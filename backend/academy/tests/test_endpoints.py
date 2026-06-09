"""Tests de los endpoints de Zyfit Academy.

Usan BD (TestCase) y el APIClient de DRF con force_authenticate (saltamos el JWT;
lo que importa aquí es el permiso de acceso/autoría y la lógica de las vistas y
del scoring del servidor)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from academy.models import (
    Course, Module, Lesson, Quiz, Question, Enrollment, Certificate,
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
