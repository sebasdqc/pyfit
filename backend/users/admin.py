from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import RangeDateFilter
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import (
    MenstrualCycle, Notification, NotificationPreference,
    Profile, User, UserInjury, UserLocation,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    """Combine Django's auth admin with Unfold's theme + forms."""
    form                  = UserChangeForm
    add_form              = UserCreationForm
    change_password_form  = AdminPasswordChangeForm

    list_display   = ['email', 'username', 'is_staff', 'is_active', 'date_joined', 'last_login']
    list_filter    = ['is_staff', 'is_superuser', 'is_active', ('date_joined', RangeDateFilter)]
    search_fields  = ['email', 'username']
    ordering       = ['-date_joined']
    readonly_fields = ['date_joined', 'last_login']


@admin.register(Profile)
class ProfileAdmin(ModelAdmin):
    list_display   = ['nombre', 'user', 'nivel_label', 'objetivo', 'racha_actual', 'puntos_totales', 'created_at']
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
    list_display   = ['user', 'zona', 'severidad', 'activa', 'created_at']
    list_filter    = ['zona', 'severidad', 'activa']
    search_fields  = ['user__email', 'descripcion']
    readonly_fields = ['created_at']


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display   = ['user', 'tipo', 'texto_preview', 'leida', 'created_at']
    list_filter    = ['tipo', 'leida', ('created_at', RangeDateFilter)]
    search_fields  = ['user__email', 'texto']
    readonly_fields = ['created_at']
    list_per_page  = 50

    @admin.display(description='Mensaje')
    def texto_preview(self, obj):
        if not obj.texto:
            return ''
        return obj.texto[:80] + ('…' if len(obj.texto) > 80 else '')


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
