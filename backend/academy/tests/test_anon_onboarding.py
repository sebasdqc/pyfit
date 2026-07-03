"""Tests del onboarding SIN registro (probar contenido gratis antes de crear
cuenta). Mismo patrón que test_subscription.py: TestCase + APIClient.

Los endpoints `anon/*` son AllowAny — no hace falta `force_authenticate`. La
sesión anónima viaja en el header `X-Anon-Session` (kwarg de test client:
`HTTP_X_ANON_SESSION`)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from academy.access_service import nivel_academia_de
from academy.migration_service import migrar_progreso_anonimo
from academy.models import (
    AcademyActivityDay, AcademyEarnedBadge, AnonymousProgress, AnonymousSession,
    Course, Enrollment, LessonProgress, Lesson, Module,
)

User = get_user_model()


class _Base(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username='ins@x.com', email='ins@x.com', password='x', academy_instructor=True,
        )
        self.client = APIClient()

    def _course_con_modulo_pago(self, slug='curso-anon-1'):
        """Curso con Módulo 1 (gratis, 1 lección) + Módulo 2 (pago, 1 lección)."""
        course = Course.objects.create(
            instructor=self.instructor, titulo='Curso Anon', slug=slug,
            categoria='entrenamiento', nivel='principiante', publicado=True,
        )
        m_gratis = Module.objects.create(course=course, orden=1, titulo='M1 gratis', es_gratuito=True)
        leccion_gratis = Lesson.objects.create(
            module=m_gratis, orden=1, titulo='Lectura gratis', tipo='texto', contenido='hola anon',
        )
        m_pago = Module.objects.create(course=course, orden=2, titulo='M2 pago', es_gratuito=False)
        leccion_pago = Lesson.objects.create(
            module=m_pago, orden=1, titulo='Lectura pago', tipo='texto', contenido='secreto',
        )
        return course, m_gratis, leccion_gratis, m_pago, leccion_pago

    def _nueva_sesion(self):
        res = self.client.post('/api/academy/anon/sesion/')
        self.assertEqual(res.status_code, 201)
        return res.json()['id']


class AccesoAnonimoTests(_Base):
    def test_catalogo_lista_solo_publicados(self):
        self._course_con_modulo_pago()
        Course.objects.create(
            instructor=self.instructor, titulo='Borrador', slug='borrador',
            categoria='x', nivel='principiante', publicado=False,
        )
        res = self.client.get('/api/academy/anon/catalogo/')
        self.assertEqual(res.status_code, 200)
        titulos = [c['titulo'] for c in res.json()]
        self.assertIn('Curso Anon', titulos)
        self.assertNotIn('Borrador', titulos)

    def test_curso_detail_muestra_pago_bloqueado_no_oculto(self):
        course, m_gratis, leccion_gratis, m_pago, leccion_pago = self._course_con_modulo_pago()
        res = self.client.get(f'/api/academy/anon/cursos/{course.id}/')
        self.assertEqual(res.status_code, 200)
        modulos = {m['id']: m for m in res.json()['modulos']}
        self.assertFalse(modulos[m_gratis.id]['lecciones'][0]['bloqueado'])
        leccion_pago_data = modulos[m_pago.id]['lecciones'][0]
        self.assertTrue(leccion_pago_data['bloqueado'])
        self.assertEqual(leccion_pago_data['contenido'], '')
        self.assertEqual(leccion_pago_data['titulo'], 'Lectura pago')  # visible, no oculto

    def test_leccion_gratis_legible(self):
        _, _, leccion_gratis, _, _ = self._course_con_modulo_pago()
        res = self.client.get(f'/api/academy/anon/lecciones/{leccion_gratis.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['contenido'], 'hola anon')

    def test_leccion_pago_bloqueada(self):
        *_, leccion_pago = self._course_con_modulo_pago()
        res = self.client.get(f'/api/academy/anon/lecciones/{leccion_pago.id}/')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()['detail'], 'requiere_registro')

    def test_no_puede_tocar_streak_badges_comunidad(self):
        # Regresión: los endpoints con cuenta obligatoria no cambian de comportamiento.
        for path in ('/api/academy/streak/', '/api/academy/badges/', '/api/academy/community/posts/'):
            res = self.client.get(path)
            self.assertEqual(res.status_code, 401, path)


class CompletarLeccionTests(_Base):
    def test_completar_sin_header_400(self):
        _, _, leccion_gratis, _, _ = self._course_con_modulo_pago()
        res = self.client.post(f'/api/academy/anon/lecciones/{leccion_gratis.id}/completar/')
        self.assertEqual(res.status_code, 400)

    def test_completar_leccion_pago_403_no_crea_progreso(self):
        session_id = self._nueva_sesion()
        *_, leccion_pago = self._course_con_modulo_pago()
        res = self.client.post(
            f'/api/academy/anon/lecciones/{leccion_pago.id}/completar/',
            HTTP_X_ANON_SESSION=session_id,
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(AnonymousProgress.objects.filter(lesson=leccion_pago).exists())

    def test_completar_leccion_gratis_204(self):
        session_id = self._nueva_sesion()
        _, _, leccion_gratis, _, _ = self._course_con_modulo_pago()
        res = self.client.post(
            f'/api/academy/anon/lecciones/{leccion_gratis.id}/completar/',
            HTTP_X_ANON_SESSION=session_id,
        )
        self.assertEqual(res.status_code, 204)
        self.assertTrue(AnonymousProgress.objects.filter(
            session_id=session_id, lesson=leccion_gratis).exists())

    def test_completar_es_idempotente(self):
        session_id = self._nueva_sesion()
        _, _, leccion_gratis, _, _ = self._course_con_modulo_pago()
        for _ in range(2):
            res = self.client.post(
                f'/api/academy/anon/lecciones/{leccion_gratis.id}/completar/',
                HTTP_X_ANON_SESSION=session_id,
            )
            self.assertEqual(res.status_code, 204)
        self.assertEqual(
            AnonymousProgress.objects.filter(session_id=session_id, lesson=leccion_gratis).count(), 1)


class PersistenciaEntreSesionesTests(_Base):
    def test_progreso_persiste_al_reabrir(self):
        session_id = self._nueva_sesion()
        _, _, leccion_gratis, _, _ = self._course_con_modulo_pago()
        self.client.post(
            f'/api/academy/anon/lecciones/{leccion_gratis.id}/completar/',
            HTTP_X_ANON_SESSION=session_id,
        )
        # "Reabrir la app": nueva request, mismo id de sesión guardado localmente.
        res = self.client.get('/api/academy/anon/sesion/', HTTP_X_ANON_SESSION=session_id)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['lecciones_completadas'], [leccion_gratis.id])
        self.assertTrue(data['todo_gratis_completado'])  # única lección gratis del curso

    def test_todo_gratis_completado_false_si_falta_alguna(self):
        session_id = self._nueva_sesion()
        course, m_gratis, leccion_gratis, _, _ = self._course_con_modulo_pago()
        # Segunda lección gratis en el mismo módulo, sin completar.
        Lesson.objects.create(module=m_gratis, orden=2, titulo='Otra gratis', tipo='texto', contenido='x')
        self.client.post(
            f'/api/academy/anon/lecciones/{leccion_gratis.id}/completar/',
            HTTP_X_ANON_SESSION=session_id,
        )
        res = self.client.get('/api/academy/anon/sesion/', HTTP_X_ANON_SESSION=session_id)
        self.assertFalse(res.json()['todo_gratis_completado'])

    def test_sesion_inexistente_404(self):
        res = self.client.get('/api/academy/anon/sesion/', HTTP_X_ANON_SESSION='00000000-0000-0000-0000-000000000000')
        self.assertEqual(res.status_code, 404)


class MigracionTests(_Base):
    def _sesion_con_progreso(self):
        session = AnonymousSession.objects.create(expires_at=timezone.now() + timedelta(days=30))
        course, m_gratis, leccion_gratis, m_pago, leccion_pago = self._course_con_modulo_pago()
        AnonymousProgress.objects.create(session=session, lesson=leccion_gratis)
        return session, course, leccion_gratis

    def test_migracion_crea_matricula_y_progreso(self):
        session, course, leccion_gratis = self._sesion_con_progreso()
        user = User.objects.create_user(username='nuevo@x.com', email='nuevo@x.com', password='x')

        migrar_progreso_anonimo(session, user)

        enrollment = Enrollment.objects.get(student=user, course=course)
        self.assertTrue(
            LessonProgress.objects.filter(enrollment=enrollment, lesson=leccion_gratis, completado=True).exists())
        session.refresh_from_db()
        self.assertIsNotNone(session.migrada_en)
        self.assertEqual(session.migrada_a_id, user.id)

    def test_migracion_dispara_racha_dia_1(self):
        session, course, leccion_gratis = self._sesion_con_progreso()
        user = User.objects.create_user(username='nuevo2@x.com', email='nuevo2@x.com', password='x')

        migrar_progreso_anonimo(session, user)

        self.assertEqual(AcademyActivityDay.objects.filter(user=user).count(), 1)
        user.refresh_from_db()
        self.assertEqual(user.academy_streak.racha_actual, 1)

    def test_migracion_registro_sin_sesion_no_hace_nada(self):
        # Regresión: registrarse sin haber navegado como anónimo no debe fallar.
        user = User.objects.create_user(username='sinanon@x.com', email='sinanon@x.com', password='x')
        migrar_progreso_anonimo(None, user)  # no debe lanzar
        self.assertEqual(nivel_academia_de(user), 'starter')

    def test_migracion_es_idempotente(self):
        session, course, leccion_gratis = self._sesion_con_progreso()
        user = User.objects.create_user(username='nuevo3@x.com', email='nuevo3@x.com', password='x')

        migrar_progreso_anonimo(session, user)
        insignias_tras_primera = AcademyEarnedBadge.objects.filter(user=user).count()
        migrar_progreso_anonimo(session, user)  # segunda vez: no-op por migrada_en

        self.assertEqual(Enrollment.objects.filter(student=user, course=course).count(), 1)
        self.assertEqual(
            LessonProgress.objects.filter(enrollment__student=user, lesson=leccion_gratis).count(), 1)
        self.assertEqual(AcademyActivityDay.objects.filter(user=user).count(), 1)
        self.assertEqual(AcademyEarnedBadge.objects.filter(user=user).count(), insignias_tras_primera)

    def test_registro_endpoint_con_sesion_anonima_migra(self):
        session, course, leccion_gratis = self._sesion_con_progreso()
        res = self.client.post('/api/auth/register/', {
            'email': 'convertido@x.com', 'password': 'contraseñaSegura123',
        }, format='json', HTTP_X_ANON_SESSION=str(session.id))
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='convertido@x.com')
        self.assertTrue(Enrollment.objects.filter(student=user, course=course).exists())
        session.refresh_from_db()
        self.assertIsNotNone(session.migrada_en)

    def test_registro_endpoint_sin_header_no_falla(self):
        # Regresión: el 99% de los registros no traen X-Anon-Session.
        res = self.client.post('/api/auth/register/', {
            'email': 'normal@x.com', 'password': 'contraseñaSegura123',
        }, format='json')
        self.assertEqual(res.status_code, 201)


class SweepTests(_Base):
    def test_sweep_sin_secreto_configurado_503(self):
        with override_settings(CRON_SECRET=''):
            res = self.client.post('/api/academy/anon/sweep/')
        self.assertEqual(res.status_code, 503)

    @override_settings(CRON_SECRET='s3cr3t')
    def test_sweep_secreto_incorrecto_403(self):
        res = self.client.post('/api/academy/anon/sweep/', HTTP_X_CRON_SECRET='malo')
        self.assertEqual(res.status_code, 403)

    @override_settings(CRON_SECRET='s3cr3t')
    def test_sweep_borra_vencidas_no_migradas(self):
        vencida = AnonymousSession.objects.create(expires_at=timezone.now() - timedelta(days=1))
        vigente = AnonymousSession.objects.create(expires_at=timezone.now() + timedelta(days=1))
        vencida_migrada = AnonymousSession.objects.create(
            expires_at=timezone.now() - timedelta(days=1), migrada_en=timezone.now(),
        )
        res = self.client.post('/api/academy/anon/sweep/', HTTP_X_CRON_SECRET='s3cr3t')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['borradas'], 1)
        self.assertFalse(AnonymousSession.objects.filter(id=vencida.id).exists())
        self.assertTrue(AnonymousSession.objects.filter(id=vigente.id).exists())
        self.assertTrue(AnonymousSession.objects.filter(id=vencida_migrada.id).exists())
