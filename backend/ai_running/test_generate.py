"""Tests F3 — generación de sesiones de running + endpoints de plan/microciclo."""
from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from runs.models import RunSession, RunnerProfile, RunningPlan, PlannedRunSession
from ai_running import training_science_running as ts

User = get_user_model()

_NARRATION = {
    'titulo': 'Tempo de control',
    'objetivo_sesion': 'Trabajar el umbral',
    'nota_del_coach': 'Hoy estás fresco; sostén el ritmo objetivo.',
    'cues': ['suelto', 'comfortably hard', 'baja pulsaciones'],
    'decisions_log': [{'icon': '🫀', 'text': 'umbral en fase base'}],
}
_USAGE = {'tokens_in': 120, 'tokens_out': 80, 'elapsed_ms': 900}


class GenerateRunTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username='runner_gen', password='x')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        RunnerProfile.objects.create(
            user=self.user, threshold_pace_s_km=300, fc_max=190, fc_reposo=50,
            fc_max_es_estimada=False, confianza='media', volumen_semanal_base_km=30,
            zonas=ts.derive_zones(threshold_pace_s_km=300, fc_max=190, fc_reposo=50,
                                  fc_max_es_estimada=False),
        )
        # Plan activo cuyos días de entrenamiento INCLUYEN hoy (test determinístico).
        today = date.today()
        wd = today.weekday()
        prefs = sorted({wd, (wd + 2) % 7, (wd + 4) % 7})
        self.plan = RunningPlan.objects.create(
            user=self.user, meta_tipo='fitness_general', dias_semana=len(prefs),
            dias_preferidos=prefs, started_at=today,
            week_start=today - timedelta(days=wd), semana_actual=1, is_active=True)

    # ── Plan / microciclo ──
    def test_crear_plan_genera_microciclo(self):
        res = self.client.post('/api/running/plan/',
                               {'meta_tipo': '10k', 'dias_semana': 4}, format='json')
        self.assertEqual(res.status_code, 201)
        plan = RunningPlan.objects.get(user=self.user, is_active=True)
        self.assertEqual(plan.meta_tipo, '10k')
        self.assertGreater(plan.sessions.count(), 0)

    def test_microcycle_endpoint(self):
        self.client.post('/api/running/sessions/generate/', {}, format='json')
        res = self.client.get('/api/running/plan/microcycle/')
        self.assertEqual(res.status_code, 200)
        self.assertGreater(len(res.data['sesiones']), 0)

    # ── Generación ──
    @override_settings(GROQ_API_KEY='')
    def test_generate_fallback_sin_groq(self):
        res = self.client.post('/api/running/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('respuesta_ia', res.data)
        self.assertTrue(res.data['respuesta_ia']['fases'])          # estructura presente
        self.assertIn(res.data['estado'], ('planificada', 'ajustada'))

    @override_settings(GROQ_API_KEY='test-key')
    def test_generate_con_llm_redacta_pero_motor_manda_numeros(self):
        with patch('ai_running.views._call_groq', return_value=(_NARRATION, _USAGE)) as m:
            res = self.client.post('/api/running/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        m.assert_called_once()
        self.assertEqual(res.data['respuesta_ia']['titulo'], 'Tempo de control')
        planned = PlannedRunSession.objects.get(pk=res.data['id'])
        self.assertEqual(planned.tokens_in, 120)                    # métricas del motor
        # Los números (rpe_target) los fija el motor, no el LLM.
        self.assertIsNotNone(planned.rpe_target)

    @override_settings(GROQ_API_KEY='')
    def test_indoor_vacia_los_ritmos(self):
        res = self.client.post('/api/running/sessions/generate/', {'indoor': True}, format='json')
        self.assertEqual(res.status_code, 200)
        for fase in res.data['respuesta_ia']['fases']:
            for seg in fase['segmentos']:
                self.assertIsNone(seg['pace_objetivo'])             # sin GPS, sin ritmo
                self.assertIsNotNone(seg['fc_objetivo'])            # FC sí (hay sensor)

    @override_settings(GROQ_API_KEY='')
    def test_today_devuelve_la_planificada(self):
        gen = self.client.post('/api/running/sessions/generate/', {}, format='json')
        res = self.client.get('/api/running/sessions/today/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['id'], gen.data['id'])

    @override_settings(GROQ_API_KEY='')
    def test_completar_vincula_runsession(self):
        gen = self.client.post('/api/running/sessions/generate/', {}, format='json')
        now = timezone.now()
        run = RunSession.objects.create(
            user=self.user, started_at=now, ended_at=now + timedelta(minutes=40),
            status='completed', session_type='free', total_distance_m=8000,
            total_duration_s=2400)
        res = self.client.post(f"/api/running/sessions/{gen.data['id']}/complete/",
                               {'run_session_id': run.id}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['estado'], 'completada')
        run.refresh_from_db()
        self.assertEqual(run.session_type, 'planned')

    @override_settings(GROQ_API_KEY='test-key')
    def test_generate_idempotente_no_rellama_llm(self):
        # Reabrir la pantalla el mismo día devuelve la sesión ya generada (sin re-LLM).
        with patch('ai_running.views._call_groq', return_value=(_NARRATION, _USAGE)) as m:
            r1 = self.client.post('/api/running/sessions/generate/', {}, format='json')
            r2 = self.client.post('/api/running/sessions/generate/', {}, format='json')
        self.assertEqual(m.call_count, 1)
        self.assertEqual(r1.data['id'], r2.data['id'])

    @override_settings(GROQ_API_KEY='')
    def test_completar_no_pisa_baseline_declarado(self):
        rp = RunnerProfile.objects.get(user=self.user)
        rp.fuente_baseline = 'declarado'
        rp.confianza = 'alta'
        rp.threshold_pace_s_km = 250
        rp.save()
        gen = self.client.post('/api/running/sessions/generate/', {}, format='json')
        now = timezone.now()
        run = RunSession.objects.create(
            user=self.user, started_at=now, ended_at=now + timedelta(minutes=40),
            status='completed', session_type='free', total_distance_m=8000,
            total_duration_s=2400, best_pace_s_per_km=240, rpe_real=7)
        self.client.post(f"/api/running/sessions/{gen.data['id']}/complete/",
                         {'run_session_id': run.id}, format='json')
        rp.refresh_from_db()
        self.assertEqual(rp.fuente_baseline, 'declarado')      # no pisado
        self.assertEqual(rp.threshold_pace_s_km, 250)

    @override_settings(GROQ_API_KEY='')
    def test_completar_recalcula_baseline_desde_historial(self):
        rp = RunnerProfile.objects.get(user=self.user)
        rp.fuente_baseline = 'cold_start'
        rp.threshold_pace_s_km = None
        rp.save()
        gen = self.client.post('/api/running/sessions/generate/', {}, format='json')
        now = timezone.now()
        run = RunSession.objects.create(
            user=self.user, started_at=now - timedelta(days=1),
            ended_at=now - timedelta(days=1) + timedelta(minutes=25),
            status='completed', session_type='free', total_distance_m=5000,
            total_duration_s=1500, best_pace_s_per_km=250, rpe_real=7)
        self.client.post(f"/api/running/sessions/{gen.data['id']}/complete/",
                         {'run_session_id': run.id}, format='json')
        rp.refresh_from_db()
        self.assertEqual(rp.fuente_baseline, 'historial')      # recomputado
        self.assertIsNotNone(rp.threshold_pace_s_km)

    @override_settings(GROQ_API_KEY='')
    def test_resumen_expone_objetivo_de_la_planificada(self):
        # Tras vincular la RunSession, el detalle de /api/runs/<id>/ expone el objetivo
        # de la sesión inteligente (para la adherencia en el resumen).
        gen = self.client.post('/api/running/sessions/generate/', {}, format='json')
        now = timezone.now()
        run = RunSession.objects.create(
            user=self.user, started_at=now, ended_at=now + timedelta(minutes=40),
            status='completed', session_type='free', total_distance_m=8000, total_duration_s=2400)
        self.client.post(f"/api/running/sessions/{gen.data['id']}/complete/",
                         {'run_session_id': run.id}, format='json')
        detail = self.client.get(f'/api/runs/{run.id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertIsNotNone(detail.data['planned'])
        self.assertEqual(detail.data['planned']['zona_principal'], gen.data['zona_principal'])

    @override_settings(GROQ_API_KEY='')
    def test_runsession_libre_no_trae_planned(self):
        now = timezone.now()
        run = RunSession.objects.create(
            user=self.user, started_at=now, ended_at=now + timedelta(minutes=30),
            status='completed', session_type='free', total_distance_m=5000, total_duration_s=1800)
        detail = self.client.get(f'/api/runs/{run.id}/')
        self.assertIsNone(detail.data['planned'])

    @override_settings(GROQ_API_KEY='')
    def test_dolor_de_carga_degrada_a_descanso_o_easy(self):
        from checkins.models import DailyCheckin
        DailyCheckin.objects.create(
            user=self.user, fecha=date.today(), estado_animo=3, calidad_sueno=8,
            duracion_disponible=45, dolor_hoy='Molestia en la rodilla')
        res = self.client.post('/api/running/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        planned = PlannedRunSession.objects.get(pk=res.data['id']) if 'id' in res.data else None
        if planned:
            self.assertIn(planned.ajuste_aplicado, ('dolor_a_easy', 'dolor_a_descanso'))
