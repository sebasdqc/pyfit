"""Aislamiento por tenant en los endpoints de quiz/preguntas.

Hallazgo de auditoría 2026-07-30: `lesson_quiz`, `quiz_questions` y
`question_detail` resolvían Lesson/Quiz por PK GLOBAL (a diferencia del resto
de endpoints de contenido, que pasan por `_course_for_read`/`_course_for_edit`
y filtran por tenant). Un alumno podía leer las preguntas del quiz de otra
organización, y un `academy_admin` podía reescribir y borrar su contenido.

Reproducido en su momento con estos mismos 4 casos: 200 al listar preguntas
ajenas, 200 al hacer PUT del quiz ajeno, 204 al borrar una pregunta ajena.

La segunda clase cubre lo que NO debe romperse al acotar el scope: el trabajo
legítimo del admin dentro de su propio tenant, y el del staff global de Zyfit.
"""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from academy.models import Course, Lesson, Module, Question, Quiz, School, Tenant

User = get_user_model()


class _BaseDosTenants(APITestCase):
    def setUp(self):
        self.t_a = Tenant.objects.create(nombre='A', slug='ta', dominio='ta.zyfit.app')
        self.t_b = Tenant.objects.create(nombre='B', slug='tb', dominio='tb.zyfit.app')

        self.course_b, self.lesson_b, self.quiz_b, self.question_b = self._contenido(self.t_b, 'b')

        self.alumno_a = User.objects.create_user(
            username='a@a.com', email='a@a.com', password='x', academy_tenant=self.t_a,
        )
        self.admin_a = User.objects.create_user(
            username='adm@a.com', email='adm@a.com', password='x',
            academy_tenant=self.t_a, academy_admin=True,
        )

    def _contenido(self, tenant, sufijo):
        school = School.objects.create(nombre=f'Escuela {sufijo}', slug=f'e{sufijo}', tenant=tenant)
        course = Course.objects.create(
            titulo=f'Curso de {sufijo}', slug=f'curso-{sufijo}', school=school,
            tenant=tenant, publicado=True,
        )
        module = Module.objects.create(course=course, titulo='M1', orden=1, es_gratuito=True)
        lesson = Lesson.objects.create(module=module, titulo='L1', orden=1)
        quiz = Quiz.objects.create(lesson=lesson, titulo=f'Quiz de {sufijo}')
        question = Question.objects.create(quiz=quiz, enunciado=f'Pregunta de {sufijo}', orden=1)
        return course, lesson, quiz, question

    def _as(self, user, slug):
        self.client.force_authenticate(user=user)
        # Manda SU propio tenant: pasa `tenant_mismatch` sin problema. El ataque
        # no es falsear el header, es pedir un id de otra organización.
        self.client.credentials(HTTP_X_TENANT_SLUG=slug)


class QuizAisladoEntreTenantsTests(_BaseDosTenants):
    """El contenido del tenant B es invisible e intocable desde el tenant A."""

    def test_alumno_de_a_no_lee_el_quiz_de_b(self):
        self._as(self.alumno_a, 'ta')
        r = self.client.get(f'/api/academy/lessons/{self.lesson_b.id}/quiz/')
        self.assertEqual(r.status_code, 404, f'fuga: leyó el quiz de otro tenant → {r.data}')

    def test_alumno_de_a_no_lista_las_preguntas_de_b(self):
        self._as(self.alumno_a, 'ta')
        r = self.client.get(f'/api/academy/quizzes/{self.quiz_b.id}/questions/')
        self.assertEqual(r.status_code, 404, f'fuga: listó preguntas de otro tenant → {r.data}')

    def test_admin_de_a_no_escribe_el_quiz_de_b(self):
        self._as(self.admin_a, 'ta')
        r = self.client.put(
            f'/api/academy/lessons/{self.lesson_b.id}/quiz/',
            {'titulo': 'SECUESTRADO POR A'}, format='json',
        )
        self.assertEqual(r.status_code, 404, 'fuga: escribió en otro tenant')
        self.quiz_b.refresh_from_db()
        self.assertEqual(self.quiz_b.titulo, 'Quiz de b')

    def test_admin_de_a_no_borra_una_pregunta_de_b(self):
        self._as(self.admin_a, 'ta')
        r = self.client.delete(
            f'/api/academy/quizzes/{self.quiz_b.id}/questions/{self.question_b.id}/'
        )
        self.assertEqual(r.status_code, 404, 'fuga: borró contenido de otro tenant')
        self.assertTrue(Question.objects.filter(pk=self.question_b.pk).exists())

    def test_el_404_no_filtra_el_titulo_del_curso_ajeno(self):
        """Antes del fix, el paywall freemium respondía ANTES que el chequeo de
        tenant y devolvía el título del curso y del módulo de la otra
        organización en el cuerpo del error."""
        self._as(self.alumno_a, 'ta')
        r = self.client.get(f'/api/academy/lessons/{self.lesson_b.id}/quiz/')
        self.assertNotIn('Curso de b', str(r.data))
        self.assertNotIn('requiere_academy_pro', str(r.data))


class QuizDentroDelPropioTenantTests(_BaseDosTenants):
    """Contracara: acotar el scope no puede romper el trabajo legítimo."""

    def setUp(self):
        super().setUp()
        self.course_a, self.lesson_a, self.quiz_a, self.question_a = self._contenido(self.t_a, 'a')

    def test_admin_edita_el_quiz_de_su_propio_tenant(self):
        self._as(self.admin_a, 'ta')
        r = self.client.put(
            f'/api/academy/lessons/{self.lesson_a.id}/quiz/',
            {'titulo': 'Quiz actualizado'}, format='json',
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.quiz_a.refresh_from_db()
        self.assertEqual(self.quiz_a.titulo, 'Quiz actualizado')

    def test_admin_borra_una_pregunta_de_su_propio_tenant(self):
        self._as(self.admin_a, 'ta')
        r = self.client.delete(
            f'/api/academy/quizzes/{self.quiz_a.id}/questions/{self.question_a.id}/'
        )
        self.assertEqual(r.status_code, 204, r.data)
        self.assertFalse(Question.objects.filter(pk=self.question_a.pk).exists())

    def test_alumno_lee_las_preguntas_de_su_propio_tenant(self):
        self._as(self.alumno_a, 'ta')
        r = self.client.get(f'/api/academy/quizzes/{self.quiz_a.id}/questions/')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(len(r.data), 1)

    def test_staff_global_de_zyfit_sigue_editando_cualquier_tenant(self):
        """`is_staff`/`is_admin` es el admin de producto de Zyfit, no el de una
        organización: conserva acceso transversal a propósito."""
        staff = User.objects.create_user(
            username='staff@zyfit.com', email='staff@zyfit.com', password='x', is_staff=True,
        )
        self.client.force_authenticate(user=staff)
        self.client.credentials(HTTP_X_TENANT_SLUG='tb')
        r = self.client.put(
            f'/api/academy/lessons/{self.lesson_b.id}/quiz/',
            {'titulo': 'Corregido por Zyfit'}, format='json',
        )
        self.assertEqual(r.status_code, 200, r.data)

    def test_instructor_del_catalogo_raiz_no_se_bloquea(self):
        """El contenido sin tenant (catálogo raíz) y las cuentas sin tenant
        siguen funcionando — `tenant_clash` solo bloquea choques concretos."""
        course, lesson, _quiz, _q = self._contenido(None, 'raiz')
        instructor = User.objects.create_user(
            username='ins@zyfit.com', email='ins@zyfit.com', password='x',
            academy_instructor=True,
        )
        course.instructor = instructor
        course.save(update_fields=['instructor'])
        self.client.force_authenticate(user=instructor)
        r = self.client.put(
            f'/api/academy/lessons/{lesson.id}/quiz/',
            {'titulo': 'Quiz raíz'}, format='json',
        )
        self.assertEqual(r.status_code, 200, r.data)
