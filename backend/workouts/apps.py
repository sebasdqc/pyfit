from django.apps import AppConfig


class WorkoutsConfig(AppConfig):
    name = 'workouts'

    def ready(self):
        """Registrar modelos en auditlog."""
        from auditlog.registry import auditlog
        from .models import Competition, Session, SessionFeedback

        # Session: el campo `respuesta_ia` es un JSON enorme que cambia entre
        # sesiones. Igual con `prompt_usado` y los registros de evidencia/decisiones.
        # Auditamos sólo los hechos estructurales (fecha, duración, RPE target).
        auditlog.register(
            Session,
            exclude_fields=[
                'respuesta_ia', 'prompt_usado', 'decisiones', 'evidencia',
                'logro', 'sustituciones',
            ],
        )

        # SessionFeedback: lo registramos completo — son pocos campos y son la
        # fuente de verdad de la experiencia del usuario.
        auditlog.register(SessionFeedback)

        # Competition: datos administrativos.
        auditlog.register(Competition)
