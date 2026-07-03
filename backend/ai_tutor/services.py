"""Capa de servicio del Tutor de Academy.

Orquesta el flujo completo, separado de las vistas (mismo patrón que el pipeline de
generación de sesiones): guardrail → límite por tier → recuperación (RAG) →
construcción del prompt → llamado a Groq → persistencia (mensajes + fuentes + uso).

Reutiliza la integración de Groq YA existente en el proyecto (no introduce un
proveedor nuevo): mismos constantes de timeout/retry que `ai_workout`, misma forma
de extraer el uso de tokens. La llamada es de texto libre (no JSON) con rol de
sistema, exactamente como el chat coach↔atleta.
"""

import logging
import time as _time

from django.conf import settings
from django.db import transaction
from groq import Groq

from ai_workout.views import GROQ_TIMEOUT_SECONDS, GROQ_MAX_RETRIES

from . import guardrails, prompt as prompt_mod
from .models import TutorConversation, TutorMessage, TutorDailyUsage
from .retrieval import retrieve_grounding

logger = logging.getLogger(__name__)

MODEL = 'llama-3.3-70b-versatile'
MAX_TOKENS = 650
TEMPERATURE = 0.4
# Turnos previos que se reenvían a la IA para acotar tokens.
MAX_HISTORY_TURNS = 8
_MAX_QUESTION_LEN = 1000


# ─── Excepciones de dominio ───────────────────────────────────────────────────

class TutorError(Exception):
    """Error base del tutor."""


class TutorDailyLimitReached(TutorError):
    def __init__(self, limit, used):
        self.limit = limit
        self.used = used
        super().__init__(f'daily limit reached ({used}/{limit})')


class TutorUnavailable(TutorError):
    """Groq no disponible o falló la generación."""


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _sanitize(value, max_len=_MAX_QUESTION_LEN) -> str:
    """Acota longitud y elimina saltos de línea (anti prompt-injection por payload)."""
    if not value:
        return ''
    return str(value).replace('\n', ' ').replace('\r', ' ').strip()[:max_len]


def _call_groq_chat(system_prompt: str, messages: list, user_id=None):
    """Llama a Groq en modo chat (texto libre) y devuelve (texto, usage).

    Mismo patrón que ai_workout: cliente por request, timeout/retry acotados,
    extracción de tokens para logging/coste."""
    if not settings.GROQ_API_KEY:
        raise TutorUnavailable('GROQ_API_KEY not configured')

    t0 = _time.monotonic()
    client = Groq(
        api_key=settings.GROQ_API_KEY,
        timeout=GROQ_TIMEOUT_SECONDS,
        max_retries=GROQ_MAX_RETRIES,
    )
    completion = client.chat.completions.create(
        model=MODEL,
        messages=[{'role': 'system', 'content': system_prompt}] + messages,
        max_tokens=MAX_TOKENS,
        temperature=TEMPERATURE,
    )
    elapsed = _time.monotonic() - t0
    text = (completion.choices[0].message.content or '').strip()
    tokens_in = getattr(completion.usage, 'prompt_tokens', 0) or 0
    tokens_out = getattr(completion.usage, 'completion_tokens', 0) or 0
    logger.info(
        'tutor_groq user=%s tokens_in=%d tokens_out=%d elapsed=%.2fs',
        user_id, tokens_in, tokens_out, elapsed,
    )
    if not text:
        raise TutorUnavailable('Empty response from AI')
    usage = {'tokens_in': tokens_in, 'tokens_out': tokens_out, 'elapsed_ms': int(elapsed * 1000)}
    return text, usage


def _history_messages(conversation) -> list:
    """Últimos turnos del hilo como messages de Groq (user/assistant)."""
    msgs = list(
        conversation.mensajes.order_by('-created_at')[: MAX_HISTORY_TURNS * 2]
    )
    msgs.reverse()
    out = []
    for m in msgs:
        role = 'assistant' if m.role == TutorMessage.ROLE_ASSISTANT else 'user'
        out.append({'role': role, 'content': _sanitize(m.contenido, 1200)})
    return out


def get_or_create_conversation(user, conversation_id=None, course=None):
    """Devuelve el hilo del usuario (o crea uno nuevo). Nunca cruza usuarios."""
    if conversation_id:
        conv = TutorConversation.objects.filter(id=conversation_id, user=user).first()
        if conv:
            return conv
    return TutorConversation.objects.create(user=user, course=course)


def _maybe_set_title(conversation, question):
    if not conversation.titulo:
        conversation.titulo = _sanitize(question, 120)
        conversation.save(update_fields=['titulo', 'updated_at'])
    else:
        # touch updated_at para ordenar por actividad reciente.
        conversation.save(update_fields=['updated_at'])


# ─── Orquestador ──────────────────────────────────────────────────────────────

def answer(*, user, question, fecha, conversation_id=None, course=None, course_id=None, curso_activo=''):
    """Procesa una pregunta y devuelve (TutorConversation, TutorMessage del tutor).

    Orden: guardrail (gratis) → límite por tier → RAG → prompt → Groq → persistir.
    El hilo se crea de forma perezosa: un intento bloqueado por límite NO deja un
    hilo vacío. Lanza TutorDailyLimitReached / TutorUnavailable según el caso.
    """
    question = _sanitize(question)
    if not question:
        raise TutorError('empty question')

    # 1) Guardrail: fuera de alcance → redirige SIN gastar cuota ni llamar a la IA.
    redir = guardrails.check(question)
    if redir:
        conversation = get_or_create_conversation(user, conversation_id, course)
        with transaction.atomic():
            TutorMessage.objects.create(
                conversation=conversation, role=TutorMessage.ROLE_USER, contenido=question,
            )
            assistant = TutorMessage.objects.create(
                conversation=conversation, role=TutorMessage.ROLE_ASSISTANT,
                contenido=redir['respuesta'], redirigido=True, fuentes=[],
            )
            _maybe_set_title(conversation, question)
        logger.info('tutor_guardrail user=%s tipo=%s', user.id, redir['tipo'])
        return conversation, assistant

    # 2) Límite diario por tier (starter=free vs pro). Antes de crear el hilo.
    if TutorDailyUsage.reached_limit(user, fecha):
        raise TutorDailyLimitReached(
            limit=TutorDailyUsage.limit_for(user),
            used=TutorDailyUsage.used_today(user, fecha),
        )

    # 3) Recuperación (RAG): prioriza el curso activo, cae al catálogo global.
    results, _scoped = retrieve_grounding(question, course_id=course_id)
    fuentes = [ch.fuente() for ch, _s in results]

    # 4) Prompt (grounding inyectado) + historial acotado + la pregunta nueva.
    system_prompt = prompt_mod.build_system_prompt(results, curso_activo=curso_activo)
    conversation = get_or_create_conversation(user, conversation_id, course)
    groq_messages = _history_messages(conversation)
    groq_messages.append({'role': 'user', 'content': question})

    # 5) Llamado a Groq.
    try:
        text, usage = _call_groq_chat(system_prompt, groq_messages, user_id=user.id)
    except TutorUnavailable:
        raise
    except Exception as exc:  # cualquier error del SDK/red
        logger.error('tutor_groq error user=%s: %s', user.id, exc)
        raise TutorUnavailable(str(exc)) from exc

    # 6) Persistir user + assistant y registrar uso (cuota + tokens).
    with transaction.atomic():
        TutorMessage.objects.create(
            conversation=conversation, role=TutorMessage.ROLE_USER, contenido=question,
        )
        assistant = TutorMessage.objects.create(
            conversation=conversation, role=TutorMessage.ROLE_ASSISTANT,
            contenido=text, fuentes=fuentes,
            tokens_in=usage['tokens_in'], tokens_out=usage['tokens_out'],
            generacion_ms=usage['elapsed_ms'], modelo=MODEL,
        )
        _maybe_set_title(conversation, question)
        TutorDailyUsage.record(
            user, fecha, tokens_in=usage['tokens_in'], tokens_out=usage['tokens_out'],
        )
    return conversation, assistant
