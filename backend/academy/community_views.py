"""Vistas de Comunidad — delgadas a propósito: parsean el request y delegan
TODA la lógica de negocio (moderación, scoping, permisos, umbral de reportes)
en `community_service`, siguiendo el mismo patrón que el resto de `academy`."""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from pyfit.throttles import CommunityRateThrottle

from . import community_service
from .permissions import IsAcademyUser
from .serializers import (
    CommunityPostDetailSerializer, CommunityPostSerializer,
    CommunityReplySerializer, CommunityReportSerializer,
)


def _int_or_400(value, campo):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({campo: 'Debe ser un número entero.'})


def _optional_int(data, campo):
    value = data.get(campo)
    return _int_or_400(value, campo) if value not in (None, '') else None


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyUser])
@throttle_classes([CommunityRateThrottle])
def community_posts_view(request):
    """GET lista preguntas de una escuela (`?escuela=`, opcional `?curso=`,
    `?orden=recientes|top`); POST crea una pregunta nueva."""
    tenant = getattr(request, 'tenant', None)
    context = {'locale': getattr(request, 'locale', 'es')}

    if request.method == 'POST':
        post = community_service.crear_post(
            request.user,
            escuela_id=_int_or_400(request.data.get('escuela'), 'escuela'),
            curso_id=_optional_int(request.data, 'curso'),
            modulo_id=_optional_int(request.data, 'modulo'),
            titulo=request.data.get('titulo', ''),
            contenido=request.data.get('contenido', ''),
            tenant=tenant,
        )
        return Response(CommunityPostSerializer(post, context=context).data, status=status.HTTP_201_CREATED)

    escuela_id = _int_or_400(request.query_params.get('escuela'), 'escuela')
    curso_param = request.query_params.get('curso')
    curso_id = _int_or_400(curso_param, 'curso') if curso_param else None
    orden = request.query_params.get('orden', 'recientes')
    qs = community_service.listar_posts(
        request.user, escuela_id=escuela_id, curso_id=curso_id, orden=orden,
    )
    return Response({
        'results': CommunityPostSerializer(qs, many=True, context=context).data,
        'count': qs.count(),
    })


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def community_post_detail_view(request, post_id):
    post = community_service.obtener_post_visible(request.user, post_id)
    context = {'locale': getattr(request, 'locale', 'es')}
    return Response(CommunityPostDetailSerializer(post, context=context).data)


@api_view(['POST'])
@permission_classes([IsAcademyUser])
@throttle_classes([CommunityRateThrottle])
def community_replies_view(request, post_id):
    reply = community_service.crear_respuesta(
        request.user, post_id=post_id, contenido=request.data.get('contenido', ''),
    )
    return Response(CommunityReplySerializer(reply).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def community_vote_view(request, reply_id):
    return Response(community_service.votar_respuesta(request.user, reply_id))


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def community_best_answer_view(request, post_id):
    reply_id = _int_or_400(request.data.get('reply_id'), 'reply_id')
    post = community_service.marcar_mejor_respuesta(request.user, post_id, reply_id)
    context = {'locale': getattr(request, 'locale', 'es')}
    return Response(CommunityPostDetailSerializer(post, context=context).data)


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def community_report_view(request):
    reporte = community_service.reportar_contenido(
        request.user,
        post_id=_optional_int(request.data, 'post_id'),
        reply_id=_optional_int(request.data, 'reply_id'),
        motivo=request.data.get('motivo', ''),
        detalle=request.data.get('detalle', ''),
    )
    return Response(CommunityReportSerializer(reporte).data, status=status.HTTP_201_CREATED)
