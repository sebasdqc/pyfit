from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = 'users'

    def ready(self):
        """Registrar modelos en auditlog en cuanto la app esté lista."""
        from auditlog.registry import auditlog
        from .models import (
            NotificationPreference, Profile, User, UserInjury, UserLocation,
        )

        # User: excluimos `password` (hash, no aporta) y `last_login` (alta
        # frecuencia, ruido). El resto: cambios de email, is_staff, etc., sí
        # quedan auditados.
        auditlog.register(
            User,
            exclude_fields=['password', 'last_login'],
        )

        # Profile: omitimos campos derivados/gamificación que se actualizan por
        # sistema y no requieren trazabilidad humana.
        auditlog.register(
            Profile,
            exclude_fields=['logros', 'puntos_totales', 'racha_actual', 'mejor_racha'],
        )

        auditlog.register(UserLocation)
        auditlog.register(UserInjury)
        auditlog.register(NotificationPreference)
