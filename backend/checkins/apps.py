from django.apps import AppConfig


class CheckinsConfig(AppConfig):
    name = 'checkins'

    def ready(self):
        """Registrar modelos en auditlog."""
        from auditlog.registry import auditlog
        from .models import DailyCheckin
        auditlog.register(DailyCheckin)
