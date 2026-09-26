"""Contrato del briefing diario: verdad, cobertura, permisos y aislamiento."""

import json
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import (
    CenterAthlete,
    CenterMembership,
    InjuryReport,
    PerformanceMetric,
    SportsCenter,
    WellnessCheckin,
)


User = get_user_model()


class DailyBriefTests(TestCase):
    day = date(2026, 9, 26)

    def setUp(self):
        self.director = User.objects.create_user(
            username='director@x.com', email='director@x.com', password='x',
            role='director_tecnico',
        )
        self.athlete = User.objects.create_user(
            username='athlete@x.com', email='athlete@x.com', password='x',
            role='athlete', first_name='Alex Real',
        )
        self.center = SportsCenter.objects.create(
            nombre='Centro Real', slug='centro-real', timezone='America/Caracas',
            daily_loop_enabled=True,
        )
        CenterMembership.objects.create(
            center=self.center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        self.link = CenterAthlete.objects.create(
            center=self.center, athlete=self.athlete, registrado_por=self.director,
            posicion='Defensa', grupo='Primera',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.director)
        self.url = f'/api/performance/centers/{self.center.id}/today/?date={self.day}'

    def _seed_load(self, value=500):
        for offset in range(8):
            PerformanceMetric.objects.create(
                center=self.center,
                athlete=self.athlete,
                fecha=self.day - timedelta(days=offset),
                tipo='carga',
                metrica='sRPE',
                valor=value,
                unidad='UA',
            )

    def _wellness(self, value=7):
        return WellnessCheckin.objects.create(
            center=self.center,
            athlete=self.athlete,
            fecha=self.day,
            sueno=value,
            fatiga=value,
            estres=value,
            dolor_muscular=value,
            animo=value,
        )

    def test_senales_reales_y_cobertura_completa(self):
        self._seed_load()
        self._wellness()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(body['timezone'], 'America/Caracas')
        self.assertTrue(body['daily_loop_enabled'])
        self.assertEqual(body['coverage']['status'], 'complete')
        self.assertEqual(body['coverage']['wellness_pct'], 100)
        self.assertEqual(body['coverage']['load_pct'], 100)
        self.assertEqual(body['availability']['ready'], 1)
        self.assertEqual(body['athletes'][0]['wellness']['index'], 100)
        self.assertIsNotNone(body['athletes'][0]['load']['acwr_ewma'])
        self.assertNotIn('demo', json.dumps(body).lower())
        self.assertNotIn('simulad', json.dumps(body).lower())

    def test_sin_mediciones_es_desconocido_no_disponible_inventado(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['coverage']['status'], 'empty')
        self.assertEqual(body['availability']['unknown'], 1)
        self.assertEqual(body['availability']['ready'], 0)
        self.assertIsNone(body['athletes'][0]['wellness'])
        self.assertIsNone(body['athletes'][0]['load'])

    def test_lesion_activa_tiene_precedencia(self):
        self._seed_load()
        self._wellness()
        InjuryReport.objects.create(
            center=self.center,
            athlete=self.athlete,
            fecha=self.day,
            zona='Rodilla derecha',
            estado='activa',
        )

        athlete = self.client.get(self.url).json()['athletes'][0]

        self.assertEqual(athlete['status'], 'unavailable')
        self.assertEqual(athlete['reasons'][0]['code'], 'active_injury')
        self.assertIn('Rodilla derecha', athlete['reasons'][0]['label'])

    def test_staff_ve_estado_operativo_sin_detalle_restringido(self):
        self._wellness(value=1)
        preparador = User.objects.create_user(
            username='prep@x.com', email='prep@x.com', password='x', role='athlete',
        )
        CenterMembership.objects.create(
            center=self.center,
            user=preparador,
            rol=CenterMembership.ROL_PREPARADOR,
        )
        self.client.force_authenticate(preparador)

        body = self.client.get(self.url).json()
        athlete = body['athletes'][0]

        self.assertEqual(athlete['status'], 'review')
        self.assertIsNone(athlete['wellness'])
        self.assertFalse(body['permissions']['wellness_detail'])
        self.assertEqual(athlete['reasons'][0]['code'], 'restricted_wellness')
        self.assertNotIn('0/100', athlete['reasons'][0]['label'])

    def test_centro_ajeno_responde_404(self):
        outsider = User.objects.create_user(
            username='outsider@x.com', email='outsider@x.com', password='x',
            role='director_tecnico',
        )
        other = SportsCenter.objects.create(nombre='Otro', slug='otro-brief')
        CenterMembership.objects.create(
            center=other, user=outsider, rol=CenterMembership.ROL_DIRECTOR,
        )
        self.client.force_authenticate(outsider)

        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_fecha_invalida_responde_400(self):
        url = f'/api/performance/centers/{self.center.id}/today/?date=26-09-2026'
        response = self.client.get(url)

        self.assertEqual(response.status_code, 400)
        self.assertIn('date', response.json())
