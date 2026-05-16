from rest_framework import serializers
from .models import DailyCheckin
from users.serializers import UserLocationSerializer


class CheckinSerializer(serializers.ModelSerializer):
    location_detail = UserLocationSerializer(source='location', read_only=True)

    class Meta:
        model = DailyCheckin
        fields = [
            'id', 'fecha', 'estado_animo', 'calidad_sueno', 'hrv',
            'location', 'location_detail', 'duracion_disponible',
            'foco_entrenamiento', 'estado_fisico', 'dolor_hoy', 'notas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'location_detail']
