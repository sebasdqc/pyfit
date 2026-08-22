"""Tests del motor adaptativo de ciclismo — foco en el WIRING propio de acá,
no en la lógica de readiness/periodización/espaciado (esa ya está probada a
fondo en endurance/test_*.py; re-testearla acá sería redundante). Espejo
reducido de ai_running/test_engine.py."""
from datetime import date, timedelta
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase

from cycling.models import RideSession, CyclistProfile, RidePlan, PlannedRide
from workouts.models import Competition
from ai_cycling import training_science_cycling as ts
from ai_cycling.adaptive_engine_cycling import CyclingAdaptiveEngineService

User = get_user_model()
MONDAY = date(2026, 6, 22)


def _cyclist_profile(user):
    return CyclistProfile.objects.create(
        user=user, fthr_bpm=165, fc_max=190, fc_reposo=50,
        fc_max_es_estimada=False, volumen_semanal_base_horas=6,
        zonas=ts.derive_zones(fthr_bpm=165, fc_max=190, fc_reposo=50,
                              fc_max_es_estimada=False),
    )


class ResolvePhaseWiringTests(TestCase):
    def test_delega_en_endurance_periodization(self):
        user = User.objects.create_user(username='rp_cyc', password='x')
        cp = _cyclist_profile(user)
        plan = RidePlan.objects.create(user=user, started_at=MONDAY, week_start=MONDAY,
                                       meta_tipo='crono', meta_fecha=MONDAY + timedelta(days=5))
        eng = CyclingAdaptiveEngineService(user, None, cp, plan)
        self.assertEqual(eng.resolve_phase(MONDAY), 'taper')   # <=1 semana → taper

    def test_competencia_cercana_fuerza_taper(self):
        user = User.objects.create_user(username='comp_cyc', password='x')
        cp = _cyclist_profile(user)
        Competition.objects.create(user=user, nombre='Gran Fondo', fecha=MONDAY + timedelta(days=3))
        plan = RidePlan.objects.create(user=user, started_at=MONDAY, week_start=MONDAY,
                                       meta_tipo='fitness_general')
        eng = CyclingAdaptiveEngineService(user, None, cp, plan)
        self.assertEqual(eng.resolve_phase(MONDAY), 'taper')


class QualitySpacingWiringTests(TestCase):
    def test_delega_en_endurance_science(self):
        chosen = CyclingAdaptiveEngineService._pick_quality_days([1, 3, 5], anchor_day=5, n=1)
        self.assertEqual(chosen, {1})


class MicrocycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='mc_cyc', password='x')
        self.cp = _cyclist_profile(self.user)
        self.plan = RidePlan.objects.create(
            user=self.user, meta_tipo='fitness_general', semana_actual=3,  # → build
            dias_semana=5, started_at=MONDAY, week_start=MONDAY)
        self.eng = CyclingAdaptiveEngineService(self.user, None, self.cp, self.plan)

    def test_genera_semana_completa(self):
        rows = self.eng.generate_microcycle(MONDAY)
        self.assertEqual(len(rows), 5)
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.fase_actual, 'build')
        self.assertGreater(self.plan.horas_objetivo_semana, 0)

    def test_long_ride_en_fin_de_semana_y_calidad_espaciada(self):
        rows = self.eng.generate_microcycle(MONDAY)
        larga = [r for r in rows if r.tipo_sesion == 'long_ride']
        self.assertEqual(len(larga), 1)
        self.assertEqual(larga[0].fecha.weekday(), 6)          # domingo
        qdays = sorted(r.fecha.weekday() for r in rows if r.es_calidad)
        for a, b in zip(qdays, qdays[1:]):
            self.assertGreater(b - a, 1)

    def test_calidad_de_build_usa_sweet_spot_y_threshold(self):
        # A diferencia de running (tempo/vo2), la fase build de ciclismo entra
        # sweet_spot y threshold — verifica que el motor usa el catálogo correcto.
        rows = self.eng.generate_microcycle(MONDAY)
        tipos_calidad = {r.tipo_sesion for r in rows if r.es_calidad}
        self.assertTrue(tipos_calidad <= {'sweet_spot', 'threshold'})

    def test_no_pisa_sesion_completada(self):
        fecha = MONDAY + timedelta(days=1)
        PlannedRide.objects.create(
            plan=self.plan, user=self.user, fecha=fecha, tipo_sesion='threshold',
            es_calidad=True, estado='completada')
        self.eng.generate_microcycle(MONDAY)
        row = PlannedRide.objects.get(plan=self.plan, fecha=fecha)
        self.assertEqual(row.estado, 'completada')

    def test_realized_hours_last_week(self):
        from datetime import datetime, time
        from django.utils import timezone as tz
        when = tz.make_aware(datetime.combine(MONDAY - timedelta(days=3), time(9, 0)))
        RideSession.objects.create(
            user=self.user, started_at=when, ended_at=when + timedelta(hours=2),
            status='completed', session_type='free', total_duration_s=7200)
        self.assertEqual(self.eng._realized_hours_last_week(MONDAY), 2.0)

    def test_no_progresa_sobre_volumen_planificado_obsoleto(self):
        self.plan.horas_objetivo_semana = 20
        self.plan.save()
        self.eng.generate_microcycle(MONDAY)
        self.plan.refresh_from_db()
        self.assertLess(self.plan.horas_objetivo_semana, 20)

    def test_cap_de_progresion_es_el_de_ciclismo_no_el_de_running(self):
        from datetime import datetime, time
        from django.utils import timezone as tz
        # 5h realizadas la semana previa; el cap de ciclismo (15%) debe permitir
        # más que el de running (10%) si el motor decide progresar.
        when = tz.make_aware(datetime.combine(MONDAY - timedelta(days=3), time(9, 0)))
        RideSession.objects.create(
            user=self.user, started_at=when, ended_at=when + timedelta(hours=5),
            status='completed', session_type='free', total_duration_s=18000)
        self.eng.generate_microcycle(MONDAY)
        self.plan.refresh_from_db()
        self.assertLessEqual(self.plan.horas_objetivo_semana, round(5.0 * ts.CYCLING_PROGRESSION_CAP, 1))


class ReadinessWiringTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='rd_cyc', password='x')
        self.cp = _cyclist_profile(self.user)
        self.plan = RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY)
        self.eng = CyclingAdaptiveEngineService(self.user, None, self.cp, self.plan)

    def test_detecta_dolor_propio_de_ciclismo(self):
        # 'sillin' está en RIDE_LOAD_PAIN_KEYWORDS pero NO en las de running —
        # confirma que el motor usa SU propio catálogo, no el de correr.
        self.eng.checkin = SimpleNamespace(
            estado_animo=3, calidad_sueno=8.0, hrv=None,
            dolor_hoy='Molestia en el sillín', foco_entrenamiento=[])
        r = self.eng.compute_readiness(MONDAY)
        self.assertEqual(r['dolor'], 'sillin')

    def test_sin_datos_ok(self):
        self.eng.checkin = None
        r = self.eng.compute_readiness(MONDAY)
        self.assertFalse(r['suficiente'])
        self.assertFalse(r['has_checkin'])


class AdaptTodayWiringTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='ad_cyc', password='x')
        self.cp = _cyclist_profile(self.user)
        self.plan = RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY)
        self.eng = CyclingAdaptiveEngineService(self.user, None, self.cp, self.plan)

    def _planned(self, tipo='threshold'):
        spec = ts.SESSION_TYPES[tipo]
        return PlannedRide(plan=self.plan, user=self.user, fecha=MONDAY,
                           tipo_sesion=tipo, es_calidad=spec['es_calidad'],
                           zona_principal=spec['zona'] or '')

    def _base_signals(self, **over):
        s = {'score': 75, 'suficiente': False, 'zona_acwr': 'Acumulando datos',
             'acwr_ewma': None, 'riesgo_alto': False, 'infracarga': False,
             'has_checkin': True, 'animo': 4, 'sueno_bad': False, 'hrv_low': False,
             'dolor': None, 'rest_checkin': False, 'flags': []}
        s.update(over)
        return s

    def test_expone_horas_factor_no_km_factor(self):
        # El contrato propio de ciclismo: 'horas_factor', NO 'km_factor'.
        out = self.eng.adapt_today(self._planned('threshold'),
                                   self._base_signals(dolor='rodilla'))
        self.assertIn('horas_factor', out)
        self.assertNotIn('km_factor', out)
        self.assertEqual(out['tipo_sesion'], 'easy')
        self.assertEqual(out['ajuste_aplicado'], 'dolor_a_easy')

    def test_todo_verde_confirma(self):
        out = self.eng.adapt_today(self._planned('sweet_spot'), self._base_signals())
        self.assertEqual(out['ajuste_aplicado'], 'confirmada')
        self.assertEqual(out['horas_factor'], 1.0)
