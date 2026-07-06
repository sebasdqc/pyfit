"""Tests del motor asesor de planificación (planning_advisor.py) — SOLO LECTURA.

Compara carga/bienestar real del plantel contra lo planeado y sugiere cambios;
nunca escribe en la base de datos. Reusa los umbrales ya existentes en
calculators/constants.py y wellness.py — los escenarios reproducen esos mismos
patrones (p. ej. el de ACWRTests.test_zona_peligro) para no inventar valores.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import (
    SportsCenter, CenterMembership, CenterAthlete, PerformanceMetric,
    TrainingPlan, Mesocycle, Microcycle, WellnessCheckin,
)
from performance.planning_advisor import suggest_for_microciclo

User = get_user_model()


class _Base(TestCase):
    def setUp(self):
        self.director = User.objects.create_user(
            username='dir@x.com', email='dir@x.com', password='x', role='director_tecnico',
        )
        self.center = SportsCenter.objects.create(nombre='CD Test', slug='cd-test')
        CenterMembership.objects.create(
            center=self.center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        self.athlete1 = User.objects.create_user(username='a1@x.com', email='a1@x.com', password='x', role='athlete')
        self.athlete2 = User.objects.create_user(username='a2@x.com', email='a2@x.com', password='x', role='athlete')
        CenterAthlete.objects.create(center=self.center, athlete=self.athlete1, registrado_por=self.director)
        CenterAthlete.objects.create(center=self.center, athlete=self.athlete2, registrado_por=self.director)

        self.client = APIClient()
        self.client.force_authenticate(self.director)

        self.plan = TrainingPlan.objects.create(center=self.center, nombre='Temporada', fecha_inicio='2026-07-01')
        self.meso = Mesocycle.objects.create(plan=self.plan, nombre='F1', tipo='competitivo', carga_objetivo='media')
        self.micro = Microcycle.objects.create(
            mesociclo=self.meso, tipo='carga', carga_relativa=70, fecha_inicio=date(2026, 7, 6),  # lunes
        )
        self.hasta = self.micro.fecha_inicio + timedelta(days=6)

    def _seed_carga(self, athlete, valores, hasta=None):
        """Crea un registro sRPE por día de `valores` (oldest→newest) terminando
        en `hasta` (por defecto, el último día de la semana del microciclo)."""
        hasta = hasta or self.hasta
        for i, v in enumerate(valores):
            d = hasta - timedelta(days=(len(valores) - 1 - i))
            PerformanceMetric.objects.create(
                center=self.center, athlete=athlete, fecha=d, tipo='carga',
                metrica='sRPE', valor=v, unidad='UA',
            )

    def _seed_wellness(self, athlete, valor, fecha=None):
        fecha = fecha or self.micro.fecha_inicio
        WellnessCheckin.objects.create(
            center=self.center, athlete=athlete, registrado_por=athlete, fecha=fecha,
            sueno=valor, fatiga=valor, estres=valor, dolor_muscular=valor, animo=valor,
        )

    def advisor_url(self):
        return (
            f'/api/performance/centers/{self.center.id}/planificacion/{self.plan.id}'
            f'/mesociclos/{self.meso.id}/microciclos/{self.micro.id}/advisor/'
        )


class DisponibilidadTests(_Base):
    def test_sin_fecha_inicio_no_disponible(self):
        self.micro.fecha_inicio = None
        self.micro.save(update_fields=['fecha_inicio'])
        out = suggest_for_microciclo(self.micro)
        self.assertFalse(out['disponible'])

    def test_sin_datos_no_disponible(self):
        out = suggest_for_microciclo(self.micro)
        self.assertFalse(out['disponible'])


class ReglaACWRTests(_Base):
    def test_plantel_en_riesgo_sugiere_recuperacion(self):
        # Mismo patrón que ACWRTests.test_zona_peligro: 21 días bajos + pico de 7.
        self._seed_carga(self.athlete1, [200] * 21 + [900] * 7)
        out = suggest_for_microciclo(self.micro)
        self.assertTrue(out['disponible'])
        campos = {s['campo']: s for s in out['sugerencias']}
        self.assertIn('tipo', campos)
        self.assertEqual(campos['tipo']['valor_sugerido'], 'recuperacion')
        self.assertEqual(campos['tipo']['nivel'], 'microciclo')

    def test_plantel_sano_no_sugiere_nada(self):
        # Carga plana (SD=0 → sin alerta de monotonía) y ACWR≈1 (zona óptima).
        self._seed_carga(self.athlete1, [500] * 7)
        self._seed_carga(self.athlete2, [500] * 7)
        out = suggest_for_microciclo(self.micro)
        self.assertTrue(out['disponible'])
        self.assertEqual(out['sugerencias'], [])

    def test_nunca_escribe_en_bd(self):
        self._seed_carga(self.athlete1, [200] * 21 + [900] * 7)
        suggest_for_microciclo(self.micro)
        fresco = Microcycle.objects.get(pk=self.micro.pk)
        self.assertEqual(fresco.tipo, 'carga')
        self.assertEqual(fresco.carga_relativa, 70)


class ReglaMonotoniaTests(_Base):
    def test_monotonia_alta_sugiere_bajar_carga_relativa(self):
        # Variabilidad baja en los últimos 7 días → monotonía > 2.0 (mismo
        # patrón que CargaSemanalTests.test_monotonia_alerta).
        self._seed_carga(self.athlete1, [500, 510, 505, 495, 500, 505, 500])
        self.micro.carga_relativa = 90
        self.micro.save(update_fields=['carga_relativa'])
        out = suggest_for_microciclo(self.micro)
        campos = {s['campo']: s for s in out['sugerencias']}
        self.assertIn('carga_relativa', campos)
        self.assertEqual(campos['carga_relativa']['valor_sugerido'], 70)  # 90 - 20


class ReglaBienestarTests(_Base):
    def test_bienestar_bajo_y_fase_pico_sugiere_bajar_a_media(self):
        self.meso.carga_objetivo = 'pico'
        self.meso.save(update_fields=['carga_objetivo'])
        self._seed_wellness(self.athlete1, 2)  # índice ≈ 17/100
        self._seed_wellness(self.athlete2, 2)
        out = suggest_for_microciclo(self.micro)
        self.assertTrue(out['disponible'])
        campos = {s['campo']: s for s in out['sugerencias']}
        self.assertIn('carga_objetivo', campos)
        self.assertEqual(campos['carga_objetivo']['nivel'], 'mesociclo')
        self.assertEqual(campos['carga_objetivo']['valor_sugerido'], 'media')


class AdvisorEndpointTests(_Base):
    def test_endpoint_responde(self):
        self._seed_carga(self.athlete1, [200] * 21 + [900] * 7)
        res = self.client.get(self.advisor_url())
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.json()['disponible'])
        self.assertGreaterEqual(len(res.json()['sugerencias']), 1)

    def test_endpoint_gating_fisio_403(self):
        fisio = User.objects.create_user(username='f@x.com', email='f@x.com', password='x', role='athlete')
        CenterMembership.objects.create(center=self.center, user=fisio, rol=CenterMembership.ROL_FISIO)
        self.client.force_authenticate(fisio)
        res = self.client.get(self.advisor_url())
        self.assertEqual(res.status_code, 403)
