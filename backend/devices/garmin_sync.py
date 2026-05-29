"""
Lógica de sincronización con la Garmin Wellness API.

Diseñado para ser invocado tanto desde el Celery beat task como desde el
management command (para ejecución manual / testing).

Exporta una única función pública: sync_all_garmin_users()
"""
import logging
from datetime import datetime, timedelta, timezone as dt_timezone, date as _date

import requests
from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)

UTC = dt_timezone.utc

# Número de días consecutivos de fallo antes de desconectar automáticamente.
MAX_CONSECUTIVE_FAILURES = 3


# ─── Token refresh ────────────────────────────────────────────────────────────

def _refresh_token(integration) -> bool:
    """
    Renueva el access_token usando el refresh_token.
    Actualiza el modelo si tiene éxito.
    Retorna True si el token quedó válido, False si hay que desconectar.
    """
    if not integration.refresh_token:
        logger.warning(
            'garmin_sync: no refresh_token for user %s — disconnecting',
            integration.user_id,
        )
        return False

    try:
        resp = requests.post(
            f'{settings.GARMIN_OAUTH_BASE_URL}/oauth/token',
            data={
                'grant_type':    'refresh_token',
                'refresh_token': integration.refresh_token,
                'client_id':     settings.GARMIN_CLIENT_ID,
                'client_secret': settings.GARMIN_CLIENT_SECRET,
            },
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.error(
            'garmin_sync: network error refreshing token for user %s: %s',
            integration.user_id, exc,
        )
        return False  # No desconectamos por error de red, solo lo ignoramos este día

    if resp.status_code == 401:
        logger.warning(
            'garmin_sync: 401 on token refresh for user %s — marking disconnected',
            integration.user_id,
        )
        return False

    if not resp.ok:
        logger.error(
            'garmin_sync: unexpected %s on token refresh for user %s: %s',
            resp.status_code, integration.user_id, resp.text[:200],
        )
        return False

    token_data = resp.json()
    new_access  = token_data.get('access_token')
    new_refresh = token_data.get('refresh_token', integration.refresh_token)
    expires_in  = int(token_data.get('expires_in', 3600))

    if not new_access:
        return False

    integration.access_token  = new_access
    integration.refresh_token = new_refresh
    integration.token_expires_at = datetime.now(UTC) + timedelta(seconds=expires_in)
    integration.save(update_fields=['access_token', 'refresh_token', 'token_expires_at', 'updated_at'])
    logger.info('garmin_sync: token refreshed for user %s', integration.user_id)
    return True


# ─── Wellness API calls ───────────────────────────────────────────────────────

def _garmin_get(path: str, access_token: str, params: dict) -> dict | None:
    """
    Hace una petición GET a la Garmin Wellness API.
    Retorna la respuesta JSON (primer elemento de lista si aplica) o None si falla.
    """
    url = f'{settings.GARMIN_API_BASE_URL}{path}'
    try:
        resp = requests.get(
            url,
            headers={'Authorization': f'Bearer {access_token}'},
            params=params,
            timeout=20,
        )
    except requests.RequestException as exc:
        logger.error('garmin_sync: request to %s failed: %s', url, exc)
        return None

    if not resp.ok:
        logger.warning('garmin_sync: %s → %s: %s', url, resp.status_code, resp.text[:200])
        return None

    try:
        data = resp.json()
    except Exception:
        logger.error('garmin_sync: invalid JSON from %s', url)
        return None

    # La mayoría de endpoints de Wellness API devuelven lista de summaries
    if isinstance(data, list):
        return data[0] if data else None
    return data


def _fetch_daily(access_token: str, today_ts: int, now_ts: int) -> dict:
    """Obtiene Daily Summary de Garmin."""
    params = {
        'uploadStartTimeInSeconds': today_ts,
        'uploadEndTimeInSeconds':   now_ts,
    }
    result = _garmin_get('/wellness-api/rest/dailies', access_token, params)
    return result or {}


def _fetch_sleep(access_token: str, today_ts: int, now_ts: int) -> dict:
    """Obtiene Sleep Summary de Garmin."""
    params = {
        'uploadStartTimeInSeconds': today_ts,
        'uploadEndTimeInSeconds':   now_ts,
    }
    result = _garmin_get('/wellness-api/rest/sleeps', access_token, params)
    return result or {}


def _fetch_hrv(access_token: str, today_ts: int, now_ts: int) -> dict:
    """Obtiene HRV Summary de Garmin (no todos los dispositivos lo soportan)."""
    params = {
        'uploadStartTimeInSeconds': today_ts,
        'uploadEndTimeInSeconds':   now_ts,
    }
    result = _garmin_get('/wellness-api/rest/hrv-summaries', access_token, params)
    return result or {}


# ─── Core sync logic ──────────────────────────────────────────────────────────

def _sync_single_user(integration) -> bool:
    """
    Sincroniza los datos de Garmin para un usuario.
    Retorna True si la sincronización fue exitosa (aunque sea parcial).
    """
    now_utc  = datetime.now(UTC)
    today    = _date.today()

    # Inicio del día actual en UTC (Unix timestamp)
    today_dt   = datetime(today.year, today.month, today.day, tzinfo=UTC)
    today_ts   = int(today_dt.timestamp())
    now_ts     = int(now_utc.timestamp())

    # Paso 1 — Verificar y renovar token
    expires_at = integration.token_expires_at
    needs_refresh = (
        expires_at is None
        or expires_at <= now_utc + timedelta(hours=1)
    )
    if needs_refresh:
        refreshed = _refresh_token(integration)
        if not refreshed:
            # Si el fallo es 401, desconectar y notificar
            _disconnect_and_notify(integration)
            return False
        # Recargar tras el save
        integration.refresh_from_db()

    access_token = integration.access_token
    if not access_token:
        return False

    updates: dict = {}
    any_success = False

    # Paso 2 — Daily Summary
    try:
        daily = _fetch_daily(access_token, today_ts, now_ts)
        if daily:
            if daily.get('averageStressLevel') is not None:
                updates['stress_level'] = float(daily['averageStressLevel'])
            if daily.get('bodyBatteryChargedValue') is not None:
                updates['body_battery'] = float(daily['bodyBatteryChargedValue'])
            if daily.get('restingHeartRateInBeatsPerMinute') is not None:
                updates['resting_hr'] = float(daily['restingHeartRateInBeatsPerMinute'])
            any_success = True
    except Exception as exc:
        logger.error('garmin_sync: daily fetch error for user %s: %s', integration.user_id, exc)

    # Paso 3 — Sleep
    try:
        sleep = _fetch_sleep(access_token, today_ts, now_ts)
        if sleep:
            # sleepScores.overall puede ser anidado o top-level según versión del API
            sleep_scores = sleep.get('sleepScores') or {}
            overall = sleep_scores.get('overall') if isinstance(sleep_scores, dict) else None
            if overall is None:
                overall = sleep.get('sleepScore')  # fallback campo plano
            if overall is not None:
                updates['sleep_score'] = float(overall)
            any_success = True
    except Exception as exc:
        logger.error('garmin_sync: sleep fetch error for user %s: %s', integration.user_id, exc)

    # Paso 4 — HRV (puede estar vacío si el dispositivo no lo soporta)
    try:
        hrv_data = _fetch_hrv(access_token, today_ts, now_ts)
        if hrv_data:
            # Intentar lastNight5MinHighHrv primero, luego el promedio disponible
            hrv_val = (
                hrv_data.get('lastNight5MinHighHrv')
                or hrv_data.get('weeklyAvg')
                or hrv_data.get('lastNight')
            )
            if hrv_val is not None:
                updates['hrv'] = float(hrv_val)
            any_success = True
    except Exception as exc:
        logger.error('garmin_sync: HRV fetch error for user %s: %s', integration.user_id, exc)

    # Paso 5 — Guardar en DB con update() directo para no disparar signals
    if updates:
        updates['last_synced_at'] = now_utc
        with transaction.atomic():
            from devices.models import DeviceIntegration as _DI
            _DI.objects.filter(pk=integration.pk).update(**updates)
        logger.info(
            'garmin_sync: user %s updated — fields: %s',
            integration.user_id, list(updates.keys()),
        )

    return any_success


def _disconnect_and_notify(integration) -> None:
    """Marca la integración como desconectada y crea notificación in-app."""
    from devices.models import DeviceIntegration as _DI
    _DI.objects.filter(pk=integration.pk).update(
        status='disconnected',
        access_token=None,
        refresh_token=None,
        token_expires_at=None,
    )
    # Notificación in-app usando el modelo de notificaciones de Zyfit
    try:
        from users.models import Notification
        Notification.objects.create(
            user=integration.user,
            tipo='alerta',
            titulo='Garmin desconectado',
            cuerpo=(
                'Tu conexión con Garmin ha expirado o fue revocada. '
                'Ve a Perfil → Dispositivos para volver a conectar.'
            ),
        )
    except Exception as exc:
        logger.warning(
            'garmin_sync: could not create disconnect notification for user %s: %s',
            integration.user_id, exc,
        )
    logger.info('garmin_sync: user %s disconnected (token invalid)', integration.user_id)


# ─── Entry point público ──────────────────────────────────────────────────────

def sync_all_garmin_users() -> dict:
    """
    Sincroniza todos los usuarios con Garmin conectado.
    Retorna dict con contadores: total, success, failed, disconnected.
    """
    from devices.models import DeviceIntegration as _DI

    integrations = list(
        _DI.objects.filter(device='garmin', status='connected')
        .select_related('user')
    )

    total        = len(integrations)
    success      = 0
    failed       = 0
    disconnected = 0

    logger.info('garmin_sync: starting sync for %d users', total)

    for integration in integrations:
        try:
            ok = _sync_single_user(integration)
            if ok:
                success += 1
            else:
                # Si _sync_single_user devuelve False sin lanzar excepción,
                # es porque el token falló y ya se desconectó.
                disconnected += 1
        except Exception as exc:
            failed += 1
            logger.error(
                'garmin_sync: unexpected error for user %s: %s',
                integration.user_id, exc,
            )

    logger.info(
        'garmin_sync: done — total=%d success=%d failed=%d disconnected=%d',
        total, success, failed, disconnected,
    )
    return {
        'total':        total,
        'success':      success,
        'failed':       failed,
        'disconnected': disconnected,
    }
