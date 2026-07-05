"""
Celery tasks para la app ai_workout.

generate_session_task — hace el trabajo pesado de POST /api/sessions/generate/
(construir el contexto, llamar a Groq, aplicar las redes de seguridad y
persistir la sesión) fuera del ciclo request/response. La vista ya creó la
Session como placeholder (respuesta_ia=None) y solo encola este task; acá se
completa in place, o se marca `generacion_error` si algo falla — el cliente lo
recupera con polling de /api/sessions/today/.
"""
import json
import logging
import time as _time
from datetime import timedelta

from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


def _mark_generation_error(sesion, message):
    sesion.generacion_error = str(message)[:2000]
    sesion.save(update_fields=['generacion_error'])


@shared_task(
    name='ai_workout.tasks.generate_session_task',
    max_retries=0,       # no reintentar automático: el usuario puede volver a generar
    ignore_result=True,
    time_limit=180,       # Groq acotado a ~60s peor caso (GROQ_TIMEOUT_SECONDS × reintentos); margen amplio
    soft_time_limit=150,
)
def generate_session_task(session_id):
    from workouts.models import Session, DailyCoachInsight, DailySaludo
    from ai_workout.adaptive_engine import AdaptiveEngineService
    from ai_workout.views import (
        _build_adaptation_context, _calcular_estado_mesociclo, _calcular_fase_ciclo,
        _call_groq, _drop_contraindicated_exercises, _get_coach_directiva,
        _get_exercise_pool, _persist_session_exercises, _resolve_location,
        build_prompt, calcular_fatiga, calcular_rpe_target, process_device_data,
    )

    try:
        sesion = Session.objects.select_related('checkin', 'user').get(pk=session_id)
    except Session.DoesNotExist:
        logger.error('generate_session_task: session %s no existe', session_id)
        return

    user = sesion.user
    checkin = sesion.checkin
    hoy = sesion.fecha
    _gen_t0 = _time.monotonic()

    try:
        perfil = user.profile
    except Exception:
        _mark_generation_error(sesion, 'Perfil no encontrado. Completa el onboarding.')
        return

    loc = _resolve_location(user, checkin)

    hace_14_dias = hoy - timedelta(days=14)
    sesiones_recientes = user.sessions.filter(created_at__date__gte=hace_14_dias).exclude(pk=sesion.pk)
    fatiga = calcular_fatiga(sesiones_recientes)

    # ── Datos de dispositivo (Garmin / Apple Health) ──────────────────────────
    checkin_hrv, calidad_sueno_efectiva, device_context = process_device_data(user, checkin)
    # ¿El sueño viene de un dispositivo (escala 1–4) en vez del check-in (horas)?
    # Si el valor efectivo difiere del manual, lo sobrescribió el dispositivo.
    sueno_es_score = calidad_sueno_efectiva != checkin.calidad_sueno

    rpe_target = calcular_rpe_target(fatiga, checkin.estado_animo, checkin_hrv)

    competicion = user.competitions.filter(
        fecha__gte=hoy,
        fecha__lte=hoy + timedelta(days=14),
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
    adaptation_context = _build_adaptation_context(user)
    estado_mesociclo = _calcular_estado_mesociclo(user)
    periodizacion = engine.get_periodization_params()

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
        exercise_pool_legacy, _pool_meta = _get_exercise_pool(user, loc, dolor_hoy=checkin.dolor_hoy or '')
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
        'sueno_es_score': sueno_es_score,
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
        _mark_generation_error(sesion, 'La IA devolvió una respuesta inválida. Intenta de nuevo.')
        return
    except (ValueError, RuntimeError) as e:
        logger.exception('AI generation failed for user %s', user.id)
        _mark_generation_error(sesion, str(e))
        return
    except Exception:
        logger.exception('Unexpected error during AI generation for user %s', user.id)
        _mark_generation_error(sesion, 'Servicio de IA no disponible. Intenta de nuevo en unos segundos.')
        return

    # Basic shape validation — the prompt asks for these keys; reject if missing.
    if not isinstance(sesion_generada, dict) or 'fases' not in sesion_generada:
        logger.error('Groq response missing "fases" for user %s: %s', user.id, sesion_generada)
        _mark_generation_error(sesion, 'La IA devolvió una respuesta incompleta. Intenta de nuevo.')
        return

    # GEN-3: red de seguridad — descarta ejercicios contraindicados que el LLM haya
    # elegido fuera del pool ya filtrado (lesiones activas / dolor de hoy).
    _drop_contraindicated_exercises(
        sesion_generada, engine._get_injury_zones(), user.id,
        body_zones=engine._get_body_zones(),
    )
    # GEN-5: red de seguridad de equipamiento — descarta ejercicios que requieran
    # implementos no disponibles (coherencia casa/gimnasio), simétrica a la anterior.
    engine.drop_unavailable_equipment(sesion_generada, user.id)

    volumen = 'bajo' if fatiga == 'alto' else 'medio' if fatiga == 'medio' else 'alto'
    db_location = loc if isinstance(loc, user.locations.model) else None

    with transaction.atomic():
        sesion.location = db_location
        sesion.rpe_target = rpe_target
        sesion.volumen_relativo = volumen
        sesion.prompt_usado = prompt
        sesion.respuesta_ia = sesion_generada
        sesion.decisiones = sesion_generada.get('decisions_log')
        # Salud del motor: duración total server-side + tokens + flag de fallback.
        sesion.generacion_ms = int((_time.monotonic() - _gen_t0) * 1000)
        sesion.tokens_in = _groq_usage.get('tokens_in')
        sesion.tokens_out = _groq_usage.get('tokens_out')
        sesion.uso_fallback = uso_fallback
        sesion.save()
        _persist_session_exercises(sesion, sesion_generada)

    # Invalidar caché del insight y del saludo para regenerarlos con la nueva sesión
    DailyCoachInsight.objects.filter(user=user, fecha=hoy).delete()
    DailySaludo.objects.filter(user=user, fecha=hoy).delete()

    # Push notification: avisar al usuario que su rutina está lista (fire-and-forget)
    try:
        from users.push import send_push
        titulo_sesion = sesion_generada.get('titulo', 'Tu sesión')
        send_push(
            user,
            title='¡Tu sesión está lista! 💪',
            body=titulo_sesion,
            data={'sesion_id': sesion.id},
        )
    except Exception:
        pass
