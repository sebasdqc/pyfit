"""
Celery tasks para la app devices.

sync_garmin_all — corre todos los días a las 6:00 AM UTC via Celery Beat.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name='devices.tasks.sync_garmin_all',
    bind=True,
    max_retries=0,          # no reintentar: el siguiente beat del día lo hará
    ignore_result=True,
    time_limit=600,         # 10 min hard limit (protección ante cuelgues de red)
    soft_time_limit=540,    # 9 min soft limit para cleanup
)
def sync_garmin_all(self):
    """
    Sincroniza datos de Garmin para todos los usuarios con status='connected'.
    Programado para 6:00 AM UTC diariamente via CELERY_BEAT_SCHEDULE.
    """
    logger.info('celery: sync_garmin_all started')
    from devices.garmin_sync import sync_all_garmin_users
    result = sync_all_garmin_users()
    logger.info(
        'celery: sync_garmin_all done — total=%d success=%d failed=%d disconnected=%d',
        result['total'], result['success'], result['failed'], result['disconnected'],
    )
    return result
