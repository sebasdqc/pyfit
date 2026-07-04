"""
Celery tasks para la app users.

flush_expired_tokens — purga diaria de la blacklist de refresh tokens
(rest_framework_simplejwt.token_blacklist), que crece sin límite porque
ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION inserta una fila por cada
refresh y nada la borra.
"""
import logging

from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task(
    name='users.tasks.flush_expired_tokens',
    max_retries=0,       # no reintentar: el siguiente beat del día lo hará
    ignore_result=True,
    time_limit=300,
    soft_time_limit=240,
)
def flush_expired_tokens():
    """Corre el comando de simplejwt que borra outstanding/blacklisted tokens vencidos."""
    logger.info('celery: flush_expired_tokens started')
    call_command('flushexpiredtokens')
    logger.info('celery: flush_expired_tokens done')
