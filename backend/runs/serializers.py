from rest_framework import serializers
from .models import RunSession, RunPoint
import math


def haversine_distance(lat1, lng1, lat2, lng2):
    """Distancia en metros entre dos coordenadas GPS."""
    R = 6371000  # radio de la Tierra en metros
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class RunPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunPoint
        fields = ['id', 'lat', 'lng', 'altitude_m', 'accuracy_m', 'timestamp', 'speed_m_s']


class RunSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunSession
        fields = ['started_at', 'session_type']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = 'active'
        return super().create(validated_data)


class RunSessionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunSession
        fields = ['status', 'ended_at']

    def validate(self, data):
        if data.get('status') == 'completed' and not data.get('ended_at'):
            raise serializers.ValidationError("ended_at is required when completing a session.")
        return data

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if instance.status == 'completed':
            self._calculate_metrics(instance)
        return instance

    def _calculate_metrics(self, session):
        """Calcula y guarda las métricas agregadas al completar la sesión."""
        points = list(session.points.filter(accuracy_m__lte=20).order_by('timestamp'))

        if len(points) < 2:
            return

        # Distancia total
        total_distance = 0
        for i in range(1, len(points)):
            total_distance += haversine_distance(
                points[i - 1].lat, points[i - 1].lng,
                points[i].lat, points[i].lng
            )

        # Duración total
        duration_s = int((session.ended_at - session.started_at).total_seconds())

        # Pace promedio (s/km)
        avg_pace = int((duration_s / (total_distance / 1000))) if total_distance > 0 else 0

        # Ganancia de elevación
        elevation_gain = sum(
            max(0, points[i].altitude_m - points[i - 1].altitude_m)
            for i in range(1, len(points))
            if points[i].altitude_m is not None and points[i - 1].altitude_m is not None
        )

        # Mejor pace (ventana deslizante de 1km)
        best_pace = self._calculate_best_pace(points)

        session.total_distance_m = total_distance
        session.total_duration_s = duration_s
        session.avg_pace_s_per_km = avg_pace
        session.best_pace_s_per_km = best_pace
        session.elevation_gain_m = elevation_gain
        session.save()

    def _calculate_best_pace(self, points):
        """Calcula el mejor pace en 1km con ventana deslizante."""
        best = float('inf')
        for i in range(len(points)):
            dist = 0
            for j in range(i + 1, len(points)):
                dist += haversine_distance(
                    points[j - 1].lat, points[j - 1].lng,
                    points[j].lat, points[j].lng
                )
                if dist >= 1000:
                    t = (points[j].timestamp - points[i].timestamp).total_seconds()
                    pace = int(t)
                    if pace < best:
                        best = pace
                    break
        return best if best != float('inf') else 0


class RunSessionDetailSerializer(serializers.ModelSerializer):
    points = RunPointSerializer(many=True, read_only=True)

    class Meta:
        model = RunSession
        fields = [
            'id', 'started_at', 'ended_at', 'status', 'session_type',
            'total_distance_m', 'total_duration_s', 'avg_pace_s_per_km',
            'best_pace_s_per_km', 'calories_burned', 'elevation_gain_m',
            'avg_heart_rate', 'points', 'created_at'
        ]


class RunSessionListSerializer(serializers.ModelSerializer):
    """Versión ligera para el historial — sin puntos GPS."""
    class Meta:
        model = RunSession
        fields = [
            'id', 'started_at', 'ended_at', 'status', 'session_type',
            'total_distance_m', 'total_duration_s', 'avg_pace_s_per_km',
            'created_at'
        ]
