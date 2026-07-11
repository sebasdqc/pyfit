"""
Celery tasks para la app workouts.

send_daily_reminders — corre todos los días vía Celery Beat (ver
pyfit/celery.py). Antes de esto, `send_reminders` (el management command que
esta tarea invoca) no estaba cableado a ningún scheduler — ni Celery Beat ni
un Job de DO — así que nunca corría en producción pese a estar completo.
"""
import logging

from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task(
    name='workouts.tasks.send_daily_reminders',
    bind=True,
    max_retries=0,          # no reintentar: el siguiente beat del día lo hará
    ignore_result=True,
    time_limit=600,         # 10 min hard limit (protección ante cuelgues de red)
    soft_time_limit=540,    # 9 min soft limit para cleanup
)
def send_daily_reminders(self):
    logger.info('celery: send_daily_reminders started')
    call_command('send_reminders')
    logger.info('celery: send_daily_reminders done')
