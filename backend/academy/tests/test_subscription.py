"""Tests del freemium + suscripción "Zyfit Academy Pro".

Mismo patrón que test_endpoints.py/test_community.py: TestCase + APIClient +
force_authenticate (sin JWT — lo que importa es el gating y la lógica de
negocio de la suscripción, no el login)."""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from academy.access_service import nivel_academia_de
from academy.models import (
    AcademySubscription, Course, Enrollment, LessonProgress, Lesson,
    Module, Question, Quiz, QuizAttempt, School,
)

User = get_user_model()


class _Base(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username='ins@x.com', email='ins@x.com', password='x', academy_instructor=True,
        )
        self.student = User.objects.create_user(
            username='alu@x.com', email='alu@x.com', password='x',
        )
        self.client = APIClient()

    def _course_con_modulo_pago(self, slug='curso-1'):
        """Curso con Módulo 1 (gratis) + Módulo 2 (pago, con lectura y quiz)."""
        course = Course.objects.create(
            instructor=self.instructor, titulo='Curso 1', slug=slug,
            categoria='entrenamiento', nivel='principiante', publicado=True,
        )
        m_gratis = Module.objects.create(course=course, orden=1, titulo='M1 gratis', es_gratuito=True)
        leccion_gratis = Lesson.objects.create(
            module=m_gratis, orden=1, titulo='Lectura gratis', tipo='texto', contenido='hola',
        )

        m_pago = Module.objects.create(course=course, orden=2, titulo='M2 pago', es_gratuito=False)
        leccion_pago = Lesson.objects.create(
            module=m_pago, orden=1, titulo='Lectura pago', tipo='texto', contenido='secreto',
        )
        ql_pago = Lesson.objects.create(module=m_pago, orden=2, titulo='Quiz pago', tipo='quiz')
        quiz_pago = Quiz.objects.create(lesson=ql_pago, titulo='Q', puntaje_aprobacion=70)
        Question.objects.create(
            quiz=quiz_pago, orden=1, tipo='opcion_unica', enunciado='¿?',
            opciones=[{'id': 'a', 'texto': 'A'}, {'id': 'b', 'texto': 'B'}],
            respuestas_correctas=['b'], puntos=1,
        )
        return course, m_gratis, leccion_gratis, m_pago, leccion_pago, quiz_pago

    def _enroll(self, course):
        return Enrollment.objects.create(student=self.student, course=course)


class GatingTests(_Base):
    def test_free_lesson_readable_by_starter(self):
        course, m_gratis, leccion_gratis, *_ = self._course_con_modulo_pago()
        self.client.force_authenticate(self.student)
        res = self.client.get(
            f'/api/academy/courses/{course.id}/modules/{m_gratis.id}/lessons/{leccion_gratis.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()['bloqueado'])
        self.assertEqual(res.json()['contenido'], 'hola')

    def test_paid_lesson_blocked_for_starter_direct_endpoint(self):
        course, _, _, m_pago, leccion_pago, _ = self._course_con_modulo_pago()
        self.client.force_authenticate(self.student)
        res = self.client.get(
            f'/api/academy/courses/{course.id}/modules/{m_pago.id}/lessons/{leccion_pago.id}/')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()['detail'], 'requiere_academy_pro')

    def test_course_tree_shows_paid_module_locked_not_hidden(self):
        course, m_gratis, leccion_gratis, m_pago, leccion_pago, _ = self._course_con_modulo_pago()
        self.client.force_authenticate(self.student)
        res = self.client.get(f'/api/academy/courses/{course.id}/')
        self.assertEqual(res.status_code, 200)
        modulos = {m['id']: m for m in res.json()['modulos']}
        self.assertFalse(modulos[m_gratis.id]['lecciones'][0]['bloqueado'])

        leccion_pago_data = next(
            l for l in modulos[m_pago.id]['lecciones'] if l['id'] == leccion_pago.id)
        # Visible pero bloqueado, no oculto: el título sigue ahí, el contenido no.
        self.assertTrue(leccion_pago_data['bloqueado'])
        self.assertEqual(leccion_pago_data['contenido'], '')
        self.assertEqual(leccion_pago_data['titulo'], 'Lectura pago')
        self.assertIsNone(leccion_pago_data['quiz'])

    def test_lesson_complete_blocked_for_paid_module(self):
        course, _, _, m_pago, leccion_pago, _ = self._course_con_modulo_pago()
        enrollment = self._enroll(course)
        self.client.force_authenticate(self.student)
        res = self.client.post(
            f'/api/academy/enrollments/{enrollment.id}/lessons/{leccion_pago.id}/complete/')
        self.assertEqual(res.status_code, 403)
        self.assertFalse(
            LessonProgress.objects.filter(enrollment=enrollment, lesson=leccion_pago).exists())

    def test_quiz_attempt_blocked_for_paid_module(self):
        course, _, _, m_pago, _, quiz_pago = self._course_con_modulo_pago()
        enrollment = self._enroll(course)
        self.client.force_authenticate(self.student)
        res = self.client.post(
            f'/api/academy/enrollments/{enrollment.id}/quizzes/{quiz_pago.id}/attempt/',
            {'respuestas': {}}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(QuizAttempt.objects.filter(enrollment=enrollment, quiz=quiz_pago).count(), 0)

    def test_active_subscription_unlocks_paid_module(self):
        course, _, _, m_pago, leccion_pago, _ = self._course_con_modulo_pago()
        AcademySubscription.objects.create(user=self.student, estado=AcademySubscription.ESTADO_ACTIVA)
        self.client.force_authenticate(self.student)
        res = self.client.get(
            f'/api/academy/courses/{course.id}/modules/{m_pago.id}/lessons/{leccion_pago.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()['bloqueado'])
        self.assertEqual(res.json()['contenido'], 'secreto')

    def test_author_never_blocked_on_own_paid_module(self):
        course, _, _, m_pago, leccion_pago, _ = self._course_con_modulo_pago()
        self.client.force_authenticate(self.instructor)
        res = self.client.get(
            f'/api/academy/courses/{course.id}/modules/{m_pago.id}/lessons/{leccion_pago.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()['bloqueado'])


class AcademySubscriptionModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u1@x.com', email='u1@x.com', password='x')

    def test_activa_da_acceso(self):
        sub = AcademySubscription.objects.create(user=self.user, estado=AcademySubscription.ESTADO_ACTIVA)
        self.assertTrue(sub.da_acceso_pro())

    def test_cancelada_con_fecha_futura_sigue_pro(self):
        sub = AcademySubscription.objects.create(
            user=self.user, estado=AcademySubscription.ESTADO_CANCELADA,
            fecha_renovacion=date.today() + timedelta(days=5),
        )
        self.assertTrue(sub.da_acceso_pro())
        self.assertEqual(nivel_academia_de(self.user), 'pro')

    def test_cancelada_con_fecha_pasada_pierde_pro(self):
        sub = AcademySubscription.objects.create(
            user=self.user, estado=AcademySubscription.ESTADO_CANCELADA,
            fecha_renovacion=date.today() - timedelta(days=1),
        )
        self.assertFalse(sub.da_acceso_pro())
        self.assertEqual(nivel_academia_de(self.user), 'starter')

    def test_vencida_no_da_acceso(self):
        sub = AcademySubscription.objects.create(user=self.user, estado=AcademySubscription.ESTADO_VENCIDA)
        self.assertFalse(sub.da_acceso_pro())

    def test_sin_fila_es_starter(self):
        self.assertEqual(nivel_academia_de(self.user), 'starter')


class SubscriptionEndpointTests(_Base):
    def test_status_sin_suscripcion(self):
        self.client.force_authenticate(self.student)
        res = self.client.get('/api/academy/subscription/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['estado'], 'sin_suscripcion')
        self.assertEqual(res.json()['nivel'], 'starter')

    def test_status_activa(self):
        AcademySubscription.objects.create(
            user=self.student, estado=AcademySubscription.ESTADO_ACTIVA, plan_tipo='anual')
        self.client.force_authenticate(self.student)
        res = self.client.get('/api/academy/subscription/')
        self.assertEqual(res.json()['estado'], 'activa')
        self.assertEqual(res.json()['plan_tipo'], 'anual')
        self.assertEqual(res.json()['nivel'], 'pro')

    def test_cancel_self_service(self):
        sub = AcademySubscription.objects.create(
            user=self.student, estado=AcademySubscription.ESTADO_ACTIVA,
            fecha_renovacion=date.today() + timedelta(days=10),
        )
        self.client.force_authenticate(self.student)
        res = self.client.post('/api/academy/subscription/cancelar/')
        self.assertEqual(res.status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.estado, AcademySubscription.ESTADO_CANCELADA)
        # Grace: sigue Pro hasta fecha_renovacion.
        self.assertEqual(res.json()['nivel'], 'pro')

    def test_cancel_without_active_subscription_400(self):
        self.client.force_authenticate(self.student)
        res = self.client.post('/api/academy/subscription/cancelar/')
        self.assertEqual(res.status_code, 400)

    def test_no_public_activate_endpoint(self):
        """No existe endpoint público de activar — solo Django Admin o el
        webhook de pagos pueden otorgar Academy Pro."""
        self.client.force_authenticate(self.student)
        res = self.client.post('/api/academy/subscription/activar/')
        self.assertEqual(res.status_code, 404)


@override_settings(ACADEMY_PAYMENT_WEBHOOK_SECRET='shh')
class SubscriptionWebhookTests(_Base):
    def test_webhook_requires_secret(self):
        res = self.client.post(
            '/api/academy/subscription/webhook/',
            {'evento': 'activacion', 'email': self.student.email}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_webhook_activates_subscription(self):
        res = self.client.post(
            '/api/academy/subscription/webhook/',
            {'evento': 'activacion', 'email': self.student.email, 'plan_tipo': 'anual'},
            format='json', HTTP_X_ACADEMY_PAYMENT_SECRET='shh',
        )
        self.assertEqual(res.status_code, 200)
        sub = AcademySubscription.objects.get(user=self.student)
        self.assertEqual(sub.estado, AcademySubscription.ESTADO_ACTIVA)
        self.assertEqual(sub.plan_tipo, 'anual')
        # refresh_from_db limpia el fields_cache de relaciones reversas (django-auditlog
        # lo precachea en None al crear el usuario en setUp, antes de que existiera
        # la suscripción) — en producción request.user siempre se resuelve fresco
        # por request, así que esto es solo un artefacto de reusar self.student.
        self.student.refresh_from_db()
        self.assertEqual(nivel_academia_de(self.student), 'pro')

    def test_webhook_cancelacion(self):
        AcademySubscription.objects.create(user=self.student, estado=AcademySubscription.ESTADO_ACTIVA)
        res = self.client.post(
            '/api/academy/subscription/webhook/',
            {'evento': 'cancelacion', 'email': self.student.email},
            format='json', HTTP_X_ACADEMY_PAYMENT_SECRET='shh',
        )
        self.assertEqual(res.status_code, 200)
        sub = AcademySubscription.objects.get(user=self.student)
        self.assertEqual(sub.estado, AcademySubscription.ESTADO_CANCELADA)

    def test_webhook_pago_fallido(self):
        AcademySubscription.objects.create(user=self.student, estado=AcademySubscription.ESTADO_ACTIVA)
        res = self.client.post(
            '/api/academy/subscription/webhook/',
            {'evento': 'pago_fallido', 'email': self.student.email},
            format='json', HTTP_X_ACADEMY_PAYMENT_SECRET='shh',
        )
        self.assertEqual(res.status_code, 200)
        sub = AcademySubscription.objects.get(user=self.student)
        self.assertEqual(sub.estado, AcademySubscription.ESTADO_PAGO_FALLIDO)
        self.student.refresh_from_db()  # ver comentario en test_webhook_activates_subscription
        self.assertEqual(nivel_academia_de(self.student), 'starter')


@override_settings(ACADEMY_PAYMENT_WEBHOOK_SECRET='shh')
class SubscriptionWebhookIdempotencyTests(_Base):
    """Hallazgo de auditoría (2026-07-09): un evento 'renovacion' reenviado
    (reintento del proveedor, o secreto filtrado) no debe correr
    `fecha_renovacion` más de una vez."""

    def _webhook(self, **body):
        return self.client.post(
            '/api/academy/subscription/webhook/', body, format='json',
            HTTP_X_ACADEMY_PAYMENT_SECRET='shh',
        )

    def test_replay_de_la_misma_referencia_no_extiende_la_fecha_dos_veces(self):
        sub = AcademySubscription.objects.create(
            user=self.student, estado=AcademySubscription.ESTADO_ACTIVA,
            fecha_renovacion=date.today(), referencia_externa='',
        )
        res1 = self._webhook(
            evento='renovacion', email=self.student.email, referencia_externa='ev-1')
        self.assertEqual(res1.status_code, 200)
        sub.refresh_from_db()
        fecha_tras_primera = sub.fecha_renovacion
        self.assertGreater(fecha_tras_primera, date.today())

        # Mismo evento, reenviado (mismo referencia_externa).
        res2 = self._webhook(
            evento='renovacion', email=self.student.email, referencia_externa='ev-1')
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.json().get('ya_procesado'))
        sub.refresh_from_db()
        self.assertEqual(sub.fecha_renovacion, fecha_tras_primera)  # no se movió de nuevo

    def test_referencia_distinta_si_extiende(self):
        sub = AcademySubscription.objects.create(
            user=self.student, estado=AcademySubscription.ESTADO_ACTIVA,
            fecha_renovacion=date.today(), referencia_externa='ev-1',
        )
        res = self._webhook(
            evento='renovacion', email=self.student.email, referencia_externa='ev-2')
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('ya_procesado', res.json())
        sub.refresh_from_db()
        self.assertGreater(sub.fecha_renovacion, date.today())
        self.assertEqual(sub.referencia_externa, 'ev-2')

    def test_sin_referencia_externa_procesa_igual_que_antes(self):
        """Compatibilidad hacia atrás: si el proveedor (o una prueba manual)
        no manda referencia_externa, no se puede deduplicar — sigue
        aplicando la renovación como antes, sin bloquear."""
        sub = AcademySubscription.objects.create(
            user=self.student, estado=AcademySubscription.ESTADO_ACTIVA,
            fecha_renovacion=date.today(),
        )
        res = self._webhook(evento='renovacion', email=self.student.email)
        self.assertEqual(res.status_code, 200)
        sub.refresh_from_db()
        self.assertGreater(sub.fecha_renovacion, date.today())


class SubscriptionWebhookDisabledTests(_Base):
    def test_webhook_disabled_without_secret_setting(self):
        res = self.client.post(
            '/api/academy/subscription/webhook/',
            {'evento': 'activacion', 'email': self.student.email}, format='json')
        self.assertEqual(res.status_code, 503)


class FreePreviewCommandTests(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username='ins3@x.com', email='ins3@x.com', password='x', academy_instructor=True,
        )

    def test_marks_first_module_per_school(self):
        escuela = School.objects.create(nombre='Escuela 1', slug='escuela-1')
        c1 = Course.objects.create(
            school=escuela, instructor=self.instructor, titulo='C1', slug='c1',
            categoria='x', nivel='principiante', publicado=True,
        )
        m1 = Module.objects.create(course=c1, orden=1, titulo='M1')
        m2 = Module.objects.create(course=c1, orden=2, titulo='M2')
        call_command('set_academy_free_preview')
        m1.refresh_from_db()
        m2.refresh_from_db()
        self.assertTrue(m1.es_gratuito)
        self.assertFalse(m2.es_gratuito)

    def test_idempotent_does_not_override_manual_flag(self):
        escuela = School.objects.create(nombre='Escuela 2', slug='escuela-2')
        c1 = Course.objects.create(
            school=escuela, instructor=self.instructor, titulo='C1', slug='c2-1',
            categoria='x', nivel='principiante', publicado=True,
        )
        m1 = Module.objects.create(course=c1, orden=1, titulo='M1')
        Module.objects.create(course=c1, orden=2, titulo='M2', es_gratuito=True)  # ya marcado a mano
        call_command('set_academy_free_preview')
        m1.refresh_from_db()
        self.assertFalse(m1.es_gratuito)  # no lo pisa

    def test_dry_run_no_guarda(self):
        escuela = School.objects.create(nombre='Escuela 3', slug='escuela-3')
        c1 = Course.objects.create(
            school=escuela, instructor=self.instructor, titulo='C1', slug='c3-1',
            categoria='x', nivel='principiante', publicado=True,
        )
        m1 = Module.objects.create(course=c1, orden=1, titulo='M1')
        call_command('set_academy_free_preview', '--dry-run')
        m1.refresh_from_db()
        self.assertFalse(m1.es_gratuito)


class RegistrationDefaultsTests(TestCase):
    def test_new_user_registers_as_starter_without_academy_subscription(self):
        client = APIClient()
        res = client.post('/api/auth/register/', {
            'email': 'nuevo@x.com', 'password': 'contrasena-segura-123',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='nuevo@x.com')
        self.assertEqual(user.profile.plan, 'starter')
        self.assertFalse(AcademySubscription.objects.filter(user=user).exists())
        self.assertEqual(nivel_academia_de(user), 'starter')
