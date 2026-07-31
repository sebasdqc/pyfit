"""Tests del Home del estudiante (GET /api/academy/dashboard/) y de
dashboard_service.build_dashboard. Mismo estilo que test_endpoints.py: BD real
(TestCase) + APIClient con force_authenticate (saltamos el JWT)."""

from datetime import datetime, timezone as dt_timezone

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from academy import grading
from academy.models import (
    AcademyBadge, AcademyEarnedBadge, AcademyStreak, Course, CourseBadge, Enrollment,
    LessonProgress, Module, Lesson, School,
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

    def _school(self, nombre='Escuela 1', slug='escuela-1', orden=0):
        return School.objects.create(nombre=nombre, slug=slug, orden=orden)

    def _course(self, school=None, slug='curso-1', titulo='Curso 1', publicado=True):
        return Course.objects.create(
            school=school, instructor=self.instructor, titulo=titulo, slug=slug,
            categoria='entrenamiento', nivel='principiante', publicado=publicado,
        )

    def _lessons(self, course, n=2):
        """Un módulo con `n` lecciones de texto en orden."""
        m = Module.objects.create(course=course, orden=1, titulo='M1')
        return [
            Lesson.objects.create(module=m, orden=i, titulo=f'Lección {i}', tipo='texto')
            for i in range(1, n + 1)
        ]

    def _enroll(self, course, student=None):
        return Enrollment.objects.create(student=student or self.student, course=course)

    def _complete(self, enrollment, lesson, when=None):
        """Marca `lesson` completada dentro de `enrollment` y recalcula el
        progreso (mismo camino que la vista lesson_complete, sin pasar por
        HTTP). Si se pasa `when`, fuerza `completado_at` (bypassa auto_now_add)
        para poder ordenar actividad entre cursos de forma determinista."""
        lp, _ = LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)
        if when is not None:
            LessonProgress.objects.filter(pk=lp.pk).update(completado_at=when)
        return grading.recompute_progress(enrollment)

    def _dashboard(self):
        res = self.client.get('/api/academy/dashboard/')
        self.assertEqual(res.status_code, 200)
        return res.data

    def _escuela(self, data, slug):
        return next(e for e in data['escuelas'] if e['slug'] == slug)

    def _curso(self, escuela, slug):
        return next(c for c in escuela['cursos'] if c['slug'] == slug)


# ─── Auth ─────────────────────────────────────────────────────────────────────

class DashboardAuthTests(_Base):
    def test_no_autenticado(self):
        self.client.force_authenticate(None)
        res = self.client.get('/api/academy/dashboard/')
        self.assertIn(res.status_code, (401, 403))


# ─── Estado vacío ──────────────────────────────────────────────────────────────

class DashboardEmptyStateTests(_Base):
    def test_estudiante_nuevo_sin_matriculas(self):
        school = self._school()
        course = self._course(school=school)
        self._lessons(course, n=2)

        data = self._dashboard()

        self.assertFalse(data['tiene_matriculas'])
        self.assertIsNone(data['continuar'])
        self.assertIsNone(data['siguiente_paso'])
        self.assertEqual(data['puntos_aprendizaje'], 0)

        escuela = self._escuela(data, school.slug)
        self.assertEqual(escuela['puntos'], 0)
        self.assertEqual(escuela['cursos_no_iniciados'], 1)
        curso = self._curso(escuela, course.slug)
        self.assertEqual(curso['estado'], 'no_iniciado')
        self.assertIsNone(curso['enrollment_id'])

    def test_escuela_sin_cursos_publicados_no_aparece(self):
        self._school(nombre='Vacía', slug='vacia')
        data = self._dashboard()
        self.assertNotIn('vacia', [e['slug'] for e in data['escuelas']])


# ─── Progreso por curso ────────────────────────────────────────────────────────

class DashboardCourseProgressTests(_Base):
    def test_inscrito_sin_actividad_es_no_iniciado(self):
        school = self._school()
        course = self._course(school=school)
        lessons = self._lessons(course, n=2)
        self._enroll(course)

        data = self._dashboard()
        escuela = self._escuela(data, school.slug)
        curso = self._curso(escuela, course.slug)

        self.assertEqual(curso['estado'], 'no_iniciado')
        self.assertEqual(curso['progreso'], 0)
        self.assertIsNotNone(curso['enrollment_id'])
        # Sin actividad todavía: no hay "continuar", pero sí un siguiente paso
        # (la primera lección del curso).
        self.assertIsNone(data['continuar'])
        self.assertIsNotNone(data['siguiente_paso'])
        self.assertEqual(data['siguiente_paso']['curso_slug'], course.slug)
        self.assertEqual(data['siguiente_paso']['leccion']['id'], lessons[0].id)

    def test_progreso_parcial_coincide_con_grading(self):
        school = self._school()
        course = self._course(school=school)
        lessons = self._lessons(course, n=2)
        enrollment = self._enroll(course)
        self._complete(enrollment, lessons[0])

        enrollment.refresh_from_db()
        data = self._dashboard()
        curso = self._curso(self._escuela(data, school.slug), course.slug)

        self.assertEqual(curso['progreso'], enrollment.progreso)
        self.assertEqual(curso['estado'], 'en_progreso')

    def test_curso_completo_certificado_y_excluido_de_continuar(self):
        school = self._school()
        course = self._course(school=school)
        lessons = self._lessons(course, n=1)
        enrollment = self._enroll(course)
        self._complete(enrollment, lessons[0])

        enrollment.refresh_from_db()
        self.assertEqual(enrollment.estado, Enrollment.ESTADO_COMPLETADA)

        data = self._dashboard()
        curso = self._curso(self._escuela(data, school.slug), course.slug)

        self.assertEqual(curso['estado'], 'completado')
        self.assertIsNotNone(curso['certificado'])
        # La única matrícula ya está completa: no queda nada que continuar.
        self.assertIsNone(data['continuar'])
        self.assertIsNone(data['siguiente_paso'])
        self.assertEqual(data['stats']['cursos_completados'], 1)


# ─── Puntos de aprendizaje por escuela ──────────────────────────────────────────

class DashboardSchoolAggregationTests(_Base):
    def test_puntos_suma_las_lecciones_completadas_de_la_escuela(self):
        school = self._school()
        completo = self._course(school=school, slug='completo')
        [l] = self._lessons(completo, n=1)  # 1 lección texto, 10 pts default
        e1 = self._enroll(completo)
        self._complete(e1, l)  # +10 pts

        parcial = self._course(school=school, slug='parcial')
        lecciones = self._lessons(parcial, n=2)  # 2 lecciones texto, 10 pts c/u
        e2 = self._enroll(parcial)
        self._complete(e2, lecciones[0])  # +10 pts (50% del curso, 1 de 2)

        self._course(school=school, slug='sin-tocar')  # nunca inscrito → 0 pts

        data = self._dashboard()
        escuela = self._escuela(data, school.slug)

        self.assertEqual(escuela['total_cursos'], 3)
        self.assertEqual(escuela['cursos_completados'], 1)
        self.assertEqual(escuela['cursos_en_progreso'], 1)
        self.assertEqual(escuela['cursos_no_iniciados'], 1)
        # 10 (completo) + 10 (parcial, 1 lección) + 0 (sin tocar) = 20
        self.assertEqual(escuela['puntos'], 20)
        self.assertEqual(data['puntos_aprendizaje'], 20)


# ─── Continuar / siguiente paso entre cursos y escuelas ─────────────────────────

class DashboardContinueAcrossCoursesTests(_Base):
    def test_continuar_elige_la_actividad_mas_reciente(self):
        escuela_a = self._school(nombre='Escuela A', slug='escuela-a', orden=1)
        escuela_b = self._school(nombre='Escuela B', slug='escuela-b', orden=2)
        curso_a = self._course(school=escuela_a, slug='curso-a')
        curso_b = self._course(school=escuela_b, slug='curso-b')
        lecciones_a = self._lessons(curso_a, n=2)
        lecciones_b = self._lessons(curso_b, n=2)
        e_a = self._enroll(curso_a)
        e_b = self._enroll(curso_b)

        t1 = datetime(2026, 1, 1, tzinfo=dt_timezone.utc)
        t2 = datetime(2026, 1, 2, tzinfo=dt_timezone.utc)
        self._complete(e_a, lecciones_a[0], when=t1)
        self._complete(e_b, lecciones_b[0], when=t2)

        data = self._dashboard()

        self.assertIsNotNone(data['continuar'])
        self.assertEqual(data['continuar']['curso_slug'], curso_b.slug)
        self.assertEqual(data['continuar']['leccion']['id'], lecciones_b[1].id)
        self.assertEqual(data['siguiente_paso'], data['continuar'])

    def test_siguiente_paso_cae_a_matricula_activa_sin_tocar_mas_antigua(self):
        school = self._school()
        curso_viejo = self._course(school=school, slug='viejo')
        curso_nuevo = self._course(school=school, slug='nuevo')
        lecciones_viejo = self._lessons(curso_viejo, n=1)
        self._lessons(curso_nuevo, n=1)

        e_viejo = self._enroll(curso_viejo)
        Enrollment.objects.filter(pk=e_viejo.pk).update(
            created_at=datetime(2020, 1, 1, tzinfo=dt_timezone.utc),
        )
        self._enroll(curso_nuevo)

        data = self._dashboard()

        self.assertIsNone(data['continuar'])
        self.assertIsNotNone(data['siguiente_paso'])
        self.assertEqual(data['siguiente_paso']['curso_slug'], curso_viejo.slug)
        self.assertEqual(data['siguiente_paso']['leccion']['id'], lecciones_viejo[0].id)


# ─── Insignias ──────────────────────────────────────────────────────────────────

class DashboardBadgesTests(_Base):
    def test_insignias_denormalizadas(self):
        school = self._school()
        course = self._course(school=school)
        [lesson] = self._lessons(course, n=1)
        CourseBadge.objects.create(
            course=course, orden=1, nombre='Primer módulo', icono='🥇',
            descripcion='Completaste el primer módulo', lesson=lesson,
        )
        enrollment = self._enroll(course)
        self._complete(enrollment, lesson)

        data = self._dashboard()

        self.assertEqual(data['insignias']['total'], 1)
        badge = data['insignias']['recientes'][0]
        self.assertEqual(badge['nombre'], 'Primer módulo')
        self.assertEqual(badge['icono'], '🥇')
        self.assertEqual(badge['descripcion'], 'Completaste el primer módulo')
        self.assertEqual(badge['curso_titulo'], course.titulo)
        self.assertIn('otorgada_at', badge)


class DashboardIdentityBadgesTests(_Base):
    """`insignias_identidad` — catálogo global de identidad (AcademyBadge),
    DISTINTO de `insignias` (CourseBadge, arriba). Ver academy.badges_service."""

    def test_incluye_catalogo_activo_con_estado_obtenida(self):
        obtenida = AcademyBadge.objects.create(
            identificador='primer-paso', nombre='Primer Paso', icono='🎯',
            criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
        )
        AcademyBadge.objects.create(
            identificador='racha-30', nombre='Racha 30', icono='👑',
            criterio_tipo=AcademyBadge.CRITERIO_STREAK_DIAS, criterio_valor=30,
        )
        AcademyEarnedBadge.objects.create(user=self.student, badge=obtenida)

        data = self._dashboard()

        self.assertEqual(data['insignias_identidad']['total'], 2)
        self.assertEqual(data['insignias_identidad']['total_obtenidas'], 1)
        por_id = {i['identificador']: i for i in data['insignias_identidad']['items']}
        self.assertTrue(por_id['primer-paso']['obtenida'])
        self.assertFalse(por_id['racha-30']['obtenida'])


# ─── Estadísticas de por vida ────────────────────────────────────────────────────

class DashboardStatsTests(_Base):
    def test_cursos_completados_y_mejor_racha(self):
        AcademyStreak.objects.create(user=self.student, racha_actual=2, mejor_racha=7)
        school = self._school()
        course = self._course(school=school)
        [lesson] = self._lessons(course, n=1)
        enrollment = self._enroll(course)
        self._complete(enrollment, lesson)

        data = self._dashboard()

        self.assertEqual(data['stats']['cursos_completados'], 1)
        self.assertEqual(data['stats']['cursos_activos'], 0)
        self.assertEqual(data['stats']['total_inscripciones'], 1)
        self.assertEqual(data['stats']['mejor_racha'], 7)
        self.assertEqual(data['racha']['mejor_racha'], 7)


# ─── N+1 ──────────────────────────────────────────────────────────────────────

class DashboardQueryCountTests(_Base):
    def test_numero_de_queries_no_crece_con_el_catalogo(self):
        for i in range(3):
            school = self._school(nombre=f'Escuela {i}', slug=f'escuela-{i}', orden=i)
            for j in range(3):
                course = self._course(school=school, slug=f'curso-{i}-{j}')
                lessons = self._lessons(course, n=2)
                if j < 2:
                    enrollment = self._enroll(course)
                    if j == 1:
                        self._complete(enrollment, lessons[0])

        # Catálogo de insignias de identidad "real" (como lo deja seed_academy_badges)
        # para que la guarda también cubra insignias_identidad, no solo el 0 default.
        for k in range(6):
            AcademyBadge.objects.create(
                identificador=f'insignia-{k}', nombre=f'Insignia {k}',
                criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
            )

        # Fijo independientemente del tamaño del catálogo (3 escuelas × 3 cursos ×
        # hasta 2 matrículas c/u aquí, + 6 insignias de identidad) — si este número
        # empieza a crecer con el fixture, es la señal de una N+1 reintroducida.
        # 24 = 18 (línea base, incluye el INSERT lazy de AcademyStreak la primera
        # vez que este estudiante pide su racha) + 1 por `_puntos_by_course`
        # (agregación de puntos de aprendizaje, sumada 2026-07-10 al reemplazar
        # `progreso_general`) + 5 del motor de aprendizaje adaptativo: mastery
        # del estudiante, matrículas activas, progreso de lecciones, tags de
        # competencia de las lecciones pendientes y los cursos de la
        # recomendación.
        #
        # Esas 5 son todas por conjunto (`IN (...)`), así que el número sigue
        # siendo fijo: la guarda no perdió sentido, quedó desactualizada. Se
        # descubrió justo al montar el CI, con el test en rojo — que es
        # exactamente para lo que se montó.
        #
        # Anotado al pasar, sin corregir porque no es una N+1 y no era el alcance:
        # dentro de `mastery_service.recomendar_siguiente`, las matrículas
        # activas del estudiante se consultan dos veces más
        # (`_candidato_matriculado` y `course_ids_matriculado`) aunque
        # `build_dashboard` ya trajo TODAS las matrículas del estudiante al
        # principio. Son 2 queries de menos si alguna vez se toca ese servicio.
        with self.assertNumQueries(24):
            res = self.client.get('/api/academy/dashboard/')
        self.assertEqual(res.status_code, 200)
