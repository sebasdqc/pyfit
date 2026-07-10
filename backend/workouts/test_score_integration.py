"""Integración Zyfit Score v2 <-> workouts.

Verifica que:
  - session_feedback dispara compute_and_store_score y crea un ScoreSnapshot,
    sin afectar los 4 efectos secundarios existentes (racha/logros/adaptation/cycle).
  - Un motor de score roto (monkeypatch) NO rompe la respuesta 200/201 ni hace
    rollback de los otros efectos secundarios (prueba el try/except interno
    de compute_and_store_score + el try/except externo de session_feedback).
  - stats_dashboard nunca rompe para un usuario sin ScoreSnapshot todavía, y
    refleja el snapshot más reciente cuando existe.
"""
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from scores import service as score_service
from scores.models import ScoreSnapshot
from users.models import Profile, UserLocation
from workouts.models import Session

User = get_user_model()


def make_user(email='score-int@example.com'):
    user = User.objects.create_user(email=email, username=email, password='testpass123')
    Profile.objects.get_or_create(user=user, defaults={'nombre': 'Test'})
    return user


def make_location(user):
    return UserLocation.objects.create(user=user, nombre='Casa', tipo='casa', implementos=[])


class SessionFeedbackTriggersScoreTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.loc = make_location(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _post_feedback(self, session_id, **kwargs):
        body = {'rpe_real': 7.0, 'cumplimiento': 85, 'rating': 4}
        body.update(kwargs)
        return self.client.post(f'/api/sessions/{session_id}/feedback/', body, format='json')

    def test_feedback_crea_snapshot(self):
        s = Session.objects.create(
            user=self.user, fecha=date.today(), duracion_planificada=60,
            rpe_target=Decimal('7.0'), location=self.loc,
        )
        response = self._post_feedback(s.id)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ScoreSnapshot.objects.filter(user=self.user).count(), 1)

    def test_reenviar_feedback_crea_snapshot_adicional(self):
        # session_feedback es idempotente-llamable (edita el feedback existente)
        # pero el motor de score es append-only: cada llamada agrega una fila.
        s = Session.objects.create(
            user=self.user, fecha=date.today(), duracion_planificada=60,
            rpe_target=Decimal('7.0'), location=self.loc,
        )
        self._post_feedback(s.id, cumplimiento=70)
        self._post_feedback(s.id, cumplimiento=95)
        self.assertEqual(ScoreSnapshot.objects.filter(user=self.user).count(), 2)

    def test_motor_de_score_roto_no_rompe_la_respuesta_ni_los_otros_efectos(self):
        s = Session.objects.create(
            user=self.user, fecha=date.today(), duracion_planificada=60,
            rpe_target=Decimal('7.0'), location=self.loc,
        )
        # Se rompe la implementación INTERNA (no el wrapper compute_and_store_score,
        # que es justamente el que tiene el try/except protector) — así se prueba
        # que ese try/except interno evita que un bug de cálculo real haga
        # rollback de racha/logros/adaptation-profile dentro del mismo atomic().
        original = score_service._compute_and_store_score_inner
        try:
            def _roto(*args, **kwargs):
                raise RuntimeError('boom')
            score_service._compute_and_store_score_inner = _roto
            response = self._post_feedback(s.id)
            self.assertEqual(response.status_code, 201)
        finally:
            score_service._compute_and_store_score_inner = original
        # racha sí se debe haber actualizado (efecto secundario previo en la misma
        # transacción) — no debe haberse revertido por el fallo del motor de score.
        profile = Profile.objects.get(user=self.user)
        self.assertEqual(profile.racha_actual, 1)
        # y no debe haber quedado ningún ScoreSnapshot a medias / corrupto
        self.assertEqual(ScoreSnapshot.objects.filter(user=self.user).count(), 0)


class StatsDashboardScoreTests(TestCase):
    def setUp(self):
        self.user = make_user('dashboard-score@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_usuario_sin_snapshot_no_rompe(self):
        response = self.client.get('/api/stats/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['zyfit_score']['has_data'])
        self.assertIsNone(response.data['zyfit_score']['valor'])

    def test_refleja_snapshot_mas_reciente(self):
        ScoreSnapshot.objects.create(
            user=self.user, fecha_corte=date.today() - timedelta(days=1),
            nivel_p1=40.0, score_final=40.0,
            estado_cold_start={'stage': 'provisional', 'dias_historial': 10},
        )
        ScoreSnapshot.objects.create(
            user=self.user, fecha_corte=date.today(),
            nivel_p1=65.0, score_final=65.0,
            estado_cold_start={'stage': 'provisional', 'dias_historial': 11},
        )
        response = self.client.get('/api/stats/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['zyfit_score']['has_data'])
        self.assertEqual(response.data['zyfit_score']['valor'], 65)


class StatsZyfitScoreEndpointTests(TestCase):
    """El círculo de Estadísticas (reemplaza al Radar) consume este endpoint."""

    def setUp(self):
        self.user = make_user('stats-zyfit-score@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_usuario_sin_snapshot(self):
        response = self.client.get('/api/stats/zyfit-score/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['has_data'])
        self.assertIsNone(response.data['valor'])
        self.assertIsNone(response.data['componentes'])
        self.assertIsNotNone(response.data['descripcion'])

    def test_incluye_desglose_de_componentes(self):
        ScoreSnapshot.objects.create(
            user=self.user, fecha_corte=date.today(),
            nivel_p1=72.0, score_final=72.0, momentum=3.5,
            componentes_json={
                'consistencia': {'valor': 80.0, 'peso_aplicado': 0.3, 'activo': True},
                'rendimiento': {'valor': None, 'peso_aplicado': None, 'activo': False, 'meta': {}},
                'adherencia': {'valor': 65.0, 'peso_aplicado': 0.2, 'activo': True},
                'recuperacion': {'valor': None, 'peso_aplicado': None, 'activo': False},
                'recencia': {'valor': 100.0, 'peso_aplicado': 0.1, 'activo': True},
            },
            estado_cold_start={'stage': 'provisional', 'dias_historial': 15},
        )
        response = self.client.get('/api/stats/zyfit-score/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['has_data'])
        self.assertEqual(response.data['valor'], 72)
        self.assertEqual(response.data['momentum'], 3.5)
        componentes = response.data['componentes']
        self.assertEqual(componentes['consistencia']['valor'], 80.0)
        self.assertTrue(componentes['consistencia']['activo'])
        self.assertIsNone(componentes['rendimiento']['valor'])
        self.assertFalse(componentes['rendimiento']['activo'])
