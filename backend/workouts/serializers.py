import copy

from rest_framework import serializers
from .models import Session, SessionExercise, SessionFeedback, Competition, SessionPhoto
from checkins.models import DailyCheckin


def _peso_por_nombre(exercises):
    """HIS-2: mapa {nombre normalizado: peso máximo registrado} desde series_log.

    El nombre se normaliza igual que en _persist_session_exercises (strip + [:200])
    para que coincida con SessionExercise.nombre.
    """
    result = {}
    for ex in exercises:
        pesos = []
        for s in (ex.series_log or []):
            if isinstance(s, dict) and s.get('peso') not in (None, ''):
                try:
                    pesos.append(float(s.get('peso')))
                except (TypeError, ValueError):
                    pass
        if pesos:
            result[ex.nombre] = max(pesos)
    return result


class SessionCheckinSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyCheckin
        fields = ['estado_fisico', 'estado_animo', 'dolor_hoy']


class SessionFeedbackSerializer(serializers.ModelSerializer):
    notas = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)

    class Meta:
        model = SessionFeedback
        fields = ['id', 'rpe_real', 'cumplimiento', 'rating', 'notas', 'molestias', 'created_at']
        read_only_fields = ['id', 'created_at']


class SessionExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionExercise
        fields = ['id', 'orden', 'nombre', 'series', 'repeticiones', 'descanso_segundos', 'rpe_sugerido', 'notas']
        read_only_fields = ['id']


class SessionListSerializer(serializers.ModelSerializer):
    feedback = SessionFeedbackSerializer(read_only=True)
    checkin = SessionCheckinSerializer(read_only=True)
    titulo = serializers.SerializerMethodField()
    objetivo_sesion = serializers.SerializerMethodField()
    # HIS-1: respuesta_ia RECORTADA para el listado/calendario — solo título,
    # objetivo, duración, RPE y fases con NOMBRES de ejercicios (suficiente para
    # búsqueda y síntesis). El detalle completo (series/reps/notas/nota del
    # entrenador) se sirve bajo demanda en GET /api/sessions/{id}/.
    respuesta_ia = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            'id', 'fecha', 'duracion_planificada', 'rpe_target', 'volumen_relativo',
            'titulo', 'objetivo_sesion', 'respuesta_ia', 'checkin', 'feedback', 'created_at',
        ]

    def get_titulo(self, obj):
        if obj.respuesta_ia:
            return obj.respuesta_ia.get('titulo', '')
        return ''

    def get_objetivo_sesion(self, obj):
        if obj.respuesta_ia:
            return obj.respuesta_ia.get('objetivo_sesion', '')
        return ''

    def get_respuesta_ia(self, obj):
        ia = obj.respuesta_ia
        if not isinstance(ia, dict):
            return None

        # HIS-2: peso real registrado por ejercicio (máximo de series_log).
        peso_por_nombre = _peso_por_nombre(obj.exercises.all())

        def _ej(ej):
            nombre = str(ej.get('nombre', '')).strip()[:200]
            return {
                'nombre': ej.get('nombre', ''),
                'series': ej.get('series'),
                'repeticiones': ej.get('repeticiones', ''),
                'rpe_sugerido': ej.get('rpe_sugerido'),
                'peso': peso_por_nombre.get(nombre),
            }

        fases = [
            {
                'nombre': f.get('nombre', ''),
                'ejercicios': [
                    _ej(ej)
                    for ej in (f.get('ejercicios', []) or [])
                ],
            }
            for f in (ia.get('fases', []) or [])
        ]
        return {
            'titulo': ia.get('titulo', ''),
            'objetivo_sesion': ia.get('objetivo_sesion', ''),
            'duracion_total': ia.get('duracion_total'),
            'rpe_target': ia.get('rpe_target'),
            'fases': fases,
        }


class SessionPhotoSerializer(serializers.ModelSerializer):
    """Foto de sesión (gym o running). `url` es firmada y temporal con Spaces."""
    url = serializers.SerializerMethodField()

    class Meta:
        model = SessionPhoto
        fields = ['id', 'url', 'created_at']

    def get_url(self, obj):
        try:
            return obj.image.url
        except Exception:
            return None


class SessionDetailSerializer(serializers.ModelSerializer):
    feedback = SessionFeedbackSerializer(read_only=True)
    exercises = SessionExerciseSerializer(many=True, read_only=True)
    photos = SessionPhotoSerializer(many=True, read_only=True)
    # HIS-2: respuesta_ia COMPLETA (series/reps/notas/nota del entrenador) pero
    # enriquecida con el peso real registrado por ejercicio (series_log).
    respuesta_ia = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            'id', 'fecha', 'duracion_planificada', 'rpe_target', 'volumen_relativo',
            'respuesta_ia', 'feedback', 'exercises', 'photos', 'created_at',
        ]

    def get_respuesta_ia(self, obj):
        ia = obj.respuesta_ia
        if not isinstance(ia, dict):
            return ia
        peso_por_nombre = _peso_por_nombre(obj.exercises.all())
        if not peso_por_nombre:
            return ia
        # Copia profunda para no mutar el JSON almacenado en memoria.
        ia = copy.deepcopy(ia)
        for fase in (ia.get('fases', []) or []):
            for ej in (fase.get('ejercicios', []) or []):
                if isinstance(ej, dict):
                    nombre = str(ej.get('nombre', '')).strip()[:200]
                    peso = peso_por_nombre.get(nombre)
                    if peso is not None:
                        ej['peso'] = peso
        return ia


class CompetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = ['id', 'nombre', 'fecha', 'tipo', 'distancia_disciplina']
        read_only_fields = ['id']
