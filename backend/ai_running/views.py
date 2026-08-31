"""Endpoints del motor de running inteligente (/api/running/).

F1: perfil de corredor + baseline. F3: plan, microciclo y generación de sesiones.
"""
import logging
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from pyfit.throttles import GenerateSessionRateThrottle
from checkins.models import DailyCheckin
from runs.models import RunSession, RunningPlan, PlannedRunSession
from workouts.models import DailyGenerationCount
# Reutilizamos el caller genérico de Groq y la fecha local del motor de fuerza.
from ai_workout.views import _call_groq, _get_local_date, _sanitize_prompt_text

from . import training_science_running as ts
from .baseline import get_or_create_runner_profile, recompute_runner_baseline
from .adaptive_engine_running import RunningAdaptiveEngineService
from .serializers import (
    RunnerProfileSerializer, RunningPlanSerializer, PlannedRunSessionSerializer,
)

logger = logging.getLogger(__name__)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def runner_profile_view(request):
    """GET: perfil de corredor (se crea cold-start si no existe).
    PATCH: editar fc_max/fc_reposo/volumen a mano; al fijar fc_max manual se marca
    como medida y se recalculan las zonas."""
    rp = get_or_create_runner_profile(request.user)

    if request.method == 'PATCH':
        ser = RunnerProfileSerializer(rp, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        fc_max_manual = 'fc_max' in ser.validated_data
        ser.save()
        if fc_max_manual:
            rp.fc_max_es_estimada = False
        # Re-derivar zonas con los nuevos valores de FC (el umbral no cambia aquí).
        rp.zonas = ts.derive_zones(
            threshold_pace_s_km=rp.threshold_pace_s_km,
            fc_max=rp.fc_max, fc_reposo=rp.fc_reposo,
            fc_max_es_estimada=rp.fc_max_es_estimada,
        )
        rp.save()

    return Response(RunnerProfileSerializer(rp).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def estimate_baseline(request):
    """Recalcula el baseline desde el historial de Free Run y, opcionalmente, un
    tiempo de carrera declarado.

    Body opcional: { "declared": { "tiempo_s": <int>, "distancia_km": <float> } }"""
    declared = None
    d = request.data.get('declared')
    if d:
        try:
            t = float(d.get('tiempo_s'))
            km = float(d.get('distancia_km'))
            if t > 0 and km > 0:
                declared = (t, km)
        except (TypeError, ValueError):
            return Response({'error': 'declared.tiempo_s y declared.distancia_km deben ser numéricos.'},
                            status=status.HTTP_400_BAD_REQUEST)

    rp = recompute_runner_baseline(request.user, declared=declared)
    return Response(RunnerProfileSerializer(rp).data)


# Protocolos de time-trial guiado para cold-start (sin historial fiable).
TIME_TRIAL_PROTOCOLS = {
    'cooper_12min': {
        'nombre': 'Test de Cooper (12 min)',
        'descripcion': 'Tras calentar 10-15 min, corre la MÁXIMA distancia posible en 12 minutos a ritmo sostenible.',
        'mide': 'distancia_km',
        'como_registrar': 'Ejecuta una carrera libre de 12 min y envía el resultado a /baseline/estimate/ como declared {tiempo_s: 720, distancia_km}.',
    },
    'test_2400m': {
        'nombre': 'Test de 2.4 km (1.5 millas)',
        'descripcion': 'Tras calentar, recorre 2.4 km lo más rápido que puedas sostener.',
        'mide': 'tiempo_s',
        'como_registrar': 'Envía a /baseline/estimate/ como declared {tiempo_s, distancia_km: 2.4}.',
    },
}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_time_trial(request):
    """Fallback de cold-start: devuelve el protocolo de time-trial recomendado. El
    resultado se registra luego vía /baseline/estimate/ como un tiempo declarado."""
    protocolo = request.data.get('protocolo', 'cooper_12min')
    spec = TIME_TRIAL_PROTOCOLS.get(protocolo, TIME_TRIAL_PROTOCOLS['cooper_12min'])
    return Response({'protocolo': protocolo, **spec})


# ═══════════════════════════════════════════════════════════════════════════════
# F3 — Plan, microciclo y generación de sesiones
# ═══════════════════════════════════════════════════════════════════════════════

TIPO_LABEL = {
    'easy': 'Rodaje fácil', 'long': 'Tirada larga', 'tempo': 'Tempo / Umbral',
    'vo2': 'Intervalos VO2máx', 'fartlek': 'Fartlek', 'hills': 'Cuestas',
    'progressive': 'Progresivo', 'strides': 'Series cortas', 'recovery': 'Recuperación',
    'rest': 'Descanso', 'cross': 'Cross-training',
}


def _mmss(s) -> str:
    s = int(round(s))
    return f"{s // 60}:{s % 60:02d}"


def _fmt_pace(rng):
    return f"{_mmss(rng[0])}–{_mmss(rng[1])} /km" if rng else None


def _fmt_hr(rng):
    return f"{rng[0]}–{rng[1]} ppm" if rng else None


def _fmt_trabajo(w) -> str:
    if not w:
        return ''
    if 'distancia_km' in w:
        return f"{w['distancia_km']} km"
    if 'min' in w:
        return f"{w['min']} min"
    if 'seg' in w:
        return f"{w['seg']} s"
    return ''


def _fmt_rec(rec):
    if not rec:
        return None
    partes = []
    if rec.get('min'):
        partes.append(f"{rec['min']} min")
    if rec.get('seg'):
        partes.append(f"{rec['seg']} s")
    if rec.get('tipo'):
        partes.append(rec['tipo'])
    return ' '.join(partes) or None


def _get_or_create_active_plan(user, hoy) -> RunningPlan:
    plan = RunningPlan.objects.filter(user=user, is_active=True).first()
    if plan:
        return plan
    monday = hoy - timedelta(days=hoy.weekday())
    return RunningPlan.objects.create(
        user=user, meta_tipo='fitness_general', started_at=hoy,
        week_start=monday, semana_actual=1, is_active=True)


def build_run_prompt(ctx: dict) -> str:
    """Prompt COMPACTO: el esqueleto (números) ya está decidido por el motor; el LLM
    solo redacta título, objetivo, nota del coach y un cue técnico por segmento."""
    presc = ctx['presc']
    lineas = []
    for i, s in enumerate(presc['segmentos']):
        pace = _fmt_pace(s.get('pace_objetivo')) if not ctx['indoor'] else None
        fc = _fmt_hr(s.get('fc_objetivo'))
        detalle = f"x{s['repeticiones']} · {_fmt_trabajo(s['trabajo'])}"
        if s.get('recuperacion'):
            detalle += f" · rec {_fmt_rec(s['recuperacion'])}"
        objetivo = ' · '.join(p for p in (pace, fc, f"RPE{s['rpe']}") if p)
        lineas.append(f"  [{i}] {s['fase']}: {detalle} → {objetivo}")
    segmentos_txt = '\n'.join(lineas)

    return f"""Eres un entrenador de running de élite (fisiología del ejercicio y periodización).
Devuelve EXCLUSIVAMENTE un objeto JSON (sin texto extra) que REDACTE la sesión ya diseñada.
NO cambies los números (ritmos, FC, RPE, repeticiones, distancias): ya están fijados por el motor.

CONTEXTO:
- Nivel: {ctx['nivel']} · Fase de periodización: {ctx['fase']}
- Tipo de sesión de hoy: {TIPO_LABEL.get(presc['tipo_sesion'], presc['tipo_sesion'])} (zona {presc['zona_principal']})
- Estado del corredor (readiness): {ctx['readiness_resumen']}
- Ajuste aplicado por el motor: {ctx['ajuste']}
- Confianza del baseline de ritmos: {ctx['confianza']}
- Modalidad: {'interior (sin GPS, guía por FC/RPE)' if ctx['indoor'] else 'exterior (GPS)'}
- Competición próxima: {ctx['competicion'] or 'ninguna'}

ESQUELETO DE LA SESIÓN (no modificar los números):
{segmentos_txt}

Responde con este JSON EXACTO:
{{
  "titulo": "título corto y motivador",
  "objetivo_sesion": "1 frase con el objetivo fisiológico de hoy",
  "nota_del_coach": "MÁXIMO 2 frases: por qué ESTA sesión HOY según la readiness/fase",
  "cues": ["cue técnico breve para el segmento 0", "... segmento 1", "..."],
  "decisions_log": [{{"icon": "🫀", "text": "decisión clave en pocas palabras"}}]
}}
La lista "cues" debe tener exactamente {len(presc['segmentos'])} elementos, uno por segmento en orden."""


def _fallback_narration(presc: dict, ajuste: str) -> dict:
    """Narración determinística cuando no hay LLM disponible (sin LLM_API_KEY o error).
    La sesión sigue siendo válida: el motor ya fijó toda la estructura."""
    spec = ts.SESSION_TYPES.get(presc['tipo_sesion'], {})
    return {
        'titulo': TIPO_LABEL.get(presc['tipo_sesion'], 'Sesión de carrera'),
        'objetivo_sesion': spec.get('proposito', ''),
        'nota_del_coach': 'Sesión ajustada a tu estado de hoy. Respeta los ritmos objetivo.',
        'cues': ['' for _ in presc['segmentos']],
        'decisions_log': [{'icon': '🏃', 'text': f'Ajuste del motor: {ajuste}'}],
    }


def _build_respuesta_ia(presc: dict, narration: dict, indoor: bool) -> dict:
    """Ensambla el JSON final: los NÚMEROS vienen del motor (presc), el texto del LLM.
    En indoor se vacían los ritmos (sin GPS) y manda FC/RPE."""
    cues = narration.get('cues') or []
    fases: list[dict] = []
    for i, s in enumerate(presc['segmentos']):
        pace = None if indoor else _fmt_pace(s.get('pace_objetivo'))
        seg_out = {
            'repeticiones': s['repeticiones'],
            'trabajo': _fmt_trabajo(s['trabajo']),
            'recuperacion': _fmt_rec(s.get('recuperacion')),
            'pace_objetivo': pace,
            'fc_objetivo': _fmt_hr(s.get('fc_objetivo')),
            'rpe': s['rpe'],
            'cue': cues[i] if i < len(cues) else '',
        }
        nombre = s['fase'].capitalize()
        if not fases or fases[-1]['_key'] != s['fase']:
            fases.append({'_key': s['fase'], 'nombre': nombre, 'segmentos': []})
        fases[-1]['segmentos'].append(seg_out)
    for f in fases:
        f.pop('_key')

    return {
        'titulo': narration.get('titulo') or TIPO_LABEL.get(presc['tipo_sesion'], 'Carrera'),
        'objetivo_sesion': narration.get('objetivo_sesion') or '',
        'tipo_sesion': presc['tipo_sesion'],
        'zona_principal': presc['zona_principal'],
        'rpe_target': presc['rpe_target'],
        'duracion_total_min': presc['duracion_min'],
        'distancia_total_km': presc['distancia_km'],
        'fases': fases,
        'nota_del_coach': narration.get('nota_del_coach') or '',
        'decisions_log': narration.get('decisions_log') or [],
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([GenerateSessionRateThrottle])
def generate_run_session(request):
    """Genera (o devuelve) la sesión de running inteligente de HOY.

    Flujo: asegura el microciclo de la semana → localiza la sesión del día →
    readiness → re-adaptación → prescripción determinística → el LLM solo redacta →
    persiste en PlannedRunSession. Body opcional: { "indoor": bool }."""
    user = request.user
    hoy = _get_local_date(request)
    indoor = bool(request.data.get('indoor', False))

    perfil = getattr(user, 'profile', None)
    runner_profile = get_or_create_runner_profile(user)
    plan = _get_or_create_active_plan(user, hoy)
    checkin = DailyCheckin.objects.filter(user=user, fecha=hoy).first()

    engine = RunningAdaptiveEngineService(user, perfil, runner_profile, plan, checkin)
    engine.ensure_current_week(hoy)

    planned = PlannedRunSession.objects.filter(plan=plan, fecha=hoy).first()

    # Día sin sesión planificada = día de descanso del microciclo.
    if planned is None:
        return Response({
            'es_rest': True, 'tipo_sesion': 'rest', 'estado': 'planificada',
            'respuesta_ia': {'titulo': 'Día de descanso', 'tipo_sesion': 'rest',
                             'objetivo_sesion': 'Recuperación', 'fases': [],
                             'nota_del_coach': 'Hoy toca descansar. El descanso es parte del plan.'},
        })

    # Idempotente: si ya se ejecutó, devolverla tal cual.
    if planned.estado == 'completada':
        return Response(PlannedRunSessionSerializer(planned).data)

    # Idempotente para el día: si la sesión ya fue generada (tiene respuesta_ia), se
    # devuelve sin re-llamar al LLM ni recalcular —la decisión del día ya se tomó tras
    # el check-in; reabrir la pantalla no debe cambiar la sesión ni gastar tokens.
    #
    # EXCEPCIÓN de seguridad: si el check-in se reenvió (mismo día, misma fila —
    # `create_checkin` actualiza en vez de crear otra) DESPUÉS de que esta sesión
    # ya se generó, y la nueva readiness dispara una señal de downgrade (dolor,
    # ACWR alto, readiness baja/HRV/sueño — las mismas reglas 1/3/5 de
    # endurance.readiness) que antes no aplicaba, se re-aplica el downgrade sin
    # LLM (mismo camino sin tokens que la rama 'rest' de abajo). Nunca sube
    # intensidad de vuelta ni gasta una generación nueva — solo puede volverse
    # más conservador que lo ya persistido.
    if planned.respuesta_ia:
        checkin_reenviado = bool(
            checkin and planned.updated_at and checkin.updated_at > planned.updated_at
        )
        if checkin_reenviado and planned.tipo_sesion != 'rest':
            readiness_re = engine.compute_readiness(hoy)
            adj_re = engine.adapt_today(planned, readiness_re)
            es_downgrade_nuevo = (
                adj_re['ajuste_aplicado'] not in ('confirmada', planned.ajuste_aplicado)
                and adj_re['tipo_sesion'] in ('rest', 'easy')
                and adj_re['tipo_sesion'] != planned.tipo_sesion
            )
            if es_downgrade_nuevo:
                if adj_re['tipo_sesion'] == 'rest':
                    planned.tipo_sesion = 'rest'
                    planned.es_calidad = False
                    planned.duracion_objetivo_min = None
                    planned.distancia_objetivo_km = None
                    planned.rpe_target = None
                    planned.respuesta_ia = {
                        'titulo': 'Descanso recomendado', 'tipo_sesion': 'rest',
                        'objetivo_sesion': 'Recuperación', 'fases': [],
                        'nota_del_coach': (
                            'Tu check-in cambió desde que generaste la sesión de hoy — '
                            'con esta nueva información, mejor descansar. Volvemos mañana.'
                        ),
                    }
                else:  # 'easy'
                    presc_re = ts.prescribe_run_session(
                        tipo_sesion='easy', zonas=runner_profile.zonas or {},
                        nivel=engine._nivel(),
                        readiness={'rpe_cap': adj_re['rpe_cap'], 'km_factor': adj_re['km_factor']},
                        periodizacion={'fase': plan.fase_actual,
                                       'km_objetivo_semana': plan.km_objetivo_semana},
                    )
                    planned.tipo_sesion = 'easy'
                    planned.es_calidad = False
                    planned.zona_principal = presc_re.get('zona_principal') or ''
                    planned.duracion_objetivo_min = presc_re.get('duracion_min')
                    planned.distancia_objetivo_km = presc_re.get('distancia_km')
                    planned.rpe_target = presc_re.get('rpe_target') or None
                    planned.estructura_fases = presc_re
                    planned.respuesta_ia = _build_respuesta_ia(
                        presc_re, _fallback_narration(presc_re, adj_re['ajuste_aplicado']), indoor,
                    )
                planned.estado = adj_re['estado']
                planned.ajuste_aplicado = adj_re['ajuste_aplicado']
                planned.readiness_snapshot = readiness_re
                planned.save()
        return Response(PlannedRunSessionSerializer(planned).data)

    readiness = engine.compute_readiness(hoy)
    adj = engine.adapt_today(planned, readiness)

    # Descanso por re-adaptación (dolor / check-in de descanso): sin LLM.
    if adj['tipo_sesion'] == 'rest':
        planned.tipo_sesion = 'rest'
        planned.es_calidad = False
        planned.estado = adj['estado']
        planned.ajuste_aplicado = adj['ajuste_aplicado']
        planned.readiness_snapshot = readiness
        planned.respuesta_ia = {
            'titulo': 'Descanso recomendado', 'tipo_sesion': 'rest',
            'objetivo_sesion': 'Recuperación', 'fases': [],
            'nota_del_coach': 'Tu estado de hoy aconseja descansar. Volvemos mañana.',
        }
        planned.save()
        return Response(PlannedRunSessionSerializer(planned).data)

    # Límite diario de generaciones con IA (contador compartido con fuerza, máx. 5/día).
    # Va después de las salidas idempotente/descanso para no bloquear esas (no generan).
    if DailyGenerationCount.reached_limit(user, hoy):
        return Response({'error': 'Alcanzaste tu límite diario', 'code': 'daily_limit'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)

    presc = ts.prescribe_run_session(
        tipo_sesion=adj['tipo_sesion'], zonas=runner_profile.zonas or {},
        nivel=engine._nivel(),
        readiness={'rpe_cap': adj['rpe_cap'], 'km_factor': adj['km_factor']},
        periodizacion={'fase': plan.fase_actual, 'km_objetivo_semana': plan.km_objetivo_semana},
    )

    anchor = engine._competition_anchor(hoy)
    ctx = {
        'presc': presc, 'indoor': indoor, 'nivel': engine._nivel(),
        'fase': plan.fase_actual, 'ajuste': adj['ajuste_aplicado'],
        'confianza': runner_profile.confianza,
        'readiness_resumen': _sanitize_prompt_text(
            f"score {readiness['score']}/100, carga {readiness['zona_acwr']}", 120),
        'competicion': (f"{anchor['nombre']} en {anchor['dias']} días" if anchor else None),
    }

    prompt = build_run_prompt(ctx)
    usage, narration = {}, None
    try:
        from django.conf import settings
        if settings.LLM_API_KEY:
            narration, usage = _call_groq(prompt, max_tokens=1200, user_id=user.id, return_usage=True)
    except Exception as e:   # noqa: BLE001 — degradación controlada a fallback determinístico
        logger.warning('generate_run: Groq falló (%s) — uso fallback determinístico', e)
    if not isinstance(narration, dict):
        narration = _fallback_narration(presc, adj['ajuste_aplicado'])

    respuesta_ia = _build_respuesta_ia(presc, narration, indoor)

    with transaction.atomic():
        planned.tipo_sesion = adj['tipo_sesion']
        planned.es_calidad = ts.SESSION_TYPES.get(adj['tipo_sesion'], {}).get('es_calidad', False)
        planned.zona_principal = presc.get('zona_principal') or ''
        planned.duracion_objetivo_min = presc.get('duracion_min')
        planned.distancia_objetivo_km = presc.get('distancia_km')
        planned.rpe_target = presc.get('rpe_target') or None
        planned.estructura_fases = presc
        planned.respuesta_ia = respuesta_ia
        planned.prompt_usado = prompt
        planned.estado = adj['estado']
        planned.ajuste_aplicado = adj['ajuste_aplicado']
        planned.readiness_snapshot = readiness
        planned.generacion_ms = usage.get('elapsed_ms')
        planned.tokens_in = usage.get('tokens_in')
        planned.tokens_out = usage.get('tokens_out')
        planned.save()

    DailyGenerationCount.record(user, hoy)
    return Response(PlannedRunSessionSerializer(planned).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def run_session_today(request):
    """Sesión planificada de hoy (para polling de la pantalla de generación)."""
    hoy = _get_local_date(request)
    plan = RunningPlan.objects.filter(user=request.user, is_active=True).first()
    if not plan:
        return Response({'es_rest': True, 'tipo_sesion': 'rest', 'planned': None})
    planned = PlannedRunSession.objects.filter(plan=plan, fecha=hoy).first()
    if not planned:
        return Response({'es_rest': True, 'tipo_sesion': 'rest', 'planned': None})
    return Response(PlannedRunSessionSerializer(planned).data)


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def running_plan_view(request):
    """GET: plan activo. POST: crear/reemplazar el plan activo (y generar la 1ª semana).
    PATCH: editar meta/días del plan activo."""
    hoy = _get_local_date(request)
    user = request.user

    if request.method == 'POST':
        ser = RunningPlanSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        monday = hoy - timedelta(days=hoy.weekday())
        # Atómico: desactivar el plan previo y crear el nuevo no pueden quedar a medias
        # (el constraint parcial unique_active_running_plan_per_user lo exige).
        with transaction.atomic():
            RunningPlan.objects.filter(user=user, is_active=True).update(is_active=False)
            plan = ser.save(user=user, started_at=hoy, week_start=monday,
                            semana_actual=1, is_active=True)
        runner_profile = get_or_create_runner_profile(user)
        perfil = getattr(user, 'profile', None)
        engine = RunningAdaptiveEngineService(user, perfil, runner_profile, plan)
        engine.generate_microcycle(monday)
        return Response(RunningPlanSerializer(plan).data, status=status.HTTP_201_CREATED)

    plan = RunningPlan.objects.filter(user=user, is_active=True).first()
    if not plan:
        return Response({'detail': 'Sin plan activo.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        ser = RunningPlanSerializer(plan, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()

    return Response(RunningPlanSerializer(plan).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plan_microcycle(request):
    """Sesiones planificadas de la semana actual del plan activo."""
    plan = RunningPlan.objects.filter(user=request.user, is_active=True).first()
    if not plan:
        return Response({'detail': 'Sin plan activo.'}, status=status.HTTP_404_NOT_FOUND)
    week_start = plan.week_start
    sesiones = PlannedRunSession.objects.filter(
        plan=plan, fecha__gte=week_start, fecha__lte=week_start + timedelta(days=6))
    return Response({
        'plan': RunningPlanSerializer(plan).data,
        'sesiones': PlannedRunSessionSerializer(sesiones, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_planned(request, pk):
    """Vincula la ejecución real (RunSession) a la sesión planificada y la marca
    completada. Body: { "run_session_id": <int> } — requerido y debe ser una
    carrera propia ya `completed`: el cliente siempre lo manda (ver
    `completePlannedRun` en mobile/lib/runningApi.ts, tipado no-opcional), y
    completar sin una carrera real vinculada (o con una todavía `active`/
    `paused`) deja el historial de adherencia/ACWR con una sesión que nunca
    ocurrió de verdad."""
    planned = get_object_or_404(PlannedRunSession, pk=pk, user=request.user)
    run_id = request.data.get('run_session_id')
    if not run_id:
        return Response({'error': 'run_session_id es requerido'},
                        status=status.HTTP_400_BAD_REQUEST)
    run = get_object_or_404(RunSession, pk=run_id, user=request.user)
    if run.status != 'completed':
        return Response(
            {'error': 'La carrera vinculada todavía no está completada'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    planned.run_session = run
    if run.session_type != 'planned':
        run.session_type = 'planned'
        run.save(update_fields=['session_type', 'updated_at'])
    planned.estado = 'completada'
    planned.save(update_fields=['run_session', 'estado', 'updated_at'])
    # Cierra el loop también para el umbral/zonas: recalcula el baseline desde el
    # historial actualizado, salvo que el atleta haya declarado/fijado uno a mano
    # (no pisamos una fuente de mayor confianza con una estimación de historial).
    rp = get_or_create_runner_profile(request.user)
    if rp.fuente_baseline in ('cold_start', 'historial'):
        try:
            recompute_runner_baseline(request.user)
        except Exception:
            logger.warning('complete_planned: fallo al recalcular baseline user=%s', request.user.id)
    return Response(PlannedRunSessionSerializer(planned).data)
