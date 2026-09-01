"""Tests de generación de sesiones de ciclismo + endpoints de plan/microciclo.
Espejo de ai_running/test_generate.py, con una diferencia deliberada: sin
test de 'indoor' — ciclismo no oculta nada en rodillo (ver ai_cycling/views.py,
docstring del módulo)."""
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
        if 'id' in res.data:
            planned = PlannedRide.objects.get(pk=res.data['id'])
            if planned.tipo_sesion != 'rest':
                self.assertTrue(planned.narracion_fallback)

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
        self.assertFalse(planned.narracion_fallback)

    @override_settings(LLM_API_KEY='test-key')
    def test_narracion_fallback_true_cuando_groq_falla(self):
        with patch('ai_cycling.views._call_groq', side_effect=RuntimeError('timeout')):
            res = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        if 'id' in res.data:
            planned = PlannedRide.objects.get(pk=res.data['id'])
            if planned.tipo_sesion != 'rest':
                self.assertTrue(planned.narracion_fallback)

    def test_get_or_create_active_plan_es_idempotente(self):
        """Bug corregido: antes era filter+create suelto — dos llamadas que
        ven 'sin plan activo' a la vez podían chocar contra el
        UniqueConstraint con un IntegrityError de 500 sin manejar."""
        from ai_cycling.views import _get_or_create_active_plan
        hoy = date.today()
        p1 = _get_or_create_active_plan(self.user, hoy)
        p2 = _get_or_create_active_plan(self.user, hoy)
        self.assertEqual(p1.pk, p2.pk)
        self.assertEqual(RidePlan.objects.filter(user=self.user, is_active=True).count(), 1)

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
    def test_completar_sin_ride_session_id_rechaza(self):
        """Bug corregido: antes se podía marcar 'completada' sin ninguna
        salida real vinculada — mismo fix que ai_running.complete_planned."""
        gen = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        res = self.client.post(f"/api/cycling/sessions/{gen.data['id']}/complete/",
                               {}, format='json')
        self.assertEqual(res.status_code, 400)
        planned = PlannedRide.objects.get(pk=gen.data['id'])
        self.assertNotEqual(planned.estado, 'completada')

    @override_settings(LLM_API_KEY='')
    def test_completar_con_ride_activa_rechaza(self):
        """Bug corregido: antes se podía vincular una RideSession que ni
        siquiera había terminado (status='active'/'paused')."""
        gen = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        ride = RideSession.objects.create(
            user=self.user, started_at=timezone.now(), status='active', session_type='free')
        res = self.client.post(f"/api/cycling/sessions/{gen.data['id']}/complete/",
                               {'ride_session_id': ride.id}, format='json')
        self.assertEqual(res.status_code, 400)
        planned = PlannedRide.objects.get(pk=gen.data['id'])
        self.assertNotEqual(planned.estado, 'completada')

    @override_settings(LLM_API_KEY='test-key')
    def test_generate_idempotente_no_rellama_llm(self):
        with patch('ai_cycling.views._call_groq', return_value=(_NARRATION, _USAGE)) as m:
            r1 = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
            r2 = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertEqual(m.call_count, 1)
        self.assertEqual(r1.data['id'], r2.data['id'])

    @override_settings(LLM_API_KEY='')
    def test_completar_recalcula_baseline_desde_historial(self):
        """Bug corregido: complete_planned no recalculaba baseline — ahora sí,
        vía el nivel 'historial' de estimate_threshold (ver
        training_science_cycling.py). Una salida larga (≥40min) y sentida
        como dura (RPE≥7) califica como proxy de un test de 20 min."""
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
        self.assertEqual(cp.fuente_baseline, 'historial')
        self.assertEqual(cp.fthr_bpm, 160)

    @override_settings(LLM_API_KEY='')
    def test_completar_no_pisa_baseline_declarado(self):
        """Una fuente de mayor confianza (test declarado) no se pisa con un
        recálculo automático desde historial."""
        cp = CyclistProfile.objects.get(user=self.user)
        cp.fuente_baseline = 'test_20min'
        cp.confianza = 'alta'
        cp.fthr_bpm = 175
        cp.save()
        gen = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        now = timezone.now()
        ride = RideSession.objects.create(
            user=self.user, started_at=now, ended_at=now + timedelta(hours=1),
            status='completed', session_type='free', total_duration_s=3600,
            avg_heart_rate=140, rpe_real=7)
        self.client.post(f"/api/cycling/sessions/{gen.data['id']}/complete/",
                         {'ride_session_id': ride.id}, format='json')
        cp.refresh_from_db()
        self.assertEqual(cp.fuente_baseline, 'test_20min')   # no pisado
        self.assertEqual(cp.fthr_bpm, 175)

    @override_settings(LLM_API_KEY='test-key')
    def test_checkin_reenviado_con_dolor_degrada_sesion_ya_generada(self):
        """Bug corregido: la idempotencia dejaba 'atascada' una sesión de
        calidad ya generada aunque el atleta reenviara el check-in con dolor
        DESPUÉS. Ahora se re-chequea la señal de seguridad (sin gastar LLM)
        y se degrada si corresponde — mismo fix que ai_running."""
        from checkins.models import DailyCheckin
        checkin = DailyCheckin.objects.create(
            user=self.user, fecha=date.today(), estado_animo=3, calidad_sueno=8,
            duracion_disponible=45, dolor_hoy='')
        with patch('ai_cycling.views._call_groq', return_value=(_NARRATION, _USAGE)):
            res1 = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertEqual(res1.status_code, 200)
        planned = PlannedRide.objects.get(pk=res1.data['id'])
        tipo_original = planned.tipo_sesion
        self.assertNotEqual(tipo_original, 'rest')

        checkin.dolor_hoy = 'Me duele la rodilla'
        checkin.save()
        DailyCheckin.objects.filter(pk=checkin.pk).update(
            updated_at=timezone.now() + timedelta(seconds=5))

        with patch('ai_cycling.views._call_groq') as m:
            res2 = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        m.assert_not_called()   # el downgrade de seguridad no gasta una generación de LLM
        self.assertEqual(res2.status_code, 200)
        planned.refresh_from_db()
        self.assertIn(planned.ajuste_aplicado, ('dolor_a_easy', 'dolor_a_descanso'))

    @override_settings(LLM_API_KEY='test-key')
    def test_checkin_sin_cambios_no_reevalua(self):
        """Reabrir la pantalla sin que el check-in haya cambiado sigue sin
        tocar la sesión ya generada — no reevalúa en cada request."""
        with patch('ai_cycling.views._call_groq', return_value=(_NARRATION, _USAGE)):
            res1 = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        planned1 = PlannedRide.objects.get(pk=res1.data['id'])
        ajuste1, tipo1 = planned1.ajuste_aplicado, planned1.tipo_sesion
        res2 = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        planned1.refresh_from_db()
        self.assertEqual(planned1.ajuste_aplicado, ajuste1)
        self.assertEqual(planned1.tipo_sesion, tipo1)
        self.assertEqual(res1.data['id'], res2.data['id'])

    @override_settings(LLM_API_KEY='')
    def test_fase_se_recalcula_en_vivo_no_usa_fase_actual_desactualizada(self):
        """Bug corregido: plan.fase_actual solo se refresca al regenerar el
        microciclo (1x/semana, ver ensure_current_week) — una competencia
        agregada a mitad de semana debe forzar 'taper' HOY sin esperar al
        próximo lunes. Se observa vía reps: nivel intermedio en 'build'/'peak'
        usa el TOPE del template (8 para vo2max); en cualquier otra fase
        (incl. 'taper') usa el punto medio (6) — ver endurance.science.pick_reps."""
        from workouts.models import Competition
        self.plan.fase_actual = 'build'
        self.plan.save()
        Competition.objects.create(
            user=self.user, nombre='Gran Fondo Andes', fecha=date.today() + timedelta(days=5))
        PlannedRide.objects.create(
            plan=self.plan, user=self.user, fecha=date.today(), tipo_sesion='vo2max',
            es_calidad=True, zona_principal='Z5', estado='planificada')
        res = self.client.post('/api/cycling/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        principal = next(f for f in res.data['respuesta_ia']['fases'] if f['nombre'] == 'Principal')
        reps = principal['segmentos'][0]['repeticiones']
        self.assertEqual(reps, 6)   # taper (resolve_phase) → punto medio, NO 8 (tope de build)

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
