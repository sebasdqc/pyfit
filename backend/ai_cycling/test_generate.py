"""Tests de generación de sesiones de ciclismo + endpoints de plan/microciclo.
Espejo de ai_running/test_generate.py, con dos diferencias deliberadas:
  · sin test de 'indoor' — ciclismo no oculta nada en rodillo (ver
    ai_cycling/views.py, docstring del módulo).
  · sin tests de recomputar baseline al completar — complete_planned de
    ciclismo NO recalcula baseline todavía (no hay nivel "historial" en
    estimate_threshold, ver training_science_cycling.py); se prueba que NO
    lo toca, honesto con lo que está construido."""
from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from cycling.models import RideSession, CyclistProfile, RidePlan, PlannedRide
from ai_cycling import training_science_cycling as ts

User = get_user_model()

_NARRATION = {
    'titulo': 'Sweet Spot de control',
    'objetivo_sesion': 'Trabajar el umbral con mínima fatiga',
    'nota_del_coach': 'Hoy estás fresco; sostén la potencia objetivo.',
    'cues': ['suelto', 'comfortably hard', 'baja cadencia si te fatigas'],
    'decisions_log': [{'icon': '🚴', 'text': 'sweet spot en fase base'}],
}
_USAGE = {'tokens_in': 120, 'tokens_out': 80, 'elapsed_ms': 900}


class GenerateRideTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username='cyclist_gen', password='x')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        CyclistProfile.objects.create(
            user=self.user, fthr_bpm=165, ftp_w=250, fc_max=190, fc_reposo=50,
            fc_max_es_estimada=False, confianza='media', volumen_semanal_base_horas=6,
            zonas=ts.derive_zones(fthr_bpm=165, ftp_w=250, fc_max=190, fc_reposo=50,
                                  fc_max_es_estimada=False),
        )
        today = date.today()
        wd = today.weekday()
        prefs = sorted({wd, (wd + 2) % 7, (wd + 4) % 7})
        self.plan = RidePlan.objects.create(
            user=self.user, meta_tipo='fitness_general', dias_semana=len(prefs),
            dias_preferidos=prefs, started_at=today,
            week_start=today - timedelta(days=wd), semana_actual=1, is_active=True)

    # ── Plan / microciclo ──
    def test_crear_plan_genera_microciclo(self):
        res = self.client.post('/api/cycling/plan/',
                               {'meta_tipo': 'gran_fondo', 'dias_semana': 4}, format='json')
        self.assertEqual(res.status_code, 201)
        plan = RidePlan.objects.get(user=self.user, is_active=True)
        self.assertEqual(plan.meta_tipo, 'gran_fondo')
        self.assertGreater(plan.sessions.count(), 0)

    def test_microcycle_endpoint(self):
        self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        res = self.client.get('/api/cycling/plan/microcycle/')
        self.assertEqual(res.status_code, 200)
        self.assertGreater(len(res.data['sesiones']), 0)

    # ── Generación ──
    @override_settings(LLM_API_KEY='')
    def test_generate_fallback_sin_groq(self):
        res = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('respuesta_ia', res.data)
        self.assertTrue(res.data['respuesta_ia']['fases'])
        self.assertIn(res.data['estado'], ('planificada', 'ajustada'))

    @override_settings(LLM_API_KEY='test-key')
    def test_generate_con_llm_redacta_pero_motor_manda_numeros(self):
        with patch('ai_cycling.views._call_groq', return_value=(_NARRATION, _USAGE)) as m:
            res = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        m.assert_called_once()
        self.assertEqual(res.data['respuesta_ia']['titulo'], 'Sweet Spot de control')
        planned = PlannedRide.objects.get(pk=res.data['id'])
        self.assertEqual(planned.tokens_in, 120)
        self.assertIsNotNone(planned.rpe_target)

    @override_settings(LLM_API_KEY='')
    def test_respuesta_sin_distancia_total(self):
        # Ciclismo se prescribe en tiempo — a propósito no hay distancia_total_km.
        res = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertNotIn('distancia_total_km', res.data['respuesta_ia'])
        self.assertIn('duracion_total_min', res.data['respuesta_ia'])

    @override_settings(LLM_API_KEY='')
    def test_sin_potenciometro_fc_presente_potencia_ausente(self):
        # Perfil solo con FTHR (sin ftp_w) — el caso más común del producto.
        self.user2 = User.objects.create_user(username='sin_potencia', password='x',
                                              email='sin_potencia@test.com')
        client2 = APIClient()
        client2.force_authenticate(self.user2)
        CyclistProfile.objects.create(
            user=self.user2, fthr_bpm=160, fc_max=185, fc_reposo=55,
            fc_max_es_estimada=False,
            zonas=ts.derive_zones(fthr_bpm=160, fc_max=185, fc_reposo=55,
                                  fc_max_es_estimada=False),
        )
        today = date.today()
        wd = today.weekday()
        RidePlan.objects.create(
            user=self.user2, meta_tipo='fitness_general', dias_semana=3,
            dias_preferidos=[wd], started_at=today,
            week_start=today - timedelta(days=wd), semana_actual=1, is_active=True)
        res = client2.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        for fase in res.data['respuesta_ia']['fases']:
            for seg in fase['segmentos']:
                if seg['fc_objetivo'] is not None:
                    self.assertIsNone(seg['potencia_objetivo'])

    @override_settings(LLM_API_KEY='')
    def test_today_devuelve_la_planificada(self):
        gen = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        res = self.client.get('/api/cycling/sessions/today/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['id'], gen.data['id'])

    @override_settings(LLM_API_KEY='')
    def test_completar_vincula_ridesession(self):
        gen = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        now = timezone.now()
        ride = RideSession.objects.create(
            user=self.user, started_at=now, ended_at=now + timedelta(hours=1),
            status='completed', session_type='free', total_duration_s=3600)
        res = self.client.post(f"/api/cycling/sessions/{gen.data['id']}/complete/",
                               {'ride_session_id': ride.id}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['estado'], 'completada')
        ride.refresh_from_db()
        self.assertEqual(ride.session_type, 'planned')

    @override_settings(LLM_API_KEY='')
    def test_completar_sin_ride_session_id_igual_completa(self):
        # ride_session_id es opcional — completar sin vincular ejecución real
        # debe seguir funcionando (a diferencia de running, acá no hay CRUD
        # de RideSession todavía para crear una desde el cliente).
        gen = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        res = self.client.post(f"/api/cycling/sessions/{gen.data['id']}/complete/",
                               {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['estado'], 'completada')

    @override_settings(LLM_API_KEY='test-key')
    def test_generate_idempotente_no_rellama_llm(self):
        with patch('ai_cycling.views._call_groq', return_value=(_NARRATION, _USAGE)) as m:
            r1 = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
            r2 = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertEqual(m.call_count, 1)
        self.assertEqual(r1.data['id'], r2.data['id'])

    @override_settings(LLM_API_KEY='')
    def test_completar_no_recalcula_baseline_todavia(self):
        # Documenta el alcance actual: sin nivel "historial" en
        # estimate_threshold, complete_planned NO toca el CyclistProfile.
        cp = CyclistProfile.objects.get(user=self.user)
        cp.fuente_baseline = 'cold_start'
        cp.fthr_bpm = None
        cp.save()
        gen = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        now = timezone.now()
        ride = RideSession.objects.create(
            user=self.user, started_at=now, ended_at=now + timedelta(hours=1),
            status='completed', session_type='free', total_duration_s=3600,
            avg_heart_rate=160, rpe_real=7)
        self.client.post(f"/api/cycling/sessions/{gen.data['id']}/complete/",
                         {'ride_session_id': ride.id}, format='json')
        cp.refresh_from_db()
        self.assertEqual(cp.fuente_baseline, 'cold_start')     # sin cambios
        self.assertIsNone(cp.fthr_bpm)                          # sin cambios

    @override_settings(LLM_API_KEY='')
    def test_dolor_de_carga_degrada_a_descanso_o_easy(self):
        from checkins.models import DailyCheckin
        DailyCheckin.objects.create(
            user=self.user, fecha=date.today(), estado_animo=3, calidad_sueno=8,
            duracion_disponible=45, dolor_hoy='Molestia en el sillín')
        res = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        planned = PlannedRide.objects.get(pk=res.data['id']) if 'id' in res.data else None
        if planned:
            self.assertIn(planned.ajuste_aplicado, ('dolor_a_easy', 'dolor_a_descanso'))


class BaselineEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username='baseline_cyc', password='x')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_estimate_con_test_de_20min_completo(self):
        res = self.client.post('/api/cycling/baseline/estimate/',
                               {'declared_test': {'avg_power_w': 260, 'avg_hr_20min': 165}},
                               format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['ftp_w'], round(260 * 0.95))
        self.assertEqual(res.data['fthr_bpm'], 165)
        self.assertEqual(res.data['confianza'], 'alta')

    def test_estimate_sin_potenciometro_solo_fc(self):
        res = self.client.post('/api/cycling/baseline/estimate/',
                               {'declared_test': {'avg_hr_20min': 158}}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data['ftp_w'])
        self.assertEqual(res.data['fthr_bpm'], 158)
        self.assertEqual(res.data['confianza'], 'media')

    def test_estimate_sin_body_cold_start(self):
        res = self.client.post('/api/cycling/baseline/estimate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['fuente_baseline'], 'cold_start')

    def test_profile_get_crea_cold_start(self):
        res = self.client.get('/api/cycling/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['fuente_baseline'], 'cold_start')

    def test_profile_patch_fc_max_marca_manual(self):
        self.client.get('/api/cycling/profile/')   # crea el perfil
        res = self.client.patch('/api/cycling/profile/', {'fc_max': 195}, format='json')
        self.assertEqual(res.status_code, 200)
        cp = CyclistProfile.objects.get(user=self.user)
        self.assertFalse(cp.fc_max_es_estimada)

    def test_start_test_devuelve_protocolo(self):
        res = self.client.post('/api/cycling/baseline/test/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['protocolo'], 'test_20_30min')
        self.assertIn('descripcion', res.data)
