from rest_framework import serializers

from runs.models import RunnerProfile, RunningPlan, PlannedRunSession


class RunnerProfileSerializer(serializers.ModelSerializer):
    """Perfil de corredor. Solo fc_max/fc_reposo/volumen son editables a mano; el
    resto (umbral, zonas, confianza) lo deriva el servicio de baseline."""
    class Meta:
        model = RunnerProfile
        fields = [
            'threshold_pace_s_km', 'vo2_estimado', 'fc_max', 'fc_reposo',
            'fc_max_es_estimada', 'volumen_semanal_base_km', 'zonas',
            'fuente_baseline', 'confianza', 'n_runs_baseline', 'fecha_calculo',
        ]
        read_only_fields = [
            'threshold_pace_s_km', 'vo2_estimado', 'zonas', 'fuente_baseline',
            'confianza', 'n_runs_baseline', 'fecha_calculo',
        ]


class PlannedRunSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannedRunSession
        fields = [
            'id', 'fecha', 'tipo_sesion', 'es_calidad', 'zona_principal',
            'duracion_objetivo_min', 'distancia_objetivo_km', 'rpe_target',
            'estructura_fases', 'respuesta_ia', 'estado', 'ajuste_aplicado',
            'run_session', 'created_at',
        ]
        read_only_fields = fields


class RunningPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunningPlan
        fields = [
            'id', 'meta_tipo', 'meta_distancia_km', 'meta_fecha', 'meta_competition',
            'fase_actual', 'semana_actual', 'total_semanas', 'km_objetivo_semana',
            'dias_semana', 'dias_preferidos', 'is_active', 'started_at', 'week_start',
        ]
        read_only_fields = ['fase_actual', 'semana_actual', 'km_objetivo_semana',
                            'week_start', 'started_at', 'is_active']
