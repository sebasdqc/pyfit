"""Tests de los endpoints de Zyfit Academy.

Usan BD (TestCase) y el APIClient de DRF con force_authenticate (saltamos el JWT;
lo que importa aquí es el permiso de acceso/autoría y la lógica de las vistas y
del scoring del servidor)."""

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from academy import grading
from academy.models import (
    Course, Module, Lesson, Quiz, Question, Enrollment, Certificate,
    Submission, CourseBadge, EarnedBadge, LessonProgress,
)

User = get_user_model()


class _Base(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username='ins@x.com', email='ins@x.com', password='x', academy_instructor=True,
        )
        self.otro_instructor = User.objects.create_user(
            username='ins2@x.com', email='ins2@x.com', password='x', academy_instructor=True,
        )
        self.student = User.objects.create_user(
            username='alu@x.com', email='alu@x.com', password='x',
        )
        self.client = APIClient()

    def _course(self, instructor=None, publicado=True, slug='curso-1'):
        c = Course.objects.create(
            instructor=instructor or self.instructor, titulo='Curso 1', slug=slug,
            categoria='entrenamiento', nivel='principiante', publicado=publicado,
        )
        return c

    def _course_con_quiz(self, **kw):
        """Curso con 1 lección de texto + 1 quiz de 1 pregunta (clave: 'b')."""
        course = self._course(**kw)
        m = Module.objects.create(course=course, orden=1, titulo='M1')
        Lesson.objects.create(module=m, orden=1, titulo='Lectura', tipo='texto')
        ql = Lesson.objects.create(module=m, orden=2, titulo='Quiz', tipo='quiz')
        quiz = Quiz.objects.create(lesson=ql, titulo='Q', puntaje_aprobacion=70)
        Question.objects.create(
            quiz=quiz, orden=1, tipo='opcion_unica', enunciado='¿?',
            opciones=[{'id': 'a', 'texto': 'A'}, {'id': 'b', 'texto': 'B'}],
            respuestas_correctas=['b'], puntos=1,
        )
        return course, quiz


# ─── Auth ─────────────────────────────────────────────────────────────────────

class AuthTests(_Base):
    def test_login_ok_estudiante(self):
        res = self.client.post('/api/academy/auth/login/',
                               {'email': 'alu@x.com', 'password': 'x'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.json())
        self.assertFalse(res.json()['user']['is_instructor'])

    def test_login_credenciales_malas(self):
        res = self.client.post('/api/academy/auth/login/',
                               {'email': 'alu@x.com', 'password': 'mal'}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_login_cuenta_inactiva_403(self):
        self.student.is_active = False
        self.student.save(update_fields=['is_active'])
        res = self.client.post('/api/academy/auth/login/',
                               {'email': 'alu@x.com', 'password': 'x'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_me_flags_instructor(self):
        self.client.force_authenticate(self.instructor)
        res = self.client.get('/api/academy/me/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['is_instructor'])
        self.assertTrue(res.json()['puede_crear_cursos'])

    def test_me_patch_nombre(self):
        self.client.force_authenticate(self.student)
        res = self.client.patch('/api/academy/me/', {'nombre': 'Ana'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['nombre'], 'Ana')


# ─── Cursos / autoría ─────────────────────────────────────────────────────────

class CourseTests(_Base):
    def test_estudiante_no_crea_curso(self):
        self.client.force_authenticate(self.student)
        res = self.client.post('/api/academy/courses/',
                               {'titulo': 'X', 'slug': 'x'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_instructor_crea_curso(self):
        self.client.force_authenticate(self.instructor)
        res = self.client.post('/api/academy/courses/',
                               {'titulo': 'Nuevo', 'slug': 'nuevo'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()['instructor'], self.instructor.id)

    def test_catalogo_solo_publicados(self):
        self._course(publicado=True, slug='pub')
        self._course(publicado=False, slug='draft')
        self.client.force_authenticate(self.student)
        res = self.client.get('/api/academy/courses/')
        slugs = {c['slug'] for c in res.json()}
        self.assertEqual(slugs, {'pub'})

    def test_mine_incluye_borradores(self):
        self._course(publicado=False, slug='draft')
        self.client.force_authenticate(self.instructor)
        res = self.client.get('/api/academy/courses/?mine=1')
        self.assertEqual({c['slug'] for c in res.json()}, {'draft'})

    def test_no_editar_curso_ajeno(self):
        course = self._course(instructor=self.instructor)
        self.client.force_authenticate(self.otro_instructor)
        res = self.client.patch(f'/api/academy/courses/{course.id}/',
                                {'titulo': 'hack'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_borrador_no_visible_a_terceros(self):
        course = self._course(instructor=self.instructor, publicado=False)
        self.client.force_authenticate(self.student)
        res = self.client.get(f'/api/academy/courses/{course.id}/')
        self.assertEqual(res.status_code, 404)


# ─── Quiz: la clave de respuestas no se filtra al estudiante ──────────────────

class QuizSecurityTests(_Base):
    def test_estudiante_no_ve_clave(self):
        course, quiz = self._course_con_quiz()
        Enrollment.objects.create(student=self.student, course=course)
        self.client.force_authenticate(self.student)
        res = self.client.get(f'/api/academy/lessons/{quiz.lesson_id}/quiz/')
        self.assertEqual(res.status_code, 200)
        pregunta = res.json()['preguntas'][0]
        self.assertNotIn('respuestas_correctas', pregunta)

    def test_autor_si_ve_clave(self):
        course, quiz = self._course_con_quiz()
        self.client.force_authenticate(self.instructor)
        res = self.client.get(f'/api/academy/lessons/{quiz.lesson_id}/quiz/')
        self.assertIn('respuestas_correctas', res.json()['preguntas'][0])

    def test_curso_detail_no_filtra_clave_a_estudiante(self):
        course, quiz = self._course_con_quiz()
        self.client.force_authenticate(self.student)
        res = self.client.get(f'/api/academy/courses/{course.id}/')
        # Busca la pregunta del quiz dentro del árbol y verifica que no trae clave.
        quiz_data = res.json()['modulos'][0]['lecciones'][1]['quiz']
        self.assertNotIn('respuestas_correctas', quiz_data['preguntas'][0])


# ─── Inscripción + progreso + scoring + certificado ───────────────────────────

class LearningFlowTests(_Base):
    def test_enroll_y_progreso(self):
        course, quiz = self._course_con_quiz()
        self.client.force_authenticate(self.student)
        res = self.client.post(f'/api/academy/courses/{course.id}/enroll/')
        self.assertEqual(res.status_code, 201)
        enr_id = res.json()['id']
        self.assertEqual(res.json()['progreso'], 0)

        # Completar la primera lección (texto) → 1 de 2 lecciones = 50%.
        lectura = course.modulos.first().lecciones.get(tipo='texto')
        res = self.client.post(
            f'/api/academy/enrollments/{enr_id}/lessons/{lectura.id}/complete/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['progreso'], 50)

    def test_enroll_idempotente(self):
        course = self._course()
        self.client.force_authenticate(self.student)
        self.client.post(f'/api/academy/courses/{course.id}/enroll/')
        res = self.client.post(f'/api/academy/courses/{course.id}/enroll/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Enrollment.objects.filter(student=self.student, course=course).count(), 1)

    def test_quiz_calificado_en_servidor_y_certificado(self):
        course, quiz = self._course_con_quiz()
        self.client.force_authenticate(self.student)
        enr = Enrollment.objects.create(student=self.student, course=course)
        # Completar la lección de texto primero.
        lectura = course.modulos.first().lecciones.get(tipo='texto')
        self.client.post(f'/api/academy/enrollments/{enr.id}/lessons/{lectura.id}/complete/')

        # Responder mal → no aprueba, sin certificado.
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/quizzes/{quiz.id}/attempt/',
            {'respuestas': {str(quiz.preguntas.first().id): ['a']}}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.json()['aprobado'])
        self.assertEqual(res.json()['puntaje'], 0)

        # Responder bien → aprueba, completa la lección del quiz → 100% + certificado.
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/quizzes/{quiz.id}/attempt/',
            {'respuestas': {str(quiz.preguntas.first().id): ['b']}}, format='json')
        self.assertTrue(res.json()['aprobado'])
        self.assertEqual(res.json()['puntaje'], 100)
        self.assertEqual(res.json()['progreso'], 100)
        self.assertEqual(res.json()['estado'], 'completada')

        enr.refresh_from_db()
        self.assertTrue(Certificate.objects.filter(enrollment=enr).exists())

        # El cliente nunca pudo mandar el puntaje: lo calcula el servidor.
        cert = Certificate.objects.get(enrollment=enr)
        res = self.client.get(f'/api/academy/certificates/verify/{cert.codigo}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['curso_titulo'], course.titulo)

    def test_no_ver_matricula_ajena(self):
        course = self._course()
        enr = Enrollment.objects.create(student=self.student, course=course)
        self.client.force_authenticate(self.otro_instructor)
        res = self.client.get(f'/api/academy/enrollments/{enr.id}/')
        self.assertEqual(res.status_code, 404)

    def test_instructor_ve_inscritos_de_su_curso(self):
        course = self._course(instructor=self.instructor)
        Enrollment.objects.create(student=self.student, course=course)
        self.client.force_authenticate(self.instructor)
        res = self.client.get(f'/api/academy/courses/{course.id}/enrollments/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)


# ─── Programa Evolución 360°: entregables, revisión e insignias ────────────────

class Evolucion360Tests(_Base):
    """Flujo del Programa 360°: el entregable lo aprueba el instructor (no es
    autocompletable), la aprobación completa la lección y otorga la insignia, y
    el certificado solo llega con todo el check-list cerrado."""

    def _course_360(self):
        """Curso mínimo 360°: texto + entregable de texto (con insignia) +
        entregable de video (con insignia)."""
        course = self._course(slug='programa-360')
        m = Module.objects.create(course=course, orden=1, titulo='Fase única')
        texto = Lesson.objects.create(module=m, orden=1, titulo='Lectura', tipo='texto')
        analisis = Lesson.objects.create(
            module=m, orden=2, titulo='Análisis de caso', tipo='entregable',
            entregable_tipo='texto',
        )
        video = Lesson.objects.create(
            module=m, orden=3, titulo='Diario de Estrategia', tipo='entregable',
            entregable_tipo='video',
        )
        b1 = CourseBadge.objects.create(
            course=course, orden=1, nombre='Insignia de Aplicador', icono='🎯', lesson=analisis,
        )
        b2 = CourseBadge.objects.create(
            course=course, orden=2, nombre='Insignia de Analista', icono='🎥', lesson=video,
        )
        return course, texto, analisis, video, b1, b2

    def test_entregable_no_autocompletable(self):
        course, _texto, analisis, *_ = self._course_360()
        enr = Enrollment.objects.create(student=self.student, course=course)
        self.client.force_authenticate(self.student)
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/lessons/{analisis.id}/complete/')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(LessonProgress.objects.filter(enrollment=enr, lesson=analisis).exists())

    def test_entrega_validacion_por_tipo(self):
        course, _texto, analisis, video, *_ = self._course_360()
        enr = Enrollment.objects.create(student=self.student, course=course)
        self.client.force_authenticate(self.student)
        # Entregable de texto sin texto → 400.
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/lessons/{analisis.id}/submission/',
            {'texto': '  '}, format='json')
        self.assertEqual(res.status_code, 400)
        # Entregable de video sin URL http(s) → 400.
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/lessons/{video.id}/submission/',
            {'video_url': 'mi-video'}, format='json')
        self.assertEqual(res.status_code, 400)
        # Una lección que no es entregable no acepta entregas.
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/lessons/{_texto.id}/submission/',
            {'texto': 'hola'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_flujo_aprobacion_otorga_insignia(self):
        course, _texto, analisis, _video, b1, _b2 = self._course_360()
        enr = Enrollment.objects.create(student=self.student, course=course)

        # El estudiante envía su análisis.
        self.client.force_authenticate(self.student)
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/lessons/{analisis.id}/submission/',
            {'texto': 'Contexto, problema, alternativas y decisión.'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()['estado'], 'enviada')
        sub_id = res.json()['id']

        # El instructor la ve en la bandeja del curso y la aprueba.
        self.client.force_authenticate(self.instructor)
        res = self.client.get(f'/api/academy/courses/{course.id}/submissions/?estado=enviada')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        res = self.client.post(f'/api/academy/submissions/{sub_id}/review/',
                               {'estado': 'aprobada', 'feedback': 'Buen análisis.'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['estado'], 'aprobada')

        # La lección quedó completada y la insignia otorgada (lado servidor).
        self.assertTrue(LessonProgress.objects.filter(enrollment=enr, lesson=analisis).exists())
        self.assertTrue(EarnedBadge.objects.filter(enrollment=enr, badge=b1).exists())

        # El detalle de la matrícula expone entregas e insignias al estudiante.
        self.client.force_authenticate(self.student)
        res = self.client.get(f'/api/academy/enrollments/{enr.id}/')
        data = res.json()
        self.assertEqual(len(data['entregas']), 1)
        self.assertEqual(data['entregas'][0]['estado'], 'aprobada')
        self.assertEqual([i['badge'] for i in data['insignias_obtenidas']], [b1.id])
        self.assertEqual(len(data['curso']['insignias']), 2)

        # Una entrega aprobada queda cerrada (no se reenvía).
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/lessons/{analisis.id}/submission/',
            {'texto': 'otro'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_rechazo_con_feedback_y_reenvio(self):
        course, _texto, analisis, *_ = self._course_360()
        enr = Enrollment.objects.create(student=self.student, course=course)
        self.client.force_authenticate(self.student)
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/lessons/{analisis.id}/submission/',
            {'texto': 'v1'}, format='json')
        sub_id = res.json()['id']

        self.client.force_authenticate(self.instructor)
        self.client.post(f'/api/academy/submissions/{sub_id}/review/',
                         {'estado': 'rechazada', 'feedback': 'Falta la causa táctica.'},
                         format='json')
        self.assertFalse(LessonProgress.objects.filter(enrollment=enr, lesson=analisis).exists())

        # El estudiante ve el feedback y reenvía: vuelve a 'enviada'.
        self.client.force_authenticate(self.student)
        res = self.client.get(
            f'/api/academy/enrollments/{enr.id}/lessons/{analisis.id}/submission/')
        self.assertEqual(res.json()['estado'], 'rechazada')
        self.assertEqual(res.json()['feedback'], 'Falta la causa táctica.')
        res = self.client.post(
            f'/api/academy/enrollments/{enr.id}/lessons/{analisis.id}/submission/',
            {'texto': 'v2 con causa táctica'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['estado'], 'enviada')
        self.assertEqual(Submission.objects.filter(enrollment=enr).count(), 1)

    def test_estudiante_no_revisa_entregas(self):
        course, _texto, analisis, *_ = self._course_360()
        enr = Enrollment.objects.create(student=self.student, course=course)
        sub = Submission.objects.create(enrollment=enr, lesson=analisis, texto='x')
        self.client.force_authenticate(self.student)
        res = self.client.post(f'/api/academy/submissions/{sub.id}/review/',
                               {'estado': 'aprobada'}, format='json')
        self.assertEqual(res.status_code, 403)
        res = self.client.get(f'/api/academy/courses/{course.id}/submissions/')
        self.assertEqual(res.status_code, 403)

    def test_checklist_completo_emite_certificado(self):
        course, texto, analisis, video, b1, b2 = self._course_360()
        enr = Enrollment.objects.create(student=self.student, course=course)
        self.client.force_authenticate(self.student)
        self.client.post(f'/api/academy/enrollments/{enr.id}/lessons/{texto.id}/complete/')
        for lesson, payload in ((analisis, {'texto': 'análisis'}),
                                (video, {'video_url': 'https://youtu.be/x'})):
            res = self.client.post(
                f'/api/academy/enrollments/{enr.id}/lessons/{lesson.id}/submission/',
                payload, format='json')
            sub_id = res.json()['id']
            self.client.force_authenticate(self.instructor)
            self.client.post(f'/api/academy/submissions/{sub_id}/review/',
                             {'estado': 'aprobada'}, format='json')
            self.client.force_authenticate(self.student)

        enr.refresh_from_db()
        self.assertEqual(enr.progreso, 100)
        self.assertEqual(enr.estado, 'completada')
        self.assertTrue(Certificate.objects.filter(enrollment=enr).exists())
        self.assertEqual(EarnedBadge.objects.filter(enrollment=enr).count(), 2)


class Seed360Tests(TestCase):
    """El seed del Programa 360° crea el curso publicado con sus 5 fases, 3
    insignias y quizzes consistentes (cada clave califica 100%)."""

    def test_seed_es_consistente_e_idempotente(self):
        call_command('seed_evolucion_360')
        course = Course.objects.get(slug='programa-evolucion-360-del-clic-a-la-cancha')
        self.assertTrue(course.publicado)
        self.assertEqual(course.modulos.count(), 5)
        self.assertEqual(course.insignias.count(), 3)
        # Cada insignia apunta a una lección entregable del propio curso.
        for badge in course.insignias.all():
            self.assertEqual(badge.lesson.tipo, 'entregable')
            self.assertEqual(badge.lesson.module.course_id, course.id)
        # Hay lecciones de los tres tipos nuevos del 360°.
        tipos = set(Lesson.objects.filter(module__course=course).values_list('tipo', flat=True))
        self.assertTrue({'en_vivo', 'practica', 'entregable'} <= tipos)
        # Cada quiz da 100% respondido con su propia clave.
        for quiz in Quiz.objects.filter(lesson__module__course=course):
            clave = {str(p.id): p.respuestas_correctas for p in quiz.preguntas.all()}
            resultado = grading.grade_attempt(quiz, clave)
            self.assertEqual(resultado['puntaje'], 100, quiz.titulo)
        # Idempotente: correrlo de nuevo no duplica.
        call_command('seed_evolucion_360')
        self.assertEqual(
            Course.objects.filter(slug='programa-evolucion-360-del-clic-a-la-cancha').count(), 1)
