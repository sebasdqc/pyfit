import json
import logging
import time as _time
from datetime import date, timedelta
from types import SimpleNamespace
from groq import Groq
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from pyfit.throttles import GenerateSessionRateThrottle, RegenerarEjercicioRateThrottle, AjustarSesionRateThrottle
from workouts.models import Session, SessionExercise, Exercise, UserAdaptationProfile, UserExerciseProfile
from checkins.models import DailyCheckin


def _get_local_date(request) -> date:
    """
    Devuelve la fecha local del dispositivo (header X-Local-Date).
    Fallback a date.today() (UTC) si el header no está disponible o es inválido.

    Necesario para que las sesiones se guarden en la fecha que el usuario
    percibe, no en la fecha UTC del servidor (que puede diferir en zonas UTC-).
    """
    header = request.headers.get('X-Local-Date', '').strip()
    if header:
        try:
            return date.fromisoformat(header)
        except ValueError:
            pass
    return date.today()
from ai_workout.adaptive_engine import AdaptiveEngineService
from ai_workout import training_science as ts

logger = logging.getLogger(__name__)

# Timeout por intento de la petición a Groq (segundos).
# IMPORTANTE: el SDK de Groq reintenta por defecto (max_retries=2). Con el default
# un Groq lento daba 30s × 3 intentos ≈ 90s y el worker seguía ocupado mucho
# tiempo. Acotamos a 1 reintento (peor caso ~60s, bajo el timeout de gunicorn de
# 120s) y dejamos un timeout por intento holgado para que la generación COMPLETE
# y cree la sesión aunque la pasarela ya le haya devuelto 504 al cliente: la
# pantalla de generación recupera la sesión por polling de /api/sessions/today/.
GROQ_TIMEOUT_SECONDS = 30
GROQ_MAX_RETRIES = 1


def _call_groq(prompt: str, max_tokens: int, user_id=None, return_usage=False):
    """
    Call Groq and return parsed JSON. Raises ValueError on parse/empty response,
    or any underlying Groq exception. Caller is responsible for translating
    exceptions into HTTP responses.

    Con `return_usage=True` devuelve `(data, usage)` donde usage = {tokens_in,
    tokens_out, elapsed_ms} para que el caller pueda persistir métricas del motor.
    """
    if not settings.GROQ_API_KEY:
        raise RuntimeError('GROQ_API_KEY not configured')

    t0 = _time.monotonic()
    groq_client = Groq(
        api_key=settings.GROQ_API_KEY,
        timeout=GROQ_TIMEOUT_SECONDS,
        max_retries=GROQ_MAX_RETRIES,
    )
    completion = groq_client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=max_tokens,
    )
    elapsed = _time.monotonic() - t0
    choice = completion.choices[0]
    text = (choice.message.content or '').strip()
    finish_reason = getattr(choice, 'finish_reason', None)
    tokens_out = getattr(completion.usage, 'completion_tokens', 0) or 0
    tokens_in  = getattr(completion.usage, 'prompt_tokens', 0) or 0
    logger.info(
        'groq_call user=%s tokens_in=%d tokens_out=%d finish=%s elapsed=%.2fs',
        user_id, tokens_in, tokens_out, finish_reason, elapsed,
    )
    # GEN-4: si Groq cortó por límite de tokens, el JSON viene incompleto. Lo
    # registramos para diagnóstico (el json.loads fallará y el caller responde 502).
    if finish_reason == 'length':
        logger.warning(
            'groq_call user=%s respuesta truncada por max_tokens (out=%d) — JSON incompleto',
            user_id, tokens_out,
        )
    if not text:
        raise ValueError('Empty response from AI')
    clean = text.replace('```json', '').replace('```', '').strip()
    data = json.loads(clean)
    if return_usage:
        usage = {
            'tokens_in':  tokens_in,
            'tokens_out': tokens_out,
            'elapsed_ms': int(elapsed * 1000),
        }
        return data, usage
    return data


# ─── Fatiga & RPE helpers ─────────────────────────────────────────────────────

def calcular_fatiga(sesiones_qs):
    from django.utils import timezone
    ahora = timezone.now()
    hace_72h = ahora - timedelta(hours=72)
    ultimas = sesiones_qs.filter(created_at__gte=hace_72h)
    count = ultimas.count()
    if count >= 3:
        return 'alto'
    if count == 2:
        return 'medio'
    return 'bajo'


def calcular_rpe_target(fatiga, estado_animo, hrv):
    rpe = 7
    if fatiga == 'alto':
        rpe -= 2
    elif fatiga == 'medio':
        rpe -= 1
    if estado_animo <= 2:
        rpe -= 1
    elif estado_animo >= 5:
        rpe += 1
    if hrv:
        if hrv < 50:
            rpe -= 1
        elif hrv > 80:
            rpe += 1
    return max(4, min(9, rpe))


def _calcular_fase_ciclo(user):
    """Texto de la fase actual del ciclo menstrual + su implicación para el
    entrenamiento, o None si no aplica (el usuario no lo activó o no hay datos).
    Los datos del ciclo se capturan en el perfil (MenstrualCycle: fecha_inicio +
    duración). Umbrales estándar para ciclo ~28 días; sirve como guía para el LLM."""
    try:
        if not user.profile.usa_ciclo_menstrual:
            return None
    except Exception:
        return None
    ciclo = user.ciclos.order_by('-fecha_inicio').first()
    if not ciclo or ciclo.fecha_inicio > date.today():
        return None
    dur = ciclo.duracion_ciclo or 28
    dia = ((date.today() - ciclo.fecha_inicio).days % dur) + 1
    if dia <= 5:
        return (f'Día {dia} del ciclo — Fase MENSTRUAL. Energía y fuerza posiblemente reducidas; '
                'prioriza intensidad moderada, técnica y movilidad, y respeta molestias.')
    if dia <= 13:
        return (f'Día {dia} del ciclo — Fase FOLICULAR. Buena tolerancia a la carga y recuperación; '
                'ventana favorable para mayor intensidad/volumen y trabajo de fuerza.')
    if dia <= 16:
        return (f'Día {dia} del ciclo — OVULACIÓN. Pico de fuerza pero mayor laxitud ligamentosa; '
                'aprovecha la intensidad cuidando la técnica en ejercicios de alto riesgo articular.')
    return (f'Día {dia} del ciclo — Fase LÚTEA. Mayor fatiga percibida y peor recuperación hacia el final; '
            'modera el volumen y prioriza calidad sobre carga máxima.')


# ─── Device data integration (Garmin + Apple Health) ─────────────────────────

def _sleep_score_to_zyfit(sleep_score: float) -> int:
    """
    Mapea un sleep score de dispositivo (0–100) a la escala interna de Zyfit (1–4).
    Compatible con Garmin y Apple Health (que usa la misma escala 0–100).
      0–40 → 1  |  41–60 → 2  |  61–80 → 3  |  81–100 → 4
    """
    if sleep_score <= 40:
        return 1
    if sleep_score <= 60:
        return 2
    if sleep_score <= 80:
        return 3
    return 4


def _best_value(devices: list, field: str):
    """
    Devuelve el primer valor no-None del campo `field` de la lista de dispositivos,
    que ya viene ordenada por last_synced_at desc (el más reciente primero).
    """
    for device in devices:
        val = getattr(device, field, None)
        if val is not None:
            return val
    return None


def process_device_data(user, checkin) -> tuple:
    """
    Consulta todos los dispositivos conectados (Garmin, Apple Health) con sync
    en las últimas 24h y devuelve los mejores valores disponibles por métrica.

    Para cada campo toma el valor más reciente entre todos los dispositivos
    conectados — Garmin y Apple Health pueden coexistir (ej: Apple Watch para
    HRV/sueño y Garmin para entrenamiento).

    Retorna: (hrv_efectivo, calidad_sueno_efectiva, device_context_str)
    """
    from datetime import datetime, timedelta, timezone as dt_timezone
    try:
        from devices.models import DeviceIntegration
        from django.db.models import Avg

        cutoff = datetime.now(dt_timezone.utc) - timedelta(hours=24)
        devices = list(
            DeviceIntegration.objects.filter(
                user=user,
                device__in=['garmin', 'apple_health'],
                status='connected',
                last_synced_at__gte=cutoff,
            ).order_by('-last_synced_at')   # más reciente primero → prioridad natural
        )

        if not devices:
            return checkin.hrv, checkin.calidad_sueno, None

        # Mejor valor disponible por campo (primer no-None de la lista ordenada)
        hrv          = _best_value(devices, 'hrv')
        sleep_score  = _best_value(devices, 'sleep_score')
        resting_hr   = _best_value(devices, 'resting_hr')
        stress_level = _best_value(devices, 'stress_level')
        body_battery = _best_value(devices, 'body_battery')

        hrv_efectivo           = hrv if hrv is not None else checkin.hrv
        calidad_sueno_efectiva = (
            _sleep_score_to_zyfit(sleep_score)
            if sleep_score is not None
            else checkin.calidad_sueno
        )

        # Etiquetas para el bloque de contexto del LLM
        device_labels = {
            'garmin':       'Garmin',
            'apple_health': 'Apple Health',
        }
        sources = ', '.join({device_labels.get(d.device, d.device) for d in devices})
        context_lines = [f'📡 Datos de dispositivo ({sources} — sync últimas 24h):']

        if sleep_score is not None:
            context_lines.append(
                f'  • Sleep Score: {sleep_score:.0f}/100 '
                f'→ calidad sueño ajustada a {calidad_sueno_efectiva}/4'
            )

        if hrv is not None:
            context_lines.append(f'  • HRV nocturno: {hrv:.0f} ms')

        if stress_level is not None:
            # Estrés percibido del perfil (onboarding) en escala 0–100 para combinar
            # con el estrés fisiológico del dispositivo. El check-in no captura un
            # valor numérico de estrés (su estado mental alimenta estado_animo).
            _percibido_map = {'bajo': 30.0, 'moderado': 55.0, 'alto': 80.0}
            try:
                checkin_stress = _percibido_map.get(user.profile.nivel_estres, 50.0)
            except Exception:
                checkin_stress = 50.0
            stress_combinado = (stress_level * 0.6) + (checkin_stress * 0.4)
            context_lines.append(
                f'  • Estrés fisiológico: {stress_level:.0f}/100 (60%) '
                f'+ percibido {checkin_stress:.0f} (40%) = combinado {stress_combinado:.0f}'
            )

        if body_battery is not None:
            context_lines.append(
                f'  • Body Battery: {body_battery:.0f}/100 '
                + ('— carga baja, priorizar recuperación activa' if body_battery < 30
                   else '— energía suficiente para sesión normal' if body_battery < 60
                   else '— alta energía disponible')
            )

        if resting_hr is not None:
            # Comparar contra promedio 30 días de cualquier dispositivo conectado
            try:
                cutoff_30d = datetime.now(dt_timezone.utc) - timedelta(days=30)
                avg_rhr = DeviceIntegration.objects.filter(
                    user=user,
                    device__in=['garmin', 'apple_health'],
                    resting_hr__isnull=False,
                    last_synced_at__gte=cutoff_30d,
                ).aggregate(avg=Avg('resting_hr'))['avg']

                if avg_rhr and resting_hr > avg_rhr + 5:
                    context_lines.append(
                        f'  • FC reposo: {resting_hr:.0f} bpm '
                        f'(+{resting_hr - avg_rhr:.0f} sobre promedio 30d de {avg_rhr:.0f}) '
                        f'— señal de fatiga sistémica: reducir intensidad'
                    )
                else:
                    context_lines.append(
                        f'  • FC reposo: {resting_hr:.0f} bpm (dentro del rango habitual)'
                    )
            except Exception:
                context_lines.append(f'  • FC reposo: {resting_hr:.0f} bpm')

        device_context = '\n'.join(context_lines) if len(context_lines) > 1 else None
        return hrv_efectivo, calidad_sueno_efectiva, device_context

    except Exception as exc:
        logger.warning('process_device_data failed for user %s: %s', user.id, exc)
        return checkin.hrv, checkin.calidad_sueno, None


# ─── Phase 1 & 2: Exercise pool ───────────────────────────────────────────────

def _get_exercise_pool(user, location, dolor_hoy=''):
    """
    Returns (grouped_dict, flat_list) of valid exercises for this user/location.

    Filtering rules:
    - Only active exercises
    - equipamiento must be a subset of location.implementos ([] = always valid)
    - Exclude exercises whose contraindicaciones overlap with:
        * active user injury zones
        * zones mentioned in dolor_hoy text
    """
    implementos_disponibles = set(location.implementos or [])

    # Gather forbidden zones from injuries
    injury_zones = set(
        user.injuries.filter(activa=True).values_list('zona', flat=True)
    )

    # Parse dolor_hoy for zone keywords
    DOLOR_KEYWORDS = {
        'rodilla': 'rodilla',
        'lumbar': 'lumbar',
        'espalda': 'lumbar',
        'hombro': 'hombro',
        'cuello': 'cuello',
        'cadera': 'cadera',
        'tobillo': 'tobillo',
        'muñeca': 'muñeca',
        'codo': 'codo',
        'pecho': 'hombro',
        'abdomen': 'lumbar',
        'muslo': 'cadera',
    }
    if dolor_hoy:
        dolor_lower = dolor_hoy.lower()
        for kw, zona in DOLOR_KEYWORDS.items():
            if kw in dolor_lower:
                injury_zones.add(zona)

    all_active = Exercise.objects.filter(activo=True)

    flat_list = []
    grouped = {}

    for ex in all_active:
        # Equipment check: exercise equipment must be subset of available
        eq_set = set(ex.equipamiento)
        if eq_set and not eq_set.issubset(implementos_disponibles):
            continue

        # Contraindication check
        contra_set = set(ex.contraindicaciones)
        if contra_set & injury_zones:
            continue

        flat_list.append(ex.nombre)
        patron = ex.patron_movimiento
        if patron not in grouped:
            grouped[patron] = []
        grouped[patron].append(ex.nombre)

    return grouped, flat_list


# ─── Phase 3 & 4: Adaptation context ─────────────────────────────────────────

def _build_adaptation_context(user):
    """
    Returns a descriptive text block about the user's training adaptation history.
    """
    try:
        ap = user.adaptation_profile
    except UserAdaptationProfile.DoesNotExist:
        return 'Sin historial suficiente (menos de 3 sesiones completadas).'

    if ap.total_sesiones < 3:
        return 'Sin historial suficiente (menos de 3 sesiones completadas).'

    lines = [
        f'Total sesiones completadas: {ap.total_sesiones}',
    ]

    if ap.rpe_bias is not None:
        bias = float(ap.rpe_bias)
        if bias > 0.5:
            lines.append(
                f'Sesga RPE: el usuario percibe el esfuerzo {bias:+.1f} puntos MÁS alto que el objetivo — '
                f'considera prescribir RPE ligeramente más bajo para compensar.'
            )
        elif bias < -0.5:
            lines.append(
                f'Sesga RPE: el usuario percibe el esfuerzo {bias:+.1f} puntos MÁS bajo que el objetivo — '
                f'puede manejar mayor intensidad de la prescrita.'
            )
        else:
            lines.append(f'RPE percibido muy alineado con el objetivo (desviación: {bias:+.1f}).')

    if ap.cumplimiento_promedio is not None:
        lines.append(f'Cumplimiento promedio histórico: {float(ap.cumplimiento_promedio):.0f}%.')

    if ap.rating_promedio is not None:
        lines.append(f'Satisfacción media de sesiones: {float(ap.rating_promedio):.1f}/5.')

    if ap.volumen_tolerado_semana is not None:
        lines.append(
            f'Volumen tolerado con ≥80% cumplimiento: {ap.volumen_tolerado_semana} sesiones/semana.'
        )

    if ap.patron_preferido:
        label = PATRON_LABELS_CORTO.get(ap.patron_preferido, ap.patron_preferido)
        lines.append(f'Patrón de movimiento más frecuente: {label}.')

    if ap.semanas_carga_consecutivas > 0:
        lines.append(
            f'Semanas de carga consecutivas (≥2 sesiones/semana): {ap.semanas_carga_consecutivas}.'
        )

    # Top exercises by frequency
    top_exs = (
        UserExerciseProfile.objects.filter(user=user)
        .order_by('-veces_realizado')[:5]
    )
    if top_exs:
        nombres = ', '.join(ep.exercise_nombre for ep in top_exs)
        lines.append(f'Ejercicios más realizados: {nombres}.')

    return ' '.join(lines)


# ─── Phase 5: Periodization state ─────────────────────────────────────────────

def _calcular_estado_mesociclo(user):
    """
    Returns a dict describing current periodization state:
    - necesita_deload: bool
    - recomendacion: string
    """
    try:
        ap = user.adaptation_profile
    except UserAdaptationProfile.DoesNotExist:
        return {
            'necesita_deload': False,
            'recomendacion': 'Fase inicial — construye hábito antes de periodizar.',
        }

    if ap.total_sesiones < 3:
        return {
            'necesita_deload': False,
            'recomendacion': 'Historial insuficiente — aplica principios generales de progresión.',
        }

    # Check deload conditions
    necesita_deload = False
    if ap.semanas_carga_consecutivas >= 3:
        # Check cumplimiento last 3 weeks
        hoy = date.today()
        hace_3_semanas = hoy - timedelta(weeks=3)
        from workouts.models import Session as SessionModel, SessionFeedback
        from django.db.models import Avg
        cum_3_semanas = (
            SessionModel.objects.filter(
                user=user,
                fecha__gte=hace_3_semanas,
                feedback__isnull=False,
            ).aggregate(avg=Avg('feedback__cumplimiento'))['avg'] or 100
        )
        if cum_3_semanas < 75:
            necesita_deload = True

    if necesita_deload:
        recomendacion = (
            f'DELOAD recomendado: {ap.semanas_carga_consecutivas} semanas de carga consecutivas '
            f'con cumplimiento reciente bajo. Reduce volumen e intensidad en un 40-50%. '
            f'Prioriza movilidad, técnica y recuperación activa.'
        )
    elif ap.semanas_carga_consecutivas >= 2:
        recomendacion = (
            f'Fase de PROGRESIÓN: {ap.semanas_carga_consecutivas} semanas de carga consecutivas '
            f'con buen cumplimiento. Mantén o incrementa ligeramente el volumen/intensidad '
            f'(+2.5-5% en carga o +1 serie por patrón).'
        )
    else:
        recomendacion = (
            'Fase de ADAPTACIÓN: el usuario está en las primeras semanas. '
            'Prioriza consistencia, técnica correcta y progresión gradual.'
        )

    return {
        'necesita_deload': necesita_deload,
        'recomendacion': recomendacion,
    }


# ─── Prompt builder ───────────────────────────────────────────────────────────

# Movement pattern labels — used in adaptation context and exercise pool formatting.
PATRON_LABELS_CORTO = {
    'empuje_horizontal':  'empuje horizontal',
    'empuje_vertical':    'empuje vertical',
    'jalon_horizontal':   'jalón horizontal',
    'jalon_vertical':     'jalón vertical',
    'sentadilla':         'sentadilla/cuádriceps',
    'bisagra':            'bisagra/cadena posterior',
    'core_antiextension': 'core antiextensión',
    'core_antirrotacion': 'core antirrotación',
    'core_antiflexion':   'core antiflexión lateral',
    'cargada':            'cargada/olímpico',
    'locomocion':         'locomoción/transporte de carga',
    'aislamiento':        'aislamiento muscular',
}

PATRON_LABELS_LARGO = {
    'empuje_horizontal':  'EMPUJE HORIZONTAL (pectoral, tríceps)',
    'empuje_vertical':    'EMPUJE VERTICAL (deltoides, tríceps)',
    'jalon_horizontal':   'JALÓN HORIZONTAL (dorsal, romboides)',
    'jalon_vertical':     'JALÓN VERTICAL (dorsal, bíceps)',
    'sentadilla':         'SENTADILLA / CUÁDRICEPS',
    'bisagra':            'BISAGRA / CADENA POSTERIOR (glúteos, isquiotibiales)',
    'core_antiextension': 'CORE — ANTIEXTENSIÓN (recto abdominal, transverso)',
    'core_antirrotacion': 'CORE — ANTIRROTACIÓN (oblicuos, multífidos)',
    'core_antiflexion':   'CORE — ANTIFLEXIÓN LATERAL (cuadrado lumbar, oblicuos)',
    'cargada':            'CARGADA / MOVIMIENTO OLÍMPICO (cuerpo completo)',
    'locomocion':         'LOCOMOCIÓN / TRANSPORTE DE CARGA (cuerpo completo)',
    'aislamiento':        'AISLAMIENTO MUSCULAR',
}


def _format_exercise_pool(grouped):
    """Format grouped exercise dict as a readable text block."""
    if not grouped:
        return 'No hay ejercicios en el banco para la ubicación actual.'

    lines = []
    for patron, exercises in sorted(grouped.items()):
        label = PATRON_LABELS_LARGO.get(patron, patron.upper())
        lines.append(f'{label}:')
        for ex in exercises:
            lines.append(f'  - {ex}')
    return '\n'.join(lines)


def _format_exercise_pool_enriched(pool: list, priorities: dict) -> str:
    """
    Formats the enriched exercise pool (from AdaptiveEngineService) for the LLM.
    Groups by patron_movimiento sorted by priority; limits to 30 exercises.
    Fase 4: una línea compacta por ejercicio con la prescripción ya calculada.
    """
    if not pool:
        return 'No hay ejercicios disponibles con los filtros aplicados para esta sesión.'

    priorizados  = priorities.get('priorizados', [])
    evitar_set   = set(priorities.get('evitar', []))

    # Group by patron
    by_patron: dict = {}
    for ex in pool:
        by_patron.setdefault(ex['patron_movimiento'], []).append(ex)

    # Sort within each patron: compuestos first, then by veces_realizado desc
    for pat in by_patron:
        by_patron[pat].sort(key=lambda x: (not x['es_compuesto'], -x.get('veces_realizado', 0)))

    # Build ordered patron list
    patron_order: list[str] = []
    for p in priorizados:
        if p in by_patron and p not in evitar_set:
            patron_order.append(p)
    for p in by_patron:
        if p not in patron_order and p not in evitar_set:
            patron_order.append(p)
    for p in evitar_set:
        if p in by_patron:
            patron_order.append(p)

    # Collect up to 30 exercises. El pool es el "menú" del que el LLM elige ~15;
    # 30 da variedad de sobra. Antes era 50, pero con perfiles ricos el prompt
    # llegaba a ~9.3k tokens y, sumado a max_tokens, excedía el límite de 12k
    # TPM de Groq (HTTP 413 → la generación fallaba siempre).
    selected: list[dict] = []
    for pat in patron_order:
        selected.extend(by_patron.get(pat, []))
        if len(selected) >= 30:
            break
    selected = selected[:30]

    PROG = {'incrementar': '↑', 'mantener': '→', 'reducir': '↓', 'consolidar': '⏸'}

    # Fase 4 — Una línea compacta por ejercicio:
    #   • nombre · músculo · REPS @RPE RIR DESC · progresión · carga previa
    # Se omiten descripción y coaching_cues (el LLM redacta el cue) y los metadatos
    # de filtrado (TN/CF/tiempo) que ya cumplieron su función en el motor.
    lines: list[str] = []
    current_patron = None

    for ex in selected:
        pat = ex['patron_movimiento']
        if pat != current_patron:
            current_patron = pat
            label = PATRON_LABELS_CORTO.get(pat, pat).upper()
            if pat in evitar_set:
                label += ' [reciente — solo si no hay alternativa]'
            lines.append(f'\n{label}')

        seg = [f'• {ex["nombre"]}']
        if ex.get('musculos_primarios'):
            seg.append(ex['musculos_primarios'][0])

        if ex.get('reps_objetivo'):
            lo, hi = ex['reps_objetivo']
            reps_txt = f'{lo}-{hi}' if lo != hi else f'{lo}'
            seg.append(
                f'{reps_txt} reps @RPE{ex["rpe_objetivo"]} RIR{ex["rir_objetivo"]} '
                f'desc{ex["descanso_objetivo_s"]}s'
            )
        else:
            seg.append('calentamiento/movilidad')

        if ex.get('primera_vez'):
            seg.append('🆕')
        elif ex.get('progresion'):
            p = PROG.get(ex['progresion'], '')
            if ex.get('rpe_referencia'):
                p += f'{ex["rpe_referencia"]:.1f}'
            if p:
                seg.append(p)
        if ex.get('carga_previa'):
            seg.append(f'prev {ex["carga_previa"]}')

        lines.append('  ' + ' · '.join(seg))

    return '\n'.join(lines)


def _pool_to_grouped(pool: list) -> dict:
    """Converts enriched pool list to legacy grouped dict {patron: [nombres]}."""
    grouped: dict = {}
    for ex in pool:
        grouped.setdefault(ex['patron_movimiento'], []).append(ex['nombre'])
    return grouped


def _get_coach_directiva(user):
    """Directiva activa del coach del atleta (vínculo más reciente con contenido).

    Devuelve un dict {objetivo, foco, evitar, nota} o None. Envuelto en try/except
    para NO romper nunca la generación si algo falla (camino crítico)."""
    try:
        from users.models import CoachAthlete
        # Coach "actual" = vínculo activo más reciente por created_at. MISMO criterio
        # que _athlete_active_link en coach_views, para que el badge "Guiado por X",
        # la config y la directiva apunten siempre al mismo coach (no a uno por
        # antigüedad y otro por la directiva más nueva cuando hay varios coaches).
        link = (CoachAthlete.objects
                .filter(athlete=user, estado=CoachAthlete.ESTADO_ACTIVO)
                .order_by('-created_at')
                .first())
        if link and isinstance(link.directiva, dict):
            d = link.directiva
            if any(d.get(k) for k in ('objetivo', 'foco', 'evitar', 'nota')):
                return d
    except Exception:
        logger.exception('No se pudo leer la directiva del coach para user=%s', getattr(user, 'id', '?'))
    return None


def _get_coach_config(user):
    """Config efectiva del coach activo del atleta (checkin/feedback/ia), o None si
    no tiene coach. Mismo criterio de "coach actual" que la directiva (vínculo
    activo más reciente). Failure-safe: nunca rompe la generación."""
    try:
        from users.models import CoachAthlete, default_coach_config, COACH_CONFIG_KEYS
        link = (CoachAthlete.objects
                .filter(athlete=user, estado=CoachAthlete.ESTADO_ACTIVO)
                .order_by('-created_at').first())
        if not link:
            return None
        cfg = default_coach_config()
        cfg.update({k: bool(v) for k, v in (link.config or {}).items() if k in COACH_CONFIG_KEYS})
        return cfg
    except Exception:
        logger.exception('No se pudo leer la config del coach para user=%s', getattr(user, 'id', '?'))
        return None


def _crear_checkin_neutro(user, hoy):
    """Check-in neutro del día, creado cuando el coach desactivó el check-in
    diario para que la generación proceda sin que el atleta lo complete. Es una
    fila real de DailyCheckin (no un sustituto sintético), así que el FK de la
    sesión y el motor adaptativo funcionan igual que con un check-in normal."""
    from checkins.models import DailyCheckin
    perfil = getattr(user, 'profile', None)
    dur = perfil.duracion_disponible if (perfil and perfil.duracion_disponible) else 60
    dur = max(10, min(300, int(dur)))
    loc = user.locations.order_by('created_at').first()
    return DailyCheckin.objects.create(
        user=user, fecha=hoy, estado_animo=3, calidad_sueno=7,
        duracion_disponible=dur, location=loc, foco_entrenamiento=[],
    )


def build_prompt(ctx):
    # Choose pool formatting: enriched (new) vs grouped (legacy fallback)
    enriched_pool = ctx.get('exercise_pool_enriched')
    priorities    = ctx.get('pattern_priorities', {'priorizados': [], 'evitar': [], 'razon_evitar': {}})

    if enriched_pool is not None:
        exercise_pool_text = _format_exercise_pool_enriched(enriched_pool, priorities)
    else:
        exercise_pool_text = _format_exercise_pool(ctx.get('exercise_pool', {}))

    adaptation_text   = ctx.get('adaptation_context', 'Sin historial suficiente.')
    mesociclo         = ctx.get('estado_mesociclo', {})
    mesociclo_text    = mesociclo.get('recomendacion', '')
    periodizacion_txt = ctx.get('periodizacion', {}).get('prompt_block', '')
    deload_warning  = (
        '\n*** ATENCIÓN: El atleta necesita DELOAD. Reduce volumen e intensidad en un 40-50%. ***'
        if mesociclo.get('necesita_deload')
        else ''
    )

    # DIRECTIVAS section (Paso 6)
    session_meta   = ctx.get('session_meta', {})
    max_sets       = session_meta.get('max_sets_sesion', 20)
    deload_session = session_meta.get('deload_session', False)
    priorizados    = priorities.get('priorizados', [])
    evitar_list    = priorities.get('evitar', [])
    razon_evitar   = priorities.get('razon_evitar', {})

    priorizados_txt = ', '.join(priorizados[:6]) if priorizados else 'libre'
    evitar_txt = (
        ', '.join(f'{p} ({razon_evitar.get(p, "reciente")})' for p in evitar_list)
        if evitar_list else 'ninguno'
    )
    deload_directiva = (
        '\n⚠️ DELOAD ACTIVO: Comunica al usuario que el sistema detectó que su cuerpo necesita recuperación activa. '
        'Tono positivo — es parte inteligente del proceso, no una limitación.'
        if deload_session else ''
    )

    # Presupuesto de volumen semanal (Fase 2): tope DURO de series por grupo muscular.
    # Se muestran solo los grupos del foco de hoy y los que están cerca/encima del MRV,
    # para no inflar el prompt con los 13 grupos.
    volume_budget = session_meta.get('volume_budget') or {}
    focus_vgs = ts.volume_groups_for_foco(ctx.get('foco_entrenamiento')) or set()
    relevantes = {
        vg: b for vg, b in volume_budget.items()
        if vg in focus_vgs or b['restante'] <= 6
    }
    volumen_directiva = ''
    if relevantes:
        en_curso, maxed = [], []
        for vg, b in sorted(relevantes.items(), key=lambda kv: kv[1]['restante']):
            label = ts.vg_label(vg)
            if b['restante'] <= 0:
                maxed.append(label)
            else:
                en_curso.append(f"{label}: quedan {b['restante']} series (semana {b['hechas']}/{b['mrv']})")
        _vol_lines = []
        if en_curso:
            _vol_lines.append('- Volumen semanal restante por grupo (NO superar el restante): ' + '; '.join(en_curso))
        if maxed:
            _vol_lines.append('- Grupos YA en el máximo semanal (NO añadir volumen directo): ' + ', '.join(maxed))
        volumen_directiva = '\n' + '\n'.join(_vol_lines)

    directivas_block = f"""
DIRECTIVAS DE LA SESIÓN (REGLAS DURAS — no negociables):
- Máximo de sets en el bloque principal: {max_sets} (NO superar este límite bajo ninguna circunstancia)
- RPE objetivo: {ctx['rpe_target']}/10 → el atleta termina cada serie con {10 - int(ctx['rpe_target'])} reps en reserva (RIR)
- Patrones priorizados hoy: {priorizados_txt}
- Patrones a evitar si existen alternativas: {evitar_txt}
- Para cada ejercicio del banco, usa los valores PRESCRITOS que trae (reps, descanso, RPE/RIR); NO los recalcules ni los superes — el sistema ya los ajustó por objetivo, periodización, nivel y seguridad.{volumen_directiva}{deload_directiva}
"""

    # Consideraciones médicas declaradas en el onboarding — restricción de seguridad.
    condiciones = ctx.get('condiciones_medicas') or []
    notas_med   = (ctx.get('notas_medicas') or '').strip()
    condiciones_txt = ', '.join(condiciones) if condiciones else 'ninguna declarada'
    if condiciones or notas_med:
        restriccion_medica = (
            '\n   - CONDICIONES MÉDICAS DECLARADAS ('
            + condiciones_txt
            + (f'; notas: {notas_med}' if notas_med else '')
            + '): Adapta la intensidad y la selección de ejercicios a estas condiciones. '
            'Ante hipertensión o cardiopatía evita maniobras de Valsalva, isométricos máximos y RPE ≥ 9; '
            'ante asma o EPOC modera la densidad y los descansos demasiado cortos; '
            'ante osteoporosis o hernias discales evita la carga axial máxima y la flexión espinal cargada. '
            'Prioriza la seguridad sobre la intensidad cuando una condición lo exija.'
        )
    else:
        restriccion_medica = ''

    # Directiva del coach (Fase 3): guía de alta prioridad fijada por el coach del
    # atleta. Se respeta por encima de las preferencias, pero SIEMPRE por debajo de
    # las restricciones absolutas de seguridad (dolor, médicas, implementos).
    cd = ctx.get('coach_directiva') or {}
    cd_lines = []
    if cd.get('objetivo'):
        cd_lines.append(f"   - Objetivo de la semana fijado por el coach: {cd['objetivo']}")
    if cd.get('foco'):
        cd_lines.append(f"   - Enfatiza especialmente: {cd['foco']}")
    if cd.get('evitar'):
        cd_lines.append(f"   - Evita (indicación del coach): {cd['evitar']}")
    if cd.get('nota'):
        cd_lines.append(f"   - Nota del coach: {cd['nota']}")
    directiva_coach = (
        "\n   - DIRECTIVA DEL ENTRENADOR (alta prioridad — el coach del atleta la fijó; síguela "
        "salvo que choque con una restricción absoluta de seguridad de arriba):\n"
        + "\n".join(cd_lines)
    ) if cd_lines else ''

    return f"""
Eres un entrenador personal y científico del ejercicio de élite. Tienes formación en fisiología del ejercicio, periodización y nutrición deportiva. Cada decisión que tomas está respaldada por evidencia científica de nivel A (meta-análisis y revisiones sistemáticas).

PERFIL COMPLETO DEL ATLETA:
- Nombre: {ctx['nombre']}
- Edad: {ctx['edad'] or 'no especificada'}
- Sexo biológico: {ctx['sexo'] or 'no especificado'}
- Peso: {f"{ctx['peso']} kg" if ctx['peso'] else 'no especificado'}
- Altura: {f"{ctx['altura']} cm" if ctx['altura'] else 'no especificada'}
- Objetivo principal: {ctx['objetivo']}
- Nivel de experiencia: {ctx['nivel']}{f" (nivel técnico {ctx['nivel_experiencia']}/5)" if ctx.get('nivel_experiencia') else ''}
- Experiencia deportiva previa: {ctx['experiencia_deportiva'] or 'ninguna especificada'}
- Lesiones o limitaciones: {ctx['lesiones'] or 'ninguna'}
- Condiciones médicas declaradas: {', '.join(ctx['condiciones_medicas']) if ctx.get('condiciones_medicas') else 'ninguna'}
- Notas médicas adicionales: {ctx.get('notas_medicas') or 'ninguna'}
- Estilo de entrenamiento preferido: {ctx['estilo_entrenamiento'] or 'no especificado'}
- Ejercicios favoritos: {ctx['ejercicios_favoritos'] or 'ninguno especificado'}
- Ejercicios a evitar: {ctx['ejercicios_evitar'] or 'ninguno'}
- Días de entrenamiento por semana: {ctx['dias_semana'] or 3}
- Horario preferido: {ctx['horario_preferido'] or 'no especificado'}
- Nivel de estrés habitual: {ctx['nivel_estres'] or 'no especificado'}
- Tipo de trabajo: {ctx['tipo_trabajo'] or 'no especificado'}

MARCADORES DE RENDIMIENTO (1RM):
- Sentadilla: {f"{ctx['rm_sentadilla']} kg" if ctx['rm_sentadilla'] else 'desconocido'}
- Peso muerto: {f"{ctx['rm_peso_muerto']} kg" if ctx['rm_peso_muerto'] else 'desconocido'}
- Press banca: {f"{ctx['rm_press_banca']} kg" if ctx['rm_press_banca'] else 'desconocido'}
- Press hombro: {f"{ctx['rm_press_hombro']} kg" if ctx['rm_press_hombro'] else 'desconocido'}

ESTADO HOY:
- Estado de ánimo: {ctx['estado_animo']}/5
- Calidad de sueño: {ctx['calidad_sueno']}{'h' if isinstance(ctx['calidad_sueno'], (int, float)) and ctx['calidad_sueno'] > 4 else '/4'}
- HRV: {ctx['hrv'] or 'no disponible'}
- Notas del usuario: {ctx['notas'] or 'ninguna'}
- Dolor o molestia HOY: {ctx['dolor_hoy'] or 'ninguno reportado'}
- Foco de entrenamiento solicitado: {', '.join(ctx['foco_entrenamiento']) if ctx['foco_entrenamiento'] else 'libre — decide tú según el contexto'}
- Fatiga acumulada últimas 72h: {ctx['fatiga']}
- RPE objetivo calculado: {ctx['rpe_target']}/10
{(chr(10) + ctx['garmin_context']) if ctx.get('garmin_context') else ''}

SESIÓN DE HOY:
- Ubicación: {ctx['ubicacion_nombre']} ({ctx['ubicacion_tipo']})
- Implementos disponibles: {', '.join(ctx['implementos']) if ctx['implementos'] else 'solo peso corporal'}
- Duración disponible: {ctx['duracion']} minutos

COMPETICIÓN PRÓXIMA:
{f"- {ctx['competicion_nombre']} el {ctx['competicion_fecha']}" if ctx.get('competicion_nombre') else '- Ninguna en los próximos 14 días'}

FASE DEL CICLO MENSTRUAL:
{ctx.get('fases_ciclo') or 'No aplica o no disponible'}

---

BANCO DE EJERCICIOS VALIDADOS:
Los siguientes ejercicios han sido pre-filtrados para esta sesión: cumplen con los implementos disponibles y NO tienen contraindicaciones absolutas con las lesiones activas ni el dolor reportado hoy.
Formato de cada línea: • ejercicio · músculo principal · REPS @RPE RIR DESC (YA prescritos por el sistema) · progresión (↑ subir / → mantener / ↓ bajar / 🆕 primera vez) · prev = última carga registrada.

{exercise_pool_text}

INSTRUCCIÓN CRÍTICA: DEBES elegir ejercicios EXCLUSIVAMENTE del banco de ejercicios validados listado arriba. Solo si el banco no tiene suficientes ejercicios para un patrón puedes crear uno nuevo, siempre que cumpla con los implementos disponibles y no tenga contraindicaciones.

---

HISTORIAL DE ADAPTACIÓN DEL USUARIO:
{adaptation_text}

---

ESTADO DEL MESOCICLO:
{mesociclo_text}{deload_warning}

{periodizacion_txt}

{directivas_block}

---

PRINCIPIOS CIENTÍFICOS QUE DEBES APLICAR OBLIGATORIAMENTE:

1. VOLUMEN EFECTIVO (Schoenfeld, 2017; Krieger, 2010)
   - Principiante: 10-15 series semanales por grupo muscular
   - Intermedio: 15-20 series semanales
   - Avanzado: 20-25 series semanales
   - Distribuye el volumen de hoy según la fatiga acumulada: si es ALTA reduce 30-40%, si es MEDIA reduce 15-20%
   - Nunca superes el umbral de volumen máximo recuperable (MRV) en una sola sesión

2. INTENSIDAD Y RPE (Zourdos et al., 2016; Helms et al., 2018)
   - RPE objetivo para hoy: {ctx['rpe_target']}/10
   - Si tienes 1RM disponible, calcula las cargas usando la fórmula de Epley: Carga = 1RM × (1 - reps/30)
   - RIR (Reps In Reserve) = 10 - RPE. Hoy el atleta debe terminar cada serie con {10 - int(ctx['rpe_target'])} reps en reserva
   - Fatiga alta o HRV bajo → prioriza RPE 6-7, técnica sobre carga
   - Estado de ánimo bajo (≤2) → reduce intensidad, aumenta componente de movilidad

3. SELECCIÓN DE EJERCICIOS (Baz-Valle et al., 2022)
   - USA EXCLUSIVAMENTE los implementos disponibles: {', '.join(ctx['implementos']) if ctx['implementos'] else 'peso corporal'}
   - NUNCA incluyas ejercicios que requieran implementos no disponibles
   - Prioriza ejercicios multiarticulares (mayor estímulo hormonal y neuromuscular)
   - Ajusta la complejidad técnica al nivel del atleta: a menor nivel de experiencia, patrones más simples y estables; a mayor nivel, mayor demanda técnica y coordinativa permitida
   - Incluye variedad: no repitas el mismo patrón de movimiento más de 2 veces en la misma sesión
   - Respeta ejercicios a evitar: {ctx['ejercicios_evitar'] or 'ninguno'}
   - Considera ejercicios favoritos cuando sea apropiado: {ctx['ejercicios_favoritos'] or 'ninguno especificado'}

4. ESTRUCTURA DE LA SESIÓN (NSCA Guidelines, 2022)
   - Calentamiento: activación neuromuscular progresiva, movilidad específica, 8-12 min
   - Bloque principal: ejercicios ordenados de mayor a menor demanda neuromuscular (compuestos primero)
   - Vuelta a la calma: estiramientos estáticos, trabajo de movilidad, respiración, 8-10 min
   - Tiempo total: exactamente {ctx['duracion']} minutos incluyendo todas las fases

5. PERIODIZACIÓN SEGÚN OBJETIVO (Issurin, 2010; Bompa & Buzzichelli, 2018)
   - Pérdida de grasa: densidad alta, descansos cortos (45-75s), supersets ocasionales
   - Ganancia muscular: 3-4 series, 6-12 reps, descansos 90-120s, énfasis en tensión mecánica
   - Rendimiento deportivo: trabajo de potencia, movimientos explosivos, especificidad
   - Resistencia: volumen moderado-alto, intensidad moderada, descansos cortos
   - Salud general: variedad, movimientos funcionales, bajo impacto articular

6. ADAPTACIONES POR SEXO BIOLÓGICO (Sung et al., 2014; Tarnopolsky, 2008)
   {'- Las mujeres tienen mayor resistencia a la fatiga → pueden manejar más volumen por sesión\n   - Mayor capacidad de recuperación → descansos pueden ser ligeramente más cortos\n   - Énfasis en cadena posterior y glúteos cuando sea apropiado al objetivo' if ctx['sexo'] == 'femenino' else '- Mayor capacidad de generar fuerza máxima → puede priorizar trabajo de alta intensidad\n   - Responde bien a volumen alto con recuperación adecuada' if ctx['sexo'] == 'masculino' else '- Aplica principios generales de periodización'}

7. CONTEXTO DE VIDA (Kreher & Schwartz, 2012)
   - Trabajo {ctx['tipo_trabajo'] or 'mixto'}: {'ya tiene demanda física diaria, reduce volumen total en 10-15%' if ctx['tipo_trabajo'] == 'activo' else 'mayor potencial de recuperación entre sesiones' if ctx['tipo_trabajo'] == 'sedentario' else 'considera fatiga acumulada moderada'}
   - Estrés {ctx['nivel_estres'] or 'moderado'}: {'el cortisol elevado interfiere con la recuperación, reduce intensidad y prioriza ejercicios placenteros' if ctx['nivel_estres'] == 'alto' else 'óptimo para sesiones de alta demanda' if ctx['nivel_estres'] == 'bajo' else 'monitorea señales de fatiga'}
   - Sueño {ctx['calidad_sueno']}h: {'privación de sueño significativa, reduce RPE objetivo en 1 punto adicional' if float(ctx['calidad_sueno']) < 6 else 'sueño subóptimo, modera la intensidad' if float(ctx['calidad_sueno']) < 7 else 'recuperación adecuada'}

---

INSTRUCCIONES FINALES:
0. RESTRICCIONES ABSOLUTAS — estas son reglas que NO puedes violar bajo ninguna circunstancia:
   - Si hay dolor o molestia reportada hoy ("{ctx['dolor_hoy'] or 'ninguno'}"), NUNCA incluyas ejercicios que involucren esa zona corporal. Esto es innegociable.
   - Si el usuario especificó un foco de entrenamiento, la sesión DEBE centrarse en ese foco.
   - Los implementos disponibles son: {', '.join(ctx['implementos']) if ctx['implementos'] else 'solo peso corporal'}. NUNCA uses un implemento que no esté en esta lista.
   - ELIGE ÚNICAMENTE ejercicios del banco de ejercicios validados listado arriba.
   - NO superes {max_sets} sets en el bloque principal.{restriccion_medica}{directiva_coach}
1. Genera UNA sesión completa para HOY, no un plan semanal
2. Cada ejercicio debe ser ejecutable con los implementos disponibles — verifica esto antes de incluirlo
3. La nota del entrenador DEBE citar al menos 2 principios científicos específicos explicando POR QUÉ la sesión está diseñada así hoy
4. Las notas de cada ejercicio deben incluir un cue técnico clave basado en biomecánica
5. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown

JSON requerido:
{{
  "titulo": "nombre descriptivo y motivador de la sesión",
  "objetivo_sesion": "qué adaptación fisiológica específica se busca hoy en una frase",
  "rpe_target": {ctx['rpe_target']},
  "duracion_total": {ctx['duracion']},
  "fases": [
    {{
      "nombre": "Calentamiento",
      "duracion_minutos": 10,
      "ejercicios": [
        {{
          "nombre": "nombre del ejercicio",
          "series": 2,
          "repeticiones": "30 segundos",
          "descanso_segundos": 15,
          "rpe_sugerido": 4,
          "notas": "cue técnico biomecánico específico"
        }}
      ]
    }},
    {{
      "nombre": "Bloque principal",
      "duracion_minutos": 40,
      "ejercicios": []
    }},
    {{
      "nombre": "Vuelta a la calma",
      "duracion_minutos": 10,
      "ejercicios": []
    }}
  ],
  "nota_del_entrenador": "máximo 2 oraciones explicando por qué esta sesión está diseñada así HOY específicamente",
  "decisions_log": [
    {{
      "icon": "🔬",
      "text": "Decisión clave del sistema en 1 oración con referencia científica si aplica"
    }}
  ]
}}
"""


# ─── Main generate view ───────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([GenerateSessionRateThrottle])
def generate_session(request):
    user = request.user
    _gen_t0 = _time.monotonic()  # cronómetro de generación (salud del motor)
    hoy = _get_local_date(request)  # fecha local del dispositivo, no UTC
    hace_14_dias = hoy - timedelta(days=14)

    try:
        perfil = user.profile
    except Exception:
        return Response({'error': 'Perfil no encontrado. Completa el onboarding.'}, status=400)

    # Config del coach (failure-safe; None si el atleta no tiene coach → camino
    # crítico intacto). Controla dos cosas en la generación:
    #   · ia=False      → el coach pausó la generación con IA (bloquea, 403).
    #   · checkin=False  → el coach quitó el check-in diario (se provisiona uno
    #                      neutro si falta, en vez de exigirlo).
    coach_cfg = _get_coach_config(user)
    if coach_cfg and not coach_cfg.get('ia', True):
        return Response({
            'coach_pausa_ia': True,
            'error': 'Tu coach pausó la generación automática con IA.',
        }, status=403)

    checkin = user.checkins.select_related('location').filter(fecha=hoy).order_by('-created_at').first()
    if not checkin:
        if coach_cfg and not coach_cfg.get('checkin', True):
            checkin = _crear_checkin_neutro(user, hoy)
        else:
            return Response({'error': 'Necesitas completar el check-in de hoy primero.'}, status=400)

    if checkin.location:
        loc = checkin.location
    else:
        loc = user.locations.order_by('created_at').first()
        if not loc:
            loc = SimpleNamespace(nombre='Sin ubicación', tipo='casa', implementos=[])

    sesiones_recientes = user.sessions.filter(created_at__date__gte=hace_14_dias)
    fatiga = calcular_fatiga(sesiones_recientes)

    # ── Datos de dispositivo (Garmin / Apple Health) ──────────────────────────
    checkin_hrv, calidad_sueno_efectiva, device_context = process_device_data(user, checkin)

    rpe_target = calcular_rpe_target(fatiga, checkin.estado_animo, checkin_hrv)

    competicion = user.competitions.filter(
        fecha__gte=hoy,
        fecha__lte=hoy + timedelta(days=14)
    ).order_by('fecha').first()

    # Adaptive engine: Pasos 3, 4, 5
    engine = AdaptiveEngineService(user, checkin, loc, perfil)
    exercise_pool_enriched = engine.get_exercise_pool()

    # Fallback to legacy pool if normalized tables return too few exercises
    uso_fallback = False
    if len(exercise_pool_enriched) < 5:
        logger.warning(
            'adaptive_engine pool too small (%d) for user %s — falling back to legacy pool',
            len(exercise_pool_enriched), user.id,
        )
        exercise_pool_enriched = None  # signal build_prompt to use legacy formatter
        uso_fallback = True            # motor degradado: salud del motor lo monitorea

    pattern_priorities = engine.get_pattern_priorities()

    # Adaptation context (existing function, unchanged)
    adaptation_context = _build_adaptation_context(user)

    # Mesocycle / periodization state (existing function, unchanged)
    estado_mesociclo = _calcular_estado_mesociclo(user)

    # Step 6: periodization params from active TrainingCycle
    periodizacion = engine.get_periodization_params()

    # Enrich with load data
    is_deload_session = estado_mesociclo.get('necesita_deload', False) or periodizacion.get('is_deload', False)
    if exercise_pool_enriched is not None:
        exercise_pool_enriched, session_meta = engine.enrich_with_load(
            exercise_pool_enriched,
            deload_session=is_deload_session,
            rpe_target=rpe_target,
            fatiga=fatiga,
            periodizacion=periodizacion,
        )
        exercise_pool_legacy = {}
    else:
        # Legacy fallback: build grouped dict and skip enrichment
        exercise_pool_legacy, _ = _get_exercise_pool(user, loc, dolor_hoy=checkin.dolor_hoy or '')
        session_meta = {'deload_session': False, 'max_sets_sesion': 20}

    ctx = {
        'nombre': perfil.nombre,
        'objetivo': perfil.objetivo or 'salud general',
        'nivel': perfil.nivel,
        'nivel_experiencia': perfil.nivel_experiencia,
        'lesiones': perfil.lesiones,
        'condiciones_medicas': perfil.condiciones_medicas or [],
        'notas_medicas': perfil.notas_medicas or '',
        'experiencia_deportiva': perfil.experiencia_deportiva,
        'edad': perfil.edad,
        'sexo': perfil.sexo,
        'peso': perfil.peso,
        'altura': perfil.altura,
        'dias_semana': perfil.dias_semana,
        'horario_preferido': perfil.horario_preferido,
        'nivel_estres': perfil.nivel_estres,
        'tipo_trabajo': perfil.tipo_trabajo,
        'estilo_entrenamiento': perfil.estilo_entrenamiento,
        'ejercicios_favoritos': perfil.ejercicios_favoritos,
        'ejercicios_evitar': perfil.ejercicios_evitar,
        'rm_sentadilla': perfil.rm_sentadilla,
        'rm_peso_muerto': perfil.rm_peso_muerto,
        'rm_press_banca': perfil.rm_press_banca,
        'rm_press_hombro': perfil.rm_press_hombro,
        'estado_animo': checkin.estado_animo,
        'calidad_sueno': calidad_sueno_efectiva,
        'hrv': checkin_hrv,
        'notas': checkin.notas,
        'garmin_context': device_context,
        'fatiga': fatiga,
        'rpe_target': rpe_target,
        'duracion': checkin.duracion_disponible,
        'ubicacion_nombre': loc.nombre,
        'ubicacion_tipo': loc.tipo,
        'implementos': loc.implementos or [],
        'competicion_nombre': competicion.nombre if competicion else None,
        'competicion_fecha': str(competicion.fecha) if competicion else None,
        'fases_ciclo': _calcular_fase_ciclo(user),
        'dolor_hoy': checkin.dolor_hoy,
        'foco_entrenamiento': checkin.foco_entrenamiento or [],
        'exercise_pool': exercise_pool_legacy,
        'exercise_pool_enriched': exercise_pool_enriched,
        'pattern_priorities': pattern_priorities,
        'session_meta': session_meta,
        'adaptation_context': adaptation_context,
        'estado_mesociclo': estado_mesociclo,
        'periodizacion': periodizacion,
        'coach_directiva': _get_coach_directiva(user),
    }

    prompt = build_prompt(ctx)

    try:
        # Fase 4: con el banco comprimido (1 línea/ejercicio) y los valores ya
        # prescritos, el LLM razona menos y produce salida más corta. max_tokens=3000
        # deja margen contra truncado y mantiene prompt+salida bajo el 12k TPM de Groq.
        sesion_generada, _groq_usage = _call_groq(
            prompt, max_tokens=3000, user_id=user.id, return_usage=True,
        )
    except json.JSONDecodeError:
        logger.exception('Groq returned invalid JSON for user %s', user.id)
        return Response(
            {'error': 'La IA devolvió una respuesta inválida. Intenta de nuevo.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except (ValueError, RuntimeError) as e:
        logger.exception('AI generation failed for user %s', user.id)
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception:
        logger.exception('Unexpected error during AI generation for user %s', user.id)
        return Response(
            {'error': 'Servicio de IA no disponible. Intenta de nuevo en unos segundos.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Basic shape validation — the prompt asks for these keys; reject if missing.
    if not isinstance(sesion_generada, dict) or 'fases' not in sesion_generada:
        logger.error('Groq response missing "fases" for user %s: %s', user.id, sesion_generada)
        return Response(
            {'error': 'La IA devolvió una respuesta incompleta. Intenta de nuevo.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # GEN-3: red de seguridad — descarta ejercicios contraindicados que el LLM haya
    # elegido fuera del pool ya filtrado (lesiones activas / dolor de hoy).
    _drop_contraindicated_exercises(sesion_generada, engine._get_injury_zones(), user.id)

    volumen = 'bajo' if fatiga == 'alto' else 'medio' if fatiga == 'medio' else 'alto'

    db_location = loc if isinstance(loc, user.locations.model) else None

    with transaction.atomic():
        # GEN-2: reemplaza la sesión del día aún no ejecutada (sin inicio_real ni
        # feedback) para no acumular duplicados al regenerar.
        user.sessions.filter(
            fecha=hoy, inicio_real__isnull=True, feedback__isnull=True,
        ).delete()
        sesion = Session.objects.create(
            user=user,
            checkin=checkin,
            location=db_location,
            fecha=hoy,
            duracion_planificada=checkin.duracion_disponible,
            rpe_target=rpe_target,
            volumen_relativo=volumen,
            prompt_usado=prompt,
            respuesta_ia=sesion_generada,
            decisiones=sesion_generada.get('decisions_log'),
            # Salud del motor: duración total server-side + tokens + flag de fallback.
            generacion_ms=int((_time.monotonic() - _gen_t0) * 1000),
            tokens_in=_groq_usage.get('tokens_in'),
            tokens_out=_groq_usage.get('tokens_out'),
            uso_fallback=uso_fallback,
        )
        _persist_session_exercises(sesion, sesion_generada)

    # Invalidar caché del insight y del saludo para regenerarlos con la nueva sesión
    from workouts.models import DailyCoachInsight, DailySaludo
    DailyCoachInsight.objects.filter(user=user, fecha=hoy).delete()
    DailySaludo.objects.filter(user=user, fecha=hoy).delete()

    return Response({'sesion': sesion_generada, 'sesion_id': sesion.id})


def _drop_contraindicated_exercises(sesion_generada, injury_zones, user_id):
    """Red de seguridad final: quita de la sesión generada los ejercicios del
    catálogo cuyas contraindicaciones chocan con lesiones activas o el dolor de hoy.
    El LLM debe elegir solo del pool ya filtrado, pero si se desvía a un ejercicio
    contraindicado del catálogo, lo eliminamos antes de persistir. Devuelve cuántos
    se descartaron."""
    if not injury_zones or not isinstance(sesion_generada, dict):
        return 0
    nombres = [
        str(ej.get('nombre', '')).strip()
        for fase in sesion_generada.get('fases', []) or []
        for ej in (fase.get('ejercicios', []) or [])
        if str(ej.get('nombre', '')).strip()
    ]
    if not nombres:
        return 0
    contra_por_nombre = {
        e.nombre.lower(): set(e.contraindicaciones or [])
        for e in Exercise.objects.filter(nombre__in=nombres)
    }
    dropped = 0
    for fase in sesion_generada.get('fases', []) or []:
        keep = []
        for ej in (fase.get('ejercicios', []) or []):
            nombre = str(ej.get('nombre', '')).strip()
            if contra_por_nombre.get(nombre.lower(), set()) & injury_zones:
                dropped += 1
                logger.warning(
                    'generate: ejercicio contraindicado descartado "%s" (lesiones=%s) user=%s',
                    nombre, sorted(injury_zones), user_id,
                )
                continue
            keep.append(ej)
        fase['ejercicios'] = keep
    return dropped


def _persist_session_exercises(sesion, sesion_generada):
    """Parse the AI response and create SessionExercise rows for analytics/history."""
    orden = 1
    to_create = []
    for fase in sesion_generada.get('fases', []) or []:
        for ej in fase.get('ejercicios', []) or []:
            try:
                nombre = str(ej.get('nombre', '')).strip()[:200]
                if not nombre:
                    continue
                series = int(ej.get('series', 0) or 0)
                descanso = int(ej.get('descanso_segundos', 0) or 0)
                repeticiones = str(ej.get('repeticiones', ''))[:50]
                rpe_raw = ej.get('rpe_sugerido')
                rpe = float(rpe_raw) if rpe_raw is not None else None
                notas = str(ej.get('notas', '') or '')
                to_create.append(SessionExercise(
                    session=sesion,
                    orden=orden,
                    nombre=nombre,
                    series=series,
                    repeticiones=repeticiones,
                    descanso_segundos=descanso,
                    rpe_sugerido=rpe,
                    notas=notas,
                ))
                orden += 1
            except (TypeError, ValueError):
                # Skip malformed exercise entries rather than failing the whole save
                continue
    if to_create:
        SessionExercise.objects.bulk_create(to_create)


# ─── Regenerar ejercicio ──────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([RegenerarEjercicioRateThrottle])
def regenerar_ejercicio(request):
    def _clean(value, max_len):
        if value is None:
            return ''
        return str(value).replace('\n', ' ').replace('\r', ' ').strip()[:max_len]

    nombre_ejercicio = _clean(request.data.get('nombre'), 120)
    fase             = _clean(request.data.get('fase'), 50)
    motivo           = _clean(request.data.get('motivo'), 200)

    if not nombre_ejercicio:
        return Response(
            {'error': 'El nombre del ejercicio es requerido'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Resolve implementos from the session's location
    implementos = []
    session_id = request.data.get('session_id')
    if session_id:
        try:
            from workouts.models import Session as WorkoutSession
            session_obj = request.user.sessions.select_related('location').get(pk=session_id)
            if session_obj.location and session_obj.location.implementos:
                implementos = [_clean(i, 50) for i in session_obj.location.implementos[:30] if i]
        except Exception:
            pass

    # Resolve active injuries from user profile
    lesiones = []
    try:
        lesiones = list(request.user.injuries.filter(activa=True).values_list('zona', flat=True))
    except Exception:
        pass

    motivo_texto = motivo or 'el usuario quiere una variante diferente'
    impl_texto   = ', '.join(implementos) if implementos else 'peso corporal / sin equipamiento'
    lesion_texto = ', '.join(lesiones) if lesiones else 'ninguna'

    prompt = f"""Eres un entrenador personal de élite. Un usuario quiere sustituir un ejercicio de su sesión.

Ejercicio a sustituir: {nombre_ejercicio}
Fase de la sesión: {fase or 'principal'}
Motivo de la sustitución: {motivo_texto}
Equipamiento disponible: {impl_texto}
Lesiones activas del usuario: {lesion_texto}

Genera exactamente 2 ejercicios alternativos que:
1. Sean ejecutables con el equipamiento disponible
2. Trabajen el mismo grupo muscular o patrón de movimiento que el original
3. Respeten las lesiones activas
4. Sean distintos entre sí

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{{
  "alternativas": [
    {{
      "nombre": "nombre del ejercicio",
      "series": 3,
      "repeticiones": "10-12",
      "descanso_segundos": 90,
      "rpe_sugerido": 7,
      "notas": "cue técnico en 1 frase",
      "por_que": "razón de por qué es buena sustitución para este usuario en 1 frase"
    }},
    {{
      "nombre": "nombre del ejercicio",
      "series": 3,
      "repeticiones": "10-12",
      "descanso_segundos": 90,
      "rpe_sugerido": 7,
      "notas": "cue técnico en 1 frase",
      "por_que": "razón de por qué es buena sustitución para este usuario en 1 frase"
    }}
  ]
}}"""

    try:
        result = _call_groq(prompt, max_tokens=700)
    except json.JSONDecodeError:
        logger.exception('Groq returned invalid JSON in regenerar for user %s', request.user.id)
        return Response(
            {'error': 'La IA devolvió una respuesta inválida.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception:
        logger.exception('Regenerar ejercicio failed for user %s', request.user.id)
        return Response(
            {'error': 'No se pudo buscar alternativas. Intenta de nuevo.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    alternativas = result.get('alternativas') if isinstance(result, dict) else None
    if not isinstance(alternativas, list) or len(alternativas) == 0:
        return Response(
            {'error': 'La IA devolvió una respuesta incompleta.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({'alternativas': alternativas})


# ─── Ajustar sesión (regenerate with overrides) ──────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AjustarSesionRateThrottle])
def session_ajustar(request, pk):
    """Re-generate an existing session with duration and/or RPE overrides."""
    from types import SimpleNamespace

    try:
        session = (
            request.user.sessions
            .select_related('checkin', 'location', 'checkin__location')
            .get(pk=pk)
        )
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    try:
        duracion_delta = int(request.data.get('duracion_delta', 0))
        rpe_delta      = int(request.data.get('rpe_delta', 0))
    except (TypeError, ValueError):
        return Response({'error': 'Parámetros inválidos.'}, status=status.HTTP_400_BAD_REQUEST)

    duracion_delta = max(-30, min(30, duracion_delta))
    rpe_delta      = max(-2,  min(2,  rpe_delta))

    user    = request.user
    checkin = session.checkin

    # Resolve location (prefer session.location, fallback to checkin.location, then first)
    if session.location:
        loc = session.location
    elif checkin and checkin.location:
        loc = checkin.location
    else:
        loc = user.locations.order_by('created_at').first()
        if not loc:
            loc = SimpleNamespace(nombre='Sin ubicación', tipo='casa', implementos=[])

    duracion_base = session.duracion_planificada or (checkin.duracion_disponible if checkin else 60)
    rpe_base      = float(session.rpe_target)

    nueva_duracion = max(20, min(120, duracion_base + duracion_delta))
    nuevo_rpe      = round(max(4.0, min(9.0, rpe_base + rpe_delta)), 1)

    try:
        perfil = user.profile
    except Exception:
        return Response({'error': 'Perfil no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)

    dolor_hoy = (checkin.dolor_hoy or '') if checkin else ''

    hoy = _get_local_date(request)  # fecha local del dispositivo, no UTC
    competicion = user.competitions.filter(
        fecha__gte=hoy,
        fecha__lte=hoy + timedelta(days=14),
    ).order_by('fecha').first()

    sesiones_recientes = user.sessions.filter(created_at__date__gte=hoy - timedelta(days=14))
    fatiga = calcular_fatiga(sesiones_recientes)

    # Build a checkin-like object for AdaptiveEngineService when checkin is None
    checkin_for_engine = checkin or SimpleNamespace(
        dolor_hoy=dolor_hoy,
        duracion_disponible=nueva_duracion,
        estado_fisico=None,
        estado_animo=3,
        foco_entrenamiento=[],
    )

    engine = AdaptiveEngineService(user, checkin_for_engine, loc, perfil)
    exercise_pool_enriched = engine.get_exercise_pool()
    if len(exercise_pool_enriched) < 5:
        exercise_pool_enriched = None
    pattern_priorities = engine.get_pattern_priorities()
    adaptation_context = _build_adaptation_context(user)
    estado_mesociclo   = _calcular_estado_mesociclo(user)
    periodizacion      = engine.get_periodization_params()
    is_deload_session  = estado_mesociclo.get('necesita_deload', False) or periodizacion.get('is_deload', False)
    if exercise_pool_enriched is not None:
        exercise_pool_enriched, session_meta = engine.enrich_with_load(
            exercise_pool_enriched,
            deload_session=is_deload_session,
            rpe_target=nuevo_rpe,
            fatiga=fatiga,
            periodizacion=periodizacion,
        )
        exercise_pool_legacy = {}
    else:
        exercise_pool_legacy, _ = _get_exercise_pool(user, loc, dolor_hoy=dolor_hoy)
        session_meta = {'deload_session': False, 'max_sets_sesion': 20}

    ctx = {
        'nombre':               perfil.nombre,
        'objetivo':             perfil.objetivo or 'salud general',
        'nivel':                perfil.nivel,
        'nivel_experiencia':    perfil.nivel_experiencia,
        'lesiones':             perfil.lesiones,
        'condiciones_medicas':  perfil.condiciones_medicas or [],
        'notas_medicas':        perfil.notas_medicas or '',
        'experiencia_deportiva': perfil.experiencia_deportiva,
        'edad':                 perfil.edad,
        'sexo':                 perfil.sexo,
        'peso':                 perfil.peso,
        'altura':               perfil.altura,
        'dias_semana':          perfil.dias_semana,
        'horario_preferido':    perfil.horario_preferido,
        'nivel_estres':         perfil.nivel_estres,
        'tipo_trabajo':         perfil.tipo_trabajo,
        'estilo_entrenamiento': perfil.estilo_entrenamiento,
        'ejercicios_favoritos': perfil.ejercicios_favoritos,
        'ejercicios_evitar':    perfil.ejercicios_evitar,
        'rm_sentadilla':        perfil.rm_sentadilla,
        'rm_peso_muerto':       perfil.rm_peso_muerto,
        'rm_press_banca':       perfil.rm_press_banca,
        'rm_press_hombro':      perfil.rm_press_hombro,
        'estado_animo':         checkin.estado_animo if checkin else 3,
        'calidad_sueno':        checkin.calidad_sueno if checkin else 7,
        'hrv':                  checkin.hrv if checkin else None,
        'notas':                checkin.notas if checkin else None,
        'fatiga':               fatiga,
        'rpe_target':           nuevo_rpe,
        'duracion':             nueva_duracion,
        'ubicacion_nombre':     loc.nombre,
        'ubicacion_tipo':       loc.tipo,
        'implementos':          loc.implementos or [],
        'competicion_nombre':   competicion.nombre if competicion else None,
        'competicion_fecha':    str(competicion.fecha) if competicion else None,
        'fases_ciclo':          _calcular_fase_ciclo(user),
        'dolor_hoy':            dolor_hoy,
        'foco_entrenamiento':   (checkin.foco_entrenamiento or []) if checkin else [],
        'exercise_pool':        exercise_pool_legacy,
        'exercise_pool_enriched': exercise_pool_enriched,
        'pattern_priorities':   pattern_priorities,
        'session_meta':         session_meta,
        'adaptation_context':   adaptation_context,
        'estado_mesociclo':     estado_mesociclo,
        'periodizacion':        periodizacion,
        'coach_directiva':      _get_coach_directiva(user),
    }

    prompt = build_prompt(ctx)

    try:
        sesion_generada = _call_groq(prompt, max_tokens=3000, user_id=user.id)
    except json.JSONDecodeError:
        logger.exception('Groq invalid JSON in ajustar for user %s', user.id)
        return Response(
            {'error': 'La IA devolvió una respuesta inválida. Intenta de nuevo.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception:
        logger.exception('Ajustar sesion failed for user %s', user.id)
        return Response(
            {'error': 'Servicio de IA no disponible. Intenta de nuevo.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not isinstance(sesion_generada, dict) or 'fases' not in sesion_generada:
        return Response(
            {'error': 'La IA devolvió una respuesta incompleta. Intenta de nuevo.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    _drop_contraindicated_exercises(sesion_generada, engine._get_injury_zones(), user.id)

    with transaction.atomic():
        session.respuesta_ia         = sesion_generada
        session.duracion_planificada = nueva_duracion
        session.rpe_target           = nuevo_rpe
        session.sustituciones        = None
        session.decisiones           = sesion_generada.get('decisions_log')
        session.evidencia            = None
        session.save(update_fields=[
            'respuesta_ia', 'duracion_planificada', 'rpe_target',
            'sustituciones', 'decisiones', 'evidencia',
        ])
        session.exercises.all().delete()
        _persist_session_exercises(session, sesion_generada)

    return Response({'sesion': sesion_generada})


# ─── Ejercicio demo ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ejercicio_demo(request):
    nombre = request.query_params.get('nombre', '')
    if not nombre:
        return Response({'error': 'Se requiere el parámetro nombre'}, status=400)

    MUSCULOS = {
        'sentadilla': '🦵', 'press': '💪', 'remo': '🏋️', 'peso muerto': '🏋️',
        'plancha': '🧱', 'burpee': '🔥', 'dominada': '💪', 'fondos': '💪',
        'zancada': '🦵', 'hip thrust': '🍑', 'curl': '💪', 'extensión': '🦵',
        'abdominales': '🧱', 'elevación': '🏋️', 'salto': '🔥',
    }
    emoji = '💪'
    nombre_lower = nombre.lower()
    for key, val in MUSCULOS.items():
        if key in nombre_lower:
            emoji = val
            break

    gif_url = ''
    imagen_url = ''
    try:
        ejercicio = Exercise.objects.get(nombre__iexact=nombre)
        gif_url = ejercicio.gif_url or ''
        imagen_url = ejercicio.imagen_url or ''
    except Exercise.DoesNotExist:
        pass

    youtube_query = f"{nombre} ejercicio técnica correcta"
    return Response({
        'emoji': emoji,
        'gif_url': gif_url,
        'imagen_url': imagen_url,
        'youtube_query': youtube_query,
        'youtube_url': f"https://www.youtube.com/results?search_query={youtube_query.replace(' ', '+')}",
    })
