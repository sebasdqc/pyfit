from django.apps import AppConfig


class ScoresConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'scores'
    verbose_name = 'Zyfit Score'

    def ready(self):
        """Registrar ScoreConfig en auditlog (parámetros ajustables editados a
        mano). ScoreSnapshot queda fuera a propósito: es un log append-only
        generado por máquina en cada feedback, auditarlo duplicaría
        almacenamiento sin aportar nada (la fila ya es el registro)."""
        from auditlog.registry import auditlog
        from .models import ScoreConfig

        auditlog.register(ScoreConfig)
