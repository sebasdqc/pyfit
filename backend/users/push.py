"""Expo Push Notification helper.

Usage:
    from users.push import send_push

    send_push(user, title='¡Tu sesión está lista!', body='Abre Zyfit para entrenar.')
"""

import logging

import requests

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


def send_push(user, title: str, body: str, data: dict | None = None) -> bool:
    """Send an Expo push notification to `user`. Returns True if the HTTP call
    succeeded (does NOT guarantee delivery — Expo handles that)."""
    profile = getattr(user, 'profile', None)
    token = getattr(profile, 'push_token', '').strip()
    if not token or not token.startswith('ExponentPushToken'):
        return False

    payload: dict = {
        'to': token,
        'title': title,
        'body': body,
        'sound': 'default',
        'priority': 'high',
    }
    if data:
        payload['data'] = data

    try:
        resp = requests.post(EXPO_PUSH_URL, json=payload, timeout=5)
        resp.raise_for_status()
        return True
    except Exception as exc:
        logger.warning('push_notification failed user=%s: %s', user.id, exc)
        return False
