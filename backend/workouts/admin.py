from django.contrib import admin
from .models import Session, SessionExercise, SessionFeedback, Competition


class SessionExerciseInline(admin.TabularInline):
    model = SessionExercise
    extra = 0


class SessionFeedbackInline(admin.StackedInline):
    model = SessionFeedback
    extra = 0


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'fecha', 'duracion_planificada', 'rpe_target', 'volumen_relativo', 'created_at']
    list_filter = ['volumen_relativo', 'fecha']
    search_fields = ['user__email']
    inlines = [SessionFeedbackInline, SessionExerciseInline]


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'user', 'fecha', 'tipo']
