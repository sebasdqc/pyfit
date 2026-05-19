from django.contrib import admin
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.contrib.filters.admin import RangeDateFilter

from .models import (
    Competition, DailyCoachInsight, Exercise, Session, SessionExercise,
    SessionFeedback, TrainingDNA, UserAdaptationProfile, UserExerciseProfile,
    MuscleGroup, EquipmentItem, ContraindicationCategory,
    ExerciseMuscle, ExerciseEquipment, ExerciseContraindication, ExerciseRelationship,
)


class SessionExerciseInline(TabularInline):
    model = SessionExercise
    extra = 0
    fields = ['orden', 'nombre', 'series', 'repeticiones', 'descanso_segundos', 'rpe_sugerido', 'notas']


class SessionFeedbackInline(StackedInline):
    model = SessionFeedback
    extra = 0


@admin.register(Session)
class SessionAdmin(ModelAdmin):
    list_display   = ['user', 'fecha', 'duracion_planificada', 'rpe_target',
                      'volumen_relativo', 'has_feedback', 'inicio_real', 'created_at']
    list_filter    = ['volumen_relativo', ('fecha', RangeDateFilter), ('created_at', RangeDateFilter)]
    search_fields  = ['user__email']
    readonly_fields = ['created_at', 'prompt_usado', 'respuesta_ia',
                       'decisiones', 'evidencia', 'logro', 'sustituciones']
    inlines        = [SessionFeedbackInline, SessionExerciseInline]
    date_hierarchy = 'fecha'

    @admin.display(boolean=True, description='Feedback')
    def has_feedback(self, obj):
        return hasattr(obj, 'feedback')


@admin.register(SessionFeedback)
class SessionFeedbackAdmin(ModelAdmin):
    list_display   = ['session', 'session_user', 'rpe_real', 'cumplimiento', 'rating', 'created_at']
    list_filter    = ['rating', ('created_at', RangeDateFilter)]
    search_fields  = ['session__user__email']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'

    @admin.display(description='Usuario', ordering='session__user__email')
    def session_user(self, obj):
        return obj.session.user.email if obj.session and obj.session.user_id else ''


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
