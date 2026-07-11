"""Registro de los modelos de Zyfit Academy en el admin (Unfold)."""

from django.contrib import admin, messages
from unfold.admin import ModelAdmin, TabularInline

from .community_models import (
    ESTADO_OCULTO_MANUAL, ESTADO_VISIBLE, CommunityPost, CommunityReply, CommunityReport,
)
from .blog_models import BlogPost
from .library_models import LibraryFavorite, LibraryResource
from .support_models import SupportFAQ, SupportMessage
from .models import (
    Course, Module, Lesson, Quiz, Question,
    Enrollment, LessonProgress, QuizAttempt, Certificate,
    Submission, CourseBadge, EarnedBadge, Tenant, School,
    AcademyStreak, AcademyActivityDay, AcademyBadge, AcademyEarnedBadge,
    AcademySubscription, AnonymousSession, AnonymousProgress,
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
    list_display = ('titulo', 'course', 'orden', 'es_gratuito')
    list_filter = ('course', 'es_gratuito')
    search_fields = ('titulo', 'course__titulo')
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(ModelAdmin):
    list_display = ('titulo', 'module', 'tipo', 'orden', 'duracion_min', 'puntos')
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


@admin.register(AcademySubscription)
class AcademySubscriptionAdmin(ModelAdmin):
    """Suscripción "Zyfit Academy Pro" (administrada — sin cobrador conectado
    todavía). Aquí el staff otorga/ajusta acceso Pro manualmente, mismo patrón
    que users.CoachSubscriptionAdmin."""
    list_display = ('user', 'estado', 'plan_tipo', 'fecha_renovacion', 'proveedor_pago', 'created_at')
    list_filter = ('estado', 'plan_tipo')
    search_fields = ('user__email',)
    autocomplete_fields = ('user',)


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


# ─── Onboarding sin registro (visitante anónimo) ──────────────────────────────
# Solo lectura: estas filas las crea/borra siempre el flujo anónimo o el
# barrido de expiración (academy_anon_sweep) — el admin es para depurar, no
# para operar (nunca hay que crear/editar una sesión anónima a mano).

@admin.register(AnonymousSession)
class AnonymousSessionAdmin(ModelAdmin):
    list_display = ('id', 'created_at', 'expires_at', 'migrada_en', 'migrada_a')
    list_filter = ('migrada_en',)
    search_fields = ('id', 'migrada_a__email')
    autocomplete_fields = ('migrada_a',)
    readonly_fields = ('id', 'created_at', 'expires_at', 'migrada_en', 'migrada_a')

    def has_add_permission(self, request):
        return False


@admin.register(AnonymousProgress)
class AnonymousProgressAdmin(ModelAdmin):
    list_display = ('session', 'lesson', 'created_at')
    search_fields = ('session__id', 'lesson__titulo')
    readonly_fields = ('session', 'lesson', 'created_at')

    def has_add_permission(self, request):
        return False


# ─── Comunidad (foro Q&A) ───────────────────────────────────────────────────────
# Panel de revisión 100% OPCIONAL: la moderación automática (IA + umbral de
# reportes, ver community_service) ya oculta contenido problemático sin
# intervención humana — este admin es solo una herramienta de conveniencia
# para que staff revise/reintegre, nunca un prerrequisito operativo.

@admin.action(description='✓ Aprobar (volver a visible)')
def aprobar_contenido(modeladmin, request, queryset):
    n = queryset.update(estado=ESTADO_VISIBLE, reportes_count=0)
    messages.success(request, f'{n} elemento(s) marcado(s) como visible.')


@admin.action(description='✕ Ocultar manualmente')
def ocultar_contenido(modeladmin, request, queryset):
    n = queryset.update(estado=ESTADO_OCULTO_MANUAL)
    messages.success(request, f'{n} elemento(s) ocultado(s).')


@admin.register(CommunityPost)
class CommunityPostAdmin(ModelAdmin):
    list_display = ('titulo', 'autor', 'escuela', 'curso', 'estado',
                     'reportes_count', 'respuestas_count', 'created_at')
    list_filter = ('estado', 'escuela', 'curso')
    search_fields = ('titulo', 'contenido', 'autor__email')
    autocomplete_fields = ('autor', 'escuela', 'curso', 'modulo', 'mejor_respuesta')
    readonly_fields = ('moderacion_resultado', 'created_at', 'updated_at')
    actions = [aprobar_contenido, ocultar_contenido]


@admin.register(CommunityReply)
class CommunityReplyAdmin(ModelAdmin):
    list_display = ('post', 'autor', 'estado', 'votos_count',
                     'reportes_count', 'es_mejor_respuesta', 'created_at')
    list_filter = ('estado', 'es_mejor_respuesta')
    search_fields = ('contenido', 'autor__email', 'post__titulo')
    autocomplete_fields = ('post', 'autor')
    readonly_fields = ('moderacion_resultado', 'created_at', 'updated_at')
    actions = [aprobar_contenido, ocultar_contenido]


@admin.register(CommunityReport)
class CommunityReportAdmin(ModelAdmin):
    list_display = ('id', 'post', 'reply', 'reportado_por', 'motivo', 'created_at')
    list_filter = ('motivo',)
    search_fields = ('detalle', 'reportado_por__email')
    autocomplete_fields = ('post', 'reply', 'reportado_por')


# ─── Biblioteca de recursos ─────────────────────────────────────────────────────
# Contenido 100% administrado por staff (sin autoría de instructor en la web
# todavía, a diferencia de Course) — mismo patrón que AcademyBadge.

@admin.register(LibraryResource)
class LibraryResourceAdmin(ModelAdmin):
    list_display = ('titulo', 'tipo', 'school', 'course', 'es_gratuito',
                     'destacado', 'vistas', 'activo', 'created_at')
    list_filter = ('tipo', 'es_gratuito', 'destacado', 'activo', 'tenant', 'school')
    search_fields = ('titulo', 'descripcion', 'fuente')
    autocomplete_fields = ('school', 'course')
    readonly_fields = ('vistas', 'created_at', 'updated_at')


@admin.register(LibraryFavorite)
class LibraryFavoriteAdmin(ModelAdmin):
    list_display = ('user', 'resource', 'created_at')
    search_fields = ('user__email', 'resource__titulo')
    autocomplete_fields = ('user', 'resource')
    readonly_fields = ('user', 'resource', 'created_at')


# ─── Blog editorial ─────────────────────────────────────────────────────────
# Autoría normal de instructor vía el editor de academy-web; el Admin queda
# como respaldo/moderación de staff (mismo criterio que Course).

@admin.register(BlogPost)
class BlogPostAdmin(ModelAdmin):
    list_display = ('titulo', 'autor', 'school', 'publicado', 'publicado_en', 'vistas', 'created_at')
    list_filter = ('publicado', 'tenant', 'school')
    search_fields = ('titulo', 'resumen', 'contenido', 'autor__email')
    autocomplete_fields = ('school', 'autor')
    prepopulated_fields = {'slug': ('titulo',)}
    readonly_fields = ('vistas', 'publicado_en', 'created_at', 'updated_at')

    def has_add_permission(self, request):
        return False


# ─── Soporte (FAQ + chat) ─────────────────────────────────────────────────────
# La FAQ la administra staff vía Django Admin (mismo patrón que
# LibraryResource); el chat lo maneja el panel de Soporte de academy-web, acá
# solo queda como respaldo de lectura/auditoría (sin edición de mensajes).

@admin.register(SupportFAQ)
class SupportFAQAdmin(ModelAdmin):
    list_display = ('pregunta', 'categoria', 'orden', 'publicado', 'tenant', 'updated_at')
    list_filter = ('publicado', 'tenant', 'categoria')
    search_fields = ('pregunta', 'respuesta', 'categoria')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SupportMessage)
class SupportMessageAdmin(ModelAdmin):
    list_display = ('student', 'from_admin', 'admin', 'leido', 'tenant', 'created_at')
    list_filter = ('from_admin', 'leido', 'tenant')
    search_fields = ('student__email', 'texto')
    autocomplete_fields = ('student', 'admin')
    readonly_fields = ('student', 'from_admin', 'admin', 'texto', 'tenant', 'created_at')

    def has_add_permission(self, request):
        return False
