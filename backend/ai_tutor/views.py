"""Endpoints del Tutor de Academy (montados bajo /api/academy/tutor/).

Siguen la convención del resto del backend: vistas function-based con @api_view,
IsAuthenticated y throttle explícito. La lógica de IA vive en services.py; aquí
solo se validan entradas, se resuelve el contexto y se serializan respuestas.
"""

import logging

from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ai_workout.views import _get_local_date
from academy.models import Course
from pyfit.throttles import AcademyTutorRateThrottle

from . import services
from .models import TutorConversation, TutorMessage, TutorDailyUsage

logger = logging.getLogger(__name__)


# ─── Serializadores ───────────────────────────────────────────────────────────

def _serialize_message(m: TutorMessage) -> dict:
    return {
        'id': m.id,
        'role': m.role,
        'contenido': m.contenido,
        'fuentes': m.fuentes or [],
        'redirigido': m.redirigido,
        'feedback': m.feedback,
        'created_at': m.created_at.isoformat(),
    }


def _serialize_conversation(c: TutorConversation, n_mensajes=None) -> dict:
    return {
        'id': c.id,
        'titulo': c.titulo,
        'course_id': c.course_id,
        'n_mensajes': n_mensajes if n_mensajes is not None else c.mensajes.count(),
        'created_at': c.created_at.isoformat(),
        'updated_at': c.updated_at.isoformat(),
    }


def _cuota(user, fecha) -> dict:
    usados = TutorDailyUsage.used_today(user, fecha)
    limite = TutorDailyUsage.limit_for(user)
    return {'usados': usados, 'limite': limite, 'restantes': max(0, limite - usados)}


# ─── Chat ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AcademyTutorRateThrottle])
def tutor_chat(request):
    """POST /api/academy/tutor/chat/

    Body: { mensaje, conversation_id?, course_id?, curso_activo? }
    Resp: { conversation_id, mensaje: {...}, cuota: {usados, limite, restantes} }
    """
    mensaje = (request.data.get('mensaje') or '').strip()
    if not mensaje:
        return Response({'error': 'mensaje requerido'}, status=status.HTTP_400_BAD_REQUEST)

    fecha = _get_local_date(request)
    conversation_id = request.data.get('conversation_id')
    curso_activo = (request.data.get('curso_activo') or '').strip()[:160]

    # Curso activo (opcional): mejora la precisión del RAG y queda ligado al hilo.
    course = None
    course_id = request.data.get('course_id')
    if course_id:
        try:
            course = Course.objects.filter(id=int(course_id)).first()
        except (TypeError, ValueError):
            course = None
    course_id = course.id if course else None

    try:
        conversation, assistant = services.answer(
            user=request.user, question=mensaje, fecha=fecha,
            conversation_id=conversation_id, course=course,
            course_id=course_id, curso_activo=curso_activo,
        )
    except services.TutorDailyLimitReached as exc:
        return Response(
            {
                'error': 'Alcanzaste tu límite diario de preguntas al tutor.',
                'code': 'daily_limit',
                'cuota': {'usados': exc.used, 'limite': exc.limit, 'restantes': 0},
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    except services.TutorError as exc:
        logger.error('tutor_chat error user=%s: %s', request.user.id, exc)
        return Response(
            {'error': 'No se pudo obtener respuesta del tutor. Intenta de nuevo.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({
        'conversation_id': conversation.id,
        'mensaje': _serialize_message(assistant),
        'cuota': _cuota(request.user, fecha),
    })


# ─── Historial ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tutor_conversations(request):
    """GET /api/academy/tutor/conversations/ — hilos del alumno (sin mensajes)."""
    qs = (
        TutorConversation.objects.filter(user=request.user)
        .annotate(_n=Count('mensajes'))
        .order_by('-updated_at')[:100]
    )
    data = [_serialize_conversation(c, n_mensajes=c._n) for c in qs]
    return Response({'conversations': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tutor_conversation_detail(request, conversation_id):
    """GET /api/academy/tutor/conversations/<id>/ — hilo + mensajes (solo dueño)."""
    conv = TutorConversation.objects.filter(id=conversation_id, user=request.user).first()
    if not conv:
        return Response({'error': 'no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    mensajes = [_serialize_message(m) for m in conv.mensajes.order_by('created_at')]
    data = _serialize_conversation(conv, n_mensajes=len(mensajes))
    data['mensajes'] = mensajes
    return Response(data)


# ─── Feedback ─────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tutor_message_feedback(request, message_id):
    """POST /api/academy/tutor/messages/<id>/feedback/ — { feedback: util|no_util }."""
    fb = (request.data.get('feedback') or '').strip()
    valid = (TutorMessage.FEEDBACK_UP, TutorMessage.FEEDBACK_DOWN, TutorMessage.FEEDBACK_NONE)
    if fb not in valid:
        return Response({'error': 'feedback inválido'}, status=status.HTTP_400_BAD_REQUEST)

    msg = (
        TutorMessage.objects
        .filter(id=message_id, conversation__user=request.user, role=TutorMessage.ROLE_ASSISTANT)
        .first()
    )
    if not msg:
        return Response({'error': 'no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    msg.feedback = fb
    msg.save(update_fields=['feedback'])
    return Response({'ok': True, 'feedback': msg.feedback})
