from rest_framework import serializers

from cycling.models import CyclistProfile, RidePlan, PlannedRide


class CyclistProfileSerializer(serializers.ModelSerializer):
    """Perfil de ciclista. Solo fc_max/fc_reposo/volumen son editables a mano; el
    resto (FTHR/FTP, zonas, confianza) lo deriva el servicio de baseline."""
    class Meta:
        model = CyclistProfile
        fields = [
            'fthr_bpm', 'ftp_w', 'fc_max', 'fc_reposo', 'fc_max_es_estimada',
            'volumen_semanal_base_horas', 'zonas',
            'fuente_baseline', 'confianza', 'fecha_calculo',
        ]
        read_only_fields = [
            'fthr_bpm', 'ftp_w', 'zonas', 'fuente_baseline', 'confianza', 'fecha_calculo',
        ]


class PlannedRideSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannedRide
        fields = [
            'id', 'fecha', 'tipo_sesion', 'es_calidad', 'zona_principal',
            'duracion_objetivo_min', 'rpe_target',
            'estructura_fases', 'respuesta_ia', 'estado', 'ajuste_aplicado',
            'ride_session', 'created_at',
        ]
        read_only_fields = fields


class RidePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RidePlan
        fields = [
            'id', 'meta_tipo', 'meta_distancia_km', 'meta_fecha', 'meta_competition',
            'fase_actual', 'semana_actual', 'total_semanas', 'horas_objetivo_semana',
            'dias_semana', 'dias_preferidos', 'is_active', 'started_at', 'week_start',
        ]
        read_only_fields = ['fase_actual', 'semana_actual', 'horas_objetivo_semana',
                            'week_start', 'started_at', 'is_active']
