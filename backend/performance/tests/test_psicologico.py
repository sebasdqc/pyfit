"""Tests del módulo PSICOLÓGICO — Fase A (monitoreo de bienestar):
cálculo del índice (servidor), alta de check-ins, un check-in por atleta/día,
validación de escala y filtro por atleta.
"""

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from performance.models import SportsCenter, CenterMembership, WellnessCheckin, PsychAssessment
from performance.wellness import compute_index, estado
from performance.psicometria import InstrumentError, score

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


# ── Fase B: cuestionarios validados (instrumentos) ───────────────────────────

class InstrumentScoringTests(SimpleTestCase):
    def test_poms_tmd(self):
        # TMD = (10+8+6+9+5) − 30 + 100 = 108
        out = score('poms', {'tension': 10, 'depresion': 8, 'colera': 6, 'vigor': 30, 'fatiga': 9, 'confusion': 5})
        self.assertEqual(out['resultados']['indice'], 108.0)

    def test_abq_burnout_medio(self):
        out = score('abq', {'agotamiento': 4, 'devaluacion': 3, 'reduccion_logro': 2})
        self.assertEqual(out['resultados']['indice'], 3.0)
        self.assertEqual(out['resultados']['interpretacion'], 'Riesgo de burnout')

    def test_subescala_fuera_de_rango(self):
        with self.assertRaises(InstrumentError):
            score('abq', {'agotamiento': 9, 'devaluacion': 3, 'reduccion_logro': 2})

    def test_instrumento_desconocido(self):
        with self.assertRaises(InstrumentError):
            score('no-existe', {})


class InstrumentEndpointTests(_Base):
    def test_catalogo(self):
        res = self.client.get('/api/performance/psicologico/instruments/')
        self.assertEqual(res.status_code, 200)
        slugs = {i['slug'] for i in res.json()}
        self.assertEqual(slugs, {'poms', 'restq-sport', 'csai-2', 'abq'})

    def test_score_sin_persistir(self):
        res = self.client.post('/api/performance/psicologico/instruments/score/', {
            'instrument': 'restq-sport', 'subescalas': {'estres': 2, 'recuperacion': 5},
        }, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['resultados']['indice'], 3.0)
        self.assertEqual(PsychAssessment.objects.count(), 0)

    def test_alta_via_instrumento_calcula_en_servidor(self):
        res = self.client.post(self.module_url(), {
            'instrument': 'abq', 'athlete': self.athlete.id, 'fecha': '2026-06-06',
            'subescalas': {'agotamiento': 4, 'devaluacion': 3, 'reduccion_logro': 2},
            'resultados': {'indice': 99999},  # debe ser ignorado
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        obj = PsychAssessment.objects.get()
        self.assertEqual(obj.instrument, 'abq')
        self.assertEqual(obj.resultados['indice'], 3.0)
        self.assertEqual(float(obj.puntuacion), 3.0)

    def test_alta_manual(self):
        res = self.client.post(self.module_url(), {
            'athlete': self.athlete.id, 'fecha': '2026-06-06', 'tipo': 'motivacion', 'puntuacion': '7.5',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        obj = PsychAssessment.objects.get()
        self.assertEqual(obj.instrument, '')
        self.assertEqual(float(obj.puntuacion), 7.5)

    def module_url(self):
        return f'/api/performance/centers/{self.center.id}/psicologico/'
