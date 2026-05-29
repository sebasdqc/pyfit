"""
Endpoints de integraciones de dispositivos para Zyfit.

Garmin:      OAuth 2.0 — tokens gestionados en backend
Apple Health: sin OAuth — datos enviados por la app iOS directamente
"""
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from urllib.parse import urlencode

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from devices.models import DeviceIntegration

logger = logging.getLogger(__name__)
UTC = dt_timezone.utc


# ══════════════════════════════════════════════════════════════════════════════
# GARMIN
# ══════════════════════════════════════════════════════════════════════════════

def _garmin_token_url() -> str:
    return f'{settings.GARMIN_OAUTH_BASE_URL}/oauth/token'

def _garmin_revoke_url() -> str:
    return f'{settings.GARMIN_OAUTH_BASE_URL}/oauth/revoke'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def garmin_auth_url(request):
    """Construye la URL de autorización OAuth 2.0 de Garmin. No toca la DB."""
    params = {
        'response_type': 'code',
        'client_id':     settings.GARMIN_CLIENT_ID,
        'redirect_uri':  settings.GARMIN_REDIRECT_URI,
        'scope':         'WELLNESS HEARTRATE SLEEP HRV STRESS',
    }
    auth_url = f'{settings.GARMIN_OAUTH_BASE_URL}/oauth/authorize?{urlencode(params)}'
    return Response({'auth_url': auth_url})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def garmin_callback(request):
    """Intercambia el code de autorización por tokens y los guarda encriptados."""
    code = (request.data.get('code') or '').strip()
    if not code:
        return Response({'error': 'El parámetro "code" es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        resp = requests.post(
            _garmin_token_url(),
            data={
                'grant_type':    'authorization_code',
                'code':          code,
                'client_id':     settings.GARMIN_CLIENT_ID,
                'client_secret': settings.GARMIN_CLIENT_SECRET,
                'redirect_uri':  settings.GARMIN_REDIRECT_URI,
            },
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.error('garmin_callback: network error for user %s: %s', request.user.id, exc)
        return Response({'error': 'No se pudo contactar con Garmin. Intenta de nuevo.'}, status=status.HTTP_502_BAD_GATEWAY)

    if not resp.ok:
        logger.warning('garmin_callback: %s for user %s: %s', resp.status_code, request.user.id, resp.text[:200])
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text[:200]
        return Response({'error': 'Error de autorización con Garmin.', 'detail': detail}, status=status.HTTP_400_BAD_REQUEST)

    token_data    = resp.json()
    access_token  = token_data.get('access_token', '')
    refresh_token = token_data.get('refresh_token', '')
    expires_in    = int(token_data.get('expires_in', 3600))

    if not access_token:
        return Response({'error': 'Garmin no devolvió access_token.'}, status=status.HTTP_400_BAD_REQUEST)

    DeviceIntegration.objects.update_or_create(
        user=request.user, device='garmin',
        defaults={
            'status':           'connected',
            'access_token':     access_token,
            'refresh_token':    refresh_token,
            'token_expires_at': datetime.now(UTC) + timedelta(seconds=expires_in),
        },
    )
    logger.info('garmin_callback: user %s connected Garmin', request.user.id)
    return Response({'status': 'connected'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def garmin_disconnect(request):
    """Revoca el token en Garmin y desconecta. Conserva last_synced_at y métricas."""
    integration = DeviceIntegration.objects.filter(user=request.user, device='garmin').first()
    if not integration or integration.status == 'disconnected':
        return Response({'status': 'disconnected'})

    if integration.access_token:
        try:
            requests.post(
                _garmin_revoke_url(),
                data={
                    'token':         integration.access_token,
                    'client_id':     settings.GARMIN_CLIENT_ID,
                    'client_secret': settings.GARMIN_CLIENT_SECRET,
                },
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.warning('garmin_disconnect: revoke failed for user %s (ignored): %s', request.user.id, exc)

    DeviceIntegration.objects.filter(user=request.user, device='garmin').update(
        status='disconnected', access_token=None, refresh_token=None, token_expires_at=None,
    )
    logger.info('garmin_disconnect: user %s disconnected Garmin', request.user.id)
    return Response({'status': 'disconnected'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def garmin_status(request):
    """Estado + métricas actuales de Garmin para mostrar en perfil."""
    return Response(_device_status_payload(request.user, 'garmin'))


# ══════════════════════════════════════════════════════════════════════════════
# APPLE HEALTH
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apple_health_connect(request):
    """
    Registra que el usuario concedió permisos de HealthKit.
    No hay OAuth — la app iOS llama a este endpoint una vez tras el diálogo de permisos.
    """
    DeviceIntegration.objects.update_or_create(
        user=request.user, device='apple_health',
        defaults={'status': 'connected'},
    )
    logger.info('apple_health_connect: user %s connected Apple Health', request.user.id)
    return Response({'status': 'connected'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apple_health_sync(request):
    """
    Recibe métricas de HealthKit leídas por la app iOS y las persiste.
    Al menos un campo debe ser no-null.
    """
    def _float(v):
        try:
            return float(v) if v is not None else None
        except (TypeError, ValueError):
            return None

    hrv          = _float(request.data.get('hrv'))
    sleep_score  = _float(request.data.get('sleep_score'))
    resting_hr   = _float(request.data.get('resting_hr'))
    heart_rate   = _float(request.data.get('heart_rate'))
    stress_level = _float(request.data.get('stress_level'))

    if all(v is None for v in [hrv, sleep_score, resting_hr, heart_rate, stress_level]):
        return Response(
            {'error': 'Al menos un campo de métricas debe tener valor.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    now = datetime.now(UTC)

    DeviceIntegration.objects.update_or_create(
        user=request.user, device='apple_health',
        defaults={
            'status':         'connected',
            'hrv':            hrv,
            'sleep_score':    sleep_score,
            'resting_hr':     resting_hr if resting_hr is not None else heart_rate,
            'stress_level':   stress_level,
            'last_synced_at': now,
        },
    )
    logger.info('apple_health_sync: user %s synced Apple Health', request.user.id)
    return Response({'last_synced_at': now.isoformat()})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def apple_health_disconnect(request):
    """Desconecta Apple Health y limpia métricas. Conserva el registro."""
    DeviceIntegration.objects.filter(user=request.user, device='apple_health').update(
        status='disconnected',
        hrv=None, sleep_score=None, resting_hr=None,
        stress_level=None, body_battery=None,
    )
    logger.info('apple_health_disconnect: user %s disconnected Apple Health', request.user.id)
    return Response({'status': 'disconnected'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def apple_health_status(request):
    """Estado + métricas actuales de Apple Health para mostrar en perfil."""
    return Response(_device_status_payload(request.user, 'apple_health'))


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS COMPARTIDOS
# ══════════════════════════════════════════════════════════════════════════════

def _device_status_payload(user, device: str) -> dict:
    """Construye el payload de estado para cualquier dispositivo."""
    integration = DeviceIntegration.objects.filter(user=user, device=device).first()
    if not integration:
        return {'status': 'disconnected', 'last_synced_at': None, 'metrics': None}

    metrics = None
    if integration.status == 'connected' and integration.last_synced_at:
        metrics = {
            'hrv':          integration.hrv,
            'sleep_score':  integration.sleep_score,
            'resting_hr':   integration.resting_hr,
            'stress_level': integration.stress_level,
            'body_battery': integration.body_battery,
        }

    return {
        'status':         integration.status,
        'last_synced_at': integration.last_synced_at,
        'metrics':        metrics,
    }
