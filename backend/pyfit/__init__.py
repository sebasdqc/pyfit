# Importar Celery app al arrancar Django para que los decoradores @shared_task
# queden registrados y el beat schedule se cargue correctamente.
from pyfit.celery import app as celery_app  # noqa: F401

__all__ = ('celery_app',)
