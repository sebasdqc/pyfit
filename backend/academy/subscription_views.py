"""Endpoints de la suscripción "Zyfit Academy Pro".

    GET  /api/academy/subscription/          estado actual + nivel resuelto (self-service)
    POST /api/academy/subscription/cancelar/ cancelar la propia suscripción (self-service)
    POST /api/academy/subscription/webhook/  punto de entrada ÚNICO para eventos del
                                              proveedor de pago (protegido por secreto)

Deliberadamente NO hay endpoint público de "activar": sin cobrador conectado
todavía, dejar que cualquier usuario autenticado se auto-otorgue Pro por una
llamada HTTP sería un agujero (acceso pago gratis). Hoy, Academy Pro solo se
activa desde Django Admin (staff) o, cuando exista un proveedor real, desde el
webhook de abajo — ver academy.payments para el gateway intercambiable.
"""

import hmac

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import access_service
from .models import AcademySubscription
from .payments import GATEWAY
from .permissions import IsAcademyUser


def _subscription_payload(user):
    sub = getattr(user, 'academy_subscription', None)
    if not sub:
        return {
            'estado': 'sin_suscripcion',
            'plan_tipo': None,
            'fecha_renovacion': None,
            'nivel': access_service.NIVEL_STARTER,
        }
    return {
        'estado': sub.estado,
        'plan_tipo': sub.plan_tipo,
        'fecha_renovacion': sub.fecha_renovacion.isoformat() if sub.fecha_renovacion else None,
        'nivel': access_service.nivel_academia_de(user),
    }


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def subscription_status(request):
    """Estado de la suscripción del usuario autenticado."""
    return Response(_subscription_payload(request.user))


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def subscription_cancel(request):
    """Cancela la suscripción propia (self-service: no otorga nada gratis, a
    diferencia de "activar", así que es seguro exponerla directamente).
    Conserva acceso Pro hasta `fecha_renovacion` (grace), como cualquier
    suscripción estándar."""
    sub = getattr(request.user, 'academy_subscription', None)
    if not sub or sub.estado != AcademySubscription.ESTADO_ACTIVA:
        return Response(
            {'detail': 'No tienes una suscripción activa para cancelar.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    GATEWAY.cancelar(sub)
    return Response(_subscription_payload(request.user))


@api_view(['POST'])
@permission_classes([AllowAny])
def subscription_webhook(request):
    """Punto de entrada único para eventos del proveedor de pago (renovación,
    cancelación, pago fallido). Protegido por secreto compartido en la
    cabecera `X-Academy-Payment-Secret` — mismo patrón que `streak_sweep`
    (settings.CRON_SECRET). Sin `ACADEMY_PAYMENT_WEBHOOK_SECRET` configurado
    el endpoint queda deshabilitado (503).

    Body esperado (formato provisional, a definir con el payload real del
    proveedor que se confirme): `{evento, email, plan_tipo}` donde `evento`
    es uno de 'activacion' | 'renovacion' | 'cancelacion' | 'pago_fallido'.
    """
    secret = getattr(settings, 'ACADEMY_PAYMENT_WEBHOOK_SECRET', '') or ''
    if not secret:
        return Response({'detail': 'Webhook deshabilitado (falta ACADEMY_PAYMENT_WEBHOOK_SECRET).'},
                         status=status.HTTP_503_SERVICE_UNAVAILABLE)
    provided = request.headers.get('X-Academy-Payment-Secret', '')
    if not hmac.compare_digest(provided, secret):
        return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

    evento = request.data.get('evento')
    email = (request.data.get('email') or '').lower().strip()
    user = get_object_or_404(get_user_model(), email=email)

    if evento in ('activacion', 'renovacion'):
        plan_tipo = request.data.get('plan_tipo') or 'mensual'
        sub = getattr(user, 'academy_subscription', None)
        if evento == 'renovacion' and sub:
            GATEWAY.renovar(sub)
        else:
            GATEWAY.activar(
                user, plan_tipo=plan_tipo,
                proveedor_pago=request.data.get('proveedor_pago', ''),
                referencia_externa=request.data.get('referencia_externa', ''),
            )
    elif evento == 'cancelacion':
        sub = getattr(user, 'academy_subscription', None)
        if sub:
            GATEWAY.cancelar(sub)
    elif evento == 'pago_fallido':
        sub = getattr(user, 'academy_subscription', None)
        if sub:
            GATEWAY.marcar_pago_fallido(sub)
    else:
        return Response({'detail': f'Evento desconocido: {evento!r}'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'detail': 'ok'})
