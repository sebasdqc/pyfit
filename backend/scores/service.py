"""Motor de cálculo del Zyfit Score v2 (ver `zyfit-score-v2-instrucciones (1).md`
en la raíz del repo para la especificación completa).

Punto de entrada: `compute_and_store_score(user, fecha_corte=None)`, llamado
desde `workouts.views.session_feedback` como un efecto secundario más (mismo
patrón que `_actualizar_racha`/`_check_logros`). Atrapa sus propias
excepciones internamente — un bug acá nunca debe poder arrastrar el rollback
de los otros efectos secundarios que sí funcionaron.

Decisiones de diseño no obvias (documentadas también en el plan de
implementación):

- `nivel_p0` NO se recalcula desde datos crudos — se reutiliza el `nivel_p1`
  congelado de un ScoreSnapshot anterior (~28 días atrás), con una guardia de
  comparabilidad (ver `_find_p0_anchor`). El "P0 window" (días -56 a -29) que
  usan las sub-fórmulas de Rendimiento/Cardio es un concepto distinto: ese sí
  se recalcula siempre con datos frescos de esas fechas.
- Adherencia usa lectura ESTRICTA: el denominador es todas las sesiones de la
  ventana P1, una sesión sin feedback aporta 0 (no se excluye del promedio).
- Consistencia y Recencia unifican `workouts.Session` (fuerza) + `runs.RunSession`
  (cardio/running) — el documento asume una sola tabla de sesiones, pero
  running vive en un modelo separado. Adherencia queda escrita para
  `Session`/`SessionFeedback` solamente, tal como especifica el documento.
"""
import logging
from collections import defaultdict
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from checkins.models import DailyCheckin
from runs.models import RunSession
from users.onboarding_goals import resolve_goal_from_objetivo
from workouts.models import Session, SessionExercise, SessionFeedback

from .models import ScoreConfig, ScoreSnapshot

logger = logging.getLogger(__name__)

WEIGHTS = {
    'consistencia': 0.30,
    'rendimiento': 0.25,
    'adherencia': 0.20,
    'recuperacion': 0.15,
    'recencia': 0.10,
}

GOAL_TO_PERFIL = {
    'fuerza': ScoreSnapshot.PERFIL_RENDIMIENTO,
    'potencia': ScoreSnapshot.PERFIL_RENDIMIENTO,
    'hipertrofia': ScoreSnapshot.PERFIL_RENDIMIENTO,
    'salud': ScoreSnapshot.PERFIL_SALUD_GENERAL,
    'perdida_grasa': ScoreSnapshot.PERFIL_SALUD_GENERAL,
}


def _clip(v, lo, hi):
    return max(lo, min(hi, v))


def _ventana(hasta, dias):
    return hasta - timedelta(days=dias - 1), hasta


def _bucket(fecha, p1_desde, p1_hasta, p0_desde, p0_hasta):
    if p1_desde <= fecha <= p1_hasta:
        return 'p1'
    if p0_desde <= fecha <= p0_hasta:
        return 'p0'
    return None


# ─── Perfil del atleta ────────────────────────────────────────────────────────

def resolve_perfil_atleta(profile):
    """`Profile.goal` si es válido; si no, fallback a `Profile.objetivo`
    (poblado de forma confiable en el onboarding, a diferencia de `goal` que
    se escribe fire-and-forget y puede quedar vacío). None = no resuelto ->
    el componente Rendimiento queda inactivo (mismo tratamiento que cold start)."""
    if profile is None:
        return None
    goal = (profile.goal or '').strip()
    perfil = GOAL_TO_PERFIL.get(goal)
    if perfil:
        return perfil
    mapped_goal = resolve_goal_from_objetivo(profile.objetivo)
    if mapped_goal:
        return GOAL_TO_PERFIL.get(mapped_goal)
    return None


# ─── Consistencia + Recencia (unión Session + RunSession) ────────────────────

def _fechas_entrenadas(user, desde, hasta):
    """Fechas (calendario local) con Session-con-feedback o RunSession
    completada, en [desde, hasta]. `Session.fecha` ya es local; `RunSession.started_at`
    es UTC-aware y se normaliza con timezone.localdate() (mismo patrón que
    ai_running/adaptive_engine_running.py) para no atribuir carreras cerca de
    medianoche UTC al día equivocado."""
    fechas = set(
        Session.objects.filter(user=user, fecha__gte=desde, fecha__lte=hasta, feedback__isnull=False)
        .values_list('fecha', flat=True)
    )
    runs = RunSession.objects.filter(
        user=user, status='completed',
        started_at__date__gte=desde - timedelta(days=1),
        started_at__date__lte=hasta + timedelta(days=1),
    )
    for r in runs:
        d = timezone.localdate(r.started_at)
        if desde <= d <= hasta:
            fechas.add(d)
    return fechas


def _dias_historial(profile, hoy):
    if profile is None or not profile.created_at:
        return 0
    inicio = timezone.localdate(profile.created_at)
    return max((hoy - inicio).days, 0)


def _consistencia(user, profile, hoy, config, dias_historial):
    dias_semana = (profile.dias_semana if profile and profile.dias_semana else 3)
    ventana = config.ventana_dias
    if dias_historial < ventana:
        # Cold start: esperado proporcional a los días transcurridos desde el
        # registro (día de registro = día 1), no sobre la ventana completa.
        dias_transcurridos = max(dias_historial + 1, 1)
        desde = hoy - timedelta(days=dias_transcurridos - 1)
        esperado = dias_semana * (dias_transcurridos / 7.0)
    else:
        desde = hoy - timedelta(days=ventana - 1)
        esperado = dias_semana * (ventana / 7.0)
    esperado = max(esperado, 1e-9)
    fechas = _fechas_entrenadas(user, desde, hoy)
    return _clip(len(fechas) / esperado * 100, 0, 100)


def _ultima_fecha_entrenada(user, hoy):
    ultima_gym = (
        Session.objects.filter(user=user, fecha__lte=hoy, feedback__isnull=False)
        .order_by('-fecha').values_list('fecha', flat=True).first()
    )
    ultima_run = None
    runs_recientes = (
        RunSession.objects.filter(user=user, status='completed', started_at__date__lte=hoy + timedelta(days=1))
        .order_by('-started_at')[:5]
    )
    for r in runs_recientes:
        d = timezone.localdate(r.started_at)
        if d <= hoy and (ultima_run is None or d > ultima_run):
            ultima_run = d
    candidatos = [d for d in (ultima_gym, ultima_run) if d is not None]
    return max(candidatos) if candidatos else None


def _recencia(user, hoy):
    ultima = _ultima_fecha_entrenada(user, hoy)
    if ultima is None:
        return 0.0
    dias_inactivo = (hoy - ultima).days
    if dias_inactivo <= 1:
        return 100.0
    return _clip(100 - (dias_inactivo - 1) * 11, 0, 100)


# ─── Adherencia ───────────────────────────────────────────────────────────────

def _adherencia(user, hoy, config, total_feedback_alltime):
    """Lectura estricta: el denominador es TODAS las Session de la ventana P1
    (no solo las que tienen feedback) — una sesión sin feedback aporta 0."""
    if total_feedback_alltime < config.min_feedback_provisional:
        return None
    desde = hoy - timedelta(days=config.ventana_dias - 1)
    sesiones = list(
        Session.objects.filter(user=user, fecha__gte=desde, fecha__lte=hoy).select_related('feedback')
    )
    if not sesiones:
        return None
    suma = sum(float(s.feedback.cumplimiento) if getattr(s, 'feedback', None) else 0.0 for s in sesiones)
    return _clip(suma / len(sesiones), 0, 100)


# ─── Recuperación ─────────────────────────────────────────────────────────────

def _normalize_escala_1_5(v):
    return _clip((v - 1) / 4 * 100, 0, 100)


def _normalize_sueno(calidad_sueno):
    """`DailyCheckin.calidad_sueno` es un campo dual-escala sin flag que lo
    distinga: check-ins manuales mandan horas de sueño (0-15), integraciones
    de dispositivo mandan una escala 1-4. Mismo criterio de desambiguación
    (`cs <= 4`) que `ai_running/adaptive_engine_running.py::compute_readiness`."""
    cs = float(calidad_sueno)
    if cs <= 4:
        return {1: 30.0, 2: 55.0, 3: 85.0, 4: 100.0}.get(int(round(cs)), 70.0)
    if cs < 6:
        return 60.0
    if cs < 7:
        return 85.0
    if cs <= 9:
        return 100.0
    if cs <= 10:
        return 90.0
    return 70.0


def _recuperacion(user, hoy, config, total_checkins_ventana=None):
    desde = hoy - timedelta(days=config.ventana_dias - 1)
    checkins = list(DailyCheckin.objects.filter(user=user, fecha__gte=desde, fecha__lte=hoy))
    # El mínimo de activación cold-start ("≥2 check-ins") reusa el mismo
    # parámetro tunable que Adherencia — el documento no lista un parámetro
    # separado y ambos umbrales valen 2 en la tabla de cold-start.
    if len(checkins) < config.min_feedback_provisional:
        return None
    valores = []
    for c in checkins:
        animo = _normalize_escala_1_5(c.estado_animo)
        sueno = _normalize_sueno(c.calidad_sueno)
        if c.estado_fisico:
            fisico = _normalize_escala_1_5(c.estado_fisico)
            valores.append(0.4 * animo + 0.4 * sueno + 0.2 * fisico)
        else:
            valores.append(0.5 * animo + 0.5 * sueno)
    return _clip(sum(valores) / len(valores), 0, 100)


# ─── Rendimiento ──────────────────────────────────────────────────────────────

def _delta_to_valor(delta, cap, perfil, umbral_neutral):
    """Mapea un delta (fracción, ya clippeado a ±cap) a un valor 0-100.
    Linear: -cap -> 0, 0 -> 50, +cap -> 100. Para perfil salud_general, un
    delta "sin cambio" (|delta| <= umbral_neutral) se registra como 100 en vez
    de 50 — mantener capacidad es un objetivo válido para ese perfil, no
    estancamiento (HARD RULE del documento). Esto genera una discontinuidad
    deliberada justo en el borde del umbral neutral; se acepta tal como está
    especificado en vez de suavizarla sin que el documento lo pida."""
    if perfil == ScoreSnapshot.PERFIL_SALUD_GENERAL and abs(delta) <= umbral_neutral:
        return 100.0
    return _clip(50 + (delta / cap) * 50, 0, 100)


def _volumen(series):
    total = 0.0
    for s in series:
        try:
            peso = float(s.get('peso'))
            reps = int(s.get('reps'))
        except (TypeError, ValueError, AttributeError):
            continue
        if peso > 0 and reps > 0:
            total += peso * reps
    return total


def _serie_valida_e1rm(s, reps_max):
    """Filtros de confianza RPE + exclusión >reps_max / peso-reps no positivos.
    Epley ajustado: RIR=10-RPE, reps_efectivas=reps+RIR, e1RM=peso*(1+reps_efectivas/30).
    Series con RPE 6-7 (confianza baja) aportan el e1RM calculado pero
    descontado a la mitad antes de competir por el "mejor del bloque" — así
    una estimación poco confiable no puede fijar el máximo del bloque a full."""
    try:
        peso = float(s.get('peso'))
        reps = int(s.get('reps'))
    except (TypeError, ValueError, AttributeError):
        return None
    if peso <= 0 or reps <= 0 or reps > reps_max:
        return None
    rpe = s.get('rpe')
    if rpe is None:
        return None
    try:
        rpe = float(rpe)
    except (TypeError, ValueError):
        return None
    if rpe < 6:
        return None
    confianza = 1.0 if rpe >= 8 else 0.5
    rir = 10 - rpe
    reps_efectivas = reps + rir
    e1rm = peso * (1 + reps_efectivas / 30.0)
    return e1rm * confianza


def _mejor_e1rm(series, reps_max):
    valores = [v for s in series if (v := _serie_valida_e1rm(s, reps_max)) is not None]
    return max(valores) if valores else None


def _linear_regression(xs, ys):
    """OLS simple (peso = a + b*rpe), sin dependencias externas."""
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    den = sum((x - mean_x) ** 2 for x in xs)
    if den == 0:
        return None
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    b = num / den
    a = mean_y - b * mean_x
    return a, b


def _carga_referencia(series, min_combinaciones):
    """Perfil salud general: regresión peso~RPE, estimar carga a RPE 8 de
    referencia — no exige cercanía al fallo real (HARD RULE)."""
    pares = []
    for s in series:
        try:
            peso = float(s.get('peso'))
            reps = int(s.get('reps'))
        except (TypeError, ValueError, AttributeError):
            continue
        if peso <= 0 or reps <= 0:
            continue
        rpe = s.get('rpe')
        if rpe is None:
            continue
        try:
            rpe = float(rpe)
        except (TypeError, ValueError):
            continue
        pares.append((rpe, peso))
    if len({p[0] for p in pares}) < min_combinaciones:
        return None
    reg = _linear_regression([p[0] for p in pares], [p[1] for p in pares])
    if reg is None:
        return None
    a, b = reg
    return a + b * 8.0


def _rendimiento_fuerza(user, perfil, p1_desde, p1_hasta, p0_desde, p0_hasta, config):
    """Devuelve (valor 0-100 o None, fuente) para el sub-componente de fuerza.
    `datos` agrupa por exercise_id (comparabilidad estricta por FK); las
    listas *_series_todas acumulan TODAS las series con series_log del bloque
    —tengan o no exercise_id resuelto— para el fallback de volumen total."""
    rows = (
        SessionExercise.objects
        .filter(session__user=user, series_log__isnull=False,
                session__fecha__gte=p0_desde, session__fecha__lte=p1_hasta)
        .select_related('session')
    )

    datos = defaultdict(lambda: {'p1_sessions': set(), 'p0_sessions': set(), 'p1_series': [], 'p0_series': []})
    p1_series_todas, p0_series_todas = [], []
    hay_datos = False

    for row in rows:
        bloque = _bucket(row.session.fecha, p1_desde, p1_hasta, p0_desde, p0_hasta)
        if bloque is None:
            continue
        series_validas = [s for s in (row.series_log or []) if isinstance(s, dict)]
        if not series_validas:
            continue
        hay_datos = True
        if bloque == 'p1':
            p1_series_todas.extend(series_validas)
        else:
            p0_series_todas.extend(series_validas)
        if row.exercise_id is not None:
            entry = datos[row.exercise_id]
            entry[f'{bloque}_sessions'].add(row.session_id)
            entry[f'{bloque}_series'].extend(series_validas)

    if not hay_datos:
        return None, None

    deltas_ponderados = []
    for d in datos.values():
        if len(d['p1_sessions']) < config.min_repeticiones_ejercicio:
            continue
        if len(d['p0_sessions']) < config.min_repeticiones_ejercicio:
            continue
        if perfil == ScoreSnapshot.PERFIL_RENDIMIENTO:
            v_p1 = _mejor_e1rm(d['p1_series'], config.reps_max_e1rm)
            v_p0 = _mejor_e1rm(d['p0_series'], config.reps_max_e1rm)
        else:
            v_p1 = _carga_referencia(d['p1_series'], config.min_combinaciones_rpe_salud)
            v_p0 = _carga_referencia(d['p0_series'], config.min_combinaciones_rpe_salud)
        if v_p1 is None or v_p0 is None or v_p0 <= 0:
            continue
        peso = _volumen(d['p1_series'])
        if peso <= 0:
            continue
        delta = _clip((v_p1 - v_p0) / v_p0, -config.rendimiento_cap_pct, config.rendimiento_cap_pct)
        deltas_ponderados.append((delta, peso))

    if deltas_ponderados:
        peso_total = sum(p for _, p in deltas_ponderados)
        delta_final = sum(dl * p for dl, p in deltas_ponderados) / peso_total
        fuente = 'e1rm_rpe' if perfil == ScoreSnapshot.PERFIL_RENDIMIENTO else 'regresion_rpe_submaxima'
        return _delta_to_valor(delta_final, config.rendimiento_cap_pct, perfil, config.umbral_neutral_pct), fuente

    # SOFT RULE — fallback: delta de volumen total P1 vs P0 (sin exigir FK).
    vol_p1 = _volumen(p1_series_todas)
    vol_p0 = _volumen(p0_series_todas)
    if vol_p0 <= 0:
        return None, None
    delta = _clip((vol_p1 - vol_p0) / vol_p0, -config.rendimiento_cap_pct, config.rendimiento_cap_pct)
    return _delta_to_valor(delta, config.rendimiento_cap_pct, perfil, config.umbral_neutral_pct), 'volume_fallback'


def _rendimiento_cardio(user, p1_desde, p1_hasta, p0_desde, p0_hasta):
    """Nivel A únicamente (GPS + RPE reportado vía run_feedback). Nivel B
    (sin GPS) no tiene ningún productor de datos hoy — no hay endpoint ni UI
    de entrada manual — así que naturalmente cae a "sin pares comparables"."""
    # `.count()` sobre un related manager SIEMPRE emite un COUNT nuevo, incluso
    # con prefetch_related — no usa esa caché. Anotar con Count evita cargar
    # los RunPoint de cada sesión a memoria solo para descartarlos (podían ser
    # miles por sesión larga, ver RunPoint) y evita el N+1 de un COUNT por fila.
    runs = (
        RunSession.objects
        .filter(user=user, status='completed', rpe_real__isnull=False,
                started_at__date__gte=p0_desde - timedelta(days=1),
                started_at__date__lte=p1_hasta + timedelta(days=1))
        .annotate(n_points=Count('points'))
    )
    p1_runs, p0_runs = [], []
    for r in runs:
        if not r.avg_pace_s_per_km or r.n_points < 2:
            continue
        d = timezone.localdate(r.started_at)
        bloque = _bucket(d, p1_desde, p1_hasta, p0_desde, p0_hasta)
        if bloque == 'p1':
            p1_runs.append(r)
        elif bloque == 'p0':
            p0_runs.append(r)

    if not p1_runs or not p0_runs:
        return None, None

    def _grupos_por_rpe(runs_):
        grupos = defaultdict(list)
        for r in runs_:
            grupos[int(r.rpe_real)].append(r.avg_pace_s_per_km)
        return grupos

    g_p1 = _grupos_por_rpe(p1_runs)
    g_p0 = _grupos_por_rpe(p0_runs)

    deltas = []
    for rpe, paces_p1 in g_p1.items():
        paces_p0 = [p for rpe_p0, lst in g_p0.items() if abs(rpe_p0 - rpe) <= 1 for p in lst]
        if not paces_p0:
            continue
        pace_ref_p1 = sum(paces_p1) / len(paces_p1)
        pace_ref_p0 = sum(paces_p0) / len(paces_p0)
        if pace_ref_p0 <= 0:
            continue
        # pace en s/km: menor = más rápido. delta positivo = progreso.
        deltas.append((pace_ref_p0 - pace_ref_p1) / pace_ref_p0)

    if not deltas:
        return None, None
    return sum(deltas) / len(deltas), 'gps_pace_rpe'


def _mix_fuerza_cardio(user, p1_desde, p1_hasta):
    """Proxy de mezcla fuerza/cardio: proporción de días entrenados de cada
    tipo en P1 (no hay una medida de "carga" unificada entre ambos dominios)."""
    dias_fuerza = (
        Session.objects.filter(user=user, fecha__gte=p1_desde, fecha__lte=p1_hasta, feedback__isnull=False)
        .values('fecha').distinct().count()
    )
    runs_p1 = RunSession.objects.filter(
        user=user, status='completed', started_at__date__gte=p1_desde, started_at__date__lte=p1_hasta,
    )
    dias_cardio = len({timezone.localdate(r.started_at) for r in runs_p1})
    total = dias_fuerza + dias_cardio
    if total == 0:
        return 0.5, 0.5
    return dias_fuerza / total, dias_cardio / total


def _rendimiento(user, profile, perfil, hoy, config):
    if perfil is None:
        return None, {'perfil_atleta': None}

    p1_desde, p1_hasta = _ventana(hoy, config.ventana_dias)
    p0_hasta = p1_desde - timedelta(days=1)
    p0_desde, p0_hasta = _ventana(p0_hasta, config.ventana_dias)

    valor_fuerza, fuente_fuerza = _rendimiento_fuerza(user, perfil, p1_desde, p1_hasta, p0_desde, p0_hasta, config)
    delta_cardio, fuente_cardio = _rendimiento_cardio(user, p1_desde, p1_hasta, p0_desde, p0_hasta)
    valor_cardio = (
        _delta_to_valor(delta_cardio, config.rendimiento_cap_pct, perfil, config.umbral_neutral_pct)
        if delta_cardio is not None else None
    )

    meta = {
        'perfil_atleta': perfil,
        'rendimiento_fuerza_source': fuente_fuerza,
        'rendimiento_cardio_source': fuente_cardio,
    }

    if valor_fuerza is None and valor_cardio is None:
        return None, meta

    if valor_fuerza is not None and valor_cardio is not None:
        peso_fuerza, peso_cardio = _mix_fuerza_cardio(user, p1_desde, p1_hasta)
        valor = valor_fuerza * peso_fuerza + valor_cardio * peso_cardio
    elif valor_fuerza is not None:
        valor = valor_fuerza
    else:
        valor = valor_cardio

    return valor, meta


# ─── Redistribución de pesos + ancla P0 ──────────────────────────────────────

def _redistribuir_pesos(valores):
    """valores: {componente: valor(0-100) | None}. Los componentes inactivos
    (None) ceden su peso, renormalizado entre los activos. Devuelve
    (nivel_p1, pesos_aplicados)."""
    activos = {k: v for k, v in valores.items() if v is not None}
    if not activos:
        return 0.0, {}
    peso_total_activo = sum(WEIGHTS[k] for k in activos)
    pesos_aplicados = {k: WEIGHTS[k] / peso_total_activo for k in activos}
    nivel = sum(valores[k] * pesos_aplicados[k] for k in activos)
    return nivel, pesos_aplicados


def _find_p0_anchor(user, hoy, ventana_dias, componentes_activos_actual):
    """El "Nivel(P0) congelado": el `nivel_p1` de un ScoreSnapshot anterior
    (>=ventana_dias atrás), nunca recalculado. Guardia de comparabilidad: solo
    se acepta si el conjunto de componentes activos de ESE snapshot es
    superset-o-igual al actual — evita que un cambio de qué componentes están
    activos se lea como progreso/regresión fantasma en el Momentum."""
    corte = hoy - timedelta(days=ventana_dias)
    candidato = (
        ScoreSnapshot.objects.filter(user=user, fecha_corte__lte=corte)
        .order_by('-fecha_corte')
        .first()
    )
    if candidato is None:
        return None
    activos_anchor = set((candidato.estado_cold_start or {}).get('componentes_activos') or [])
    if not set(componentes_activos_actual).issubset(activos_anchor):
        return None
    return candidato


# ─── Orquestador ──────────────────────────────────────────────────────────────

def _compute_and_store_score_inner(user, fecha_corte):
    hoy = fecha_corte or timezone.localdate()
    config = ScoreConfig.get_solo()
    profile = getattr(user, 'profile', None)

    dias_historial = _dias_historial(profile, hoy)
    perfil_atleta = resolve_perfil_atleta(profile)

    total_feedback_alltime = SessionFeedback.objects.filter(session__user=user, session__fecha__lte=hoy).count()

    consistencia = _consistencia(user, profile, hoy, config, dias_historial)
    recencia = _recencia(user, hoy)
    adherencia = _adherencia(user, hoy, config, total_feedback_alltime)
    recuperacion = _recuperacion(user, hoy, config)
    rendimiento, rendimiento_meta = _rendimiento(user, profile, perfil_atleta, hoy, config)

    valores = {
        'consistencia': consistencia,
        'rendimiento': rendimiento,
        'adherencia': adherencia,
        'recuperacion': recuperacion,
        'recencia': recencia,
    }
    nivel_p1, pesos_aplicados = _redistribuir_pesos(valores)
    componentes_activos = sorted(k for k, v in valores.items() if v is not None)

    anchor = _find_p0_anchor(user, hoy, config.ventana_dias, componentes_activos)
    nivel_p0 = anchor.nivel_p1 if anchor else None
    momentum = None
    if nivel_p0 is not None:
        momentum = _clip(nivel_p1 - nivel_p0, -config.momentum_cap, config.momentum_cap)
        score_final = _clip(nivel_p1 + momentum, 0, 100)
    else:
        score_final = _clip(nivel_p1, 0, 100)

    if total_feedback_alltime < config.min_feedback_provisional:
        stage = 'building'
    elif dias_historial < config.ventana_dias:
        stage = 'provisional'
    elif nivel_p0 is None:
        stage = 'completo_sin_momentum'
    else:
        stage = 'completo'

    componentes_json = {
        k: {'valor': v, 'peso_aplicado': pesos_aplicados.get(k), 'activo': v is not None}
        for k, v in valores.items()
    }
    componentes_json['rendimiento']['meta'] = rendimiento_meta

    return ScoreSnapshot.objects.create(
        user=user,
        fecha_corte=hoy,
        nivel_p1=nivel_p1,
        nivel_p0=nivel_p0,
        momentum=momentum,
        score_final=score_final,
        componentes_json=componentes_json,
        perfil_atleta=perfil_atleta,
        estado_cold_start={
            'stage': stage,
            'es_provisional': stage in ('building', 'provisional'),
            'componentes_activos': componentes_activos,
            'dias_historial': dias_historial,
        },
    )


def compute_and_store_score(user, fecha_corte=None):
    """Recalcula y persiste el Zyfit Score del usuario. Nunca lanza — un bug
    acá no debe poder arrastrar el rollback de racha/logros/adaptation-profile
    (que corren en la misma transacción, en session_feedback). Devuelve el
    ScoreSnapshot creado, o None si falló."""
    try:
        return _compute_and_store_score_inner(user, fecha_corte)
    except Exception:
        logger.exception('[scores] fallo calculando Zyfit Score para user_id=%s', getattr(user, 'id', None))
        return None


def describe_snapshot(snapshot):
    """Mapea un ScoreSnapshot (o None) al shape {valor, descripcion, has_data}
    que ya consume /api/stats/dashboard/ — has_data se activa desde el stage
    'provisional' (>=2 sesiones con feedback), reemplazando el gate viejo de
    >=7 sesiones totales."""
    if snapshot is None:
        return None, (
            'Registra tu primera sesión con feedback para empezar a construir tu Zyfit Score.'
        ), False

    estado = snapshot.estado_cold_start or {}
    stage = estado.get('stage')
    dias_historial = estado.get('dias_historial', 0)

    if stage == 'building':
        return None, (
            f'Construyendo tu perfil — llevas {dias_historial} día(s) de historial, '
            'completa al menos 2 sesiones con feedback para ver tu primer Zyfit Score.'
        ), False

    valor = round(snapshot.score_final)
    if stage == 'provisional':
        descripcion = f'Score preliminar ({valor}) — construyendo tu historial completo (28 días).'
    elif stage == 'completo_sin_momentum':
        descripcion = f'Zyfit Score {valor} — la tendencia estará disponible desde los 56 días de historial.'
    else:
        momentum = snapshot.momentum or 0
        if momentum > 1:
            descripcion = f'Zyfit Score {valor} — en ascenso respecto al bloque anterior.'
        elif momentum < -1:
            descripcion = f'Zyfit Score {valor} — en descenso respecto al bloque anterior.'
        else:
            descripcion = f'Zyfit Score {valor} — estable respecto al bloque anterior.'
    return valor, descripcion, True
