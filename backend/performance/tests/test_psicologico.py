"""Tests del módulo PSICOLÓGICO — Fase A (monitoreo de bienestar):
cálculo del índice (servidor), alta de check-ins, un check-in por atleta/día,
validación de escala y filtro por atleta.
"""

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from performance.models import SportsCenter, CenterMembership, WellnessCheckin
from performance.wellness import compute_index, estado

User = get_user_model()


class WellnessFormulaTests(SimpleTestCase):
    def test_indice_extremos_y_medio(self):
        # Todo 7 → 100; todo 1 → 0; todo 4 → 50.
        self.assertEqual(compute_index({k: 7 for k in ('sueno', 'fatiga', 'estres', 'dolor_muscular', 'animo')}), 100)
        self.assertEqual(compute_index({k: 1 for k in ('sueno', 'fatiga', 'estres', 'dolor_muscular', 'animo')}), 0)
        self.assertEqual(compute_index({k: 4 for k in ('sueno', 'fatiga', 'estres', 'dolor_muscular', 'animo')}), 50)

    def test_estado_por_umbral(self):
        self.assertEqual(estado(85), 'ok')
        self.assertEqual(estado(60), 'duda')
        self.assertEqual(estado(40), 'alerta')


class _Base(TestCase):
    def setUp(self):
        self.director = User.objects.create_user(
            username='dir@x.com', email='dir@x.com', password='x', role='director_tecnico',
        )
        self.athlete = User.objects.create_user(
            username='atl@x.com', email='atl@x.com', password='x', role='athlete',
        )
        self.center = SportsCenter.objects.create(nombre='CD Test', slug='cd-test')
        CenterMembership.objects.create(
            center=self.center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.director)

    def url(self):
        return f'/api/performance/centers/{self.center.id}/psicologico/wellness/'


class WellnessComputeEndpointTests(_Base):
    def test_calcula_indice_sin_persistir(self):
        res = self.client.post('/api/performance/psicologico/wellness/compute/', {
            'sueno': 6, 'fatiga': 5, 'estres': 6, 'dolor_muscular': 7, 'animo': 6,
        }, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        # total 30 → (30-5)/30*100 = 83
        self.assertEqual(res.json()['indice_bienestar'], 83)
        self.assertEqual(res.json()['estado'], 'ok')
        self.assertEqual(WellnessCheckin.objects.count(), 0)

    def test_fuera_de_escala_400(self):
        res = self.client.post('/api/performance/psicologico/wellness/compute/', {
            'sueno': 9, 'fatiga': 5, 'estres': 6, 'dolor_muscular': 7, 'animo': 6,
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('sueno', res.json()['errors'])


class WellnessCheckinTests(_Base):
    def _payload(self, **over):
        base = {
            'athlete': self.athlete.id, 'fecha': '2026-06-06',
            'sueno': 6, 'fatiga': 5, 'estres': 6, 'dolor_muscular': 7, 'animo': 6,
        }
        base.update(over)
        return base

    def test_alta_calcula_indice_en_servidor(self):
        res = self.client.post(self.url(), self._payload(), format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['indice_bienestar'], 83)
        self.assertEqual(res.json()['estado'], 'ok')
        self.assertEqual(WellnessCheckin.objects.get().indice_bienestar, 83)

    def test_un_checkin_por_atleta_y_dia(self):
        self.client.post(self.url(), self._payload(), format='json')
        dup = self.client.post(self.url(), self._payload(), format='json')
        self.assertEqual(dup.status_code, 400)
        self.assertEqual(WellnessCheckin.objects.count(), 1)

    def test_validacion_escala(self):
        res = self.client.post(self.url(), self._payload(animo=0), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('animo', res.json())

    def test_lista_filtra_por_atleta(self):
        otro = User.objects.create_user(username='o@x.com', email='o@x.com', password='x', role='athlete')
        self.client.post(self.url(), self._payload(), format='json')
        self.client.post(self.url(), self._payload(athlete=otro.id), format='json')
        todos = self.client.get(self.url()).json()
        self.assertEqual(len(todos), 2)
        solo = self.client.get(f'{self.url()}?athlete={self.athlete.id}').json()
        self.assertEqual(len(solo), 1)
        self.assertEqual(solo[0]['athlete'], self.athlete.id)
