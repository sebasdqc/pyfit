import csv

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.http import HttpResponse
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import RangeDateFilter
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from workouts.models import Session
from .models import (
    MenstrualCycle, Notification, NotificationPreference,
    Profile, User, UserInjury, UserLocation,
)


# ─── Bulk actions helpers ────────────────────────────────────────────────────

def export_users_csv_action(modeladmin, request, queryset):
    """Exporta la selección actual a CSV."""
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="usuarios_seleccion.csv"'
    response.write('﻿')  # UTF-8 BOM for Excel
    writer = csv.writer(response)
    writer.writerow(['id', 'email', 'username', 'is_active', 'is_staff', 'date_joined', 'last_login'])
    for u in queryset.select_related():
        writer.writerow([
            u.id, u.email, u.username, u.is_active, u.is_staff,
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


# ─── Admin classes ────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form                  = UserChangeForm
    add_form              = UserCreationForm
    change_password_form  = AdminPasswordChangeForm

    list_display   = ['email', 'username', 'status_badge', 'is_staff', 'sessions_count', 'date_joined', 'last_login']
    list_filter    = ['is_staff', 'is_superuser', 'is_active', ('date_joined', RangeDateFilter)]
    search_fields  = ['email', 'username']
    ordering       = ['-date_joined']
    readonly_fields = ['date_joined', 'last_login']
    actions        = [activate_users, deactivate_users, export_users_csv_action,
                      send_welcome_notification, send_reengagement_notification]

    @admin.display(description='Estado', ordering='is_active')
    def status_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color:#34d399;font-weight:600;">● Activo</span>')
        return format_html('<span style="color:#f87171;font-weight:600;">● Inactivo</span>')

    @admin.display(description='Sesiones')
    def sessions_count(self, obj):
        n = Session.objects.filter(user=obj).count()
        if n == 0:
            return format_html('<span style="color:#6b7280;">0</span>')
        return format_html('<span style="color:#7ab6ff;font-weight:600;">{}</span>', n)


@admin.register(Profile)
class ProfileAdmin(ModelAdmin):
    list_display   = ['nombre', 'user', 'nivel_label', 'objetivo_short', 'racha_actual', 'puntos_totales', 'created_at']
    list_filter    = ['nivel', 'sexo', 'estilo_coaching', ('created_at', RangeDateFilter)]
    search_fields  = ['nombre', 'user__email']
    readonly_fields = ['created_at', 'racha_actual', 'mejor_racha', 'puntos_totales', 'logros']
    fieldsets = (
        ('Identidad',     {'fields': ['user', 'nombre', 'sexo', 'fecha_nacimiento']}),
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
