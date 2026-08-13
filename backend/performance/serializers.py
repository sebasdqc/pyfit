"""Serializers del panel Zyfit Performance."""

from rest_framework import serializers

from pyfit.text_validators import contains_unsafe_chars
from .models import (
    SportsCenter, CenterMembership, CenterAthlete,
    PerformanceMetric, InjuryReport, PhysicalTest, TrainingPlan, PsychAssessment,
    TestDefinition, Mesocycle, Microcycle, WellnessCheckin, TacticalPlay,
    CalendarEvent, PlannedSession,
    PerformanceOnboarding, NECESIDAD_CHOICES, NECESIDAD_IDS,
)


class SportsCenterSerializer(serializers.ModelSerializer):
    total_atletas = serializers.SerializerMethodField()
    total_staff = serializers.SerializerMethodField()

    class Meta:
        model = SportsCenter
        fields = [
            'id', 'nombre', 'slug', 'tipo', 'ciudad', 'pais', 'disciplina',
            'director_principal', 'activo', 'created_at',
            'total_atletas', 'total_staff',
        ]
        read_only_fields = ['id', 'created_at']

    def get_total_atletas(self, obj):
        return obj.atletas.count()

    def get_total_staff(self, obj):
        return obj.memberships.filter(activo=True).count()


def _display_name(user):
    """Nombre visible de una cuenta: nombre completo, first_name o parte local
    del email. No depende de un Profile (que puede no existir)."""
    if user is None:
        return ''
    full = (user.get_full_name() or '').strip()
    return full or user.first_name or user.email.split('@')[0]


class CenterMembershipSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = CenterMembership
        fields = [
            'id', 'center', 'user', 'email', 'nombre', 'rol', 'modulos', 'activo', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'email', 'nombre']

    def get_nombre(self, obj):
        return _display_name(obj.user)


def _store_athlete_foto(instance, data_url):
    """Aplica el cambio de foto de un CenterAthlete.

    - '' (vacío)  → quita la foto (de Spaces y del campo legado).
    - data URL    → si DO Spaces está configurado (settings.USE_SPACES) y es base64,
                    lo decodifica y lo SUBE a Spaces (`foto_img`), dejando `foto`
                    vacío. Si no, cae al comportamiento actual: guarda el data URL
                    como base64 en `foto` (sin necesidad de infraestructura).
    """
    from django.conf import settings

    # Quitar la foto
    if not data_url:
        if instance.foto_img:
            instance.foto_img.delete(save=False)
        instance.foto = ''
        instance.save(update_fields=['foto', 'foto_img'])
        return

    # Subir a Spaces (si está configurado y el data URL es base64)
    if getattr(settings, 'USE_SPACES', False) and ';base64,' in data_url:
        import base64 as _b64
        import uuid
        from django.core.files.base import ContentFile

        header, b64 = data_url.split(';base64,', 1)
        ext = header.rsplit('/', 1)[-1].split('+')[0].lower() or 'jpg'
        if ext == 'jpeg':
            ext = 'jpg'
        try:
            content = ContentFile(_b64.b64decode(b64))
        except Exception:
            content = None
        if content is not None:
            if instance.foto_img:
                instance.foto_img.delete(save=False)
            instance.foto_img.save(f'{uuid.uuid4().hex}.{ext}', content, save=False)
            instance.foto = ''  # limpia el base64 legado si lo hubiera
            instance.save(update_fields=['foto', 'foto_img'])
            return

    # Fallback (sin Spaces): comportamiento actual — base64 en la BD.
    if instance.foto_img:
        instance.foto_img.delete(save=False)
    instance.foto = data_url
    instance.save(update_fields=['foto', 'foto_img'])


class CenterAthleteSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='athlete.email', read_only=True)
    nombre = serializers.SerializerMethodField()
    # ¿La cuenta del atleta está reclamada (puede iniciar sesión)? Los atletas se
    # dan de alta sin contraseña usable (la reclaman en la app de consumo); este
    # flag deja ver en el panel quién ya activó su cuenta y quién sigue pendiente.
    cuenta_activa = serializers.SerializerMethodField()
    # `foto`: en lectura devuelve la URL del objeto en Spaces (o el base64 legado
    # de filas antiguas); en escritura acepta un data URL (se sube a Spaces) o ''
    # para quitarla. Se enruta en create/update; nunca se escribe directo al modelo.
    foto = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = CenterAthlete
        fields = [
            'id', 'center', 'athlete', 'email', 'nombre', 'cuenta_activa', 'registrado_por',
            'dorsal', 'posicion', 'grupo', 'estado', 'foto', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'email', 'nombre', 'cuenta_activa', 'registrado_por']

    def get_nombre(self, obj):
        return _display_name(obj.athlete)

    def validate_posicion(self, value):
        if value and contains_unsafe_chars(value):
            raise serializers.ValidationError('Ese campo no puede contener los caracteres { } < > \\ `.')
        return value

    def validate_grupo(self, value):
        if value and contains_unsafe_chars(value):
            raise serializers.ValidationError('Ese campo no puede contener los caracteres { } < > \\ `.')
        return value

    def get_cuenta_activa(self, obj):
        u = obj.athlete
        return bool(u and u.is_active and u.has_usable_password())

    # La foto llega como data URL (base64) ya reescalada en el cliente (~256 px).
    # Acotamos tamaño y forma antes de subirla/guardarla.
    MAX_FOTO_BYTES = 700 * 1024  # ~512 KB de imagen → margen holgado en base64

    def validate_foto(self, value):
        if not value:
            return value
        if not value.startswith('data:image/'):
            raise serializers.ValidationError('La foto debe ser un data URL de imagen.')
        if len(value) > self.MAX_FOTO_BYTES:
            raise serializers.ValidationError('La foto es demasiado grande.')

        # Decodificar y validar magic bytes (mismo patrón que upload_avatar).
        import base64
        from io import BytesIO
        from PIL import Image

        try:
            _, b64part = value.split(',', 1)
            raw_bytes = base64.b64decode(b64part)
        except Exception:
            raise serializers.ValidationError('El base64 de la foto es inválido.')

        snippet = raw_bytes[:1024].lower()
        if b'<svg' in snippet or b'<?xml' in snippet or b'<!doctype' in snippet:
            raise serializers.ValidationError('Tipo de imagen no permitido.')

        try:
            img = Image.open(BytesIO(raw_bytes))
            img.verify()
            fmt = img.format.lower() if img.format else ''
        except Exception:
            raise serializers.ValidationError('El archivo no es una imagen válida.')

        if fmt not in ('jpeg', 'png', 'gif', 'webp'):
            raise serializers.ValidationError('Solo se admiten JPEG, PNG, GIF o WebP.')

        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Lectura: prioriza la URL del objeto en Spaces; si no, el base64 legado.
        if instance.foto_img:
            try:
                data['foto'] = instance.foto_img.url
            except Exception:
                data['foto'] = ''
        else:
            data['foto'] = instance.foto or ''
        return data

    def create(self, validated_data):
        foto = validated_data.pop('foto', None)
        instance = super().create(validated_data)
        if foto is not None:
            _store_athlete_foto(instance, foto)
        return instance

    def update(self, instance, validated_data):
        foto = validated_data.pop('foto', None)
        instance = super().update(instance, validated_data)
        if foto is not None:
            _store_athlete_foto(instance, foto)
        return instance


class PerformanceMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceMetric
        fields = [
            'id', 'center', 'athlete', 'registrado_por', 'fecha',
            'tipo', 'metrica', 'valor', 'unidad', 'notas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'registrado_por']


class InjuryReportSerializer(serializers.ModelSerializer):
    # Días de baja transcurridos desde la fecha de la lesión (0 si ya tiene alta).
    dias_baja = serializers.SerializerMethodField()

    class Meta:
        model = InjuryReport
        fields = [
            'id', 'center', 'athlete', 'registrado_por', 'fecha',
            'zona', 'tipo', 'diagnostico', 'mecanismo', 'severidad', 'estado',
            'tratamiento', 'fecha_alta_estimada', 'vista', 'zona_x', 'zona_y',
            'dias_baja', 'notas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'registrado_por', 'dias_baja']

    def get_dias_baja(self, obj):
        if obj.estado == 'alta' or not obj.fecha:
            return 0
        from datetime import date
        return max(0, (date.today() - obj.fecha).days)


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


class PlannedSessionSerializer(serializers.ModelSerializer):
    """Sesión de un día del microciclo. `fecha` la deriva la VISTA desde
    `microciclo.fecha_inicio + dia_semana` (no hay campo editable directo);
    `origen`/`respuesta_ia`/`tokens_*`/`generacion_ms` los escribe el generador
    de IA sobre la instancia, no llegan por PATCH de un formulario manual."""

    evento_titulo = serializers.SerializerMethodField()
    evento_tipo = serializers.SerializerMethodField()

    class Meta:
        model = PlannedSession
        fields = [
            'id', 'microciclo', 'dia_semana', 'fecha', 'orden', 'tipo', 'nombre',
            'duracion_min', 'rpe_objetivo', 'carga_objetivo_ua', 'evento',
            'evento_titulo', 'evento_tipo', 'origen', 'contenido', 'respuesta_ia',
            'generacion_ms', 'tokens_in', 'tokens_out',
            'estado', 'notas', 'creado_por', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'microciclo', 'fecha', 'origen', 'respuesta_ia',
            'generacion_ms', 'tokens_in', 'tokens_out', 'creado_por',
            'created_at', 'updated_at',
        ]

    def get_evento_titulo(self, obj):
        return obj.evento.titulo if obj.evento_id else None

    def get_evento_tipo(self, obj):
        return obj.evento.tipo if obj.evento_id else None


class MicrocycleSerializer(serializers.ModelSerializer):
    sesiones = PlannedSessionSerializer(many=True, read_only=True)

    class Meta:
        model = Microcycle
        fields = [
            'id', 'mesociclo', 'orden', 'fecha_inicio', 'nombre', 'tipo',
            'carga_relativa', 'volumen', 'intensidad', 'notas', 'created_at',
            'sesiones',
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


class CalendarEventSerializer(serializers.ModelSerializer):
    """Evento del calendario del centro. El nombre del autor se resuelve con el
    mismo helper que el resto del panel (no depende de un Profile)."""

    registrado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'center', 'tipo', 'titulo', 'descripcion',
            'fecha_inicio', 'fecha_fin', 'hora_inicio', 'todo_el_dia',
            'ubicacion', 'grupo', 'rival', 'localia',
            'registrado_por', 'registrado_por_nombre', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'center', 'registrado_por', 'registrado_por_nombre',
            'created_at', 'updated_at',
        ]

    def get_registrado_por_nombre(self, obj):
        return _display_name(obj.registrado_por)

    def validate(self, attrs):
        # fecha_fin (si viene) no puede ser anterior a fecha_inicio.
        inicio = attrs.get('fecha_inicio') or getattr(self.instance, 'fecha_inicio', None)
        fin = attrs.get('fecha_fin', getattr(self.instance, 'fecha_fin', None))
        if fin and inicio and fin < inicio:
            raise serializers.ValidationError(
                {'fecha_fin': 'La fecha de fin no puede ser anterior a la de inicio.'}
            )
        return attrs


class PerformanceOnboardingSerializer(serializers.ModelSerializer):
    """Wizard de primer inicio de sesión del panel.

    Todos los campos son opcionales a nivel de serializer porque el guardado es
    progresivo (un PATCH por paso). Lo que exige que el wizard esté realmente
    contestado es `_ONBOARDING_REQUERIDOS` en la vista, al marcar `completado`.
    """

    class Meta:
        model = PerformanceOnboarding
        fields = [
            'segmento', 'pais', 'cargo', 'cargo_otro', 'disciplina', 'disciplina_otro',
            'tamano_plantel', 'necesidades', 'canal', 'canal_otro',
            'completado', 'completado_at', 'updated_at',
        ]
        read_only_fields = ['completado', 'completado_at', 'updated_at']

    def validate_pais(self, value):
        # ISO 3166-1 alfa-2 en mayúsculas; vacío es válido (paso sin contestar).
        value = (value or '').strip().upper()
        if value and (len(value) != 2 or not value.isalpha()):
            raise serializers.ValidationError('Código de país inválido.')
        return value

    def validate_necesidades(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Debe ser una lista.')
        desconocidas = [v for v in value if v not in NECESIDAD_IDS]
        if desconocidas:
            raise serializers.ValidationError(f'Opciones desconocidas: {", ".join(map(str, desconocidas))}.')
        # Sin duplicados y en el orden canónico del catálogo, para que el dato
        # quede comparable entre cuentas sin depender del orden de clic.
        return [c[0] for c in NECESIDAD_CHOICES if c[0] in set(value)]

    def _validate_texto_libre(self, value, etiqueta):
        value = (value or '').strip()
        if value and contains_unsafe_chars(value):
            raise serializers.ValidationError(f'{etiqueta} contiene caracteres no permitidos.')
        return value

    def validate_cargo_otro(self, value):
        return self._validate_texto_libre(value, 'El cargo')

    def validate_disciplina_otro(self, value):
        return self._validate_texto_libre(value, 'La disciplina')

    def validate_canal_otro(self, value):
        return self._validate_texto_libre(value, 'La respuesta')
