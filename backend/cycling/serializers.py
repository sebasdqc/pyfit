from rest_framework import serializers
from .models import RideSession


# ⚠️ Sin RidePoint (tracking GPS): a diferencia de RunSessionUpdateSerializer
# (que RECALCULA distancia/pace/desnivel/calorías desde los puntos GPS al
# completar), acá las métricas agregadas las escribe el CLIENTE directamente
# al completar la sesión — no hay de dónde derivarlas todavía. Es el mismo
# límite documentado en cycling/models.py: "SIN un RidePoint... eso es una
# feature de tracking en vivo con cambios nativos en mobile".


class RideSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RideSession
        fields = ['id', 'started_at', 'session_type']
        read_only_fields = ['id']

    def create(self, validated_data):
        request = self.context['request']
        from checkins.views import _get_write_date
        hoy = _get_write_date(request)
        # Cierra cualquier sesión active/paused huérfana del usuario (crash de
        # la app, doble tap en "empezar") antes de abrir una nueva — mismo
        # fix que RunSessionCreateSerializer.create().
        RideSession.objects.filter(
            user=request.user, status__in=['active', 'paused'],
        ).update(status='abandoned')
        validated_data['user'] = request.user
        validated_data['status'] = 'active'
        # Fecha local del dispositivo al crear la sesión — ver el comentario
        # de RideSession.local_date.
        validated_data['local_date'] = hoy
        return super().create(validated_data)


class RideSessionUpdateSerializer(serializers.ModelSerializer):
    """PATCH al completar: `ended_at` + lo que el cliente pueda reportar
    (potenciómetro/pulsómetro propios, o entrada manual). `total_duration_s`
    NO se acepta del cliente — se calcula siempre server-side desde
    started_at/ended_at, la única métrica que no depende de un sensor."""
    class Meta:
        model = RideSession
        fields = [
            'status', 'ended_at', 'total_distance_m', 'avg_power_w',
            'normalized_power_w', 'avg_cadence_rpm', 'avg_heart_rate',
            'calories_burned', 'elevation_gain_m',
        ]

    def validate(self, data):
        if data.get('status') == 'completed' and not data.get('ended_at'):
            raise serializers.ValidationError("ended_at is required when completing a session.")
        ended_at = data.get('ended_at')
        if ended_at and self.instance and ended_at < self.instance.started_at:
            raise serializers.ValidationError("ended_at cannot be before started_at.")
        return data

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if instance.status == 'completed' and instance.ended_at:
            instance.total_duration_s = int(
                (instance.ended_at - instance.started_at).total_seconds())
            instance.save(update_fields=['total_duration_s', 'updated_at'])
        return instance


class RideFeedbackSerializer(serializers.ModelSerializer):
    """Feedback post-salida sobre la propia RideSession. Espejo exacto de
    RunFeedbackSerializer (mismos campos, mismas validaciones) — el feedback
    post-sesión no cambia entre deportes."""
    class Meta:
        model = RideSession
        fields = ['rpe_real', 'rating', 'cumplimiento', 'molestias', 'feedback_notas']

    def validate_rpe_real(self, v):
        if v is not None and not (1 <= v <= 10):
            raise serializers.ValidationError("rpe_real debe estar entre 1 y 10.")
        return v

    def validate_rating(self, v):
        if v is not None and not (1 <= v <= 5):
            raise serializers.ValidationError("rating debe estar entre 1 y 5.")
        return v

    def validate_cumplimiento(self, v):
        if v is not None and not (0 <= v <= 100):
            raise serializers.ValidationError("cumplimiento debe estar entre 0 y 100.")
        return v

    def validate_molestias(self, v):
        if v is None:
            return []
        if not isinstance(v, list) or not all(isinstance(z, str) for z in v):
            raise serializers.ValidationError("molestias debe ser una lista de strings.")
        return v


class RideSessionDetailSerializer(serializers.ModelSerializer):
    planned = serializers.SerializerMethodField()

    class Meta:
        model = RideSession
        fields = [
            'id', 'started_at', 'ended_at', 'status', 'session_type',
            'total_distance_m', 'total_duration_s', 'avg_power_w',
            'normalized_power_w', 'avg_cadence_rpm', 'avg_heart_rate',
            'calories_burned', 'elevation_gain_m', 'planned', 'created_at',
            'rpe_real', 'rating', 'cumplimiento', 'molestias', 'feedback_notas', 'feedback_at',
        ]

    def get_planned(self, obj):
        """Objetivo prescrito (zona/FC/potencia/RPE del bloque principal) si la
        salida está vinculada a una sesión inteligente — mismo criterio que
        RunSessionDetailSerializer.get_planned, adaptado (fc/potencia, no pace)."""
        if obj.session_type != 'planned':
            return None
        pr = obj.planned_origin.first()
        if not pr:
            return None
        segs = pr.estructura_fases.get('segmentos', []) if isinstance(pr.estructura_fases, dict) else []
        principales = [s for s in segs if s.get('fase') == 'principal']
        pool = principales or segs
        target = max(pool, key=lambda s: s.get('rpe') or 0) if pool else {}
        ia = pr.respuesta_ia if isinstance(pr.respuesta_ia, dict) else {}
        return {
            'tipo_sesion': pr.tipo_sesion,
            'titulo': ia.get('titulo') or '',
            'zona_principal': pr.zona_principal,
            'rpe_target': pr.rpe_target,
            'fc_objetivo': target.get('fc_objetivo'),
            'potencia_objetivo': target.get('potencia_objetivo'),
        }


class RideSessionListSerializer(serializers.ModelSerializer):
    """Versión ligera para el historial."""
    class Meta:
        model = RideSession
        fields = [
            'id', 'started_at', 'ended_at', 'status', 'session_type',
            'total_distance_m', 'total_duration_s', 'avg_power_w',
            'avg_heart_rate', 'elevation_gain_m', 'calories_burned',
            'rpe_real', 'rating', 'cumplimiento',
            'created_at',
        ]
