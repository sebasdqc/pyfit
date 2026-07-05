from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import RangeDateFilter

from .models import DailyCheckin


@admin.register(DailyCheckin)
class DailyCheckinAdmin(ModelAdmin):
    list_display   = ['user', 'fecha', 'estado_animo', 'calidad_sueno',
                      'duracion_disponible', 'location', 'created_at']
    list_filter    = ['estado_animo', 'estado_fisico', ('fecha', RangeDateFilter)]
    # dolor_hoy queda fuera de la búsqueda: está encriptado (dato de salud),
    # buscar en el texto cifrado no encontraría nada.
    search_fields  = ['user__email', 'notas']
    readonly_fields = ['created_at']
    date_hierarchy = 'fecha'
