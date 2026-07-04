"""
Celery application para Zyfit.

Configuración mínima: Redis como broker y backend de resultados.
El beat schedule define los jobs periódicos (sync Garmin 6 AM UTC).
"""
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfit.settings')

app = Celery('pyfit')

# Cargar configuración desde Django settings, prefijo CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-descubrir tasks en todas las apps instaladas
app.autodiscover_tasks()

# ─── Beat schedule ────────────────────────────────────────────────────────────
app.conf.beat_schedule = {
    'sync-garmin-daily': {
        'task':     'devices.tasks.sync_garmin_all',
        'schedule': crontab(hour=6, minute=0),  # 6:00 AM UTC todos los días
        'options':  {'expires': 3600},           # descarta si no se ejecutó en 1h
    },
    'flush-expired-tokens-daily': {
        'task':     'users.tasks.flush_expired_tokens',
        'schedule': crontab(hour=3, minute=30),  # 3:30 AM UTC todos los días
        'options':  {'expires': 3600},
    },
}
app.conf.timezone = 'UTC'
