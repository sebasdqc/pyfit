"""Registro de los modelos de Zyfit Performance en el admin (Unfold)."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import (
    SportsCenter, CenterMembership, CenterAthlete,
    PerformanceMetric, InjuryReport, PhysicalTest, TrainingPlan, PsychAssessment,
    TestDefinition, Mesocycle, Microcycle, WellnessCheckin,
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
