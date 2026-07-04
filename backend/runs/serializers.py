from rest_framework import serializers
from .models import RunSession, RunPoint
from workouts.serializers import SessionPhotoSerializer
import math


# Gaps entre puntos GPS consecutivos mayores a este umbral se consideran
# pausas (o pérdida de señal) y NO cuentan como tiempo en movimiento. Evita
# inflar la duración —y por tanto el pace— cuando el corredor pausa la sesión.
PAUSE_GAP_THRESHOLD_S = 10

# Cambios de altitud menores a este umbral se descartan como ruido del GPS
# (la altitud GPS oscila ±5-10 m). Histéresis para no inflar el desnivel.
ELEVATION_NOISE_THRESHOLD_M = 3.0

# Peso por defecto (kg) cuando el perfil no tiene peso, para estimar calorías.
DEFAULT_WEIGHT_KG = 70.0

# Máximo de puntos GPS que devuelve el detalle: la traza se diezma para no
# enviar miles de puntos. Se puede pedir la traza completa con ?full=1.
MAX_DETAIL_POINTS = 500


def haversine_distance(lat1, lng1, lat2, lng2):
    """Distancia en metros entre dos coordenadas GPS."""
    R = 6371000  # radio de la Tierra en metros
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def downsample_points(points, max_points):
    """Diezma una lista de puntos a `max_points` como máximo, conservando
    siempre el primero y el último (muestreo por zancada uniforme). Suficiente
    para dibujar la polilínea del recorrido sin enviar miles de puntos."""
    n = len(points)
    if n <= max_points:
        return points
    step = n / max_points
    sampled = [points[int(i * step)] for i in range(max_points)]
    sampled[-1] = points[-1]
    return sampled


class RunPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunPoint
        fields = ['id', 'lat', 'lng', 'altitude_m', 'accuracy_m', 'timestamp', 'speed_m_s']


class RunSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunSession
        # `id` es imprescindible en la respuesta: el cliente lo usa para enviar
        # puntos GPS y completar la sesión. `is_trail` es opcional en la escritura:
        # el check-in de trail lo manda explícito (camino fiable); si no llega, se
        # intenta heredar del check-in del día (respaldo).
        fields = ['id', 'started_at', 'session_type', 'is_trail']
        read_only_fields = ['id']
        extra_kwargs = {'is_trail': {'required': False}}

    def create(self, validated_data):
        request = self.context['request']
        validated_data['user'] = request.user
        validated_data['status'] = 'active'
        # ¿El cliente marcó la carrera como trail explícitamente? (el check-in de
        # trail envía is_trail=true al navegar al Free Run). Es el camino fiable y
        # no depende del emparejamiento por fecha.
        explicit_trail = bool(validated_data.get('is_trail'))
        instance = super().create(validated_data)
        # Respaldo: si no vino explícito, hereda la disciplina del check-in de HOY.
        # Se usa la misma fecha local (X-Local-Date) con la que el check-in escribió
        # `fecha`, así el emparejamiento es exacto pese a TIME_ZONE=UTC.
        if not explicit_trail:
            from checkins.views import _get_write_date
            hoy = _get_write_date(request)
            checkin = request.user.checkins.filter(fecha=hoy).order_by('-created_at').first()
            if checkin and 'trail' in (checkin.foco_entrenamiento or []):
                instance.is_trail = True
                instance.save(update_fields=['is_trail'])
        return instance


class RunSessionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunSession
        fields = ['status', 'ended_at']

    def validate(self, data):
        if data.get('status') == 'completed' and not data.get('ended_at'):
            raise serializers.ValidationError("ended_at is required when completing a session.")
        ended_at = data.get('ended_at')
        if ended_at and self.instance and ended_at < self.instance.started_at:
            raise serializers.ValidationError("ended_at cannot be before started_at.")
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

        # Distancia acumulada: un solo recorrido de haversine, reutilizado
        # tanto para la distancia total como para el mejor pace.
        cum = [0.0] * len(points)
        for i in range(1, len(points)):
            cum[i] = cum[i - 1] + haversine_distance(
                points[i - 1].lat, points[i - 1].lng,
                points[i].lat, points[i].lng
            )
        total_distance = cum[-1]

        # Duración en movimiento (excluye pausas y gaps de señal GPS)
        duration_s = self._calculate_moving_duration(points)

        # Pace promedio (s/km)
        avg_pace = int((duration_s / (total_distance / 1000))) if total_distance > 0 else 0

        # Ganancia de elevación (con histéresis anti-ruido GPS)
        elevation_gain = self._calculate_elevation_gain(points)

        # Mejor pace (ventana deslizante de 1km)
        best_pace = self._calculate_best_pace(points, cum)

        # Calorías estimadas (ACSM running, usa el peso del perfil)
        calories = self._calculate_calories(session, total_distance, duration_s)

        session.total_distance_m = total_distance
        session.total_duration_s = duration_s
        session.avg_pace_s_per_km = avg_pace
        session.best_pace_s_per_km = best_pace
        session.elevation_gain_m = elevation_gain
        session.calories_burned = calories
        session.save()

    def _calculate_moving_duration(self, points):
        """Tiempo en movimiento: suma los deltas entre puntos consecutivos,
        descartando los gaps mayores al umbral de pausa (pausas o pérdida de
        señal GPS). Así un parón a mitad de carrera no infla la duración."""
        moving = 0.0
        for i in range(1, len(points)):
            delta = (points[i].timestamp - points[i - 1].timestamp).total_seconds()
            if 0 < delta <= PAUSE_GAP_THRESHOLD_S:
                moving += delta
        return int(moving)

    def _calculate_elevation_gain(self, points):
        """Desnivel positivo acumulado con histéresis: solo se contabiliza un
        cambio cuando supera ELEVATION_NOISE_THRESHOLD_M respecto a la última
        altitud significativa, filtrando la oscilación del altímetro GPS."""
        gain = 0.0
        last = None
        for p in points:
            if p.altitude_m is None:
                continue
            if last is None:
                last = p.altitude_m
                continue
            diff = p.altitude_m - last
            if abs(diff) >= ELEVATION_NOISE_THRESHOLD_M:
                if diff > 0:
                    gain += diff
                last = p.altitude_m
        return round(gain, 1)

    def _calculate_calories(self, session, distance_m, duration_s):
        """Calorías estimadas con la ecuación ACSM de carrera en llano:
        VO2 (ml/kg/min) = 0.2 * velocidad(m/min) + 3.5
        kcal = VO2 * peso(kg) * minutos * 5(kcal/L) / 1000(ml/L)
        No incluye pendiente (la altitud GPS es ruidosa)."""
        if distance_m <= 0 or duration_s <= 0:
            return 0.0
        weight_kg = self._user_weight_kg(session.user)
        minutes = duration_s / 60
        speed_m_min = distance_m / minutes
        vo2 = 0.2 * speed_m_min + 3.5
        kcal = vo2 * weight_kg * minutes * 5 / 1000
        return round(kcal, 1)

    def _user_weight_kg(self, user):
        profile = getattr(user, 'profile', None)
        if profile and profile.peso:
            return float(profile.peso)
        return DEFAULT_WEIGHT_KG

    def _calculate_best_pace(self, points, cum):
        """Mejor pace en una ventana de 1 km, con dos punteros O(n).

        `cum[k]` es la distancia acumulada hasta el punto k. Para cada fin de
        ventana `j` avanzamos la cola `i` lo máximo posible manteniendo
        >= 1 km: así obtenemos la ventana más ajustada (menor tiempo) que
        termina en `j`. El mínimo sobre todos los `j` es el mejor pace global.
        """
        best = float('inf')
        i = 0
        for j in range(1, len(points)):
            while i + 1 < j and cum[j] - cum[i + 1] >= 1000:
                i += 1
            if cum[j] - cum[i] >= 1000:
                t = (points[j].timestamp - points[i].timestamp).total_seconds()
                if t < best:
                    best = t
        return int(best) if best != float('inf') else 0


class RunFeedbackSerializer(serializers.ModelSerializer):
    """Valida y persiste el feedback post-carrera sobre la propia RunSession.

    Paralelo al feedback de las sesiones de gym (rpe_real, rating, cumplimiento,
    molestias, notas). Todos los campos son opcionales: la pantalla puede enviar
    solo lo que el usuario completó."""
    class Meta:
        model = RunSession
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


class RunSessionDetailSerializer(serializers.ModelSerializer):
    points = serializers.SerializerMethodField()
    planned = serializers.SerializerMethodField()
    photos = SessionPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = RunSession
        fields = [
            'id', 'started_at', 'ended_at', 'status', 'session_type', 'is_trail',
            'total_distance_m', 'total_duration_s', 'avg_pace_s_per_km',
            'best_pace_s_per_km', 'calories_burned', 'elevation_gain_m',
            'avg_heart_rate', 'points', 'planned', 'photos', 'created_at',
            'rpe_real', 'rating', 'cumplimiento', 'molestias', 'feedback_notas', 'feedback_at',
        ]

    def get_points(self, obj):
        """Devuelve la traza diezmada (máx. MAX_DETAIL_POINTS). Con ?full=1
        se devuelve completa (útil para exportar GPX o recalcular).

        Si la traza cruda ya fue purgada por retención (puntos_purgados=True,
        ver runs.tasks.purge_old_gps_points), no quedan RunPoint en DB: se sirve
        la snapshot diezmada guardada en gps_resumen (?full=1 no aplica — la
        traza completa ya no existe)."""
        if obj.puntos_purgados:
            return obj.gps_resumen or []
        points = list(obj.points.all())  # ordenados por timestamp (Meta)
        request = self.context.get('request')
        full = request and request.query_params.get('full') in ('1', 'true', 'True')
        if not full:
            points = downsample_points(points, MAX_DETAIL_POINTS)
        return RunPointSerializer(points, many=True).data

    def get_planned(self, obj):
        """Objetivo prescrito (zona/ritmo/FC/RPE del bloque principal) si la carrera
        está vinculada a una sesión inteligente — para calcular adherencia en el
        resumen. None para carreras libres."""
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
            'pace_objetivo': target.get('pace_objetivo'),   # [lo,hi] s/km o None
            'fc_objetivo': target.get('fc_objetivo'),        # [lo,hi] bpm o None
        }


class RunSessionListSerializer(serializers.ModelSerializer):
    """Versión ligera para el historial — sin puntos GPS."""
    class Meta:
        model = RunSession
        fields = [
            'id', 'started_at', 'ended_at', 'status', 'session_type', 'is_trail',
            'total_distance_m', 'total_duration_s', 'avg_pace_s_per_km',
            'elevation_gain_m', 'calories_burned',
            'rpe_real', 'rating', 'cumplimiento',
            'created_at',
        ]
