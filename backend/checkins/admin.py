from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import RangeDateFilter

from .models import DailyCheckin


@admin.register(DailyCheckin)
class DailyCheckinAdmin(ModelAdmin):
    list_display   = ['user', 'fecha', 'estado_animo', 'calidad_sueno',
                      'duracion_disponible', 'location', 'created_at']
    list_filter    = ['estado_animo', 'estado_fisico', ('fecha', RangeDateFilter)]
    search_fields  = ['user__email', 'notas', 'dolor_hoy']
    readonly_fields = ['created_at']
    date_hierarchy = 'fecha'
