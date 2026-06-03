import csv

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count
from django.http import HttpResponse
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import RangeDateFilter
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from workouts.models import Session
from .models import (
    ImpersonationLog, MenstrualCycle, Notification, NotificationPreference,
    Profile, User, UserInjury, UserLocation,
)


# ─── Bulk actions helpers ────────────────────────────────────────────────────

def export_users_csv_action(modeladmin, request, queryset):
    """Exporta la selección actual a CSV."""
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="usuarios_seleccion.csv"'
    response.write('﻿')  # UTF-8 BOM for Excel
    writer = csv.writer(response)
    writer.writerow(['id', 'email', 'username', 'role', 'coach_activo', 'is_active', 'is_staff', 'date_joined', 'last_login'])
    for u in queryset.select_related():
        writer.writerow([
            u.id, u.email, u.username, u.role, u.coach_activo, u.is_active, u.is_staff,
            u.date_joined.strftime('%Y-%m-%d') if u.date_joined else '',
            u.last_login.strftime('%Y-%m-%d') if u.last_login else '',
        ])
    return response
export_users_csv_action.short_description = '⬇ Exportar selección como CSV'


def activate_users(modeladmin, request, queryset):
    n = queryset.filter(is_active=False).update(is_active=True)
    messages.success(request, f'{n} usuario(s) activado(s).')
activate_users.short_description = '✓ Activar usuarios seleccionados'


def deactivate_users(modeladmin, request, queryset):
    # Prevent superusers from being deactivated
    safe = queryset.filter(is_superuser=False)
    n = safe.update(is_active=False)
    messages.success(request, f'{n} usuario(s) desactivado(s).')
deactivate_users.short_description = '✗ Desactivar usuarios seleccionados'


def send_welcome_notification(modeladmin, request, queryset):
    from .models import Notification
    notifications = [
        Notification(
            user=u,
            tipo='insight',
            texto='¡Bienvenido a Zyfit! Completa tu perfil y genera tu primera sesión personalizada. 💪'
        )
        for u in queryset
    ]
    Notification.objects.bulk_create(notifications, batch_size=200)
    messages.success(request, f'Bienvenida enviada a {queryset.count()} usuario(s).')
send_welcome_notification.short_description = '👋 Enviar notificación de bienvenida'


def send_reengagement_notification(modeladmin, request, queryset):
    from .models import Notification
    notifications = [
        Notification(
            user=u,
            tipo='reencuentro',
            texto='Te extrañamos en Zyfit. ¡Vuelve a entrenar hoy y retoma tu racha! 🔥'
        )
        for u in queryset
    ]
    Notification.objects.bulk_create(notifications, batch_size=200)
    messages.success(request, f'Re-engagement enviado a {queryset.count()} usuario(s).')
send_reengagement_notification.short_description = '📣 Enviar notificación de re-engagement'


def grant_coach(modeladmin, request, queryset):
    """Marca como coach sin activar el acceso (queda pendiente de activación)."""
    n = queryset.update(role=User.ROLE_COACH)
    messages.success(request, f'{n} cuenta(s) marcada(s) como coach (acceso pendiente de activación).')
grant_coach.short_description = '🧑‍🏫 Marcar como coach (pendiente)'


def activate_coach(modeladmin, request, queryset):
    """Convierte en coach y activa el acceso al portal en un solo paso."""
    n = queryset.update(role=User.ROLE_COACH, coach_activo=True)
    messages.success(request, f'{n} coach(es) con acceso al portal activado.')
activate_coach.short_description = '✅ Activar acceso de coach'


def revoke_coach(modeladmin, request, queryset):
    """Revierte la cuenta a atleta y desactiva el acceso de coach."""
    n = queryset.update(role=User.ROLE_ATHLETE, coach_activo=False)
    messages.success(request, f'{n} cuenta(s) revertida(s) a atleta.')
revoke_coach.short_description = '↩ Revertir a atleta'


# ─── Admin classes ────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form                  = UserChangeForm
    add_form              = UserCreationForm
    change_password_form  = AdminPasswordChangeForm

    list_display   = ['email', 'username', 'rol_badge', 'status_badge', 'is_staff', 'sessions_count', 'ver_360', 'date_joined', 'last_login']
    list_filter    = ['role', 'coach_activo', 'is_staff', 'is_superuser', 'is_active', ('date_joined', RangeDateFilter)]
    search_fields  = ['email', 'username']
    ordering       = ['-date_joined']
    readonly_fields = ['date_joined', 'last_login']
    actions        = [activate_users, deactivate_users, grant_coach, activate_coach, revoke_coach,
                      export_users_csv_action, send_welcome_notification, send_reengagement_notification]

    # Sección de rol Zyfit añadida a los fieldsets estándar de Django.
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Rol Zyfit', {'fields': ('role', 'coach_activo')}),
    )

    def get_queryset(self, request):
        # Annotate session count en una sola query en vez de un COUNT por fila.
        return super().get_queryset(request).annotate(_n_sessions=Count('sessions'))

    @admin.display(description='Rol', ordering='role')
    def rol_badge(self, obj):
        if obj.role == User.ROLE_COACH:
            if obj.coach_activo:
                return format_html('<span style="color:#a78bfa;font-weight:600;">🧑‍🏫 Coach</span>')
            return format_html('<span style="color:#fbbf24;font-weight:600;">🧑‍🏫 Coach · pendiente</span>')
        return format_html('<span style="color:#6b7280;">Atleta</span>')

    @admin.display(description='360')
    def ver_360(self, obj):
        url = reverse('zyfit_user_detail', args=[obj.id])
        return format_html('<a href="{}" style="color:#7ab6ff;font-weight:600;">Ver 360 →</a>', url)

    @admin.display(description='Estado', ordering='is_active')
    def status_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color:#34d399;font-weight:600;">● Activo</span>')
        return format_html('<span style="color:#f87171;font-weight:600;">● Inactivo</span>')

    @admin.display(description='Sesiones', ordering='_n_sessions')
    def sessions_count(self, obj):
        n = obj._n_sessions
        if n == 0:
            return format_html('<span style="color:#6b7280;">0</span>')
        return format_html('<span style="color:#7ab6ff;font-weight:600;">{}</span>', n)


def mark_as_test(modeladmin, request, queryset):
    n = queryset.update(is_test=True)
    messages.success(request, f'{n} perfil(es) marcado(s) como cuenta de prueba (excluidos de métricas).')
mark_as_test.short_description = '🧪 Marcar como cuenta de prueba'


def unmark_as_test(modeladmin, request, queryset):
    n = queryset.update(is_test=False)
    messages.success(request, f'{n} perfil(es) desmarcado(s) — vuelven a contar en métricas.')
unmark_as_test.short_description = '👤 Quitar marca de cuenta de prueba'


@admin.register(Profile)
class ProfileAdmin(ModelAdmin):
    list_display   = ['nombre', 'user', 'nivel_col', 'objetivo_short', 'racha_actual', 'puntos_totales', 'is_test', 'ver_360', 'created_at']
    list_filter    = ['nivel', 'sexo', 'estilo_coaching', 'is_test', ('created_at', RangeDateFilter)]
    search_fields  = ['nombre', 'user__email']
    readonly_fields = ['created_at', 'racha_actual', 'mejor_racha', 'puntos_totales', 'logros']
    actions        = [mark_as_test, unmark_as_test]
    list_select_related = ['user']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_n_sessions=Count('user__sessions'))

    @admin.display(description='Nivel', ordering='_n_sessions')
    def nivel_col(self, obj):
        n = obj._n_sessions
        label = 'Leyenda' if n >= 30 else 'Élite' if n >= 15 else 'Atleta' if n >= 5 else 'Rookie'
        return f'{label} · {n}'

    @admin.display(description='360')
    def ver_360(self, obj):
        url = reverse('zyfit_user_detail', args=[obj.user_id])
        return format_html('<a href="{}" style="color:#7ab6ff;font-weight:600;">Ver 360 →</a>', url)
    fieldsets = (
        ('Identidad',     {'fields': ['user', 'nombre', 'sexo', 'fecha_nacimiento', 'is_test']}),
        ('Cuerpo',        {'fields': ['peso', 'altura', 'usa_ciclo_menstrual']}),
        ('Objetivo',      {'fields': ['objetivo', 'objetivos_multiples', 'objetivo_secundario', 'horizonte_temporal', 'motivacion']}),
        ('Entrenamiento', {'fields': ['nivel', 'dias_semana', 'horario_preferido', 'duracion_disponible', 'duracion_minima',
                                       'estilo_entrenamiento', 'tipos_entrenamiento', 'estilo_coaching']}),
        ('RMs',           {'fields': ['rm_sentadilla', 'rm_peso_muerto', 'rm_press_banca', 'rm_press_hombro']}),
        ('Salud',         {'fields': ['lesiones', 'experiencia_deportiva', 'calidad_sueno_habitual',
                                       'condiciones_medicas', 'notas_medicas', 'motivo_limitacion',
                                       'nivel_estres', 'tipo_trabajo']}),
        ('Preferencias',  {'fields': ['ejercicios_favoritos', 'ejercicios_evitar',
                                       'lugares_entrenamiento', 'implementos_perfil',
                                       'razones_abandono']}),
        ('Gamificación',  {'fields': ['racha_actual', 'mejor_racha', 'puntos_totales', 'logros']}),
        ('Sistema',       {'fields': ['created_at']}),
    )

    @admin.display(description='Objetivo')
    def objetivo_short(self, obj):
        if not obj.objetivo:
            return format_html('<span style="color:#6b7280;">—</span>')
        return (obj.objetivo[:40] + '…') if len(obj.objetivo) > 40 else obj.objetivo


@admin.register(UserLocation)
class UserLocationAdmin(ModelAdmin):
    list_display   = ['nombre', 'user', 'tipo', 'implementos_count', 'created_at']
    list_filter    = ['tipo']
    search_fields  = ['nombre', 'user__email']
    readonly_fields = ['created_at']

    @admin.display(description='Implementos')
    def implementos_count(self, obj):
        return len(obj.implementos or [])


@admin.register(UserInjury)
class UserInjuryAdmin(ModelAdmin):
    list_display   = ['user', 'zona', 'severidad_badge', 'activa', 'created_at']
    list_filter    = ['zona', 'severidad', 'activa']
    search_fields  = ['user__email', 'descripcion']
    readonly_fields = ['created_at']

    @admin.display(description='Severidad', ordering='severidad')
    def severidad_badge(self, obj):
        colors = {'leve': '#34d399', 'moderada': '#fbbf24', 'severa': '#f87171'}
        color = colors.get(obj.severidad, '#9ca3af')
        return format_html('<span style="color:{};font-weight:600;">{}</span>', color, obj.severidad)


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display   = ['user', 'tipo', 'texto_preview', 'leida', 'created_at']
    list_filter    = ['tipo', 'leida', ('created_at', RangeDateFilter)]
    search_fields  = ['user__email', 'texto']
    readonly_fields = ['created_at']
    list_per_page  = 50
    actions        = ['mark_as_read']

    @admin.display(description='Mensaje')
    def texto_preview(self, obj):
        if not obj.texto:
            return ''
        return obj.texto[:80] + ('…' if len(obj.texto) > 80 else '')

    @admin.action(description='✓ Marcar como leídas')
    def mark_as_read(self, request, queryset):
        n = queryset.update(leida=True)
        messages.success(request, f'{n} notificación(es) marcada(s) como leídas.')


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(ModelAdmin):
    list_display   = ['user', 'silencio', 'hora_inicio', 'hora_fin',
                      'invitacion', 'insight', 'alerta', 'logro', 'reencuentro']
    list_filter    = ['silencio', 'invitacion', 'insight', 'alerta', 'logro', 'reencuentro']
    search_fields  = ['user__email']


@admin.register(MenstrualCycle)
class MenstrualCycleAdmin(ModelAdmin):
    list_display   = ['user', 'fecha_inicio', 'duracion_ciclo']
    list_filter    = [('fecha_inicio', RangeDateFilter)]
    search_fields  = ['user__email']


@admin.register(ImpersonationLog)
class ImpersonationLogAdmin(ModelAdmin):
    """Bitácora de solo lectura — auditoría del 'ver como usuario'."""
    list_display   = ['created_at', 'impersonator', 'arrow', 'target', 'action_badge', 'ip']
    list_filter    = ['action', ('created_at', RangeDateFilter)]
    search_fields  = ['impersonator__email', 'target__email', 'ip']
    readonly_fields = ['impersonator', 'target', 'action', 'ip', 'user_agent', 'created_at']
    date_hierarchy = 'created_at'
    list_per_page  = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False  # solo lectura

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('impersonator', 'target')

    @admin.display(description='')
    def arrow(self, obj):
        return '→'

    @admin.display(description='Acción', ordering='action')
    def action_badge(self, obj):
        color = '#7ab6ff' if obj.action == 'start' else '#9ca3af'
        label = 'Inicio' if obj.action == 'start' else 'Fin'
        return format_html('<span style="color:{};font-weight:600;">{}</span>', color, label)
