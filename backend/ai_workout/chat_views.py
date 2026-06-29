import logging
import time as _time
from datetime import date, timedelta

from django.conf import settings
from django.utils import timezone
from groq import Groq
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from checkins.models import DailyCheckin
from pyfit.throttles import AIChatRateThrottle
from workouts.models import Session
from ai_workout.views import calcular_fatiga, GROQ_TIMEOUT_SECONDS, GROQ_MAX_RETRIES

logger = logging.getLogger(__name__)

# Máximo de turnos del historial que se reenvían a Groq para acotar tokens.
MAX_HISTORY_TURNS = 10
# Longitud máxima de cada mensaje del usuario antes de enviarlo a la IA.
_MAX_MSG_LEN = 600


def _sanitize(value: str, max_len: int = _MAX_MSG_LEN) -> str:
    if not value:
        return ''
    return str(value).replace('\n', ' ').replace('\r', ' ').strip()[:max_len]


# ─── Context builder ──────────────────────────────────────────────────────────

def _build_system_prompt(user, lang: str) -> str:
    profile = getattr(user, 'profile', None)
    today = date.today()

    # ── Perfil ────────────────────────────────────────────────────────────────
    nombre = _sanitize(getattr(profile, 'nombre', '') or user.first_name or 'el atleta', 60)
    nivel = getattr(profile, 'nivel', 'principiante') or 'principiante'
    objetivo = _sanitize(getattr(profile, 'objetivo', '') or '', 100)
    objetivos_mult = getattr(profile, 'objetivos_multiples', []) or []
    lesiones = _sanitize(getattr(profile, 'lesiones', '') or '', 200)
    ejercicios_evitar = _sanitize(getattr(profile, 'ejercicios_evitar', '') or '', 200)
    ejercicios_favoritos = _sanitize(getattr(profile, 'ejercicios_favoritos', '') or '', 200)
    dias_semana = getattr(profile, 'dias_semana', 3) or 3
    nivel_estres = getattr(profile, 'nivel_estres', '') or 'moderado'
    tipo_trabajo = getattr(profile, 'tipo_trabajo', '') or 'mixto'
    usa_ciclo = getattr(profile, 'usa_ciclo_menstrual', False)
    peso = getattr(profile, 'peso', None)
    sexo = getattr(profile, 'sexo', '') or ''

    rm_lines = []
    for campo, label in [('rm_sentadilla', 'Sentadilla'), ('rm_peso_muerto', 'Peso muerto'),
                         ('rm_press_banca', 'Press banca'), ('rm_press_hombro', 'Press hombro')]:
        val = getattr(profile, campo, None)
        if val:
            rm_lines.append(f'{label}: {val} kg')

    # ── Check-in de hoy ───────────────────────────────────────────────────────
    checkin = DailyCheckin.objects.filter(user=user, fecha=today).first()
    checkin_lines = []
    if checkin:
        checkin_lines.append(f'Estado animo: {checkin.estado_animo}/5')
        if checkin.calidad_sueno:
            checkin_lines.append(f'Sueño: {checkin.calidad_sueno}h')
        if checkin.hrv:
            checkin_lines.append(f'HRV: {checkin.hrv} ms')
        if checkin.dolor_hoy:
            checkin_lines.append(f'Dolor/molestia hoy: {_sanitize(checkin.dolor_hoy, 200)}')
        if checkin.foco_entrenamiento:
            checkin_lines.append(f'Foco: {", ".join(checkin.foco_entrenamiento)}')
        if checkin.duracion_disponible:
            checkin_lines.append(f'Tiempo disponible: {checkin.duracion_disponible} min')
    else:
        checkin_lines.append('Sin check-in de hoy')

    # ── Sesiones recientes (14 días) ──────────────────────────────────────────
    hace_14d = timezone.now() - timedelta(days=14)
    sesiones_qs = Session.objects.filter(user=user, created_at__gte=hace_14d).order_by('-fecha')
    fatiga = calcular_fatiga(sesiones_qs)

    sesiones_completadas = sesiones_qs.filter(feedback__isnull=False)
    total_recientes = sesiones_completadas.count()

    rpe_real_vals = [
        s.feedback.rpe_real for s in sesiones_completadas.select_related('feedback')
        if s.feedback and s.feedback.rpe_real
    ]
    rpe_promedio = round(sum(rpe_real_vals) / len(rpe_real_vals), 1) if rpe_real_vals else None

    # Días sin trabajo por grupo muscular (últimas 2 semanas)
    grupos_trabajados: dict[str, int] = {}
    for s in sesiones_completadas:
        if s.respuesta_ia and isinstance(s.respuesta_ia, dict):
            for fase in s.respuesta_ia.get('fases', []):
                for ej in fase.get('ejercicios', []):
                    nombre_ej = ej.get('nombre', '').lower()
                    dias_diff = (today - s.fecha).days if s.fecha else 99
                    grupos_trabajados[nombre_ej] = min(grupos_trabajados.get(nombre_ej, 99), dias_diff)

    # ── Gamificación ──────────────────────────────────────────────────────────
    nivel_label = getattr(profile, 'nivel_label', 'Rookie') if profile else 'Rookie'
    if callable(nivel_label):
        nivel_label = nivel_label()
    racha = getattr(profile, 'racha_actual', 0) or 0
    mejor_racha = getattr(profile, 'mejor_racha', 0) or 0
    sesiones_totales = Session.objects.filter(user=user, feedback__isnull=False).count()
    logros = getattr(profile, 'logros', []) or []

    # ── Coach vinculado ───────────────────────────────────────────────────────
    coach_info = ''
    coach_paused = False
    link = user.coaches.filter(estado='activo').select_related('coach__profile').first()
    if link:
        coach_nombre = _sanitize(
            getattr(link.coach, 'first_name', '') or
            getattr(getattr(link.coach, 'profile', None), 'nombre', '') or 'tu coach', 60
        )
        ia_habilitada = link.config.get('ia', True)
        coach_paused = not ia_habilitada
        coach_info = f'Coach vinculado: {coach_nombre}. IA {"PAUSADA por el coach" if coach_paused else "habilitada"}.'
        if link.directiva:
            directiva_nota = _sanitize(link.directiva.get('nota', ''), 200)
            if directiva_nota:
                coach_info += f' Directiva del coach: {directiva_nota}'

    # ── Idioma del sistema ────────────────────────────────────────────────────
    lang_names = {'es': 'español', 'en': 'English', 'pt': 'português', 'fr': 'français'}
    lang_name = lang_names.get(lang, 'español')

    # ── Ciclo menstrual ───────────────────────────────────────────────────────
    ciclo_nota = ''
    if usa_ciclo and sexo == 'femenino':
        ultimo_ciclo = user.ciclos.order_by('-fecha_inicio').first()
        if ultimo_ciclo:
            dias_ciclo = (today - ultimo_ciclo.fecha_inicio).days % (ultimo_ciclo.duracion_ciclo or 28)
            if dias_ciclo <= 5:
                ciclo_nota = 'Fase menstrual (días 1-5): mayor fatiga percibida, priorizar movilidad e intensidad moderada.'
            elif dias_ciclo <= 13:
                ciclo_nota = 'Fase folicular (días 6-13): mayor energía y tolerancia a la carga, momento óptimo para trabajo intenso.'
            elif dias_ciclo <= 16:
                ciclo_nota = 'Ovulación (días 14-16): pico de rendimiento, sesiones de alta intensidad son óptimas.'
            else:
                ciclo_nota = 'Fase lútea (días 17+): mayor fatiga y peor recuperación hacia el final del ciclo, reducir intensidad progresivamente.'

    # ── Construcción del prompt ───────────────────────────────────────────────
    prompt = f"""Eres el Coach de IA de Zyfit, el entrenador personal de {nombre}.
Respondes SIEMPRE en {lang_name}. Máximo 3-4 oraciones por respuesta. Sin listas ni markdown.

═══ PERFIL DEL ATLETA ═══
Nombre: {nombre}
Nivel: {nivel} (gamificación: {nivel_label})
Objetivo principal: {objetivo or 'no definido'}
{('Objetivos adicionales: ' + ', '.join(objetivos_mult)) if objetivos_mult else ''}
Sexo: {sexo or 'no especificado'} | Peso: {peso or 'no definido'} kg
Días de entrenamiento por semana: {dias_semana}
Nivel de estrés habitual: {nivel_estres} | Tipo de trabajo: {tipo_trabajo}
{('RMs: ' + ' | '.join(rm_lines)) if rm_lines else ''}
{('Lesiones activas: ' + lesiones) if lesiones else ''}
{('Ejercicios a evitar: ' + ejercicios_evitar) if ejercicios_evitar else ''}
{('Ejercicios favoritos: ' + ejercicios_favoritos) if ejercicios_favoritos else ''}
{ciclo_nota}

═══ HOY ═══
{chr(10).join(checkin_lines)}

═══ HISTORIAL RECIENTE (14 días) ═══
Sesiones completadas: {total_recientes}
Fatiga acumulada: {fatiga}
{('RPE real promedio: ' + str(rpe_promedio)) if rpe_promedio else ''}

═══ GAMIFICACIÓN ═══
Sesiones totales: {sesiones_totales} | Racha: {racha} días | Mejor racha: {mejor_racha} días
{('Logros: ' + ', '.join(logros)) if logros else ''}

{('═══ COACH ═══' + chr(10) + coach_info) if coach_info else ''}

═══ REGLAS ABSOLUTAS ═══
1. NUNCA recomiendes ejercicios que estén en "ejercicios a evitar" ni que afecten zonas lesionadas.
2. Si hay dolor_hoy, SIEMPRE ajusta la respuesta para evitar cargar esa zona.
3. NUNCA prescribas medicamentos, diagnósticos ni reemplaces atención médica. Si hay dolor agudo o síntomas médicos, deriva a un profesional.
4. Si la IA está PAUSADA por el coach, no propongas planes alternativos al del coach.
5. Siempre hace referencia a datos reales del atleta — NUNCA respondas de forma genérica.
6. Ajusta toda recomendación de carga a la fatiga actual: {fatiga}.
7. No inventes estudios ni estadísticas que no estés seguro que existen.
8. Cuando el usuario tenga sueño bajo (<6h) o HRV bajo (<50ms), baja recomendaciones de intensidad."""

    return prompt


# ─── Groq chat (texto libre, no JSON) ────────────────────────────────────────

def _call_groq_chat(system_prompt: str, messages: list[dict], user_id=None) -> str:
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
        messages=[{'role': 'system', 'content': system_prompt}] + messages,
        max_tokens=400,
        temperature=0.7,
    )
    elapsed = _time.monotonic() - t0
    text = (completion.choices[0].message.content or '').strip()
    tokens_in = getattr(completion.usage, 'prompt_tokens', 0) or 0
    tokens_out = getattr(completion.usage, 'completion_tokens', 0) or 0
    logger.info(
        'groq_chat user=%s tokens_in=%d tokens_out=%d elapsed=%.2fs',
        user_id, tokens_in, tokens_out, elapsed,
    )
    if not text:
        raise ValueError('Empty response from AI')
    return text


# ─── View ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIChatRateThrottle])
def chat_coach(request):
    """
    POST /api/chat/
    Body: { mensaje: str, historial: [{role: 'user'|'coach', text: str}], lang: str }
    Response: { respuesta: str }
    """
    mensaje = _sanitize(request.data.get('mensaje', ''))
    if not mensaje:
        return Response({'error': 'mensaje requerido'}, status=status.HTTP_400_BAD_REQUEST)

    lang = request.data.get('lang', 'es')
    if lang not in ('es', 'en', 'pt', 'fr'):
        lang = 'es'

    # Reconstruir el historial como messages de Groq
    raw_history = request.data.get('historial', [])
    if not isinstance(raw_history, list):
        raw_history = []

    groq_messages: list[dict] = []
    for turn in raw_history[-MAX_HISTORY_TURNS:]:
        role = turn.get('role', '')
        text = _sanitize(turn.get('text', ''), 600)
        if not text:
            continue
        if role == 'user':
            groq_messages.append({'role': 'user', 'content': text})
        elif role == 'coach':
            groq_messages.append({'role': 'assistant', 'content': text})

    groq_messages.append({'role': 'user', 'content': mensaje})

    try:
        system_prompt = _build_system_prompt(request.user, lang)
        respuesta = _call_groq_chat(system_prompt, groq_messages, user_id=request.user.id)
    except RuntimeError as exc:
        logger.error('chat_coach config error: %s', exc)
        return Response({'error': 'Servicio no disponible'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as exc:
        logger.error('chat_coach groq error user=%s: %s', request.user.id, exc)
        return Response({'error': 'No se pudo obtener respuesta. Intenta de nuevo.'}, status=status.HTTP_502_BAD_GATEWAY)

    return Response({'respuesta': respuesta})
