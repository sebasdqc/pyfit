from rest_framework import serializers
from .models import Session, SessionExercise, SessionFeedback, Competition


class SessionFeedbackSerializer(serializers.ModelSerializer):
    notas = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)

    class Meta:
        model = SessionFeedback
        fields = ['id', 'rpe_real', 'cumplimiento', 'rating', 'notas', 'created_at']
        read_only_fields = ['id', 'created_at']


class SessionExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionExercise
        fields = ['id', 'orden', 'nombre', 'series', 'repeticiones', 'descanso_segundos', 'rpe_sugerido', 'notas']
        read_only_fields = ['id']


class SessionListSerializer(serializers.ModelSerializer):
    feedback = SessionFeedbackSerializer(read_only=True)
    titulo = serializers.SerializerMethodField()
    objetivo_sesion = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            'id', 'fecha', 'duracion_planificada', 'rpe_target', 'volumen_relativo',
            'titulo', 'objetivo_sesion', 'feedback', 'created_at',
        ]

    def get_titulo(self, obj):
        if obj.respuesta_ia:
            return obj.respuesta_ia.get('titulo', '')
        return ''

    def get_objetivo_sesion(self, obj):
        if obj.respuesta_ia:
            return obj.respuesta_ia.get('objetivo_sesion', '')
        return ''


class SessionDetailSerializer(serializers.ModelSerializer):
    feedback = SessionFeedbackSerializer(read_only=True)
    exercises = SessionExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = [
            'id', 'fecha', 'duracion_planificada', 'rpe_target', 'volumen_relativo',
            'respuesta_ia', 'feedback', 'exercises', 'created_at',
        ]


class CompetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = ['id', 'nombre', 'fecha', 'tipo', 'distancia_disciplina']
        read_only_fields = ['id']
