"""Tests del simulador de carga de Academy (POST /api/academy/simulador/carga/compute/)
— reutiliza performance.calculators, ver academy/views.py::simulador_carga_compute.
Hallazgo de auditoría (2026-07-09): sin throttle dedicado, cualquier
estudiante de Academy (no solo staff de Performance) caía en el backstop
genérico de 300/min."""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class SimuladorCargaThrottleTests(TestCase):
    def setUp(self):
        # GOTCHA: el cache de throttle (LocMemCache) es por proceso, no por
        # test — limpiar antes de cada uno para no heredar contadores de
        # otros archivos de test que corran antes en la misma corrida.
        cache.clear()
        self.student = User.objects.create_user(
            username='alu@x.com', email='alu@x.com', password='x',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def _compute(self):
        return self.client.post(
            '/api/academy/simulador/carga/compute/',
            {'test_slug': 'srpe', 'inputs': {'rpe': 5, 'duracion_min': 60}},
            format='json',
        )

    def test_compute_normal_funciona(self):
        res = self._compute()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['resultados']['carga_ua'], 300.0)

    def test_throttle_dedicado_corta_a_los_30_por_minuto(self):
        for _ in range(30):
            res = self._compute()
            self.assertEqual(res.status_code, 200)
        res = self._compute()
        self.assertEqual(res.status_code, 429)
