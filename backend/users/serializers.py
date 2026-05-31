from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile, UserLocation, UserInjury

User = get_user_model()


class UserInjurySerializer(serializers.ModelSerializer):
    # Accept zone IDs from onboarding (e.g. 'rodilla_izq', 'hombro_der') without
    # tying the API to the legacy ZONA_CHOICES. The same applies to severidad,
    # which may receive 'severa' alongside the historical leve/moderada/cronica.
    zona = serializers.CharField(max_length=20)
    severidad = serializers.CharField(max_length=20)

    class Meta:
        model = UserInjury
        fields = ['id', 'zona', 'severidad', 'descripcion', 'activa', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    # min_length=8 alineado con AUTH_PASSWORD_VALIDATORS (MinimumLengthValidator).
    # create_user() no corre los validators de Django por defecto, así que
    # la validación explícita aquí es la única barrera de la API.
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'password']

    def validate_password(self, value):
        """Corre los AUTH_PASSWORD_VALIDATORS de Django sobre la contraseña."""
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        Profile.objects.create(user=user, nombre=validated_data['email'].split('@')[0])
        return user


class UserLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLocation
        fields = ['id', 'nombre', 'tipo', 'implementos', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    edad = serializers.IntegerField(read_only=True)
    nivel_label = serializers.CharField(read_only=True)
    locations = UserLocationSerializer(source='user.locations', many=True, read_only=True)

    class Meta:
        model = Profile
        fields = [
            'id', 'email', 'nombre', 'objetivo', 'objetivos_multiples', 'nivel', 'nivel_label', 'nivel_experiencia',
            'lesiones', 'experiencia_deportiva', 'estilo_entrenamiento',
            'fecha_nacimiento', 'edad', 'peso', 'altura', 'sexo', 'pais',
            'dias_semana', 'dias_fijos', 'horario_preferido', 'nivel_estres', 'tipo_trabajo',
            'ejercicios_favoritos', 'ejercicios_evitar',
            'rm_sentadilla', 'rm_peso_muerto', 'rm_press_banca', 'rm_press_hombro',
            'usa_ciclo_menstrual', 'racha_actual', 'mejor_racha', 'puntos_totales', 'logros',
            'plan', 'plan_tipo', 'plan_renovacion',
            'goal', 'goal_changed_at', 'previous_goal',
            'created_at', 'locations',
            'avatar',
            # Onboarding extended fields
            'calidad_sueno_habitual', 'condiciones_medicas', 'notas_medicas', 'motivo_limitacion',
            'lugares_entrenamiento', 'implementos_perfil', 'duracion_disponible', 'duracion_minima',
            'objetivo_secundario', 'horizonte_temporal', 'motivacion',
            'razones_abandono', 'estilo_coaching', 'tipos_entrenamiento',
        ]
        # Plan se modifica vía endpoints dedicados de suscripción (próximas iteraciones),
        # nunca por PUT directo al perfil — evita que el cliente se autopromocione.
        read_only_fields = [
            'id', 'email', 'edad', 'nivel_label',
            'racha_actual', 'mejor_racha', 'puntos_totales', 'logros',
            'plan', 'plan_tipo', 'plan_renovacion',
            'goal_changed_at', 'previous_goal',
            'created_at', 'locations',
        ]
