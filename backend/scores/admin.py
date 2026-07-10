from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import RangeDateFilter

from .models import ScoreConfig, ScoreSnapshot


@admin.register(ScoreSnapshot)
class ScoreSnapshotAdmin(ModelAdmin):
    list_display = ['user', 'fecha_corte', 'score_final', 'nivel_p1', 'momentum', 'perfil_atleta', 'created_at']
    list_filter = [('fecha_corte', RangeDateFilter), 'perfil_atleta']
    search_fields = ['user__email']
    readonly_fields = [
        'user', 'fecha_corte', 'nivel_p1', 'nivel_p0', 'momentum', 'score_final',
        'componentes_json', 'perfil_atleta', 'estado_cold_start', 'created_at',
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ScoreConfig)
class ScoreConfigAdmin(ModelAdmin):
    list_display = ['__str__', 'momentum_cap', 'rendimiento_cap_pct', 'ventana_dias']

    def has_add_permission(self, request):
        # Singleton — se crea sola vía get_solo(), no tiene sentido un segundo registro.
        return not ScoreConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
