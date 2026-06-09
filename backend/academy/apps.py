from django.apps import AppConfig


class AcademyConfig(AppConfig):
    """Vertical e-learning "Zyfit Academy".

    Plataforma de cursos en línea (entrenamiento, nutrición, salud): un instructor
    crea cursos con módulos, lecciones (video/texto/quiz) y cuestionarios; los
    estudiantes se inscriben, avanzan, rinden quizzes y obtienen un certificado.
    Es una vertical independiente, en paralelo a Zyfit Performance.
    """

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'academy'
    verbose_name = 'Zyfit Academy (e-learning)'

    def ready(self):
        """Registra los modelos del catálogo y del aprendizaje en auditlog, con el
        mismo criterio que el resto del backend (trazar cambios estructurales)."""
        from auditlog.registry import auditlog
        from .models import (
            Course, Module, Lesson, Quiz, Question,
            Enrollment, LessonProgress, QuizAttempt, Certificate,
        )

        auditlog.register(Course)
        auditlog.register(Module)
        auditlog.register(Lesson)
        auditlog.register(Quiz)
        auditlog.register(Question)
        auditlog.register(Enrollment)
        auditlog.register(LessonProgress)
        auditlog.register(QuizAttempt)
        auditlog.register(Certificate)
