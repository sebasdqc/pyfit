"""Endpoints del motor de ciclismo inteligente (/api/cycling/).

Espejo de ai_running/views.py: perfil de ciclista + baseline, plan, microciclo
y generación de sesiones. Sin `indoor` en generate: a diferencia de running
(donde oculta el ritmo, sin sentido en cinta sin calibrar), la sesión de
ciclismo se prescribe en FC/potencia/RPE — igual de válidos en rodillo que en
ruta, no hay nada que ocultar."""
import logging
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from pyfit.throttles import GenerateSessionRateThrottle
from checkins.models import DailyCheckin
from cycling.models import RideSession, RidePlan, PlannedRide, CyclistTypeProfile
from workouts.models import DailyGenerationCount
# Reutilizamos el caller genérico de Groq y la fecha local del motor de fuerza
# (mismos que ya reusa ai_running — utilidades sport-agnostic).
from ai_workout.views import _call_groq, _get_local_date, _sanitize_prompt_text

from . import training_science_cycling as ts
from .baseline import get_or_create_cyclist_profile, recompute_cyclist_baseline
from .adaptive_engine_cycling import CyclingAdaptiveEngineService
from .serializers import (
    CyclistProfileSerializer, RidePlanSerializer, PlannedRideSerializer,
)

logger = logging.getLogger(__name__)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def cyclist_profile_view(request):
    """GET: perfil de ciclista (se crea cold-start si no existe).
    PATCH: editar fc_max/fc_reposo/volumen a mano; al fijar fc_max manual se marca
    como medida y se recalculan las zonas."""
    cp = get_or_create_cyclist_profile(request.user)

    if request.method == 'PATCH':
        ser = CyclistProfileSerializer(cp, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        fc_max_manual = 'fc_max' in ser.validated_data
        ser.save()
        if fc_max_manual:
            cp.fc_max_es_estimada = False
        # Re-derivar zonas con los nuevos valores de FC (FTHR/FTP no cambian aquí).
        cp.zonas = ts.derive_zones(
            fthr_bpm=cp.fthr_bpm, ftp_w=cp.ftp_w,
            fc_max=cp.fc_max, fc_reposo=cp.fc_reposo,
            fc_max_es_estimada=cp.fc_max_es_estimada,
        )
        cp.save()

    return Response(CyclistProfileSerializer(cp).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def estimate_baseline(request):
    """Recalcula el baseline desde un test de 20-30 min declarado.

    Body opcional: { "declared_test": { "avg_power_w": <int>, "avg_hr_20min": <int> } }"""
    declared_test = request.data.get('declared_test')
    if declared_test is not None and not isinstance(declared_test, dict):
        return Response({'error': 'declared_test debe ser un objeto con avg_power_w y/o avg_hr_20min.'},
                        status=status.HTTP_400_BAD_REQUEST)

    cp = recompute_cyclist_baseline(request.user, declared_test=declared_test)
    return Response(CyclistProfileSerializer(cp).data)


# Protocolo de test guiado para cold-start (sin baseline fiable). A diferencia
# de running (dos protocolos, tiempo o distancia), acá es uno solo: el test
# estándar de 20-30 min sirve tanto para FTP (si hay potenciómetro) como para
# FTHR (siempre, con solo un pulsómetro).
TEST_PROTOCOLS = {
    'test_20_30min': {
        'nombre': 'Test de 20-30 min',
        'descripcion': (
            'Tras calentar 15-20 min, pedalea al MÁXIMO esfuerzo sostenible '
            'durante 20-30 min. Si tienes potenciómetro, registra la potencia '
            'media de los últimos 20 min. Registra también tu FC media de esos '
            'mismos 20 min — sirve aunque no tengas potenciómetro.'
        ),
        'mide': 'avg_power_w (opcional) y avg_hr_20min',
        'como_registrar': (
            'Envía el resultado a /baseline/estimate/ como '
            'declared_test: {avg_power_w, avg_hr_20min}.'
        ),
    },
}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_test(request):
    """Fallback de cold-start: devuelve el protocolo de test recomendado. El
    resultado se registra luego vía /baseline/estimate/."""
    protocolo = request.data.get('protocolo', 'test_20_30min')
    spec = TEST_PROTOCOLS.get(protocolo, TEST_PROTOCOLS['test_20_30min'])
    return Response({'protocolo': protocolo, **spec})


# ═══════════════════════════════════════════════════════════════════════════════
# Plan, microciclo y generación de sesiones
# ═══════════════════════════════════════════════════════════════════════════════

TIPO_LABEL = {
    'easy': 'Rodaje fácil', 'long_ride': 'Salida larga', 'tempo': 'Tempo',
    'sweet_spot': 'Sweet Spot', 'threshold': 'Umbral (FTP)',
    'vo2max': 'Intervalos VO2máx', 'anaerobic': 'Capacidad anaeróbica',
    'sprints': 'Sprints', 'recovery': 'Recuperación', 'rest': 'Descanso',
    'cross': 'Cross-training',
}


def _fmt_hr(rng):
    return f"{rng[0]}–{rng[1]} ppm" if rng else None


def _fmt_power(rng):
    return f"{rng[0]}–{rng[1]} W" if rng else None


def _fmt_trabajo(w) -> str:
    if not w:
        return ''
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


def _get_or_create_active_plan(user, hoy) -> RidePlan:
    """`get_or_create` (no filter+create suelto): dos requests concurrentes del
    mismo usuario que ven "sin plan activo" a la vez pueden ambos intentar
    crear uno — el UniqueConstraint `unique_active_ride_plan_per_user` evita
    el duplicado, pero un `.create()` sin protección deja al perdedor de la
    carrera con un IntegrityError de 500 sin manejar. Mismo fix que
    ai_running.views._get_or_create_active_plan."""
    monday = hoy - timedelta(days=hoy.weekday())
    plan, _ = RidePlan.objects.get_or_create(
        user=user, is_active=True,
        defaults={
            'meta_tipo': 'fitness_general', 'started_at': hoy,
            'week_start': monday, 'semana_actual': 1,
        },
    )
    return plan


def build_ride_prompt(ctx: dict) -> str:
    """Prompt COMPACTO: el esqueleto (números) ya está decidido por el motor; el LLM
    solo redacta título, objetivo, nota del coach y un cue técnico por segmento."""
    presc = ctx['presc']
    lineas = []
    for i, s in enumerate(presc['segmentos']):
        fc = _fmt_hr(s.get('fc_objetivo'))
        potencia = _fmt_power(s.get('potencia_objetivo'))
        detalle = f"x{s['repeticiones']} · {_fmt_trabajo(s['trabajo'])}"
        if s.get('recuperacion'):
            detalle += f" · rec {_fmt_rec(s['recuperacion'])}"
        objetivo = ' · '.join(p for p in (potencia, fc, f"RPE{s['rpe']}") if p)
        lineas.append(f"  [{i}] {s['fase']}: {detalle} → {objetivo}")
    segmentos_txt = '\n'.join(lineas)

    return f"""Eres un entrenador de ciclismo de élite (fisiología del ejercicio y periodización).
Devuelve EXCLUSIVAMENTE un objeto JSON (sin texto extra) que REDACTE la sesión ya diseñada.
NO cambies los números (potencia, FC, RPE, repeticiones, duraciones): ya están fijados por el motor.

CONTEXTO:
- Nivel: {ctx['nivel']} · Fase de periodización: {ctx['fase']}
- Tipo de sesión de hoy: {TIPO_LABEL.get(presc['tipo_sesion'], presc['tipo_sesion'])} (zona {presc['zona_principal']})
- Estado del ciclista (readiness): {ctx['readiness_resumen']}
- Ajuste aplicado por el motor: {ctx['ajuste']}
- Confianza del baseline de FTHR/FTP: {ctx['confianza']}
- Competición próxima: {ctx['competicion'] or 'ninguna'}

ESQUELETO DE LA SESIÓN (no modificar los números):
{segmentos_txt}

Responde con este JSON EXACTO:
{{
  "titulo": "título corto y motivador",
  "objetivo_sesion": "1 frase con el objetivo fisiológico de hoy",
  "nota_del_coach": "MÁXIMO 2 frases: por qué ESTA sesión HOY según la readiness/fase",
  "cues": ["cue técnico breve para el segmento 0", "... segmento 1", "..."],
  "decisions_log": [{{"icon": "🚴", "text": "decisión clave en pocas palabras"}}]
}}
La lista "cues" debe tener exactamente {len(presc['segmentos'])} elementos, uno por segmento en orden."""


def _fallback_narration(presc: dict, ajuste: str) -> dict:
    """Narración determinística cuando no hay LLM disponible. La sesión sigue
    siendo válida: el motor ya fijó toda la estructura."""
    spec = ts.SESSION_TYPES.get(presc['tipo_sesion'], {})
    return {
        'titulo': TIPO_LABEL.get(presc['tipo_sesion'], 'Sesión de ciclismo'),
        'objetivo_sesion': spec.get('proposito', ''),
        'nota_del_coach': 'Sesión ajustada a tu estado de hoy. Respeta los objetivos de FC/potencia.',
        'cues': ['' for _ in presc['segmentos']],
        'decisions_log': [{'icon': '🚴', 'text': f'Ajuste del motor: {ajuste}'}],
    }


def _build_respuesta_ia(presc: dict, narration: dict) -> dict:
    """Ensambla el JSON final: los NÚMEROS vienen del motor (presc), el texto del LLM.
    Sin distancia — ciclismo se prescribe en tiempo (ver training_science_cycling)."""
    cues = narration.get('cues') or []
    fases: list[dict] = []
    for i, s in enumerate(presc['segmentos']):
        seg_out = {
            'repeticiones': s['repeticiones'],
            'trabajo': _fmt_trabajo(s['trabajo']),
            'recuperacion': _fmt_rec(s.get('recuperacion')),
            'fc_objetivo': _fmt_hr(s.get('fc_objetivo')),
            'potencia_objetivo': _fmt_power(s.get('potencia_objetivo')),
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
        'titulo': narration.get('titulo') or TIPO_LABEL.get(presc['tipo_sesion'], 'Ciclismo'),
        'objetivo_sesion': narration.get('objetivo_sesion') or '',
        'tipo_sesion': presc['tipo_sesion'],
        'zona_principal': presc['zona_principal'],
        'rpe_target': presc['rpe_target'],
        'duracion_total_min': presc['duracion_min'],
        'fases': fases,
        'nota_del_coach': narration.get('nota_del_coach') or '',
        'decisions_log': narration.get('decisions_log') or [],
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([GenerateSessionRateThrottle])
def generate_ride_session(request):
    """Genera (o devuelve) la sesión de ciclismo inteligente de HOY.

    Mismo flujo que generate_run_session: asegura el microciclo → localiza la
    sesión del día → readiness → re-adaptación → prescripción determinística →
    el LLM solo redacta → persiste en PlannedRide."""
    user = request.user
    hoy = _get_local_date(request)

    perfil = getattr(user, 'profile', None)
    cyclist_profile = get_or_create_cyclist_profile(user)
    plan = _get_or_create_active_plan(user, hoy)
    checkin = DailyCheckin.objects.filter(user=user, fecha=hoy).first()

    engine = CyclingAdaptiveEngineService(user, perfil, cyclist_profile, plan, checkin)
    engine.ensure_current_week(hoy)
    # `plan.fase_actual` es un cache que solo se refresca al regenerar el
    # microciclo (1x/semana) — recalcular siempre en vivo para decidir la
    # sesión de HOY, igual que ai_running.views.generate_run_session.
    fase_hoy = engine.resolve_phase(hoy)

    # Todo el resto de la función va bajo un solo lock de fila
    # (select_for_update) sobre el PlannedRide del día — evita el doble-LLM en
    # requests concurrentes. Mismo fix que ai_running.views.generate_run_session.
    with transaction.atomic():
        planned = (
            PlannedRide.objects
            .select_for_update()
            .filter(plan=plan, fecha=hoy)
            .first()
        )

        if planned is None:
            return Response({
                'es_rest': True, 'tipo_sesion': 'rest', 'estado': 'planificada',
                'respuesta_ia': {'titulo': 'Día de descanso', 'tipo_sesion': 'rest',
                                 'objetivo_sesion': 'Recuperación', 'fases': [],
                                 'nota_del_coach': 'Hoy toca descansar. El descanso es parte del plan.'},
            })

        if planned.estado == 'completada':
            return Response(PlannedRideSerializer(planned).data)

        # Idempotente para el día: mismo criterio que running — reabrir la
        # pantalla no debe cambiar la sesión ni gastar tokens de nuevo.
        #
        # EXCEPCIÓN de seguridad: si el check-in se reenvió DESPUÉS de que esta
        # sesión ya se generó y la nueva readiness dispara un downgrade que
        # antes no aplicaba, se re-aplica sin LLM — mismo fix que
        # ai_running.views.generate_run_session.
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
                        presc_re = ts.prescribe_ride_session(
                            tipo_sesion='easy', zonas=cyclist_profile.zonas or {},
                            nivel=engine._nivel(),
                            readiness={'rpe_cap': adj_re['rpe_cap'], 'horas_factor': adj_re['horas_factor']},
                            periodizacion={'fase': fase_hoy,
                                           'horas_objetivo_semana': plan.horas_objetivo_semana},
                        )
                        planned.tipo_sesion = 'easy'
                        planned.es_calidad = False
                        planned.zona_principal = presc_re.get('zona_principal') or ''
                        planned.duracion_objetivo_min = presc_re.get('duracion_min')
                        planned.rpe_target = presc_re.get('rpe_target') or None
                        planned.estructura_fases = presc_re
                        planned.respuesta_ia = _build_respuesta_ia(
                            presc_re, _fallback_narration(presc_re, adj_re['ajuste_aplicado']),
                        )
                    planned.estado = adj_re['estado']
                    planned.ajuste_aplicado = adj_re['ajuste_aplicado']
                    planned.readiness_snapshot = readiness_re
                    planned.save()
            return Response(PlannedRideSerializer(planned).data)

        readiness_data = engine.compute_readiness(hoy)
        adj = engine.adapt_today(planned, readiness_data)

        if adj['tipo_sesion'] == 'rest':
            planned.tipo_sesion = 'rest'
            planned.es_calidad = False
            planned.estado = adj['estado']
            planned.ajuste_aplicado = adj['ajuste_aplicado']
            planned.readiness_snapshot = readiness_data
            planned.respuesta_ia = {
                'titulo': 'Descanso recomendado', 'tipo_sesion': 'rest',
                'objetivo_sesion': 'Recuperación', 'fases': [],
                'nota_del_coach': 'Tu estado de hoy aconseja descansar. Volvemos mañana.',
            }
            planned.save()
            return Response(PlannedRideSerializer(planned).data)

        # Límite diario de generaciones con IA — contador COMPARTIDO con fuerza y
        # running (mismo presupuesto de Groq, máx. 5/día por usuario en total).
        if DailyGenerationCount.reached_limit(user, hoy):
            return Response({'error': 'Alcanzaste tu límite diario', 'code': 'daily_limit'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Afina la potencia/FC objetivo con el historial de ESTE tipo de sesión
        # — ver CyclistTypeProfile y power_bias_from_profile. Mismo fix que
        # ai_running.views.generate_run_session (RunTypeProfile).
        tipo_profile = CyclistTypeProfile.objects.filter(
            user=user, tipo_sesion=adj['tipo_sesion']).first()
        power_bias_pct = ts.power_bias_from_profile(
            tipo_profile.rpe_promedio_real if tipo_profile else None,
            tipo_profile.rpe_promedio_target if tipo_profile else None,
        )
        zonas_ajustadas = ts.apply_power_bias(cyclist_profile.zonas or {}, power_bias_pct)

        presc = ts.prescribe_ride_session(
            tipo_sesion=adj['tipo_sesion'], zonas=zonas_ajustadas,
            nivel=engine._nivel(),
            readiness={'rpe_cap': adj['rpe_cap'], 'horas_factor': adj['horas_factor']},
            periodizacion={'fase': fase_hoy, 'horas_objetivo_semana': plan.horas_objetivo_semana},
        )

        anchor = engine._competition_anchor(hoy)
        ctx = {
            'presc': presc, 'nivel': engine._nivel(),
            'fase': fase_hoy, 'ajuste': adj['ajuste_aplicado'],
            'confianza': cyclist_profile.confianza,
            'readiness_resumen': _sanitize_prompt_text(
                f"score {readiness_data['score']}/100, carga {readiness_data['zona_acwr']}", 120),
            'competicion': (f"{anchor['nombre']} en {anchor['dias']} días" if anchor else None),
        }

        prompt = build_ride_prompt(ctx)
        usage, narration = {}, None
        try:
            from django.conf import settings
            if settings.LLM_API_KEY:
                narration, usage = _call_groq(prompt, max_tokens=1200, user_id=user.id, return_usage=True)
        except Exception as e:   # noqa: BLE001 — degradación controlada a fallback determinístico
            logger.warning('generate_ride: Groq falló (%s) — uso fallback determinístico', e)
        uso_fallback = not isinstance(narration, dict)
        if uso_fallback:
            narration = _fallback_narration(presc, adj['ajuste_aplicado'])

        respuesta_ia = _build_respuesta_ia(presc, narration)

        planned.tipo_sesion = adj['tipo_sesion']
        planned.es_calidad = ts.SESSION_TYPES.get(adj['tipo_sesion'], {}).get('es_calidad', False)
        planned.zona_principal = presc.get('zona_principal') or ''
        planned.duracion_objetivo_min = presc.get('duracion_min')
        planned.rpe_target = presc.get('rpe_target') or None
        planned.estructura_fases = presc
        planned.respuesta_ia = respuesta_ia
        planned.prompt_usado = prompt
        planned.estado = adj['estado']
        planned.ajuste_aplicado = adj['ajuste_aplicado']
        planned.readiness_snapshot = readiness_data
        planned.generacion_ms = usage.get('elapsed_ms')
        planned.tokens_in = usage.get('tokens_in')
        planned.tokens_out = usage.get('tokens_out')
        planned.narracion_fallback = uso_fallback
        planned.save()

    DailyGenerationCount.record(user, hoy)
    return Response(PlannedRideSerializer(planned).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ride_session_today(request):
    """Sesión planificada de hoy (para polling de la pantalla de generación)."""
    hoy = _get_local_date(request)
    plan = RidePlan.objects.filter(user=request.user, is_active=True).first()
    if not plan:
        return Response({'es_rest': True, 'tipo_sesion': 'rest', 'planned': None})
    planned = PlannedRide.objects.filter(plan=plan, fecha=hoy).first()
    if not planned:
        return Response({'es_rest': True, 'tipo_sesion': 'rest', 'planned': None})
    return Response(PlannedRideSerializer(planned).data)


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def ride_plan_view(request):
    """GET: plan activo. POST: crear/reemplazar el plan activo (y generar la 1ª semana).
    PATCH: editar meta/días del plan activo."""
    hoy = _get_local_date(request)
    user = request.user

    if request.method == 'POST':
        ser = RidePlanSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        monday = hoy - timedelta(days=hoy.weekday())
        with transaction.atomic():
            RidePlan.objects.filter(user=user, is_active=True).update(is_active=False)
            plan = ser.save(user=user, started_at=hoy, week_start=monday,
                            semana_actual=1, is_active=True)
        cyclist_profile = get_or_create_cyclist_profile(user)
        perfil = getattr(user, 'profile', None)
        engine = CyclingAdaptiveEngineService(user, perfil, cyclist_profile, plan)
        engine.generate_microcycle(monday)
        return Response(RidePlanSerializer(plan).data, status=status.HTTP_201_CREATED)

    plan = RidePlan.objects.filter(user=user, is_active=True).first()
    if not plan:
        return Response({'detail': 'Sin plan activo.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        ser = RidePlanSerializer(plan, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()

    return Response(RidePlanSerializer(plan).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plan_microcycle(request):
    """Sesiones planificadas de la semana actual del plan activo."""
    plan = RidePlan.objects.filter(user=request.user, is_active=True).first()
    if not plan:
        return Response({'detail': 'Sin plan activo.'}, status=status.HTTP_404_NOT_FOUND)
    week_start = plan.week_start
    sesiones = PlannedRide.objects.filter(
        plan=plan, fecha__gte=week_start, fecha__lte=week_start + timedelta(days=6))
    return Response({
        'plan': RidePlanSerializer(plan).data,
        'sesiones': PlannedRideSerializer(sesiones, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_planned(request, pk):
    """Vincula la ejecución real (RideSession) a la sesión planificada y la marca
    completada. Body: { "ride_session_id": <int> } — requerido y debe ser una
    salida propia ya `completed`: completar sin una RideSession real vinculada
    (o con una todavía `active`/`paused`) deja el historial de adherencia/ACWR
    con una sesión que nunca ocurrió de verdad. Mismo fix que
    ai_running.views.complete_planned."""
    planned = get_object_or_404(PlannedRide, pk=pk, user=request.user)
    ride_id = request.data.get('ride_session_id')
    if not ride_id:
        return Response({'error': 'ride_session_id es requerido'},
                        status=status.HTTP_400_BAD_REQUEST)
    ride = get_object_or_404(RideSession, pk=ride_id, user=request.user)
    if ride.status != 'completed':
        return Response(
            {'error': 'La salida vinculada todavía no está completada'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    # Atómico: si el proceso muere entre los dos save(), no debe quedar
    # RideSession.session_type='planned' con PlannedRide todavía en
    # 'planificada' sin ride_session vinculado.
    with transaction.atomic():
        planned.ride_session = ride
        if ride.session_type != 'planned':
            ride.session_type = 'planned'
            ride.save(update_fields=['session_type', 'updated_at'])
        planned.estado = 'completada'
        planned.save(update_fields=['ride_session', 'estado', 'updated_at'])
    # Cierra el loop del umbral/zonas: recalcula el baseline desde el
    # historial actualizado, salvo que el ciclista haya declarado/fijado uno a
    # mano (no pisamos una fuente de mayor confianza con una estimación de
    # historial) — mismo criterio que ai_running.views.complete_planned.
    cp = get_or_create_cyclist_profile(request.user)
    if cp.fuente_baseline in ('cold_start', 'historial'):
        try:
            recompute_cyclist_baseline(request.user)
        except Exception:
            logger.warning('complete_planned: fallo al recalcular baseline user=%s', request.user.id)
    return Response(PlannedRideSerializer(planned).data)
