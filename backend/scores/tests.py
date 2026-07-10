"""Tests unitarios del motor de Zyfit Score v2 (scores/service.py).

Cubre, contra fixtures a mano (no contra las fórmulas viejas de workouts):
  - resolve_perfil_atleta (Profile.goal, fallback a Profile.objetivo, allowlist estricto)
  - Consistencia (cold-start proporcional, ventana completa)
  - Recencia (unión Session + RunSession, decaimiento)
  - Adherencia (lectura estricta: sesión sin feedback = 0 en el promedio)
  - Recuperación (dual-escala de calidad_sueno, umbral de activación)
  - Rendimiento fuerza (tiers de confianza RPE, exclusión >12 reps, cap ±20%,
    piso neutral salud_general, fallback de volumen)
  - Redistribución de pesos
  - Ancla P0 congelada + guardia de comparabilidad
  - compute_and_store_score end-to-end (incluida su propia protección ante fallos)
"""
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from checkins.models import DailyCheckin
from runs.models import RunSession
from users.models import Profile
from workouts.models import Exercise, Session, SessionExercise, SessionFeedback

from . import service
from .models import ScoreConfig, ScoreSnapshot

User = get_user_model()


def make_user(email='atleta@example.com', dias_semana=3, goal='', objetivo=''):
    user = User.objects.create_user(email=email, username=email, password='testpass123')
    Profile.objects.filter(user=user).delete()
    Profile.objects.create(user=user, nombre='Atleta', dias_semana=dias_semana, goal=goal, objetivo=objetivo)
    return user


def make_session(user, fecha, feedback=True, cumplimiento=80):
    s = Session.objects.create(user=user, fecha=fecha, duracion_planificada=60, rpe_target=Decimal('7.0'))
    if feedback:
        SessionFeedback.objects.create(session=s, rpe_real=Decimal('7.0'), cumplimiento=cumplimiento, rating=4)
    return s


def make_run(user, started_at, status='completed', rpe_real=None, avg_pace=300, n_points=3):
    ended_at = started_at + timedelta(minutes=30) if status == 'completed' else None
    run = RunSession.objects.create(
        user=user, started_at=started_at, ended_at=ended_at, status=status,
        avg_pace_s_per_km=avg_pace, rpe_real=rpe_real,
    )
    for i in range(n_points):
        run.points.create(lat=0.0 + i * 0.001, lng=0.0, accuracy_m=5.0, timestamp=started_at + timedelta(minutes=i))
    return run


def make_exercise(nombre='Sentadilla'):
    return Exercise.objects.create(nombre=nombre, patron_movimiento='sentadilla')


def make_session_exercise(session, exercise, series_log, orden=1):
    return SessionExercise.objects.create(
        session=session, orden=orden, nombre=exercise.nombre if exercise else 'Ejercicio libre',
        series=len(series_log), repeticiones='8-10', descanso_segundos=90,
        series_log=series_log, exercise=exercise,
    )


class ResolvePerfilAtletaTests(TestCase):
    def test_goal_valido_rendimiento(self):
        user = make_user(goal='potencia')
        self.assertEqual(service.resolve_perfil_atleta(user.profile), ScoreSnapshot.PERFIL_RENDIMIENTO)

    def test_goal_valido_salud(self):
        user = make_user(goal='salud')
        self.assertEqual(service.resolve_perfil_atleta(user.profile), ScoreSnapshot.PERFIL_SALUD_GENERAL)

    def test_fallback_a_objetivo_conocido(self):
        user = make_user(goal='', objetivo='rendimiento')
        self.assertEqual(service.resolve_perfil_atleta(user.profile), ScoreSnapshot.PERFIL_RENDIMIENTO)

    def test_fallback_a_objetivo_salud(self):
        user = make_user(goal='', objetivo='verse_mejor')
        self.assertEqual(service.resolve_perfil_atleta(user.profile), ScoreSnapshot.PERFIL_SALUD_GENERAL)

    def test_objetivo_desconocido_no_resuelve(self):
        user = make_user(goal='', objetivo='algo_legado_random')
        self.assertIsNone(service.resolve_perfil_atleta(user.profile))

    def test_sin_goal_ni_objetivo(self):
        user = make_user(goal='', objetivo='')
        self.assertIsNone(service.resolve_perfil_atleta(user.profile))

    def test_profile_none(self):
        self.assertIsNone(service.resolve_perfil_atleta(None))


class ConsistenciaTests(TestCase):
    def test_ventana_completa(self):
        user = make_user(dias_semana=3)
        user.profile.created_at = timezone.now() - timedelta(days=100)
        user.profile.save(update_fields=['created_at'])
        hoy = date.today()
        for i in range(6):
            make_session(user, hoy - timedelta(days=i * 4))
        config = ScoreConfig.get_solo()
        valor = service._consistencia(user, user.profile, hoy, config, dias_historial=100)
        # esperado = 3 * 4 = 12 sesiones; reales = 6 -> 50%
        self.assertAlmostEqual(valor, 50.0, delta=1)

    def test_cold_start_proporcional(self):
        user = make_user(dias_semana=3)
        hoy = date.today()
        # 7 días transcurridos, 3 sesiones entrenadas -> esperado 3 -> 100%
        for i in range(3):
            make_session(user, hoy - timedelta(days=i * 2))
        config = ScoreConfig.get_solo()
        valor = service._consistencia(user, user.profile, hoy, config, dias_historial=6)
        self.assertAlmostEqual(valor, 100.0, delta=1)


class RecenciaTests(TestCase):
    def test_entreno_hoy(self):
        user = make_user()
        make_session(user, date.today())
        self.assertEqual(service._recencia(user, date.today()), 100.0)

    def test_nunca_entreno(self):
        user = make_user()
        self.assertEqual(service._recencia(user, date.today()), 0.0)

    def test_decaimiento_por_inactividad(self):
        user = make_user()
        hoy = date.today()
        make_session(user, hoy - timedelta(days=4))
        valor = service._recencia(user, hoy)
        # dias_inactivo=4 -> 100 - (4-1)*11 = 67
        self.assertAlmostEqual(valor, 67.0, delta=1)

    def test_solo_corredor_cuenta_via_runsession(self):
        user = make_user()
        make_run(user, timezone.now(), status='completed', rpe_real=6)
        self.assertEqual(service._recencia(user, date.today()), 100.0)

    def test_run_activo_no_cuenta(self):
        user = make_user()
        make_run(user, timezone.now(), status='active', rpe_real=None)
        self.assertEqual(service._recencia(user, date.today()), 0.0)


class AdherenciaTests(TestCase):
    def test_bajo_umbral_de_activacion(self):
        user = make_user()
        make_session(user, date.today(), feedback=True, cumplimiento=90)
        config = ScoreConfig.get_solo()
        # solo 1 sesión con feedback en total, min_feedback_provisional=2
        valor = service._adherencia(user, date.today(), config, total_feedback_alltime=1)
        self.assertIsNone(valor)

    def test_sesion_sin_feedback_cuenta_como_cero(self):
        user = make_user()
        hoy = date.today()
        make_session(user, hoy, feedback=True, cumplimiento=100)
        make_session(user, hoy - timedelta(days=1), feedback=False)
        config = ScoreConfig.get_solo()
        valor = service._adherencia(user, hoy, config, total_feedback_alltime=2)
        # (100 + 0) / 2 sesiones = 50, NO 100 (que sería si se ignorara la sin-feedback)
        self.assertAlmostEqual(valor, 50.0, delta=0.5)


class RecuperacionTests(TestCase):
    def test_menos_de_2_checkins_inactivo(self):
        user = make_user()
        DailyCheckin.objects.create(
            user=user, fecha=date.today(), estado_animo=4, calidad_sueno=Decimal('8.0'),
            duracion_disponible=60,
        )
        config = ScoreConfig.get_solo()
        self.assertIsNone(service._recuperacion(user, date.today(), config))

    def test_calidad_optima_alta(self):
        user = make_user()
        hoy = date.today()
        for i in range(2):
            DailyCheckin.objects.create(
                user=user, fecha=hoy - timedelta(days=i), estado_animo=5, calidad_sueno=Decimal('8.0'),
                estado_fisico=5, duracion_disponible=60,
            )
        config = ScoreConfig.get_solo()
        valor = service._recuperacion(user, hoy, config)
        self.assertAlmostEqual(valor, 100.0, delta=0.5)

    def test_escala_dispositivo_no_se_confunde_con_horas(self):
        # calidad_sueno=2 en escala de dispositivo (<=4) debe leerse como "mala",
        # no como "2 horas de sueño" bajo la tabla de horas (que también sería mala,
        # pero por un camino distinto) -- se verifica el valor exacto de la tabla de dispositivo.
        self.assertAlmostEqual(service._normalize_sueno(Decimal('2')), 55.0)
        self.assertAlmostEqual(service._normalize_sueno(Decimal('8')), 100.0)


class RendimientoFuerzaTests(TestCase):
    def setUp(self):
        self.config = ScoreConfig.get_solo()

    def test_e1rm_excluye_series_sin_rpe(self):
        serie_sin_rpe = {'peso': 100, 'reps': 5}
        self.assertIsNone(service._serie_valida_e1rm(serie_sin_rpe, self.config.reps_max_e1rm))

    def test_e1rm_excluye_mas_de_12_reps(self):
        serie = {'peso': 50, 'reps': 15, 'rpe': 9}
        self.assertIsNone(service._serie_valida_e1rm(serie, self.config.reps_max_e1rm))

    def test_e1rm_confianza_baja_descuenta_a_la_mitad(self):
        # rpe=9 -> RIR=1, reps_efectivas=6, e1rm_base=100*(1+6/30)=120, confianza=1.0 -> 120
        alta = service._serie_valida_e1rm({'peso': 100, 'reps': 5, 'rpe': 9}, 12)
        self.assertAlmostEqual(alta, 120.0, delta=0.01)
        # rpe=6 -> RIR=4, reps_efectivas=9, e1rm_base=100*(1+9/30)=130, confianza=0.5 -> 65
        baja = service._serie_valida_e1rm({'peso': 100, 'reps': 5, 'rpe': 6}, 12)
        self.assertAlmostEqual(baja, 65.0, delta=0.01)

    def test_e1rm_rpe_bajo_6_excluida(self):
        self.assertIsNone(service._serie_valida_e1rm({'peso': 100, 'reps': 5, 'rpe': 5}, 12))

    def test_delta_cap_20_pct(self):
        user = make_user(goal='potencia')
        ex = make_exercise()
        hoy = date.today()
        p1 = make_session(user, hoy, feedback=True)
        p1b = make_session(user, hoy - timedelta(days=1), feedback=True)
        p0 = make_session(user, hoy - timedelta(days=30), feedback=True)
        p0b = make_session(user, hoy - timedelta(days=31), feedback=True)
        # P1: e1RM mucho mayor a P0 (debería clippearse a +20%)
        make_session_exercise(p1, ex, [{'peso': 200, 'reps': 5, 'rpe': 9}])
        make_session_exercise(p1b, ex, [{'peso': 200, 'reps': 5, 'rpe': 9}])
        make_session_exercise(p0, ex, [{'peso': 100, 'reps': 5, 'rpe': 9}])
        make_session_exercise(p0b, ex, [{'peso': 100, 'reps': 5, 'rpe': 9}])
        p1_desde, p1_hasta = hoy - timedelta(days=27), hoy
        p0_desde, p0_hasta = hoy - timedelta(days=55), hoy - timedelta(days=28)
        valor, fuente = service._rendimiento_fuerza(
            user, ScoreSnapshot.PERFIL_RENDIMIENTO, p1_desde, p1_hasta, p0_desde, p0_hasta, self.config,
        )
        self.assertEqual(fuente, 'e1rm_rpe')
        # delta capeado a +20% -> valor = 100 (linear: -20%→0, 0%→50, +20%→100)
        self.assertAlmostEqual(valor, 100.0, delta=1)

    def test_piso_neutral_salud_general(self):
        user = make_user(goal='salud')
        ex = make_exercise()
        hoy = date.today()
        p1 = make_session(user, hoy, feedback=True)
        p1b = make_session(user, hoy - timedelta(days=1), feedback=True)
        p0 = make_session(user, hoy - timedelta(days=30), feedback=True)
        p0b = make_session(user, hoy - timedelta(days=31), feedback=True)
        # Mismo peso/reps en P1 y P0 -> "sin cambio" -> 100 pts para salud_general
        for s, blk in ((p1, 'a'), (p1b, 'b'), (p0, 'c'), (p0b, 'd')):
            make_session_exercise(s, ex, [
                {'peso': 80, 'reps': 6, 'rpe': 6}, {'peso': 80, 'reps': 6, 'rpe': 7},
                {'peso': 80, 'reps': 6, 'rpe': 8},
            ])
        p1_desde, p1_hasta = hoy - timedelta(days=27), hoy
        p0_desde, p0_hasta = hoy - timedelta(days=55), hoy - timedelta(days=28)
        valor, fuente = service._rendimiento_fuerza(
            user, ScoreSnapshot.PERFIL_SALUD_GENERAL, p1_desde, p1_hasta, p0_desde, p0_hasta, self.config,
        )
        self.assertEqual(fuente, 'regresion_rpe_submaxima')
        self.assertAlmostEqual(valor, 100.0, delta=0.5)

    def test_fallback_volumen_sin_comparabilidad(self):
        user = make_user(goal='potencia')
        hoy = date.today()
        p1 = make_session(user, hoy, feedback=True)
        p0 = make_session(user, hoy - timedelta(days=30), feedback=True)
        # Sin exercise FK (no comparable) -> debe caer a fallback de volumen
        make_session_exercise(p1, None, [{'peso': 100, 'reps': 10}])
        make_session_exercise(p0, None, [{'peso': 50, 'reps': 10}])
        p1_desde, p1_hasta = hoy - timedelta(days=27), hoy
        p0_desde, p0_hasta = hoy - timedelta(days=55), hoy - timedelta(days=28)
        valor, fuente = service._rendimiento_fuerza(
            user, ScoreSnapshot.PERFIL_RENDIMIENTO, p1_desde, p1_hasta, p0_desde, p0_hasta, self.config,
        )
        self.assertEqual(fuente, 'volume_fallback')
        self.assertIsNotNone(valor)

    def test_sin_datos_devuelve_none(self):
        user = make_user(goal='potencia')
        hoy = date.today()
        p1_desde, p1_hasta = hoy - timedelta(days=27), hoy
        p0_desde, p0_hasta = hoy - timedelta(days=55), hoy - timedelta(days=28)
        valor, fuente = service._rendimiento_fuerza(
            user, ScoreSnapshot.PERFIL_RENDIMIENTO, p1_desde, p1_hasta, p0_desde, p0_hasta, self.config,
        )
        self.assertIsNone(valor)
        self.assertIsNone(fuente)


class RedistribucionPesosTests(TestCase):
    def test_todos_activos(self):
        valores = {'consistencia': 100, 'rendimiento': 100, 'adherencia': 100, 'recuperacion': 100, 'recencia': 100}
        nivel, pesos = service._redistribuir_pesos(valores)
        self.assertAlmostEqual(nivel, 100.0, delta=0.01)
        self.assertAlmostEqual(sum(pesos.values()), 1.0, delta=0.001)

    def test_redistribucion_subconjunto(self):
        # Solo consistencia (0.30), adherencia (0.20), recencia (0.10) activos -> suman 0.60
        valores = {'consistencia': 50, 'rendimiento': None, 'adherencia': 50, 'recuperacion': None, 'recencia': 50}
        nivel, pesos = service._redistribuir_pesos(valores)
        self.assertAlmostEqual(nivel, 50.0, delta=0.01)
        self.assertAlmostEqual(sum(pesos.values()), 1.0, delta=0.001)
        self.assertNotIn('rendimiento', pesos)

    def test_ninguno_activo(self):
        valores = {k: None for k in service.WEIGHTS}
        nivel, pesos = service._redistribuir_pesos(valores)
        self.assertEqual(nivel, 0.0)
        self.assertEqual(pesos, {})


class FindP0AnchorTests(TestCase):
    def test_sin_snapshots_previos(self):
        user = make_user()
        self.assertIsNone(service._find_p0_anchor(user, date.today(), 28, ['consistencia']))

    def test_ancla_valida(self):
        user = make_user()
        hoy = date.today()
        ScoreSnapshot.objects.create(
            user=user, fecha_corte=hoy - timedelta(days=30), nivel_p1=70.0, score_final=70.0,
            estado_cold_start={'componentes_activos': ['consistencia', 'recencia', 'adherencia']},
        )
        anchor = service._find_p0_anchor(user, hoy, 28, ['consistencia', 'recencia'])
        self.assertIsNotNone(anchor)
        self.assertEqual(anchor.nivel_p1, 70.0)

    def test_guardia_de_comparabilidad_rechaza_componentes_extra(self):
        user = make_user()
        hoy = date.today()
        ScoreSnapshot.objects.create(
            user=user, fecha_corte=hoy - timedelta(days=30), nivel_p1=70.0, score_final=70.0,
            estado_cold_start={'componentes_activos': ['consistencia']},
        )
        # El snapshot actual tiene MÁS componentes activos que el ancla -> no comparable
        anchor = service._find_p0_anchor(user, hoy, 28, ['consistencia', 'rendimiento'])
        self.assertIsNone(anchor)

    def test_muy_reciente_no_califica(self):
        user = make_user()
        hoy = date.today()
        ScoreSnapshot.objects.create(
            user=user, fecha_corte=hoy - timedelta(days=10), nivel_p1=70.0, score_final=70.0,
            estado_cold_start={'componentes_activos': ['consistencia']},
        )
        anchor = service._find_p0_anchor(user, hoy, 28, ['consistencia'])
        self.assertIsNone(anchor)


class ComputeAndStoreScoreTests(TestCase):
    def test_crea_snapshot_usuario_nuevo(self):
        user = make_user()
        make_session(user, date.today(), feedback=True, cumplimiento=80)
        snapshot = service.compute_and_store_score(user, fecha_corte=date.today())
        self.assertIsNotNone(snapshot)
        self.assertEqual(ScoreSnapshot.objects.filter(user=user).count(), 1)
        self.assertEqual(snapshot.estado_cold_start['stage'], 'building')

    def test_nunca_lanza_ante_fallo_interno(self):
        user = make_user()
        original = service._consistencia
        try:
            service._consistencia = lambda *a, **kw: 1 / 0
            snapshot = service.compute_and_store_score(user, fecha_corte=date.today())
            self.assertIsNone(snapshot)
        finally:
            service._consistencia = original

    def test_describe_snapshot_sin_snapshot(self):
        valor, desc, has_data = service.describe_snapshot(None)
        self.assertIsNone(valor)
        self.assertFalse(has_data)
        self.assertIsNotNone(desc)

    def test_describe_snapshot_building(self):
        user = make_user()
        snap = ScoreSnapshot.objects.create(
            user=user, fecha_corte=date.today(), nivel_p1=40.0, score_final=40.0,
            estado_cold_start={'stage': 'building', 'dias_historial': 1},
        )
        valor, desc, has_data = service.describe_snapshot(snap)
        self.assertIsNone(valor)
        self.assertFalse(has_data)

    def test_describe_snapshot_provisional_tiene_datos(self):
        user = make_user()
        snap = ScoreSnapshot.objects.create(
            user=user, fecha_corte=date.today(), nivel_p1=60.0, score_final=60.0,
            estado_cold_start={'stage': 'provisional', 'dias_historial': 10},
        )
        valor, desc, has_data = service.describe_snapshot(snap)
        self.assertEqual(valor, 60)
        self.assertTrue(has_data)
