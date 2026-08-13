"""Registro de los modelos de Zyfit Performance en el admin (Unfold)."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import (
    SportsCenter, CenterMembership, CenterAthlete,
    PerformanceMetric, InjuryReport, PhysicalTest, TrainingPlan, PsychAssessment,
    TestDefinition, Mesocycle, Microcycle, WellnessCheckin, TacticalPlay,
    CalendarEvent, PlannedSession, PerformanceOnboarding,
)


@admin.register(SportsCenter)
class SportsCenterAdmin(ModelAdmin):
    list_display = ('nombre', 'slug', 'ciudad', 'disciplina', 'activo', 'created_at')
    list_filter = ('activo', 'pais')
    search_fields = ('nombre', 'slug', 'ciudad')
    prepopulated_fields = {'slug': ('nombre',)}


@admin.register(CenterMembership)
class CenterMembershipAdmin(ModelAdmin):
    list_display = ('center', 'user', 'rol', 'activo', 'created_at')
    list_filter = ('rol', 'activo', 'center')
    search_fields = ('user__email', 'center__nombre')
    autocomplete_fields = ('center', 'user')


@admin.register(CenterAthlete)
class CenterAthleteAdmin(ModelAdmin):
    list_display = ('athlete', 'center', 'estado', 'grupo', 'registrado_por', 'created_at')
    list_filter = ('estado', 'center')
    search_fields = ('athlete__email', 'center__nombre', 'dorsal')
    autocomplete_fields = ('center', 'athlete', 'registrado_por')


@admin.register(PerformanceMetric)
class PerformanceMetricAdmin(ModelAdmin):
    list_display = ('athlete', 'center', 'tipo', 'metrica', 'valor', 'unidad', 'fecha')
    list_filter = ('tipo', 'center')
    search_fields = ('athlete__email', 'metrica')


@admin.register(InjuryReport)
class InjuryReportAdmin(ModelAdmin):
    list_display = ('athlete', 'center', 'zona', 'severidad', 'estado', 'fecha')
    list_filter = ('severidad', 'estado', 'center')
    search_fields = ('athlete__email', 'zona', 'diagnostico')


@admin.register(TestDefinition)
class TestDefinitionAdmin(ModelAdmin):
    list_display = ('nombre', 'slug', 'familia', 'activo', 'updated_at')
    list_filter = ('familia', 'activo')
    search_fields = ('nombre', 'slug')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PhysicalTest)
class PhysicalTestAdmin(ModelAdmin):
    list_display = ('athlete', 'center', 'nombre', 'test_slug', 'resultado', 'unidad', 'fecha')
    list_filter = ('categoria', 'center')
    search_fields = ('athlete__email', 'nombre', 'test_slug')


@admin.register(TrainingPlan)
class TrainingPlanAdmin(ModelAdmin):
    list_display = ('nombre', 'center', 'grupo', 'athlete', 'fecha_inicio', 'fecha_fin')
    list_filter = ('center',)
    search_fields = ('nombre', 'objetivo', 'grupo')


@admin.register(Mesocycle)
class MesocycleAdmin(ModelAdmin):
    list_display = ('nombre', 'plan', 'orden', 'tipo', 'carga_objetivo', 'duracion_semanas')
    list_filter = ('tipo', 'carga_objetivo')
    search_fields = ('nombre', 'plan__nombre')


@admin.register(Microcycle)
class MicrocycleAdmin(ModelAdmin):
    list_display = ('__str__', 'mesociclo', 'orden', 'tipo', 'carga_relativa', 'volumen', 'intensidad')
    list_filter = ('tipo', 'volumen', 'intensidad')
    search_fields = ('nombre', 'mesociclo__nombre')


@admin.register(PlannedSession)
class PlannedSessionAdmin(ModelAdmin):
    list_display = ('__str__', 'microciclo', 'fecha', 'tipo', 'origen', 'estado', 'creado_por')
    list_filter = ('tipo', 'origen', 'estado')
    search_fields = ('nombre', 'microciclo__mesociclo__plan__nombre')
    autocomplete_fields = ('evento', 'creado_por')


@admin.register(PsychAssessment)
class PsychAssessmentAdmin(ModelAdmin):
    list_display = ('athlete', 'center', 'tipo', 'puntuacion', 'fecha')
    list_filter = ('tipo', 'center')
    search_fields = ('athlete__email',)


@admin.register(WellnessCheckin)
class WellnessCheckinAdmin(ModelAdmin):
    list_display = ('athlete', 'center', 'fecha', 'indice_bienestar', 'sueno', 'fatiga', 'estres', 'dolor_muscular', 'animo')
    list_filter = ('center',)
    search_fields = ('athlete__email',)


@admin.register(TacticalPlay)
class TacticalPlayAdmin(ModelAdmin):
    list_display = ('nombre', 'center', 'formacion', 'campo', 'registrado_por', 'updated_at')
    list_filter = ('center', 'campo')
    search_fields = ('nombre', 'descripcion', 'center__nombre')
    autocomplete_fields = ('center', 'registrado_por')


@admin.register(CalendarEvent)
class CalendarEventAdmin(ModelAdmin):
    list_display = ('titulo', 'center', 'tipo', 'fecha_inicio', 'fecha_fin', 'grupo', 'rival', 'registrado_por')
    list_filter = ('tipo', 'center')
    search_fields = ('titulo', 'descripcion', 'rival', 'center__nombre')
    autocomplete_fields = ('center', 'registrado_por')
    date_hierarchy = 'fecha_inicio'


@admin.register(PerformanceOnboarding)
class PerformanceOnboardingAdmin(ModelAdmin):
    """Respuestas del wizard de bienvenida. Es la única lectura que tiene el
    equipo sobre de dónde llega cada cuenta y qué vino a buscar, así que se
    muestra en la lista en vez de esconderse en el detalle."""

    list_display = ('user', 'segmento', 'pais', 'cargo', 'disciplina', 'tamano_plantel', 'canal', 'completado', 'completado_at')
    list_filter = ('completado', 'segmento', 'cargo', 'disciplina', 'tamano_plantel', 'canal', 'pais')
    search_fields = ('user__email', 'cargo_otro', 'disciplina_otro', 'canal_otro')
    autocomplete_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at', 'completado_at')
