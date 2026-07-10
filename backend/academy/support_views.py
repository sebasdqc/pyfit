"""Endpoints de Soporte de Zyfit Academy.

    GET  /api/academy/support/faq/                      FAQ publicada (estudiante)
    GET  /api/academy/support/chat/                      mi hilo de soporte + marca leídos (estudiante)
    POST /api/academy/support/chat/                      enviar mensaje (estudiante)
    GET  /api/academy/support/chat/no-leidos/             no leídos del admin, para el badge (estudiante)
    GET  /api/academy/support/admin/hilos/                inbox: lista de hilos (SOLO admin)
    GET  /api/academy/support/admin/hilos/<student_id>/   ver un hilo + marca leídos (SOLO admin)
    POST /api/academy/support/admin/hilos/<student_id>/   responder (SOLO admin)

Mismo criterio REST + polling (sin WebSockets) que el chat coach↔atleta —
ver `academy.support_service` para la lógica y `mobile/CLAUDE.md` ("Chat por
polling de 5s") para el precedente de por qué no hay infraestructura de
tiempo real en este proyecto.
"""

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from . import support_service
from .permissions import IsAcademyAdmin, IsAcademyUser
from .serializers import SupportFAQSerializer
from pyfit.throttles import SupportChatRateThrottle

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def support_faq_view(request):
    tenant = getattr(request, 'tenant', None)
    faqs = support_service.faqs_publicadas(tenant)
    context = {'locale': getattr(request, 'locale', 'es')}
    return Response(SupportFAQSerializer(faqs, many=True, context=context).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyUser])
@throttle_classes([SupportChatRateThrottle])
def support_chat_view(request):
    """Chat del estudiante con soporte. GET lista (y marca leídos los mensajes
    del admin); POST envía un mensaje del estudiante."""
    tenant = getattr(request, 'tenant', None)

    if request.method == 'POST':
        texto = (request.data.get('texto') or '').strip()
        if not texto:
            return Response({'error': 'El mensaje está vacío.'}, status=status.HTTP_400_BAD_REQUEST)
        msg = support_service.enviar_mensaje(tenant, request.user, texto, from_admin=False)
        return Response(support_service.serializar_mensaje(msg), status=status.HTTP_201_CREATED)

    support_service.marcar_leidos(tenant, request.user, from_admin=True)
    mensajes = [support_service.serializar_mensaje(m) for m in support_service.hilo_estudiante(tenant, request.user)]
    return Response({'mensajes': mensajes})


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def support_chat_unread_view(request):
    """Conteo de mensajes del admin sin leer (no marca como leídos) — para el
    badge de "Soporte" en la navegación."""
    tenant = getattr(request, 'tenant', None)
    return Response({'no_leidos': support_service.no_leidos_estudiante(tenant, request.user)})


@api_view(['GET'])
@permission_classes([IsAcademyAdmin])
def support_admin_hilos_view(request):
    tenant = getattr(request, 'tenant', None)
    return Response(support_service.hilos_admin(tenant))


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyAdmin])
@throttle_classes([SupportChatRateThrottle])
def support_admin_hilo_detail_view(request, student_id):
    """Hilo de un estudiante puntual, del lado del admin. GET lista (y marca
    leídos los mensajes del estudiante); POST envía la respuesta del admin."""
    tenant = getattr(request, 'tenant', None)
    student = get_object_or_404(User, pk=student_id, academy_tenant=tenant)

    if request.method == 'POST':
        texto = (request.data.get('texto') or '').strip()
        if not texto:
            return Response({'error': 'El mensaje está vacío.'}, status=status.HTTP_400_BAD_REQUEST)
        msg = support_service.enviar_mensaje(tenant, student, texto, from_admin=True, admin=request.user)
        return Response(support_service.serializar_mensaje(msg), status=status.HTTP_201_CREATED)

    support_service.marcar_leidos(tenant, student, from_admin=False)
    mensajes = [support_service.serializar_mensaje(m) for m in support_service.hilo_estudiante(tenant, student)]
    return Response({
        'student': {
            'id': student.id,
            'nombre': support_service.display_name(student),
            'email': student.email,
        },
        'mensajes': mensajes,
    })
