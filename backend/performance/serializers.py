"""Serializers del panel Zyfit Performance."""

from rest_framework import serializers

from .models import (
    SportsCenter, CenterMembership, CenterAthlete,
    PerformanceMetric, InjuryReport, PhysicalTest, TrainingPlan, PsychAssessment,
    TestDefinition, Mesocycle, Microcycle, WellnessCheckin, TacticalPlay,
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
            'dorsal', 'posicion', 'grupo', 'estado', 'foto', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'email', 'registrado_por']

    # La foto llega como data URL (base64) ya reescalada en el cliente. Acotamos
    # tamaño y forma para no almacenar imágenes grandes en la BD (provisional
    # hasta que haya almacenamiento de objetos).
    MAX_FOTO_BYTES = 700 * 1024  # ~512 KB de imagen → margen holgado en base64

    def validate_foto(self, value):
        if not value:
            return value
        if not value.startswith('data:image/'):
            raise serializers.ValidationError('La foto debe ser un data URL de imagen.')
        if len(value) > self.MAX_FOTO_BYTES:
            raise serializers.ValidationError('La foto es demasiado grande.')
        return value


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


class MicrocycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Microcycle
        fields = [
            'id', 'mesociclo', 'orden', 'fecha_inicio', 'nombre', 'tipo',
            'carga_relativa', 'volumen', 'intensidad', 'notas', 'created_at',
        ]
        # `mesociclo` lo fija la vista a partir de la ruta.
        read_only_fields = ['id', 'created_at', 'mesociclo']


class MesocycleSerializer(serializers.ModelSerializer):
    microciclos = MicrocycleSerializer(many=True, read_only=True)

    class Meta:
        model = Mesocycle
        fields = [
            'id', 'plan', 'orden', 'nombre', 'tipo', 'enfasis', 'carga_objetivo',
            'duracion_semanas', 'notas', 'created_at', 'microciclos',
        ]
        # `plan` lo fija la vista a partir de la ruta.
        read_only_fields = ['id', 'created_at', 'plan']


class TrainingPlanSerializer(serializers.ModelSerializer):
    total_mesociclos = serializers.SerializerMethodField()
    total_microciclos = serializers.SerializerMethodField()

    class Meta:
        model = TrainingPlan
        fields = [
            'id', 'center', 'athlete', 'creado_por', 'nombre', 'objetivo', 'grupo',
            'descripcion', 'fecha_inicio', 'fecha_fin', 'created_at',
            'total_mesociclos', 'total_microciclos',
        ]
        read_only_fields = ['id', 'created_at', 'creado_por']

    def get_total_mesociclos(self, obj):
        return obj.mesociclos.count()

    def get_total_microciclos(self, obj):
        return Microcycle.objects.filter(mesociclo__plan=obj).count()


class TrainingPlanDetailSerializer(TrainingPlanSerializer):
    """Árbol completo del macrociclo: fases con sus semanas anidadas."""

    mesociclos = MesocycleSerializer(many=True, read_only=True)

    class Meta(TrainingPlanSerializer.Meta):
        fields = TrainingPlanSerializer.Meta.fields + ['mesociclos']


class PsychAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PsychAssessment
        fields = [
            'id', 'center', 'athlete', 'registrado_por', 'fecha',
            'tipo', 'instrument', 'subescalas', 'resultados', 'puntuacion',
            'notas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'registrado_por']


class WellnessCheckinSerializer(serializers.ModelSerializer):
    estado = serializers.SerializerMethodField()

    class Meta:
        model = WellnessCheckin
        fields = [
            'id', 'center', 'athlete', 'registrado_por', 'fecha',
            'sueno', 'fatiga', 'estres', 'dolor_muscular', 'animo',
            'indice_bienestar', 'estado', 'notas', 'created_at',
        ]
        # El índice lo calcula el servidor (model.save); el cliente no lo fija.
        read_only_fields = ['id', 'created_at', 'registrado_por', 'indice_bienestar']

    def get_estado(self, obj):
        from .wellness import estado
        return estado(obj.indice_bienestar)


# ─── Simulador (pizarra táctica) ──────────────────────────────────────────────

FICHA_TIPOS = {'jugador', 'rival', 'balon'}
TRAZO_TIPOS = {'pase', 'conduccion', 'mov_sin_balon', 'bloqueo'}


def _is_norm(v):
    """True si v es un número dentro de [0, 1] (coordenada normalizada)."""
    return isinstance(v, (int, float)) and not isinstance(v, bool) and 0.0 <= float(v) <= 1.0


def _validate_punto(p):
    if not isinstance(p, dict) or not _is_norm(p.get('x')) or not _is_norm(p.get('y')):
        raise serializers.ValidationError(
            'Cada punto debe tener x,y normalizados (0..1). No se admiten píxeles.'
        )


def _validate_escena(value):
    """Valida la estructura de la escena y, sobre todo, que TODAS las coordenadas
    estén normalizadas (0..1). Acepta {} (escena vacía)."""
    if value in (None, {}):
        return {'version': 1, 'frames': []}
    if not isinstance(value, dict):
        raise serializers.ValidationError('La escena debe ser un objeto.')
    frames = value.get('frames', [])
    if not isinstance(frames, list):
        raise serializers.ValidationError('`frames` debe ser una lista.')
    for frame in frames:
        if not isinstance(frame, dict):
            raise serializers.ValidationError('Cada frame debe ser un objeto.')
        fichas = frame.get('fichas', [])
        trazos = frame.get('trazos', [])
        if not isinstance(fichas, list) or not isinstance(trazos, list):
            raise serializers.ValidationError('`fichas` y `trazos` deben ser listas.')
        for f in fichas:
            if not isinstance(f, dict):
                raise serializers.ValidationError('Cada ficha debe ser un objeto.')
            if f.get('tipo') not in FICHA_TIPOS:
                raise serializers.ValidationError(f'Tipo de ficha inválido: {f.get("tipo")!r}.')
            _validate_punto(f)
        for t in trazos:
            if not isinstance(t, dict):
                raise serializers.ValidationError('Cada trazo debe ser un objeto.')
            if t.get('tipo') not in TRAZO_TIPOS:
                raise serializers.ValidationError(f'Tipo de trazo inválido: {t.get("tipo")!r}.')
            puntos = t.get('puntos')
            if not isinstance(puntos, list) or len(puntos) < 2:
                raise serializers.ValidationError('Un trazo necesita al menos 2 puntos.')
            for p in puntos:
                _validate_punto(p)
    # Normaliza la versión por si el cliente no la manda.
    value.setdefault('version', 1)
    return value


class TacticalPlaySerializer(serializers.ModelSerializer):
    registrado_por_nombre = serializers.CharField(
        source='registrado_por.nombre', read_only=True, default='',
    )

    class Meta:
        model = TacticalPlay
        fields = [
            'id', 'center', 'nombre', 'descripcion', 'formacion', 'campo',
            'escena', 'registrado_por', 'registrado_por_nombre',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'center', 'registrado_por', 'registrado_por_nombre',
            'created_at', 'updated_at',
        ]

    def validate_escena(self, value):
        return _validate_escena(value)
