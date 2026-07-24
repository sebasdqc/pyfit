"""Tests del generador de sesiones de EQUIPO con IA (team_session_generator.py).

Mockea `_call_groq` con el mismo patrón que `ai_running/test_generate.py`
(`performance.team_session_generator` importa `_call_groq` de `ai_workout.views`,
así que se parchea el nombre en el módulo importador). Cubre: happy path, error
de formato de la IA, contexto de return-to-play (nunca confía en
CenterAthlete.estado), contexto de carga/ACWR de riesgo, y el bloqueo por falta
de fecha_inicio a nivel de vista.
"""

from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from performance.models import (
    SportsCenter, CenterMembership, CenterAthlete, InjuryReport, PerformanceMetric,
    TrainingPlan, Mesocycle, Microcycle, PlannedSession,
)
from performance.team_session_generator import (
    _return_to_play_context, _team_load_context, generate_team_session,
)

User = get_user_model()

_IA_RESPUESTA = {
    'titulo': 'Rondo + finalización',
    'objetivo_sesion': 'Circulación rápida y definición',
    'fases': [{'nombre': 'Principal', 'bloques': [
        {'nombre': 'Rondo 6v2', 'duracion_min': 15, 'descripcion': '...', 'jugadores': 'todos', 'espacio': '15x15', 'objetivo': 'circulación'},
    ]}],
    'variantes_individuales': [],
    'nota_del_cuerpo_tecnico': 'Buen ritmo hoy.',
}
_USAGE = {'tokens_in': 300, 'tokens_out': 150, 'elapsed_ms': 800}


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        self.director = User.objects.create_user(
            username='dir@x.com', email='dir@x.com', password='x', role='director_tecnico',
        )
        self.center = SportsCenter.objects.create(nombre='CD Test', slug='cd-test', disciplina='fútbol')
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
        self.meso = Mesocycle.objects.create(plan=self.plan, nombre='F1', tipo='competitivo', enfasis='Definición')
        self.micro = Microcycle.objects.create(
            mesociclo=self.meso, tipo='carga', carga_relativa=70, fecha_inicio=date(2026, 7, 6),  # lunes
        )
        self.planned = PlannedSession.objects.create(
            microciclo=self.micro, dia_semana=2, fecha=date(2026, 7, 8),
            tipo='tecnico_tactico', duracion_min=75, rpe_objetivo=6,
        )

    def sesiones_url(self, sesion_id=None, action=''):
        base = (
            f'/api/performance/centers/{self.center.id}/planificacion/{self.plan.id}'
            f'/mesociclos/{self.meso.id}/microciclos/{self.micro.id}/sesiones'
        )
        if sesion_id is None:
            return f'{base}/'
        return f'{base}/{sesion_id}/{action}'

    def _seed_carga_riesgo(self, athlete, hasta):
        """21 días de carga baja + 7 de carga alta terminando en `hasta` — mismo
        patrón que ACWRTests.test_zona_peligro, dispara riesgo_alerta=True."""
        valores = [200] * 21 + [900] * 7
        for i, v in enumerate(valores):
            d = hasta - timedelta(days=(27 - i))
            PerformanceMetric.objects.create(
                center=self.center, athlete=athlete, fecha=d, tipo='carga',
                metrica='sRPE', valor=v, unidad='UA',
            )


class ReturnToPlayContextTests(_Base):
    def test_lesion_activa_marca_aunque_centerathlete_este_activo(self):
        CenterAthlete.objects.filter(athlete=self.athlete1).update(estado=CenterAthlete.ESTADO_ACTIVO)
        InjuryReport.objects.create(
            center=self.center, athlete=self.athlete1, registrado_por=self.director,
            fecha=date(2026, 7, 1), zona='isquiotibial', estado='recuperacion',
        )
        rtp = _return_to_play_context(self.center, [self.athlete1.id, self.athlete2.id])
        ids = [r['athlete_id'] for r in rtp]
        self.assertIn(self.athlete1.id, ids)
        self.assertNotIn(self.athlete2.id, ids)

    def test_lesion_de_alta_no_marca(self):
        InjuryReport.objects.create(
            center=self.center, athlete=self.athlete1, registrado_por=self.director,
            fecha=date(2026, 6, 1), zona='tobillo', estado='alta',
        )
        rtp = _return_to_play_context(self.center, [self.athlete1.id, self.athlete2.id])
        self.assertEqual(rtp, [])


class TeamLoadContextTests(_Base):
    def test_detecta_plantel_en_riesgo(self):
        self._seed_carga_riesgo(self.athlete1, hasta=date(2026, 7, 8))
        ctx = _team_load_context(self.center, [self.athlete1.id, self.athlete2.id], date(2026, 7, 8))
        self.assertEqual(ctx['n_con_datos'], 1)  # solo athlete1 tiene ≥7 días
        self.assertEqual(ctx['atletas_riesgo_pct'], 100.0)

    def test_sin_datos_no_rompe(self):
        ctx = _team_load_context(self.center, [self.athlete1.id], date(2026, 7, 8))
        self.assertEqual(ctx['n_con_datos'], 0)
        self.assertEqual(ctx['atletas_riesgo_pct'], 0.0)


class GenerateTeamSessionServiceTests(_Base):
    @override_settings(LLM_API_KEY='test-key')
    def test_happy_path_persiste_contenido_y_tokens(self):
        with patch('performance.team_session_generator._call_groq', return_value=(_IA_RESPUESTA, _USAGE)) as m:
            out = generate_team_session(self.planned, self.director)
        m.assert_called_once()
        self.assertEqual(out.estado, PlannedSession.ESTADO_GENERADA)
        self.assertEqual(out.origen, PlannedSession.ORIGEN_IA)
        self.assertEqual(out.contenido['titulo'], 'Rondo + finalización')
        self.assertEqual(out.tokens_in, 300)
        self.assertEqual(out.tokens_out, 150)
        self.assertEqual(out.generacion_ms, 800)
        # El motor mandó los números: no los tocó la IA.
        self.assertEqual(out.tipo, 'tecnico_tactico')
        self.assertEqual(out.duracion_min, 75)

    @override_settings(LLM_API_KEY='test-key')
    def test_respuesta_sin_fases_lanza_value_error(self):
        with patch('performance.team_session_generator._call_groq', return_value=({'titulo': 'x'}, _USAGE)):
            with self.assertRaises(ValueError):
                generate_team_session(self.planned, self.director)
        self.planned.refresh_from_db()
        self.assertEqual(self.planned.estado, PlannedSession.ESTADO_BORRADOR)


class GenerateTeamSessionEndpointTests(_Base):
    @override_settings(LLM_API_KEY='test-key')
    def test_endpoint_happy_path(self):
        with patch('performance.team_session_generator._call_groq', return_value=(_IA_RESPUESTA, _USAGE)):
            res = self.client.post(self.sesiones_url(self.planned.id, 'generar/'))
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['estado'], 'generada')
        self.assertEqual(res.json()['origen'], 'ia')

    @override_settings(LLM_API_KEY='test-key')
    def test_endpoint_falla_groq_502(self):
        with patch('performance.team_session_generator._call_groq', side_effect=RuntimeError('boom')):
            res = self.client.post(self.sesiones_url(self.planned.id, 'generar/'))
        self.assertEqual(res.status_code, 502)
        self.planned.refresh_from_db()
        self.assertEqual(self.planned.estado, PlannedSession.ESTADO_BORRADOR)

    def test_endpoint_bloquea_sin_fecha_inicio(self):
        self.micro.fecha_inicio = None
        self.micro.save(update_fields=['fecha_inicio'])
        self.planned.fecha = None
        self.planned.save(update_fields=['fecha'])
        res = self.client.post(self.sesiones_url(self.planned.id, 'generar/'))
        self.assertEqual(res.status_code, 400)
