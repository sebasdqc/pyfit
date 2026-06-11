"""Tests del módulo CARGA INTERNA (sRPE → ACWR) — endpoint sobre PerformanceMetric.

Cubren registro de sRPE, cálculo server-side de ACWR/monotonía por atleta, vista de
equipo, borrado, gating por módulo Rendimiento y validación. Usa BD (TestCase).
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import SportsCenter, CenterMembership, CenterAthlete, PerformanceMetric

User = get_user_model()


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
        CenterAthlete.objects.create(
            center=self.center, athlete=self.athlete, registrado_por=self.director,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.director)

    def url(self):
        return f'/api/performance/centers/{self.center.id}/carga/'


class CargaRegistroTests(_Base):
    def test_post_registra_srpe(self):
        res = self.client.post(self.url(), {
            'athlete': self.athlete.id, 'fecha': '2026-06-10', 'rpe': 7, 'duracion_min': 90,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['carga_ua'], 630.0)  # 7 × 90
        m = PerformanceMetric.objects.get()
        self.assertEqual(m.tipo, 'carga')
        self.assertEqual(float(m.valor), 630.0)

    def test_rpe_fuera_de_rango_400(self):
        res = self.client.post(self.url(), {
            'athlete': self.athlete.id, 'rpe': 12, 'duracion_min': 90,
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(PerformanceMetric.objects.count(), 0)

    def test_duracion_invalida_400(self):
        res = self.client.post(self.url(), {
            'athlete': self.athlete.id, 'rpe': 7, 'duracion_min': 0,
        }, format='json')
        self.assertEqual(res.status_code, 400)


class CargaCalculoTests(_Base):
    def _seed_week(self, dias=10, carga=600):
        """Crea `dias` registros diarios consecutivos terminando hoy."""
        hoy = date.today()
        for i in range(dias):
            PerformanceMetric.objects.create(
                center=self.center, athlete=self.athlete, fecha=hoy - timedelta(days=i),
                tipo='carga', metrica='sRPE', valor=carga, unidad='UA',
            )

    def test_vista_atleta_calcula_acwr(self):
        self._seed_week(dias=10)
        res = self.client.get(f'{self.url()}?athlete={self.athlete.id}')
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body['athlete'], self.athlete.id)
        met = body['metricas']
        self.assertTrue(met['suficiente'])
        self.assertIsNotNone(met['acwr_ewma'])
        # Carga constante → ACWR ≈ 1.0 (aguda ≈ crónica).
        self.assertAlmostEqual(met['acwr_ra'], 1.0, places=1)
        self.assertEqual(len(body['registros']), 10)

    def test_pocos_dias_no_calcula_acwr(self):
        self._seed_week(dias=3)
        res = self.client.get(f'{self.url()}?athlete={self.athlete.id}')
        met = res.json()['metricas']
        self.assertFalse(met['suficiente'])
        self.assertIsNone(met['acwr_ewma'])

    def test_vista_equipo_una_fila_por_atleta(self):
        self._seed_week(dias=8)
        res = self.client.get(self.url())
        self.assertEqual(res.status_code, 200)
        filas = res.json()
        self.assertEqual(len(filas), 1)
        self.assertEqual(filas[0]['athlete'], self.athlete.id)
        self.assertIn('zona', filas[0])

    def test_delete_registro(self):
        self._seed_week(dias=1)
        rec = PerformanceMetric.objects.first()
        res = self.client.delete(f'{self.url()}{rec.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertEqual(PerformanceMetric.objects.filter(tipo='carga').count(), 0)


class CargaGatingTests(_Base):
    def test_atleta_sin_panel_403(self):
        self.client.force_authenticate(self.athlete)
        res = self.client.get(self.url())
        self.assertEqual(res.status_code, 403)

    def test_staff_sin_rendimiento_403(self):
        # Un fisioterapeuta no tiene el módulo rendimiento por defecto.
        fisio = User.objects.create_user(username='f@x.com', email='f@x.com', password='x', role='athlete')
        CenterMembership.objects.create(center=self.center, user=fisio, rol=CenterMembership.ROL_FISIO)
        self.client.force_authenticate(fisio)
        res = self.client.get(self.url())
        self.assertEqual(res.status_code, 403)
