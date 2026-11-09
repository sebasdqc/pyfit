"""Diagnóstico inicial y evaluación final: validez de la medición.

Lo que se protege: que ninguna de las dos filtre la clave (si el alumno la viera
en el diagnóstico, la final solo mediría memoria de la clave), que el diagnóstico
sea ANTES de empezar y la final DESPUÉS de completar, y que se hagan una vez."""

from django.test import TestCase
from rest_framework.test import APIClient

from academy.models import CourseAssessment, LessonProgress
from academy.tests._fixtures import enroll, make_course, make_user


class _Base(TestCase):
    def setUp(self):
        self.instructor = make_user('ins@x.com', academy_instructor=True)
        self.student = make_user('alu@x.com')
        # 2 módulos x 4 preguntas; el primero gratis, el segundo de pago.
        self.course, self.preguntas, _ = make_course(self.instructor, preguntas_por_quiz=4)
        self.enrollment = enroll(self.student, self.course)
        self.client = APIClient()
        self.client.force_authenticate(self.student)
        self.base = f'/api/academy/enrollments/{self.enrollment.id}/evaluaciones/'

    def responder_todo(self, kind, correctas=True, ids=None):
        qs = self.client.get(f'{self.base}{kind}/').json()['preguntas']
        resp = {str(q['id']): ['b' if correctas else 'a'] for q in qs}
        return self.client.post(f'{self.base}{kind}/', {'respuestas': resp}, format='json')

    def completar(self):
        self.enrollment.estado = 'completada'
        self.enrollment.save()


class DiagnosticoTests(_Base):
    def test_estado_inicial(self):
        e = self.client.get(self.base).json()
        self.assertTrue(e['disponible'])
        self.assertTrue(e['puede_diagnostico'])
        self.assertFalse(e['puede_final'])
        self.assertIsNone(e['ganancia'])

    def test_las_preguntas_no_traen_clave_ni_feedback(self):
        data = self.client.get(f'{self.base}diagnostico/').json()
        texto = str(data)
        for prohibido in ('respuestas_correctas', 'feedback', 'Repasa la lección', 'Bien'):
            self.assertNotIn(prohibido, texto)

    def test_el_resultado_tampoco_revela_la_clave(self):
        res = self.responder_todo('diagnostico')
        self.assertEqual(res.status_code, 201)
        self.assertNotIn('respuestas_correctas', str(res.json()))
        self.assertNotIn('feedback', str(res.json()))

    def test_starter_solo_mide_modulos_gratuitos(self):
        # Módulo 1 (gratis) = 4 preguntas; el de pago no entra para starter.
        qs = self.client.get(f'{self.base}diagnostico/').json()['preguntas']
        self.assertEqual(len(qs), 4)
        self.assertEqual({q['enunciado'][:11] for q in qs}, {'Pregunta 1.'})

    def test_puntaje(self):
        res = self.responder_todo('diagnostico', correctas=False).json()
        self.assertEqual((res['puntaje'], res['correctas'], res['total']), (0, 0, 4))

    def test_se_hace_una_sola_vez(self):
        self.responder_todo('diagnostico')
        self.assertEqual(self.client.get(f'{self.base}diagnostico/').status_code, 409)
        # Tampoco se puede enviar un segundo POST directo.
        res = self.client.post(f'{self.base}diagnostico/', {'respuestas': {}}, format='json')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(CourseAssessment.objects.count(), 1)

    def test_no_se_puede_despues_de_empezar_el_curso(self):
        lesson = self.preguntas[0].quiz.lesson
        LessonProgress.objects.create(enrollment=self.enrollment, lesson=lesson)
        self.assertEqual(self.client.get(f'{self.base}diagnostico/').status_code, 400)
        self.assertFalse(self.client.get(self.base).json()['puede_diagnostico'])

    def test_curso_con_pocas_preguntas_no_ofrece_evaluacion(self):
        course, _, _ = make_course(self.instructor, slug='corto', modulos=1, preguntas_por_quiz=2)
        enr = enroll(self.student, course)
        e = self.client.get(f'/api/academy/enrollments/{enr.id}/evaluaciones/').json()
        self.assertFalse(e['disponible'])
        self.assertFalse(e['puede_diagnostico'])

    def test_matricula_ajena_404(self):
        self.client.force_authenticate(make_user('otro@x.com'))
        self.assertEqual(self.client.get(self.base).status_code, 404)

    def test_tipo_invalido(self):
        self.assertEqual(self.client.get(f'{self.base}sorpresa/').status_code, 400)


class FinalTests(_Base):
    def test_no_se_habilita_hasta_completar(self):
        self.assertEqual(self.client.get(f'{self.base}final/').status_code, 400)

    def test_reutiliza_las_mismas_preguntas_y_calcula_la_ganancia(self):
        diag_ids = [q['id'] for q in self.client.get(f'{self.base}diagnostico/').json()['preguntas']]
        # Diagnóstico: 1 de 4 correctas = 25 %.
        resp = {str(i): ['a'] for i in diag_ids}
        resp[str(diag_ids[0])] = ['b']
        self.client.post(f'{self.base}diagnostico/', {'respuestas': resp}, format='json')

        self.completar()
        final_ids = [q['id'] for q in self.client.get(f'{self.base}final/').json()['preguntas']]
        self.assertEqual(final_ids, diag_ids)

        # Final: 3 de 4 = 75 %. Ganancia: +50 puntos; normalizada 50/75 = 67 %.
        resp = {str(i): ['b'] for i in final_ids}
        resp[str(final_ids[0])] = ['a']
        res = self.client.post(f'{self.base}final/', {'respuestas': resp}, format='json').json()
        self.assertEqual(res['puntaje'], 75)
        self.assertEqual(res['ganancia'], {'diagnostico': 25, 'final': 75, 'puntos': 50, 'normalizada': 67})

    def test_final_sin_diagnostico_no_calcula_ganancia(self):
        self.completar()
        res = self.responder_todo('final').json()
        self.assertEqual(res['puntaje'], 100)
        self.assertIsNone(res['ganancia'])

    def test_ganancia_normalizada_con_diagnostico_perfecto_no_divide_por_cero(self):
        self.responder_todo('diagnostico')
        self.completar()
        res = self.responder_todo('final').json()
        self.assertEqual(res['ganancia']['puntos'], 0)
        self.assertIsNone(res['ganancia']['normalizada'])

    def test_final_una_sola_vez(self):
        self.completar()
        self.responder_todo('final')
        self.assertEqual(self.client.get(f'{self.base}final/').status_code, 409)
        res = self.client.post(f'{self.base}final/', {'respuestas': {}}, format='json')
        self.assertEqual(res.status_code, 409)
