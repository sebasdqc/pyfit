from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile, UserLocation, UserInjury

User = get_user_model()


class UserInjurySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserInjury
        fields = ['id', 'zona', 'severidad', 'descripcion', 'activa', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'password']

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
            'id', 'email', 'nombre', 'objetivo', 'objetivos_multiples', 'nivel', 'nivel_label',
            'lesiones', 'experiencia_deportiva', 'estilo_entrenamiento',
            'fecha_nacimiento', 'edad', 'peso', 'altura', 'sexo',
            'dias_semana', 'horario_preferido', 'nivel_estres', 'tipo_trabajo',
            'ejercicios_favoritos', 'ejercicios_evitar',
            'rm_sentadilla', 'rm_peso_muerto', 'rm_press_banca', 'rm_press_hombro',
            'usa_ciclo_menstrual', 'racha_actual', 'mejor_racha', 'puntos_totales', 'logros',
            'created_at', 'locations',
        ]
        read_only_fields = ['id', 'email', 'edad', 'nivel_label', 'racha_actual', 'mejor_racha', 'puntos_totales', 'logros', 'created_at', 'locations']
