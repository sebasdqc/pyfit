from django.contrib import admin
from .models import DailyCheckin


@admin.register(DailyCheckin)
class DailyCheckinAdmin(admin.ModelAdmin):
    list_display = ['user', 'fecha', 'estado_animo', 'calidad_sueno', 'duracion_disponible', 'created_at']
    list_filter = ['fecha', 'estado_animo']
    search_fields = ['user__email']
