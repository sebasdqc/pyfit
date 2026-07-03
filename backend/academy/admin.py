"""Registro de los modelos de Zyfit Academy en el admin (Unfold)."""

from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from .models import (
    Course, Module, Lesson, Quiz, Question,
    Enrollment, LessonProgress, QuizAttempt, Certificate,
    Submission, CourseBadge, EarnedBadge, Tenant, School,
    AcademyStreak, AcademyActivityDay, AcademyBadge, AcademyEarnedBadge,
)


class ModuleInline(TabularInline):
    model = Module
    extra = 0


class LessonInline(TabularInline):
    model = Lesson
    extra = 0


class QuestionInline(TabularInline):
    model = Question
    extra = 0


class CourseInSchoolInline(TabularInline):
    model = Course
    fields = ('titulo', 'slug', 'nivel', 'publicado')
    extra = 0
    show_change_link = True


@admin.register(School)
class SchoolAdmin(ModelAdmin):
    list_display = ('nombre', 'slug', 'orden', 'tenant', 'created_at')
    list_filter = ('tenant',)
    search_fields = ('nombre', 'slug')
    prepopulated_fields = {'slug': ('nombre',)}
    inlines = [CourseInSchoolInline]


@admin.register(Tenant)
class TenantAdmin(ModelAdmin):
    list_display = ('nombre', 'slug', 'dominio', 'dominio_custom', 'activo', 'created_at')
    list_filter = ('activo',)
    search_fields = ('nombre', 'slug', 'dominio')


@admin.register(Course)
class CourseAdmin(ModelAdmin):
    list_display = ('titulo', 'slug', 'tenant', 'instructor', 'disciplina', 'licencia',
                    'modalidad', 'carga_horaria_h', 'publicado', 'created_at')
    list_filter = ('publicado', 'tenant', 'disciplina', 'licencia', 'modalidad', 'nivel', 'categoria')
    search_fields = ('titulo', 'slug', 'resumen', 'instructor__email')
    prepopulated_fields = {'slug': ('titulo',)}
    autocomplete_fields = ('instructor',)
    inlines = [ModuleInline]


@admin.register(Module)
class ModuleAdmin(ModelAdmin):
    list_display = ('titulo', 'course', 'orden')
    list_filter = ('course',)
    search_fields = ('titulo', 'course__titulo')
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(ModelAdmin):
    list_display = ('titulo', 'module', 'tipo', 'orden', 'duracion_min')
    list_filter = ('tipo',)
    search_fields = ('titulo', 'module__titulo')


@admin.register(Quiz)
class QuizAdmin(ModelAdmin):
    list_display = ('__str__', 'lesson', 'puntaje_aprobacion')
    search_fields = ('titulo', 'lesson__titulo')
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(ModelAdmin):
    list_display = ('__str__', 'quiz', 'tipo', 'orden', 'puntos')
    list_filter = ('tipo',)
    search_fields = ('enunciado',)


@admin.register(Enrollment)
class EnrollmentAdmin(ModelAdmin):
    list_display = ('student', 'course', 'estado', 'progreso', 'created_at', 'completado_at')
    list_filter = ('estado', 'course')
    search_fields = ('student__email', 'course__titulo')
    autocomplete_fields = ('student', 'course')


@admin.register(LessonProgress)
class LessonProgressAdmin(ModelAdmin):
    list_display = ('enrollment', 'lesson', 'completado', 'completado_at')
    search_fields = ('enrollment__student__email', 'lesson__titulo')


@admin.register(QuizAttempt)
class QuizAttemptAdmin(ModelAdmin):
    list_display = ('enrollment', 'quiz', 'puntaje', 'aprobado', 'created_at')
    list_filter = ('aprobado',)
    search_fields = ('enrollment__student__email',)


@admin.register(Certificate)
class CertificateAdmin(ModelAdmin):
    list_display = ('codigo', 'enrollment', 'emitido_at')
    search_fields = ('codigo', 'enrollment__student__email', 'enrollment__course__titulo')
    readonly_fields = ('codigo', 'emitido_at')


@admin.register(Submission)
class SubmissionAdmin(ModelAdmin):
    list_display = ('enrollment', 'lesson', 'estado', 'revisado_por', 'updated_at')
    list_filter = ('estado',)
    search_fields = ('enrollment__student__email', 'lesson__titulo')


@admin.register(CourseBadge)
class CourseBadgeAdmin(ModelAdmin):
    list_display = ('__str__', 'course', 'orden', 'lesson')
    list_filter = ('course',)
    search_fields = ('nombre', 'course__titulo')


@admin.register(EarnedBadge)
class EarnedBadgeAdmin(ModelAdmin):
    list_display = ('enrollment', 'badge', 'otorgada_at')
    search_fields = ('enrollment__student__email', 'badge__nombre')


@admin.register(AcademyStreak)
class AcademyStreakAdmin(ModelAdmin):
    list_display = ('user', 'racha_actual', 'mejor_racha', 'ultima_actividad',
                    'freezes_disponibles', 'freezes_usados', 'puntos_totales', 'updated_at')
    search_fields = ('user__email',)
    autocomplete_fields = ('user',)
    readonly_fields = ('updated_at',)


@admin.register(AcademyActivityDay)
class AcademyActivityDayAdmin(ModelAdmin):
    list_display = ('user', 'fecha', 'origen', 'created_at')
    list_filter = ('origen',)
    search_fields = ('user__email',)
    date_hierarchy = 'fecha'


@admin.register(AcademyBadge)
class AcademyBadgeAdmin(ModelAdmin):
    list_display = ('__str__', 'criterio_tipo', 'criterio_escuela', 'criterio_curso',
                    'criterio_valor', 'orden', 'activo')
    list_filter = ('criterio_tipo', 'activo')
    search_fields = ('nombre', 'identificador')
    prepopulated_fields = {'identificador': ('nombre',)}


@admin.register(AcademyEarnedBadge)
class AcademyEarnedBadgeAdmin(ModelAdmin):
    list_display = ('user', 'badge', 'otorgada_at')
    search_fields = ('user__email', 'badge__nombre')
    autocomplete_fields = ('user',)
