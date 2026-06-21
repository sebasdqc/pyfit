"""Tests F2 — motor adaptativo de running (periodización, readiness, re-adaptación)."""
from datetime import date, timedelta
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase

from runs.models import RunnerProfile, RunningPlan, PlannedRunSession
from workouts.models import Competition
from ai_running import training_science_running as ts
from ai_running.adaptive_engine_running import RunningAdaptiveEngineService

User = get_user_model()
MONDAY = date(2026, 6, 22)   # lunes ISO


def _runner_profile(user):
    return RunnerProfile.objects.create(
        user=user, threshold_pace_s_km=300, fc_max=190, fc_reposo=50,
        fc_max_es_estimada=False, volumen_semanal_base_km=30,
        zonas=ts.derive_zones(threshold_pace_s_km=300, fc_max=190, fc_reposo=50,
                              fc_max_es_estimada=False),
    )


class ResolvePhaseTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='rp', password='x')
        self.rp = _runner_profile(self.user)

    def _engine(self, **plan_kwargs):
        plan = RunningPlan.objects.create(
            user=self.user, started_at=plan_kwargs.pop('started_at', MONDAY),
            week_start=MONDAY, **plan_kwargs)
        return RunningAdaptiveEngineService(self.user, None, self.rp, plan)

    def test_taper_cerca_de_la_meta(self):
        eng = self._engine(meta_tipo='10k', meta_fecha=MONDAY + timedelta(days=5))
        self.assertEqual(eng.resolve_phase(MONDAY), 'taper')

    def test_peak_a_dos_semanas(self):
        eng = self._engine(meta_tipo='10k', meta_fecha=MONDAY + timedelta(days=14))
        self.assertEqual(eng.resolve_phase(MONDAY), 'peak')

    def test_base_al_inicio(self):
        eng = self._engine(meta_tipo='10k', started_at=MONDAY,
                           meta_fecha=MONDAY + timedelta(days=84))
        self.assertEqual(eng.resolve_phase(MONDAY), 'base')

    def test_build_a_mitad(self):
        eng = self._engine(meta_tipo='10k', started_at=MONDAY - timedelta(days=56),
                           meta_fecha=MONDAY + timedelta(days=56))
        self.assertEqual(eng.resolve_phase(MONDAY), 'build')

    def test_continuo_ciclo_por_semana(self):
        eng = self._engine(meta_tipo='fitness_general', semana_actual=1)
        self.assertEqual(eng.resolve_phase(MONDAY), 'base')
        eng.plan.semana_actual = 3
        self.assertEqual(eng.resolve_phase(MONDAY), 'build')
        eng.plan.semana_actual = 4
        self.assertEqual(eng.resolve_phase(MONDAY), 'recovery')

    def test_competicion_fuerza_taper(self):
        Competition.objects.create(user=self.user, nombre='10K Ciudad',
                                   fecha=MONDAY + timedelta(days=6))
        eng = self._engine(meta_tipo='fitness_general', semana_actual=1)  # sería base
        self.assertEqual(eng.resolve_phase(MONDAY), 'taper')


class QualitySpacingTests(TestCase):
    def test_pick_quality_days_separa_del_long(self):
        chosen = RunningAdaptiveEngineService._pick_quality_days([1, 3, 5], long_day=5, n=1)
        self.assertEqual(chosen, {1})        # el más lejano al long (día 5)

    def test_pick_dos_calidades_no_adyacentes(self):
        chosen = RunningAdaptiveEngineService._pick_quality_days([0, 2, 3, 5, 6], long_day=6, n=2)
        ds = sorted(chosen)
        self.assertEqual(len(ds), 2)
        self.assertGreater(ds[1] - ds[0], 1)   # no consecutivas


class MicrocycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='mc', password='x')
        self.rp = _runner_profile(self.user)
        self.plan = RunningPlan.objects.create(
            user=self.user, meta_tipo='fitness_general', semana_actual=3,  # → build
            dias_semana=5, started_at=MONDAY, week_start=MONDAY)
        self.eng = RunningAdaptiveEngineService(self.user, None, self.rp, self.plan)

    def test_genera_semana_completa(self):
        rows = self.eng.generate_microcycle(MONDAY)
        self.assertEqual(len(rows), 5)
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.fase_actual, 'build')
        self.assertGreater(self.plan.km_objetivo_semana, 0)

    def test_long_run_en_fin_de_semana_y_calidad_espaciada(self):
        rows = self.eng.generate_microcycle(MONDAY)
        longs = [r for r in rows if r.tipo_sesion == 'long']
        self.assertEqual(len(longs), 1)
        self.assertEqual(longs[0].fecha.weekday(), 6)        # domingo (día más lejano)
        qdays = sorted(r.fecha.weekday() for r in rows if r.es_calidad)
        for a, b in zip(qdays, qdays[1:]):
            self.assertGreater(b - a, 1)                     # ninguna calidad consecutiva

    def test_no_pisa_sesion_completada(self):
        fecha = MONDAY + timedelta(days=1)
        PlannedRunSession.objects.create(
            plan=self.plan, user=self.user, fecha=fecha, tipo_sesion='tempo',
            es_calidad=True, estado='completada')
        self.eng.generate_microcycle(MONDAY)
        row = PlannedRunSession.objects.get(plan=self.plan, fecha=fecha)
        self.assertEqual(row.estado, 'completada')           # intacta


class ReadinessTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='rd', password='x')
        self.rp = _runner_profile(self.user)
        self.plan = RunningPlan.objects.create(
            user=self.user, started_at=MONDAY, week_start=MONDAY)
        self.eng = RunningAdaptiveEngineService(self.user, None, self.rp, self.plan)

    def test_sin_runs_acwr_no_suficiente(self):
        self.eng.checkin = None
        r = self.eng.compute_readiness(MONDAY)
        self.assertFalse(r['suficiente'])
        self.assertEqual(r['zona_acwr'], 'Acumulando datos')
        self.assertFalse(r['has_checkin'])

    def test_checkin_malo_baja_score(self):
        self.eng.checkin = SimpleNamespace(estado_animo=1, calidad_sueno=5.0, hrv=40,
                                           dolor_hoy='', foco_entrenamiento=[])
        r = self.eng.compute_readiness(MONDAY)
        self.assertEqual(r['score'], 25)        # 70 −20(ánimo) −15(sueño<6) −10(hrv<45)
        self.assertTrue(r['hrv_low'])
        self.assertTrue(r['sueno_bad'])

    def test_detecta_dolor_de_carga(self):
        self.eng.checkin = SimpleNamespace(estado_animo=3, calidad_sueno=8.0, hrv=None,
                                           dolor_hoy='Me molesta la rodilla derecha',
                                           foco_entrenamiento=[])
        r = self.eng.compute_readiness(MONDAY)
        self.assertEqual(r['dolor'], 'rodilla')

    def test_rest_checkin(self):
        self.eng.checkin = SimpleNamespace(estado_animo=3, calidad_sueno=8.0, hrv=None,
                                           dolor_hoy='', foco_entrenamiento=['descanso'])
        self.assertTrue(self.eng.compute_readiness(MONDAY)['rest_checkin'])


class AdaptTodayTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='ad', password='x')
        self.rp = _runner_profile(self.user)
        self.plan = RunningPlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY)
        self.eng = RunningAdaptiveEngineService(self.user, None, self.rp, self.plan)

    def _planned(self, tipo='vo2'):
        spec = ts.SESSION_TYPES[tipo]
        return PlannedRunSession(plan=self.plan, user=self.user, fecha=MONDAY,
                                 tipo_sesion=tipo, es_calidad=spec['es_calidad'],
                                 zona_principal=spec['zona'] or '')

    def _base_signals(self, **over):
        s = {'score': 75, 'suficiente': False, 'zona_acwr': 'Acumulando datos',
             'acwr_ewma': None, 'riesgo_alto': False, 'infracarga': False,
             'has_checkin': True, 'animo': 4, 'sueno_bad': False, 'hrv_low': False,
             'dolor': None, 'rest_checkin': False, 'flags': []}
        s.update(over)
        return s

    def test_dolor_degrada_calidad_a_easy(self):
        out = self.eng.adapt_today(self._planned('vo2'), self._base_signals(dolor='rodilla'))
        self.assertEqual(out['tipo_sesion'], 'easy')
        self.assertEqual(out['ajuste_aplicado'], 'dolor_a_easy')

    def test_dolor_en_easy_va_a_descanso(self):
        out = self.eng.adapt_today(self._planned('easy'), self._base_signals(dolor='tobillo'))
        self.assertEqual(out['tipo_sesion'], 'rest')
        self.assertEqual(out['ajuste_aplicado'], 'dolor_a_descanso')

    def test_acwr_alto_degrada_calidad(self):
        out = self.eng.adapt_today(self._planned('tempo'),
                                   self._base_signals(suficiente=True, riesgo_alto=True))
        self.assertEqual(out['tipo_sesion'], 'easy')
        self.assertEqual(out['ajuste_aplicado'], 'acwr_alto_degradado')
        self.assertLess(out['km_factor'], 1.0)

    def test_sin_checkin_neutro(self):
        out = self.eng.adapt_today(self._planned('vo2'), self._base_signals(has_checkin=False))
        self.assertEqual(out['ajuste_aplicado'], 'sin_checkin_neutro')
        self.assertEqual(out['tipo_sesion'], 'vo2')        # no intensifica ni degrada

    def test_readiness_baja_suaviza_calidad(self):
        out = self.eng.adapt_today(self._planned('vo2'), self._base_signals(score=30))
        self.assertEqual(out['tipo_sesion'], 'easy')
        self.assertEqual(out['ajuste_aplicado'], 'readiness_baja_suaviza')

    def test_infracarga_permite_progresion(self):
        out = self.eng.adapt_today(self._planned('easy'),
                                   self._base_signals(suficiente=True, infracarga=True, score=80))
        self.assertEqual(out['ajuste_aplicado'], 'infracarga_ok')
        self.assertGreater(out['km_factor'], 1.0)

    def test_todo_verde_confirma(self):
        out = self.eng.adapt_today(self._planned('tempo'), self._base_signals())
        self.assertEqual(out['ajuste_aplicado'], 'confirmada')
        self.assertEqual(out['estado'], 'planificada')
