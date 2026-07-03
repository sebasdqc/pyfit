"""Tests de las insignias de identidad de Zyfit Academy (academy.badges_service
+ endpoint GET /badges/ + disparo automático desde las vistas de aprendizaje).

Insignias de identidad son GLOBALES por usuario y transversales a cursos —
DISTINTAS de CourseBadge/EarnedBadge (Check-list de Competencias por curso,
cubierto en test_dashboard.py::DashboardBadgesTests). Mismo estilo que
test_streak.py/test_dashboard.py: BD real (TestCase) + APIClient con
force_authenticate.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from academy import badges_service, grading
from academy.models import (
    AcademyBadge, AcademyEarnedBadge, AcademyStreak, Course, Enrollment,
    Lesson, LessonProgress, Module, Question, Quiz, School, Submission,
)

User = get_user_model()


class _Base(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='alu@x.com', email='alu@x.com', password='x',
        )
        self.instructor = User.objects.create_user(
            username='ins@x.com', email='ins@x.com', password='x', academy_instructor=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def _school(self, nombre='Escuela 1', slug='escuela-1'):
        return School.objects.create(nombre=nombre, slug=slug)

    def _course(self, school=None, slug='curso-1', publicado=True):
        return Course.objects.create(
            school=school, instructor=self.instructor, titulo=slug, slug=slug,
            categoria='entrenamiento', nivel='principiante', publicado=publicado,
        )

    def _lessons(self, course, n=1):
        m = Module.objects.create(course=course, orden=1, titulo='M1')
        return [
            Lesson.objects.create(module=m, orden=i, titulo=f'Lección {i}', tipo='texto')
            for i in range(1, n + 1)
        ]

    def _enroll(self, course, student=None):
        return Enrollment.objects.create(student=student or self.student, course=course)

    def _complete(self, enrollment, lesson):
        LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)
        return grading.recompute_progress(enrollment)


# ─── Un test por criterio_tipo ─────────────────────────────────────────────────

class CriterioPrimeraLeccionTests(_Base):
    def test_se_otorga_al_completar_una_leccion(self):
        badge = AcademyBadge.objects.create(
            identificador='primer-paso', nombre='Primer Paso',
            criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
        )
        course = self._course()
        [lesson] = self._lessons(course)
        enrollment = self._enroll(course)
        self._complete(enrollment, lesson)

        badges_service.evaluate_badges(self.student)

        self.assertTrue(AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).exists())

    def test_no_se_otorga_sin_lecciones_completadas(self):
        AcademyBadge.objects.create(
            identificador='primer-paso', nombre='Primer Paso',
            criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
        )
        badges_service.evaluate_badges(self.student)
        self.assertFalse(AcademyEarnedBadge.objects.filter(user=self.student).exists())


class CriterioStreakDiasTests(_Base):
    def test_se_otorga_al_alcanzar_el_umbral(self):
        badge = AcademyBadge.objects.create(
            identificador='racha-7', nombre='Racha 7',
            criterio_tipo=AcademyBadge.CRITERIO_STREAK_DIAS, criterio_valor=7,
        )
        AcademyStreak.objects.create(user=self.student, racha_actual=7, mejor_racha=7)

        badges_service.evaluate_badges(self.student)

        self.assertTrue(AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).exists())

    def test_no_se_otorga_por_debajo_del_umbral(self):
        AcademyBadge.objects.create(
            identificador='racha-7', nombre='Racha 7',
            criterio_tipo=AcademyBadge.CRITERIO_STREAK_DIAS, criterio_valor=7,
        )
        AcademyStreak.objects.create(user=self.student, racha_actual=6)

        badges_service.evaluate_badges(self.student)

        self.assertFalse(AcademyEarnedBadge.objects.filter(user=self.student).exists())

    def test_usuario_sin_academystreak_no_rompe_la_evaluacion(self):
        AcademyBadge.objects.create(
            identificador='racha-7', nombre='Racha 7',
            criterio_tipo=AcademyBadge.CRITERIO_STREAK_DIAS, criterio_valor=7,
        )
        # Sin AcademyStreak creado para self.student.
        nuevas = badges_service.evaluate_badges(self.student)
        self.assertEqual(nuevas, [])


class CriterioCursoCompletadoTests(_Base):
    """`curso_completado` no está en el seed inicial pero el evaluador debe
    soportarlo genéricamente (se puede sembrar vía catálogo sin tocar código)."""

    def test_se_otorga_al_completar_el_curso(self):
        course = self._course()
        badge = AcademyBadge.objects.create(
            identificador='curso-x', nombre='Curso X',
            criterio_tipo=AcademyBadge.CRITERIO_CURSO_COMPLETADO, criterio_curso=course,
        )
        [lesson] = self._lessons(course, n=1)
        enrollment = self._enroll(course)
        self._complete(enrollment, lesson)

        badges_service.evaluate_badges(self.student)

        self.assertTrue(AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).exists())

    def test_no_se_otorga_con_curso_incompleto(self):
        course = self._course()
        AcademyBadge.objects.create(
            identificador='curso-x', nombre='Curso X',
            criterio_tipo=AcademyBadge.CRITERIO_CURSO_COMPLETADO, criterio_curso=course,
        )
        [l1, l2] = self._lessons(course, n=2)
        enrollment = self._enroll(course)
        self._complete(enrollment, l1)  # 50%, no completo

        badges_service.evaluate_badges(self.student)

        self.assertFalse(AcademyEarnedBadge.objects.filter(user=self.student).exists())


class CriterioEscuelaCompletadaTests(_Base):
    def test_se_otorga_cuando_todos_los_cursos_publicados_estan_completados(self):
        school = self._school()
        c1 = self._course(school=school, slug='c1')
        c2 = self._course(school=school, slug='c2')
        badge = AcademyBadge.objects.create(
            identificador='fisiologo', nombre='Fisiólogo',
            criterio_tipo=AcademyBadge.CRITERIO_ESCUELA_COMPLETADA, criterio_escuela=school,
        )
        for c in (c1, c2):
            [lesson] = self._lessons(c, n=1)
            e = self._enroll(c)
            self._complete(e, lesson)

        badges_service.evaluate_badges(self.student)

        self.assertTrue(AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).exists())

    def test_no_se_otorga_si_falta_un_curso_por_completar(self):
        school = self._school()
        c1 = self._course(school=school, slug='c1')
        c2 = self._course(school=school, slug='c2')
        AcademyBadge.objects.create(
            identificador='fisiologo', nombre='Fisiólogo',
            criterio_tipo=AcademyBadge.CRITERIO_ESCUELA_COMPLETADA, criterio_escuela=school,
        )
        [l1] = self._lessons(c1, n=1)
        e1 = self._enroll(c1)
        self._complete(e1, l1)
        self._enroll(c2)  # inscrito pero sin completar

        badges_service.evaluate_badges(self.student)

        self.assertFalse(AcademyEarnedBadge.objects.filter(user=self.student).exists())

    def test_escuela_sin_cursos_publicados_nunca_cuenta(self):
        school = self._school()
        AcademyBadge.objects.create(
            identificador='fisiologo', nombre='Fisiólogo',
            criterio_tipo=AcademyBadge.CRITERIO_ESCUELA_COMPLETADA, criterio_escuela=school,
        )
        # Escuela sin ningún curso: no debe contar como "completada" (vacío-verdadero).
        badges_service.evaluate_badges(self.student)
        self.assertFalse(AcademyEarnedBadge.objects.filter(user=self.student).exists())

    def test_cursos_no_publicados_no_se_exigen(self):
        school = self._school()
        c1 = self._course(school=school, slug='c1', publicado=True)
        self._course(school=school, slug='c2', publicado=False)  # borrador: no cuenta
        badge = AcademyBadge.objects.create(
            identificador='fisiologo', nombre='Fisiólogo',
            criterio_tipo=AcademyBadge.CRITERIO_ESCUELA_COMPLETADA, criterio_escuela=school,
        )
        [l1] = self._lessons(c1, n=1)
        e1 = self._enroll(c1)
        self._complete(e1, l1)

        badges_service.evaluate_badges(self.student)

        self.assertTrue(AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).exists())


# ─── Reglas de negocio ──────────────────────────────────────────────────────────

class NoDuplicadoTests(_Base):
    def test_no_se_otorga_dos_veces_al_mismo_usuario(self):
        badge = AcademyBadge.objects.create(
            identificador='primer-paso', nombre='Primer Paso',
            criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
        )
        course = self._course()
        [lesson] = self._lessons(course)
        enrollment = self._enroll(course)
        self._complete(enrollment, lesson)

        primera = badges_service.evaluate_badges(self.student)
        segunda = badges_service.evaluate_badges(self.student)

        self.assertEqual(len(primera), 1)
        self.assertEqual(segunda, [])
        self.assertEqual(
            AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).count(), 1,
        )


class CatalogoDesactivadoTests(_Base):
    def test_desactivar_conserva_lo_ya_ganado_y_bloquea_nuevas_emisiones(self):
        badge = AcademyBadge.objects.create(
            identificador='primer-paso', nombre='Primer Paso',
            criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
        )
        course = self._course()
        [lesson] = self._lessons(course)
        e1 = self._enroll(course, student=self.student)
        self._complete(e1, lesson)
        badges_service.evaluate_badges(self.student)
        self.assertTrue(AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).exists())

        badge.activo = False
        badge.save(update_fields=['activo'])

        otro = User.objects.create_user(username='otro@x.com', email='otro@x.com', password='x')
        e2 = self._enroll(course, student=otro)
        self._complete(e2, lesson)
        badges_service.evaluate_badges(otro)

        # El primero conserva la insignia (desactivar no revoca historial)...
        self.assertTrue(AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).exists())
        # ...pero ya no se emite a nadie más.
        self.assertFalse(AcademyEarnedBadge.objects.filter(user=otro, badge=badge).exists())


# ─── Disparo automático (efecto colateral de la acción real, sin llamada extra) ──

class DisparoAutomaticoTests(_Base):
    def setUp(self):
        super().setUp()
        self.badge = AcademyBadge.objects.create(
            identificador='primer-paso', nombre='Primer Paso', icono='🎯',
            criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
        )
        self.course = self._course()
        [self.lesson] = self._lessons(self.course, n=1)
        self.enrollment = self._enroll(self.course)

    def test_lesson_complete_otorga_sin_llamada_extra_del_frontend(self):
        res = self.client.post(
            f'/api/academy/enrollments/{self.enrollment.id}/lessons/{self.lesson.id}/complete/'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            res.data['nuevas_insignias'],
            [{'id': self.badge.id, 'nombre': 'Primer Paso', 'icono': '🎯'}],
        )
        self.assertTrue(
            AcademyEarnedBadge.objects.filter(user=self.student, badge=self.badge).exists(),
        )

    def test_quiz_attempt_otorga_al_aprobar(self):
        ql = Lesson.objects.create(module=self.lesson.module, orden=2, titulo='Quiz', tipo='quiz')
        quiz = Quiz.objects.create(lesson=ql, puntaje_aprobacion=50)
        q = Question.objects.create(
            quiz=quiz, orden=1, tipo='opcion_unica', enunciado='¿?',
            opciones=[{'id': 'a', 'texto': 'A'}, {'id': 'b', 'texto': 'B'}],
            respuestas_correctas=['b'], puntos=1,
        )

        res = self.client.post(
            f'/api/academy/enrollments/{self.enrollment.id}/quizzes/{quiz.id}/attempt/',
            {'respuestas': {str(q.id): ['b']}}, format='json',
        )

        self.assertEqual(res.status_code, 201)
        self.assertEqual(
            res.data['nuevas_insignias'],
            [{'id': self.badge.id, 'nombre': 'Primer Paso', 'icono': '🎯'}],
        )

    def test_submission_review_otorga_al_alumno_no_al_instructor_que_revisa(self):
        # Lección "entregable": la completa el instructor al aprobar, no el alumno.
        entregable = Lesson.objects.create(
            module=self.lesson.module, orden=2, titulo='Entrega', tipo='entregable',
            entregable_tipo='texto',
        )
        submission = Submission.objects.create(
            enrollment=self.enrollment, lesson=entregable, texto='mi análisis',
        )
        self.client.force_authenticate(self.instructor)

        res = self.client.post(
            f'/api/academy/submissions/{submission.id}/review/',
            {'estado': 'aprobada'}, format='json',
        )

        self.assertEqual(res.status_code, 200)
        # La insignia es del ALUMNO de la matrícula (enrollment.student), no de
        # request.user (el instructor que revisa).
        self.assertTrue(
            AcademyEarnedBadge.objects.filter(user=self.student, badge=self.badge).exists(),
        )
        self.assertFalse(AcademyEarnedBadge.objects.filter(user=self.instructor).exists())


# ─── Endpoint GET /badges/ ──────────────────────────────────────────────────────

class BadgesEndpointTests(_Base):
    def test_devuelve_catalogo_activo_con_estado_obtenida(self):
        obtenida = AcademyBadge.objects.create(
            identificador='primer-paso', nombre='Primer Paso', icono='🎯', orden=0,
            criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
        )
        AcademyBadge.objects.create(
            identificador='racha-30', nombre='Racha 30', icono='👑', orden=1,
            criterio_tipo=AcademyBadge.CRITERIO_STREAK_DIAS, criterio_valor=30,
        )
        AcademyBadge.objects.create(
            identificador='oculta', nombre='Oculta', criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
            activo=False,
        )
        AcademyEarnedBadge.objects.create(user=self.student, badge=obtenida)

        res = self.client.get('/api/academy/badges/')

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['total'], 2)  # la inactiva no aparece
        self.assertEqual(res.data['total_obtenidas'], 1)
        por_id = {i['identificador']: i for i in res.data['items']}
        self.assertTrue(por_id['primer-paso']['obtenida'])
        self.assertIsNotNone(por_id['primer-paso']['otorgada_at'])
        self.assertFalse(por_id['racha-30']['obtenida'])
        self.assertIsNone(por_id['racha-30']['otorgada_at'])
        self.assertNotIn('oculta', por_id)

    def test_no_autenticado_403(self):
        self.client.force_authenticate(None)
        res = self.client.get('/api/academy/badges/')
        self.assertIn(res.status_code, (401, 403))

    def test_no_dispara_evaluacion_de_lo_que_ya_se_cumple(self):
        """GET /badges/ es de solo lectura: aunque el criterio ya se cumpla, no
        otorga nada por sí solo (el desbloqueo es SIEMPRE efecto colateral de
        una acción real, nunca de 'revisar si gané algo')."""
        badge = AcademyBadge.objects.create(
            identificador='primer-paso', nombre='Primer Paso',
            criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
        )
        course = self._course()
        [lesson] = self._lessons(course)
        enrollment = self._enroll(course)
        self._complete(enrollment, lesson)  # cumple el criterio, pero nunca se llamó evaluate_badges

        res = self.client.get('/api/academy/badges/')

        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['items'][0]['obtenida'])
        self.assertFalse(AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).exists())
