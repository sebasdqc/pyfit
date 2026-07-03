from django.apps import AppConfig


class AiTutorConfig(AppConfig):
    """Tutor IA de Zyfit Academy.

    Espejo de las otras apps de IA del backend (`ai_workout`, `ai_running`): la
    lógica de IA vive aquí (RAG + prompt + llamado a Groq, en la capa de servicio)
    mientras que el contenido que sirve de grounding vive en la app `academy`.
    """

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_tutor'
    verbose_name = 'Zyfit Academy — Tutor IA'
