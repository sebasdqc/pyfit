from django.apps import AppConfig


class PerformanceConfig(AppConfig):
    """Vertical B2B "Zyfit Performance".

    Panel web independiente para centros deportivos de alto rendimiento. Reúne
    el centro deportivo (entidad raíz), las pertenencias de staff con rol, el
    registro de atletas por el director técnico y los cinco módulos de trabajo:
    rendimiento, lesiones, test, planificación y psicológico.
    """

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'performance'
    verbose_name = 'Zyfit Performance (B2B)'

    def ready(self):
        """Registrar los modelos del centro en auditlog (mismo criterio que el
        resto del backend: trazar cambios estructurales, omitir ruido)."""
        from auditlog.registry import auditlog
        from .models import (
            SportsCenter, CenterMembership, CenterAthlete,
            PerformanceMetric, InjuryReport, PhysicalTest, TrainingPlan,
            PsychAssessment, TestDefinition, Mesocycle, Microcycle, WellnessCheckin,
            TacticalPlay, CalendarEvent, PlannedSession,
        )

        auditlog.register(SportsCenter)
        auditlog.register(CenterMembership)
        auditlog.register(CenterAthlete)
        # Los registros de datos de cada módulo son la fuente de verdad clínica /
        # deportiva del centro: se auditan completos.
        auditlog.register(PerformanceMetric)
        auditlog.register(InjuryReport)
        auditlog.register(PhysicalTest)
        auditlog.register(TrainingPlan)
        auditlog.register(Mesocycle)
        auditlog.register(Microcycle)
        # Sesión de un día del microciclo (manual o generada con IA).
        auditlog.register(PlannedSession)
        auditlog.register(PsychAssessment)
        auditlog.register(WellnessCheckin)
        # Jugadas de la pizarra táctica (módulo Simulador).
        auditlog.register(TacticalPlay)
        # Eventos del calendario del centro (temporadas, torneos, partidos…).
        auditlog.register(CalendarEvent)
        # El catálogo de tests se siembra desde el motor (seed_tests); se audita
        # para dejar traza de altas/bajas/cambios de definición.
        auditlog.register(TestDefinition)
