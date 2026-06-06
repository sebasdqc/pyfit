"""Serializers del panel Zyfit Performance."""

from rest_framework import serializers

from .models import (
    SportsCenter, CenterMembership, CenterAthlete,
    PerformanceMetric, InjuryReport, PhysicalTest, TrainingPlan, PsychAssessment,
    TestDefinition,
)


class SportsCenterSerializer(serializers.ModelSerializer):
    total_atletas = serializers.SerializerMethodField()
    total_staff = serializers.SerializerMethodField()

    class Meta:
        model = SportsCenter
        fields = [
            'id', 'nombre', 'slug', 'ciudad', 'pais', 'disciplina',
            'director_principal', 'activo', 'created_at',
            'total_atletas', 'total_staff',
        ]
        read_only_fields = ['id', 'created_at']

    def get_total_atletas(self, obj):
        return obj.atletas.count()

    def get_total_staff(self, obj):
        return obj.memberships.filter(activo=True).count()


class CenterMembershipSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = CenterMembership
        fields = [
            'id', 'center', 'user', 'email', 'rol', 'modulos', 'activo', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'email']


class CenterAthleteSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='athlete.email', read_only=True)

    class Meta:
        model = CenterAthlete
        fields = [
            'id', 'center', 'athlete', 'email', 'registrado_por',
            'dorsal', 'posicion', 'grupo', 'estado', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'email', 'registrado_por']


class PerformanceMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceMetric
        fields = [
            'id', 'center', 'athlete', 'registrado_por', 'fecha',
            'tipo', 'metrica', 'valor', 'unidad', 'notas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'registrado_por']


class InjuryReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = InjuryReport
        fields = [
            'id', 'center', 'athlete', 'registrado_por', 'fecha',
            'zona', 'diagnostico', 'severidad', 'estado', 'tratamiento',
            'fecha_alta_estimada', 'notas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'registrado_por']


class TestDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestDefinition
        fields = ['slug', 'familia', 'nombre', 'descripcion', 'input_schema', 'activo']


class PhysicalTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhysicalTest
        fields = [
            'id', 'center', 'athlete', 'registrado_por', 'fecha',
            'test_slug', 'nombre', 'categoria', 'inputs', 'resultados',
            'resultado', 'unidad', 'notas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'registrado_por']


class TrainingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingPlan
        fields = [
            'id', 'center', 'athlete', 'creado_por', 'nombre', 'objetivo',
            'descripcion', 'fecha_inicio', 'fecha_fin', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'creado_por']


class PsychAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PsychAssessment
        fields = [
            'id', 'center', 'athlete', 'registrado_por', 'fecha',
            'tipo', 'puntuacion', 'notas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'registrado_por']
