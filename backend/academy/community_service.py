"""Comunidad — capa de servicio (toda la lógica de negocio vive aquí, no en
las vistas: creación de posts/respuestas, moderación automática, votos,
"mejor respuesta" y reportes con auto-ocultamiento por umbral).

Autosostenible por diseño: el chequeo de contenido reutiliza la integración
de Groq YA existente en el proyecto (mismo modelo/wrapper que `ai_workout` y
`ai_tutor`, ver `_call_groq` más abajo) — no se introduce un proveedor de IA
nuevo. El sistema de reportes de alumnos es la red de seguridad secundaria
para lo que la IA no llegó a interceptar; ninguno de los dos requiere que un
humano revise una cola para que el foro siga funcionando (ver `academy.admin`
para el panel de revisión, 100% opcional)."""

import json
import logging

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError

from ai_workout.views import GROQ_MAX_RETRIES, GROQ_TIMEOUT_SECONDS
from pyfit.llm import get_llm_client

from . import badges_service, community_guardrails
from .community_models import (
    ESTADO_OCULTO_IA, ESTADO_OCULTO_REPORTES, ESTADO_VISIBLE,
    CommunityPost, CommunityReply, CommunityReport, CommunityVote,
)
from .community_prompts import (
    CATEGORIAS_VALIDAS, build_moderation_system_prompt, build_moderation_user_message,
)
from .models import Course, Module, School
from .serializers import _display_name

logger = logging.getLogger(__name__)

TITULO_MAX_LEN = 200
CONTENIDO_POST_MAX_LEN = 5000
CONTENIDO_REPLY_MAX_LEN = 3000


# ─── Moderación automática (IA) ────────────────────────────────────────────────

def _call_groq_moderation(system_prompt: str, user_message: str, max_tokens: int) -> dict:
    """Variante de `ai_workout.views._call_groq` con system/user separados
    (defensa contra prompt injection: el texto del alumno viaja como mensaje
    'user', nunca mezclado con las instrucciones del moderador en un único
    bloque — mismo patrón que `ai_tutor.services._call_groq_chat`). Devuelve
    el JSON parseado; propaga `json.JSONDecodeError`/`ValueError`/errores del
    SDK de Groq tal cual para que el caller decida cómo degradar."""
    if not settings.LLM_API_KEY:
        raise RuntimeError('LLM_API_KEY not configured')
    client = get_llm_client(timeout=GROQ_TIMEOUT_SECONDS, max_retries=GROQ_MAX_RETRIES)
    completion = client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_message},
        ],
        max_tokens=max_tokens,
    )
    text = (completion.choices[0].message.content or '').strip()
    if not text:
        raise ValueError('Empty response from AI')
    clean = text.replace('```json', '').replace('```', '').strip()
    return json.loads(clean)


def moderar_texto(texto: str) -> dict:
    """Clasifica `texto` en apropiado/spam/fuera_de_tema/dañino.

    Orden: guardrails determinísticos (gratis, sin llamar a Groq) → Groq.

    Dos formas de degradar, tratadas DISTINTO a propósito:
      • Groq no responde (timeout, sin API key, error del SDK) → FAIL-OPEN
        (se publica como 'apropiado'): es una caída de un servicio externo
        opcional, y no debe degradar la experiencia de todo el foro (el
        sistema de reportes de alumnos queda como red de seguridad
        secundaria). Trade-off deliberado, sin cambios.
      • Groq SÍ responde pero con JSON inválido o una categoría que no
        reconocemos → FAIL-CLOSED (se oculta para revisión, igual que
        'dañino'): esto es lo que lograría un alumno que intente manipular al
        clasificador para que su respuesta no sea interpretable. Antes ambos
        casos caían al mismo 'apropiado' — eso premiaba precisamente el
        intento de manipulación."""
    hit = community_guardrails.check(texto)
    if hit:
        return {**hit, 'fuente': 'guardrails'}

    try:
        data = _call_groq_moderation(
            build_moderation_system_prompt(), build_moderation_user_message(texto), max_tokens=150,
        )
    except json.JSONDecodeError as exc:
        logger.warning('community_moderar_texto: Groq respondió con JSON inválido (%s) — oculto para revisión', exc)
        return {'categoria': 'dañino', 'razon': 'respuesta de moderación no interpretable', 'fuente': 'invalido'}
    except Exception as exc:
        logger.warning('community_moderar_texto: Groq no disponible (%s)', exc)
        return {'categoria': 'apropiado', 'razon': 'moderación no disponible', 'fuente': 'fallback'}

    categoria = data.get('categoria') if isinstance(data, dict) else None
    if categoria not in CATEGORIAS_VALIDAS:
        logger.warning('community_moderar_texto: categoría inválida de Groq (%r) — oculto para revisión', categoria)
        return {'categoria': 'dañino', 'razon': 'categoría de moderación no reconocida', 'fuente': 'invalido'}
    razon = (data.get('razon') if isinstance(data, dict) else '') or ''
    return {'categoria': categoria, 'razon': razon, 'fuente': 'groq'}


def _estado_desde_moderacion(resultado: dict) -> str:
    return ESTADO_VISIBLE if resultado['categoria'] == 'apropiado' else ESTADO_OCULTO_IA


# ─── Notificaciones (best-effort, respeta preferencias) ────────────────────────

def _notificar(destinatario, *, tipo, texto, data=None):
    """Notifica al alumno respetando `NotificationPreference.comunidad`. El
    brief exige que esta notificación sea explícitamente opcional/configurable
    (a diferencia de otros tipos del proyecto, aquí también se gatea el push,
    no solo el registro in-app). Failure-safe y con import diferido, mismo
    patrón que `academy.streak_service._push`: nunca debe tumbar el flujo de
    comunidad ni acoplar Academy a `users` en el arranque."""
    try:
        prefs = getattr(destinatario, 'notification_prefs', None)
        if prefs is not None and not prefs.comunidad:
            return
        from users.models import Notification
        from users.push import send_push
        Notification.objects.create(user=destinatario, tipo=tipo, texto=texto)
        send_push(destinatario, title='Zyfit Academy · Comunidad', body=texto, data=data or {})
    except Exception:
        pass


# ─── Posts ──────────────────────────────────────────────────────────────────────

def obtener_post_visible(user, post_id) -> CommunityPost:
    """Un post oculto solo lo ve su autor o staff/admin (para que puedan verlo
    y, en su caso, reportarlo/editarlo vía admin); un tercero recibe 404."""
    post = get_object_or_404(CommunityPost, pk=post_id)
    if (post.estado == ESTADO_VISIBLE or post.autor_id == user.id
            or user.is_staff or user.is_admin or user.academy_admin):
        return post
    raise Http404


def crear_post(user, *, escuela_id, curso_id=None, modulo_id=None, titulo, contenido, tenant) -> CommunityPost:
    titulo = (titulo or '').strip()
    contenido = (contenido or '').strip()
    if not titulo:
        raise ValidationError({'titulo': 'El título es obligatorio.'})
    if not contenido:
        raise ValidationError({'contenido': 'El contenido es obligatorio.'})
    if len(titulo) > TITULO_MAX_LEN:
        raise ValidationError({'titulo': f'Máximo {TITULO_MAX_LEN} caracteres.'})
    if len(contenido) > CONTENIDO_POST_MAX_LEN:
        raise ValidationError({'contenido': f'Máximo {CONTENIDO_POST_MAX_LEN} caracteres.'})

    # Scoping por tenant activo (igual criterio que schools_view/courses_view):
    # cualquier alumno del tenant puede postear en cualquier escuela publicada,
    # SIN requerir estar inscrito (no hay concepto de "mis escuelas").
    escuela = get_object_or_404(School, pk=escuela_id, tenant=tenant)

    curso = None
    if curso_id is not None:
        curso = get_object_or_404(Course, pk=curso_id, school=escuela, publicado=True)

    modulo = None
    if modulo_id is not None:
        if curso is None:
            raise ValidationError({'modulo': 'No se puede indicar un módulo sin indicar un curso.'})
        modulo = get_object_or_404(Module, pk=modulo_id, course=curso)

    resultado = moderar_texto(f'{titulo}\n{contenido}')
    return CommunityPost.objects.create(
        autor=user, escuela=escuela, tenant=tenant, curso=curso, modulo=modulo,
        titulo=titulo, contenido=contenido,
        estado=_estado_desde_moderacion(resultado), moderacion_resultado=resultado,
    )


def listar_posts(user, *, escuela_id, curso_id=None, orden='recientes'):
    """Solo contenido visible (lo oculto lo revisa staff vía Django Admin, ver
    `academy.admin`) — nunca se filtra por matrícula: cualquier alumno del
    tenant ve las preguntas de una escuela publicada."""
    qs = CommunityPost.objects.filter(escuela_id=escuela_id, estado=ESTADO_VISIBLE)
    if curso_id is not None:
        qs = qs.filter(curso_id=curso_id)
    if orden == 'top':
        return qs.order_by('-respuestas_count', '-created_at')
    return qs.order_by('-created_at')


# ─── Respuestas ─────────────────────────────────────────────────────────────────

def crear_respuesta(user, *, post_id, contenido) -> CommunityReply:
    contenido = (contenido or '').strip()
    if not contenido:
        raise ValidationError({'contenido': 'El contenido es obligatorio.'})
    if len(contenido) > CONTENIDO_REPLY_MAX_LEN:
        raise ValidationError({'contenido': f'Máximo {CONTENIDO_REPLY_MAX_LEN} caracteres.'})

    post = obtener_post_visible(user, post_id)
    if post.estado != ESTADO_VISIBLE:
        raise ValidationError({'detail': 'No se puede responder contenido oculto.'})

    resultado = moderar_texto(contenido)
    estado = _estado_desde_moderacion(resultado)

    with transaction.atomic():
        reply = CommunityReply.objects.create(
            post=post, autor=user, contenido=contenido,
            estado=estado, moderacion_resultado=resultado,
        )
        CommunityPost.objects.filter(pk=post.pk).update(respuestas_count=F('respuestas_count') + 1)

    if estado == ESTADO_VISIBLE and reply.autor_id != post.autor_id:
        _notificar(
            post.autor, tipo='community_respuesta',
            texto=f'{_display_name(user)} respondió tu pregunta "{post.titulo}".',
            data={'post_id': post.id},
        )
    return reply


def votar_respuesta(user, reply_id) -> dict:
    """Toggle de upvote. Devuelve el conteo actualizado y si el usuario quedó
    con voto puesto tras la operación."""
    reply = get_object_or_404(CommunityReply, pk=reply_id, estado=ESTADO_VISIBLE)
    if reply.autor_id == user.id:
        raise ValidationError({'detail': 'No podés votar tu propia respuesta.'})

    with transaction.atomic():
        voto = CommunityVote.objects.filter(reply=reply, usuario=user).first()
        if voto:
            voto.delete()
            CommunityReply.objects.filter(pk=reply.pk).update(votos_count=F('votos_count') - 1)
            ya_voto = False
        else:
            CommunityVote.objects.create(reply=reply, usuario=user)
            CommunityReply.objects.filter(pk=reply.pk).update(votos_count=F('votos_count') + 1)
            ya_voto = True

    reply.refresh_from_db(fields=['votos_count'])
    return {'votos_count': reply.votos_count, 'ya_voto': ya_voto}


def marcar_mejor_respuesta(user, post_id, reply_id) -> CommunityPost:
    """Solo el autor original de la pregunta puede marcar la mejor respuesta —
    es una acción del alumno, no de un moderador. Dispara notificación y
    evalúa el badge opcional "Colaborador" como efecto colateral síncrono de
    la acción real (MISMO patrón que `academy.views._otorgar_insignias`:
    nunca en una lectura, siempre tras una acción concreta)."""
    post = get_object_or_404(CommunityPost, pk=post_id)
    if post.autor_id != user.id:
        raise PermissionDenied('Solo quien hizo la pregunta puede marcar la mejor respuesta.')

    reply = get_object_or_404(CommunityReply, pk=reply_id, post=post, estado=ESTADO_VISIBLE)

    with transaction.atomic():
        CommunityReply.objects.filter(post=post, es_mejor_respuesta=True) \
            .exclude(pk=reply.pk).update(es_mejor_respuesta=False)
        CommunityReply.objects.filter(pk=reply.pk).update(es_mejor_respuesta=True)
        post.mejor_respuesta = reply
        post.save(update_fields=['mejor_respuesta', 'updated_at'])

    if reply.autor_id != post.autor_id:
        _notificar(
            reply.autor, tipo='community_mejor_respuesta',
            texto=f'Tu respuesta en "{post.titulo}" fue marcada como mejor respuesta.',
            data={'post_id': post.id},
        )

    try:
        badges_service.evaluate_badges(reply.autor)
    except Exception:
        pass  # failure-safe: nunca debe tumbar el flujo de comunidad

    post.refresh_from_db()
    return post


# ─── Reportes ───────────────────────────────────────────────────────────────────

def reportar_contenido(user, *, post_id=None, reply_id=None, motivo, detalle='') -> CommunityReport:
    """Idempotente (un usuario no duplica su reporte sobre el mismo contenido,
    vía `UniqueConstraint`). Al superar `settings.COMMUNITY_REPORT_THRESHOLD`
    oculta el contenido automáticamente, sin intervención manual."""
    if bool(post_id) == bool(reply_id):
        raise ValidationError({'detail': 'Debés indicar exactamente un post o una respuesta.'})
    if motivo not in dict(CommunityReport.MOTIVO_CHOICES):
        raise ValidationError({'motivo': 'Motivo inválido.'})

    target_cls = CommunityPost if post_id is not None else CommunityReply
    target = get_object_or_404(target_cls, pk=post_id if post_id is not None else reply_id)
    if target.autor_id == user.id:
        raise ValidationError({'detail': 'No podés reportar tu propio contenido.'})

    with transaction.atomic():
        reporte, creado = CommunityReport.objects.get_or_create(
            post=target if post_id is not None else None,
            reply=target if reply_id is not None else None,
            reportado_por=user,
            defaults={'motivo': motivo, 'detalle': detalle},
        )
        if creado:
            target_cls.objects.filter(pk=target.pk).update(reportes_count=F('reportes_count') + 1)
            target.refresh_from_db(fields=['reportes_count', 'estado'])
            if target.estado == ESTADO_VISIBLE and target.reportes_count >= settings.COMMUNITY_REPORT_THRESHOLD:
                target_cls.objects.filter(pk=target.pk).update(estado=ESTADO_OCULTO_REPORTES)

    return reporte
