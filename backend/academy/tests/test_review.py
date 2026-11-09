"""Repaso espaciado: cajas e intervalos, cola, seguridad de la clave y enganche
con el quiz. Lo que más importa: que no se pueda leer la clave de una pregunta
que no toca, ni repasar contenido de pago o de un curso ajeno."""

from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from academy import review_service
from academy.models import AcademyActivityDay, AcademySubscription, QuestionReview
from academy.tests._fixtures import enroll, make_course, make_user

HOY = date.today()


class _Base(TestCase):
    def setUp(self):
        self.instructor = make_user('ins@x.com', academy_instructor=True)
        self.student = make_user('alu@x.com')
        self.course, self.preguntas, _ = make_course(self.instructor)
        self.enrollment = enroll(self.student, self.course)
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def detalle(self, *oks):
        return [{'question_id': q.id, 'correcta': ok} for q, ok in zip(self.preguntas, oks)]

    def review(self, pregunta):
        return QuestionReview.objects.get(user=self.student, question=pregunta)

    def vencer(self, pregunta):
        """Hace que la pregunta toque hoy."""
        QuestionReview.objects.filter(user=self.student, question=pregunta).update(
            proxima_revision=HOY - timedelta(days=1),
        )


class CajasTests(_Base):
    def test_pregunta_nueva_acierto_va_a_caja_1_y_vuelve_en_3_dias(self):
        review_service.registrar_resultados_quiz(self.student, self.detalle(True), HOY)
        r = self.review(self.preguntas[0])
        self.assertEqual((r.caja, r.proxima_revision), (1, HOY + timedelta(days=3)))

    def test_pregunta_nueva_fallo_va_a_caja_0_y_vuelve_mañana(self):
        review_service.registrar_resultados_quiz(self.student, self.detalle(False), HOY)
        r = self.review(self.preguntas[0])
        self.assertEqual((r.caja, r.proxima_revision), (0, HOY + timedelta(days=1)))

    def test_repetir_el_quiz_el_mismo_dia_no_infla_el_dominio(self):
        review_service.registrar_resultados_quiz(self.student, self.detalle(True), HOY)
        review_service.registrar_resultados_quiz(self.student, self.detalle(True), HOY)
        self.assertEqual(self.review(self.preguntas[0]).caja, 1)

    def test_fallar_en_el_quiz_devuelve_a_caja_0_aunque_no_tocara(self):
        review_service.registrar_resultados_quiz(self.student, self.detalle(True), HOY)
        review_service.registrar_resultados_quiz(self.student, self.detalle(False), HOY)
        r = self.review(self.preguntas[0])
        self.assertEqual((r.caja, r.fallos), (0, 1))

    def test_acierto_cuando_ya_tocaba_sube_de_caja(self):
        review_service.registrar_resultados_quiz(self.student, self.detalle(True), HOY)
        self.vencer(self.preguntas[0])
        review_service.registrar_resultados_quiz(self.student, self.detalle(True), HOY)
        self.assertEqual(self.review(self.preguntas[0]).caja, 2)


class ColaTests(_Base):
    def test_solo_salen_las_que_tocan(self):
        review_service.registrar_resultados_quiz(self.student, self.detalle(True, True, True), HOY)
        self.assertEqual(review_service.cola(self.student, 'pro', HOY), [])
        self.vencer(self.preguntas[1])
        cola = review_service.cola(self.student, 'pro', HOY)
        self.assertEqual([c['question_id'] for c in cola], [self.preguntas[1].id])

    def test_la_cola_no_trae_la_clave_ni_el_feedback(self):
        review_service.registrar_resultados_quiz(self.student, self.detalle(False), HOY)
        self.vencer(self.preguntas[0])
        item = review_service.cola(self.student, 'pro', HOY)[0]
        self.assertFalse({'respuestas_correctas', 'feedback', 'feedback_correcta'} & set(item))
        self.assertNotIn('correcta', str(item['opciones']).lower())

    def test_starter_no_ve_preguntas_de_modulos_de_pago(self):
        pago = self.preguntas[-1]  # módulo 2 = de pago
        review_service.registrar_resultados_quiz(self.student, [{'question_id': pago.id, 'correcta': False}], HOY)
        self.vencer(pago)
        self.assertEqual(review_service.cola(self.student, 'starter', HOY), [])
        self.assertEqual(len(review_service.cola(self.student, 'pro', HOY)), 1)

    def test_curso_cancelado_no_aparece(self):
        review_service.registrar_resultados_quiz(self.student, self.detalle(False), HOY)
        self.vencer(self.preguntas[0])
        self.enrollment.estado = 'cancelada'
        self.enrollment.save()
        self.assertEqual(review_service.cola(self.student, 'pro', HOY), [])

    def test_limite_por_sesion(self):
        review_service.registrar_resultados_quiz(self.student, [
            {'question_id': q.id, 'correcta': False} for q in self.preguntas
        ], HOY - timedelta(days=5))
        self.assertEqual(len(review_service.cola(self.student, 'pro', HOY, limite=2)), 2)
        self.assertEqual(review_service.resumen(self.student, 'pro', HOY)['pendientes'], len(self.preguntas))


class ResponderTests(_Base):
    def setUp(self):
        super().setUp()
        self.q = self.preguntas[0]
        review_service.registrar_resultados_quiz(self.student, self.detalle(False), HOY)
        self.vencer(self.q)

    def responder(self, respuestas, nivel='pro'):
        return review_service.responder(self.student, nivel, self.q.id, respuestas, HOY)

    def test_acierto_sube_de_caja_y_revela_la_clave_despues(self):
        r = self.responder(['b'])
        self.assertTrue(r['correcta'])
        self.assertEqual((r['caja'], r['dias'], r['correctas'], r['feedback']), (1, 3, ['b'], 'Bien'))

    def test_fallo_vuelve_a_caja_0_con_feedback(self):
        review_service.registrar_resultados_quiz(self.student, self.detalle(True), HOY - timedelta(days=9))
        self.vencer(self.q)
        r = self.responder(['a'])
        self.assertFalse(r['correcta'])
        self.assertEqual((r['caja'], r['feedback']), (0, 'Repasa la lección'))

    def test_no_se_puede_responder_dos_veces_el_mismo_dia(self):
        self.responder(['b'])
        with self.assertRaises(review_service.ReviewError) as cm:
            self.responder(['b'])
        self.assertEqual(cm.exception.code, 'no_toca')

    def test_no_se_puede_pedir_la_clave_de_una_pregunta_que_no_toca(self):
        otra = self.preguntas[1]
        review_service.registrar_resultados_quiz(self.student, [{'question_id': otra.id, 'correcta': True}], HOY)
        with self.assertRaises(review_service.ReviewError) as cm:
            review_service.responder(self.student, 'pro', otra.id, ['a'], HOY)
        self.assertEqual(cm.exception.code, 'no_toca')

    def test_pregunta_ajena_o_inexistente(self):
        with self.assertRaises(review_service.ReviewError) as cm:
            review_service.responder(make_user('otro@x.com'), 'pro', self.q.id, ['b'], HOY)
        self.assertEqual(cm.exception.code, 'no_existe')

    def test_respuesta_vacia(self):
        with self.assertRaises(review_service.ReviewError) as cm:
            self.responder([])
        self.assertEqual(cm.exception.code, 'vacia')

    def test_modulo_de_pago_exige_pro(self):
        pago = self.preguntas[-1]
        review_service.registrar_resultados_quiz(self.student, [{'question_id': pago.id, 'correcta': False}], HOY)
        self.vencer(pago)
        with self.assertRaises(review_service.ReviewError) as cm:
            review_service.responder(self.student, 'starter', pago.id, ['b'], HOY)
        self.assertEqual(cm.exception.code, 'requiere_academy_pro')

    def test_dominada_en_la_caja_4(self):
        QuestionReview.objects.filter(user=self.student, question=self.q).update(caja=3)
        self.assertTrue(self.responder(['b'])['dominada'])


class EndpointsTests(_Base):
    def test_ciclo_completo_por_api_y_cuenta_como_racha(self):
        # Rendir el quiz por la API mete las preguntas al mazo (enganche).
        quiz = self.preguntas[0].quiz
        res = self.client.post(
            f'/api/academy/enrollments/{self.enrollment.id}/quizzes/{quiz.id}/attempt/',
            {'respuestas': {str(self.preguntas[0].id): ['a']}}, format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(QuestionReview.objects.filter(user=self.student).count(), 3)

        self.vencer(self.preguntas[0])
        data = self.client.get('/api/academy/repaso/').json()
        self.assertEqual(data['resumen']['pendientes'], 1)
        self.assertEqual(data['preguntas'][0]['question_id'], self.preguntas[0].id)
        self.assertNotIn('respuestas_correctas', str(data))

        AcademyActivityDay.objects.all().delete()
        res = self.client.post('/api/academy/repaso/responder/', {
            'question_id': self.preguntas[0].id, 'respuestas': ['b'],
        }, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.json()['correcta'])
        self.assertEqual(res.json()['resumen']['pendientes'], 0)
        self.assertTrue(AcademyActivityDay.objects.filter(user=self.student, origen='repaso').exists())

    def test_validacion_de_entrada(self):
        for body in ({'question_id': 'x', 'respuestas': ['b']}, {'question_id': 1, 'respuestas': 'b'}):
            self.assertEqual(self.client.post('/api/academy/repaso/responder/', body, format='json').status_code, 400)

    def test_pago_se_responde_con_403(self):
        pago = self.preguntas[-1]
        review_service.registrar_resultados_quiz(self.student, [{'question_id': pago.id, 'correcta': False}], HOY)
        self.vencer(pago)
        res = self.client.post('/api/academy/repaso/responder/', {
            'question_id': pago.id, 'respuestas': ['b'],
        }, format='json')
        self.assertEqual(res.status_code, 403)
        AcademySubscription.objects.create(
            user=self.student, estado='activa', fecha_renovacion=HOY + timedelta(days=10),
        )
        self.student.refresh_from_db()
        res = self.client.post('/api/academy/repaso/responder/', {
            'question_id': pago.id, 'respuestas': ['b'],
        }, format='json')
        self.assertEqual(res.status_code, 200)

    def test_requiere_sesion(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get('/api/academy/repaso/').status_code, (401, 403))
