"""
Celery tasks para la app runs.

purge_old_gps_points — retención de la traza GPS cruda. RunPoint no tiene
límite de crecimiento (un punto por segundo de cada carrera, para siempre);
pasado el período de retención se comprime a una snapshot diezmada
(RunSession.gps_resumen) y se borran las filas crudas.
"""
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# Días desde que termina una carrera hasta que su traza cruda se purga.
GPS_RETENTION_DAYS = 180


@shared_task(
    name='runs.tasks.purge_old_gps_points',
    max_retries=0,        # no reintentar: el siguiente beat lo retoma
    ignore_result=True,
    time_limit=1800,
    soft_time_limit=1700,
)
def purge_old_gps_points():
    """Comprime y purga la traza GPS de carreras completadas hace más de
    GPS_RETENTION_DAYS. Procesa de a una sesión para no acumular en memoria
    todas las RunPoint de golpe."""
    from .models import RunSession, RunPoint
    from .serializers import downsample_points, MAX_DETAIL_POINTS, RunPointSerializer

    corte = timezone.now() - timezone.timedelta(days=GPS_RETENTION_DAYS)
    qs = RunSession.objects.filter(
        status='completed', puntos_purgados=False, ended_at__lt=corte,
    ).only('id')

    total = 0
    for session in qs.iterator():
        points = list(RunPoint.objects.filter(session=session).order_by('timestamp'))
        if not points:
            # Sin puntos (carrera manual o ya vacía): solo marcar, nada que comprimir.
            RunSession.objects.filter(pk=session.pk).update(puntos_purgados=True)
            continue
        resumen = RunPointSerializer(downsample_points(points, MAX_DETAIL_POINTS), many=True).data
        RunSession.objects.filter(pk=session.pk).update(gps_resumen=resumen, puntos_purgados=True)
        RunPoint.objects.filter(session=session).delete()
        total += 1

    logger.info('celery: purge_old_gps_points done — sesiones purgadas=%d', total)
    return total
