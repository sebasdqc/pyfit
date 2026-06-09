"""Registro de los modelos de Zyfit Academy en el admin (Unfold)."""

from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from .models import (
    Course, Module, Lesson, Quiz, Question,
    Enrollment, LessonProgress, QuizAttempt, Certificate,
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


@admin.register(Course)
class CourseAdmin(ModelAdmin):
    list_display = ('titulo', 'slug', 'instructor', 'categoria', 'nivel', 'publicado', 'created_at')
    list_filter = ('publicado', 'nivel', 'categoria')
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
