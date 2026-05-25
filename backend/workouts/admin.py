import csv

from django.contrib import admin, messages
from django.http import HttpResponse
from django.utils.html import format_html
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.contrib.filters.admin import RangeDateFilter

from .models import (
    Competition, DailyCoachInsight, Exercise, Session, SessionExercise,
    SessionFeedback, TrainingDNA, UserAdaptationProfile, UserExerciseProfile,
    MuscleGroup, EquipmentItem, ContraindicationCategory,
    ExerciseMuscle, ExerciseEquipment, ExerciseContraindication, ExerciseRelationship,
)


# ─── Bulk action helpers ──────────────────────────────────────────────────────

def export_sessions_csv_action(modeladmin, request, queryset):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="sesiones_seleccion.csv"'
    response.write('﻿')  # UTF-8 BOM for Excel
    writer = csv.writer(response)
    writer.writerow(['id', 'usuario', 'fecha', 'duracion_planificada', 'rpe_target', 'volumen_relativo', 'tiene_feedback', 'created_at'])
    for s in queryset.select_related('user'):
        writer.writerow([
            s.id, s.user.email, s.fecha,
            s.duracion_planificada, s.rpe_target, s.volumen_relativo,
            hasattr(s, 'feedback'),
            s.created_at.strftime('%Y-%m-%d %H:%M') if s.created_at else '',
        ])
    return response
export_sessions_csv_action.short_description = '⬇ Exportar selección como CSV'


def export_feedback_csv_action(modeladmin, request, queryset):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="feedback_seleccion.csv"'
    response.write('﻿')  # UTF-8 BOM for Excel
    writer = csv.writer(response)
    writer.writerow(['feedback_id', 'session_id', 'usuario', 'fecha_sesion', 'rpe_target', 'rpe_real', 'rpe_diff', 'cumplimiento', 'rating'])
    for fb in queryset.select_related('session', 'session__user'):
        s = fb.session
        rpe_diff = round(float(fb.rpe_real) - float(s.rpe_target), 1) if fb.rpe_real and s.rpe_target else ''
        writer.writerow([
            fb.id, s.id, s.user.email, s.fecha,
            s.rpe_target, fb.rpe_real, rpe_diff,
            fb.cumplimiento, fb.rating,
        ])
    return response
export_feedback_csv_action.short_description = '⬇ Exportar feedback como CSV'


# ─── Inlines ──────────────────────────────────────────────────────────────────

class SessionExerciseInline(TabularInline):
    model = SessionExercise
    extra = 0
    fields = ['orden', 'nombre', 'series', 'repeticiones', 'descanso_segundos', 'rpe_sugerido', 'notas']


class SessionFeedbackInline(StackedInline):
    model = SessionFeedback
    extra = 0


# ─── Admin classes ────────────────────────────────────────────────────────────

@admin.register(Session)
class SessionAdmin(ModelAdmin):
    list_display   = ['user', 'fecha', 'duracion_planificada', 'rpe_display',
                      'volumen_relativo', 'has_feedback', 'inicio_real', 'created_at']
    list_filter    = ['volumen_relativo', ('fecha', RangeDateFilter), ('created_at', RangeDateFilter)]
    search_fields  = ['user__email']
    readonly_fields = ['created_at', 'prompt_usado', 'respuesta_ia',
                       'decisiones', 'evidencia', 'logro', 'sustituciones']
    inlines        = [SessionFeedbackInline, SessionExerciseInline]
    date_hierarchy = 'fecha'
    actions        = [export_sessions_csv_action]

    @admin.display(boolean=True, description='Feedback')
    def has_feedback(self, obj):
        return hasattr(obj, 'feedback')

    @admin.display(description='RPE target', ordering='rpe_target')
    def rpe_display(self, obj):
        if obj.rpe_target is None:
            return format_html('<span style="color:#6b7280;">—</span>')
        val = float(obj.rpe_target)
        color = '#34d399' if val <= 6 else '#fbbf24' if val <= 8 else '#f87171'
        return format_html('<span style="color:{};font-family:ui-monospace,monospace;font-weight:600;">{}</span>', color, obj.rpe_target)


@admin.register(SessionFeedback)
class SessionFeedbackAdmin(ModelAdmin):
    list_display   = ['session', 'session_user', 'rpe_real', 'rpe_diff', 'cumplimiento', 'rating', 'created_at']
    list_filter    = ['rating', ('created_at', RangeDateFilter)]
    search_fields  = ['session__user__email']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    actions        = [export_feedback_csv_action]

    @admin.display(description='Usuario', ordering='session__user__email')
    def session_user(self, obj):
        return obj.session.user.email if obj.session and obj.session.user_id else ''

    @admin.display(description='RPE diff', ordering='rpe_real')
    def rpe_diff(self, obj):
        if obj.rpe_real is None or obj.session.rpe_target is None:
            return '—'
        diff = float(obj.rpe_real) - float(obj.session.rpe_target)
        color = '#34d399' if abs(diff) <= 1 else '#fbbf24' if abs(diff) <= 2 else '#f87171'
        sign = '+' if diff > 0 else ''
        return format_html(
            '<span style="color:{};font-family:ui-monospace,monospace;font-weight:600;">{}{}</span>',
            color, sign, round(diff, 1)
        )


@admin.register(Exercise)
class ExerciseAdmin(ModelAdmin):
    list_display   = ['nombre', 'patron_movimiento', 'dificultad', 'bilateral', 'es_compuesto', 'activo']
    list_filter    = ['patron_movimiento', 'dificultad', 'activo', 'bilateral', 'es_compuesto']
    search_fields  = ['nombre']
    list_per_page  = 50


@admin.register(UserExerciseProfile)
class UserExerciseProfileAdmin(ModelAdmin):
    list_display   = ['user', 'exercise_nombre', 'veces_realizado',
                      'rpe_promedio_real', 'cumplimiento_promedio', 'rating_promedio', 'ultima_vez']
    list_filter    = ['patron_movimiento']
    search_fields  = ['user__email', 'exercise_nombre']


@admin.register(UserAdaptationProfile)
class UserAdaptationProfileAdmin(ModelAdmin):
    list_display   = ['user', 'total_sesiones', 'rpe_bias', 'cumplimiento_promedio',
                      'rating_promedio', 'volumen_tolerado_semana', 'patron_preferido', 'updated_at']
    search_fields  = ['user__email']
    readonly_fields = ['updated_at']


@admin.register(DailyCoachInsight)
class DailyCoachInsightAdmin(ModelAdmin):
    list_display   = ['user', 'fecha', 'texto_preview', 'created_at']
    list_filter    = [('fecha', RangeDateFilter)]
    search_fields  = ['user__email', 'texto']
    readonly_fields = ['created_at']

    @admin.display(description='Insight')
    def texto_preview(self, obj):
        return (obj.texto or '')[:80] + ('…' if obj.texto and len(obj.texto) > 80 else '')


@admin.register(TrainingDNA)
class TrainingDNAAdmin(ModelAdmin):
    list_display   = ['user', 'total_sesiones_at_generation', 'generated_at']
    search_fields  = ['user__email']
    readonly_fields = ['generated_at']


@admin.register(Competition)
class CompetitionAdmin(ModelAdmin):
    list_display   = ['nombre', 'user', 'fecha', 'tipo', 'distancia_disciplina']
    list_filter    = [('fecha', RangeDateFilter)]
    search_fields  = ['nombre', 'user__email']
    date_hierarchy = 'fecha'


# ─── Satellite catalog models ──────────────────────────────────────────────────

class ExerciseMuscleInline(TabularInline):
    model = ExerciseMuscle
    extra = 0
    fields = ['muscle', 'role']
    raw_id_fields = ['muscle']


class ExerciseEquipmentInline(TabularInline):
    model = ExerciseEquipment
    extra = 0
    fields = ['equipment', 'is_required']


class ExerciseContraindicationInline(TabularInline):
    model = ExerciseContraindication
    extra = 0
    fields = ['contraindication', 'notes']


@admin.register(MuscleGroup)
class MuscleGroupAdmin(ModelAdmin):
    list_display  = ['name', 'anatomical_group']
    list_filter   = ['anatomical_group']
    search_fields = ['name']


@admin.register(EquipmentItem)
class EquipmentItemAdmin(ModelAdmin):
    list_display  = ['name', 'category', 'is_gym_only']
    list_filter   = ['category', 'is_gym_only']
    search_fields = ['name']


@admin.register(ContraindicationCategory)
class ContraindicationCategoryAdmin(ModelAdmin):
    list_display  = ['name', 'body_zone', 'severity']
    list_filter   = ['severity', 'body_zone']
    search_fields = ['name', 'body_zone']


@admin.register(ExerciseMuscle)
class ExerciseMuscleAdmin(ModelAdmin):
    list_display  = ['exercise', 'muscle', 'role']
    list_filter   = ['role']
    search_fields = ['exercise__nombre', 'muscle__name']
    raw_id_fields = ['exercise', 'muscle']


@admin.register(ExerciseEquipment)
class ExerciseEquipmentAdmin(ModelAdmin):
    list_display  = ['exercise', 'equipment', 'is_required']
    list_filter   = ['is_required']
    search_fields = ['exercise__nombre', 'equipment__name']
    raw_id_fields = ['exercise', 'equipment']


@admin.register(ExerciseContraindication)
class ExerciseContraindicationAdmin(ModelAdmin):
    list_display  = ['exercise', 'contraindication', 'notes_preview']
    list_filter   = ['contraindication__severity', 'contraindication__body_zone']
    search_fields = ['exercise__nombre', 'contraindication__name']
    raw_id_fields = ['exercise', 'contraindication']

    @admin.display(description='Notas')
    def notes_preview(self, obj):
        return (obj.notes or '')[:60] + ('…' if obj.notes and len(obj.notes) > 60 else '')


@admin.register(ExerciseRelationship)
class ExerciseRelationshipAdmin(ModelAdmin):
    list_display  = ['source_exercise', 'relationship_type', 'target_exercise']
    list_filter   = ['relationship_type']
    search_fields = ['source_exercise__nombre', 'target_exercise__nombre']
    raw_id_fields = ['source_exercise', 'target_exercise']
