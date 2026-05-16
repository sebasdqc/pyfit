import random
import string
from datetime import timedelta
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    email = models.EmailField(unique=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'


class Profile(models.Model):
    NIVEL_CHOICES = [('principiante', 'Principiante'), ('intermedio', 'Intermedio'), ('avanzado', 'Avanzado')]
    SEXO_CHOICES = [('masculino', 'Masculino'), ('femenino', 'Femenino'), ('otro', 'Otro')]
    ESTRES_CHOICES = [('bajo', 'Bajo'), ('moderado', 'Moderado'), ('alto', 'Alto')]
    TRABAJO_CHOICES = [('sedentario', 'Sedentario'), ('mixto', 'Mixto'), ('activo', 'Activo')]
    HORARIO_CHOICES = [('mañana', 'Mañana'), ('mediodia', 'Mediodía'), ('tarde', 'Tarde'), ('noche', 'Noche')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    nombre = models.CharField(max_length=100)
    objetivo = models.CharField(max_length=200, blank=True)
    objetivos_multiples = models.JSONField(default=list, blank=True)
    nivel = models.CharField(max_length=20, choices=NIVEL_CHOICES, default='principiante')
    lesiones = models.TextField(blank=True)
    experiencia_deportiva = models.TextField(blank=True)
    estilo_entrenamiento = models.CharField(max_length=100, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    peso = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    altura = models.IntegerField(null=True, blank=True)
    sexo = models.CharField(max_length=20, choices=SEXO_CHOICES, blank=True)
    dias_semana = models.IntegerField(default=3)
    horario_preferido = models.CharField(max_length=40, blank=True)
    nivel_estres = models.CharField(max_length=20, choices=ESTRES_CHOICES, blank=True)
    tipo_trabajo = models.CharField(max_length=20, choices=TRABAJO_CHOICES, blank=True)
    ejercicios_favoritos = models.TextField(blank=True)
    ejercicios_evitar = models.TextField(blank=True)
    rm_sentadilla = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    rm_peso_muerto = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    rm_press_banca = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    rm_press_hombro = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    usa_ciclo_menstrual = models.BooleanField(default=False)

    # Onboarding extended fields
    calidad_sueno_habitual = models.CharField(max_length=30, blank=True)
    condiciones_medicas = models.JSONField(default=list, blank=True)
    notas_medicas = models.TextField(blank=True)
    motivo_limitacion = models.TextField(blank=True)
    lugares_entrenamiento = models.JSONField(default=list, blank=True)
    implementos_perfil = models.JSONField(default=list, blank=True)
    duracion_disponible = models.IntegerField(null=True, blank=True)
    duracion_minima = models.IntegerField(null=True, blank=True)
    objetivo_secundario = models.CharField(max_length=200, blank=True)
    horizonte_temporal = models.CharField(max_length=50, blank=True)
    motivacion = models.TextField(blank=True)
    razones_abandono = models.JSONField(default=list, blank=True)
    estilo_coaching = models.CharField(max_length=20, blank=True)
    tipos_entrenamiento = models.JSONField(default=list, blank=True)
    racha_actual = models.IntegerField(default=0)
    mejor_racha = models.IntegerField(default=0)
    puntos_totales = models.IntegerField(default=0)
    logros = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profiles'

    def __str__(self):
        return self.nombre

    @property
    def edad(self):
        if not self.fecha_nacimiento:
            return None
        from datetime import date
        today = date.today()
        b = self.fecha_nacimiento
        return today.year - b.year - ((today.month, today.day) < (b.month, b.day))

    @property
    def nivel_label(self):
        total = self.user.sessions.count()
        if total >= 30:
            return 'Leyenda'
        if total >= 15:
            return 'Élite'
        if total >= 5:
            return 'Atleta'
        return 'Rookie'


class UserLocation(models.Model):
    TIPO_CHOICES = [('gimnasio', 'Gimnasio'), ('casa', 'Casa'), ('exterior', 'Exterior')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='locations')
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    implementos = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_locations'

    def __str__(self):
        return f'{self.nombre} ({self.tipo})'


class MenstrualCycle(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ciclos')
    fecha_inicio = models.DateField()
    duracion_ciclo = models.IntegerField(default=28)

    class Meta:
        db_table = 'menstrual_cycle'


class UserInjury(models.Model):
    ZONA_CHOICES = [
        ('rodilla', 'Rodilla'), ('lumbar', 'Lumbar'), ('hombro', 'Hombro'),
        ('cuello', 'Cuello/Cervical'), ('cadera', 'Cadera'), ('tobillo', 'Tobillo'),
        ('muñeca', 'Muñeca'), ('codo', 'Codo'), ('thoracica', 'Dorsal/Torácica'),
    ]
    SEVERIDAD_CHOICES = [
        ('leve', 'Leve'), ('moderada', 'Moderada'), ('cronica', 'Crónica'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='injuries')
    zona = models.CharField(max_length=20, choices=ZONA_CHOICES)
    severidad = models.CharField(max_length=20, choices=SEVERIDAD_CHOICES)
    descripcion = models.TextField(blank=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_injuries'

    def __str__(self):
        return f'{self.user} - {self.zona} ({self.severidad})'


class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'password_reset_codes'

    def is_valid(self):
        return timezone.now() < self.created_at + timedelta(minutes=15)

    @classmethod
    def generate_for(cls, user):
        cls.objects.filter(user=user).delete()
        code = ''.join(random.choices(string.digits, k=6))
        return cls.objects.create(user=user, code=code)
