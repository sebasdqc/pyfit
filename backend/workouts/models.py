from django.db import models
from django.conf import settings


class Exercise(models.Model):
    PATRON_CHOICES = [
        ('empuje_horizontal', 'Empuje horizontal'),
        ('empuje_vertical', 'Empuje vertical'),
        ('jale_horizontal', 'Jale horizontal'),
        ('jale_vertical', 'Jale vertical'),
        ('sentadilla', 'Sentadilla/Cuádriceps'),
        ('bisagra', 'Bisagra/Cadena posterior'),
        ('core', 'Core'),
        ('cardio', 'Cardio/Metabólico'),
        ('movilidad', 'Movilidad/Flexibilidad'),
    ]
    DIFICULTAD_CHOICES = [
        ('principiante', 'Principiante'),
        ('intermedio', 'Intermedio'),
        ('avanzado', 'Avanzado'),
    ]
    nombre = models.CharField(max_length=200, unique=True)
    patron_movimiento = models.CharField(max_length=30, choices=PATRON_CHOICES)
    musculos_primarios = models.JSONField(default=list)
    musculos_secundarios = models.JSONField(default=list)
    equipamiento = models.JSONField(default=list)  # matches mobile implementos values exactly
    dificultad = models.CharField(max_length=20, choices=DIFICULTAD_CHOICES, default='intermedio')
    contraindicaciones = models.JSONField(default=list)  # body zone strings: 'rodilla','lumbar','hombro','cuello','cadera','tobillo','muñeca','codo'
    bilateral = models.BooleanField(default=True)
    es_compuesto = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)
    gif_url = models.CharField(max_length=500, blank=True, default='')
    imagen_url = models.CharField(max_length=500, blank=True, default='')

    class Meta:
        db_table = 'exercises'
        ordering = ['patron_movimiento', 'nombre']

    def __str__(self):
        return self.nombre


class UserExerciseProfile(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exercise_profiles')
    exercise_nombre = models.CharField(max_length=200)
    patron_movimiento = models.CharField(max_length=30, blank=True)
    veces_realizado = models.IntegerField(default=0)
    rpe_promedio_real = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    rpe_promedio_target = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    cumplimiento_promedio = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rating_promedio = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    ultima_vez = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'user_exercise_profiles'
        unique_together = [['user', 'exercise_nombre']]
        indexes = [
            models.Index(fields=['user', '-veces_realizado']),
        ]

    def __str__(self):
        return f'{self.user} - {self.exercise_nombre}'


class UserAdaptationProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='adaptation_profile')
    total_sesiones = models.IntegerField(default=0)
    rpe_bias = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)  # avg(rpe_real - rpe_target)
    cumplimiento_promedio = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rating_promedio = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    volumen_tolerado_semana = models.IntegerField(null=True, blank=True)  # sessions/week where cumplimiento >= 80%
    patron_preferido = models.CharField(max_length=30, blank=True)
    semanas_carga_consecutivas = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_adaptation_profiles'

    def __str__(self):
        return f'Adaptation profile — {self.user}'


class Session(models.Model):
    VOLUMEN_CHOICES = [('bajo', 'Bajo'), ('medio', 'Medio'), ('alto', 'Alto')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    checkin = models.ForeignKey('checkins.DailyCheckin', on_delete=models.SET_NULL, null=True, blank=True)
    location = models.ForeignKey('users.UserLocation', on_delete=models.SET_NULL, null=True, blank=True)
    fecha = models.DateField()
    duracion_planificada = models.IntegerField()
    rpe_target = models.DecimalField(max_digits=3, decimal_places=1)
    volumen_relativo = models.CharField(max_length=10, choices=VOLUMEN_CHOICES, blank=True)
    prompt_usado = models.TextField(blank=True)
    respuesta_ia = models.JSONField(null=True, blank=True)
    decisiones = models.JSONField(null=True, blank=True)  # [{"icon": "...", "text": "..."}]
    evidencia = models.JSONField(null=True, blank=True)   # {"text": "...", "reference": "..."}
    logro = models.JSONField(null=True, blank=True)       # {"icon": "...", "titulo": "...", "descripcion": "..."}
    sustituciones = models.JSONField(null=True, blank=True)  # [{original, elegido, motivo, fase}]
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sessions'
        ordering = ['-fecha', '-created_at']
        indexes = [
            models.Index(fields=['user', '-fecha']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f'{self.user} - {self.fecha}'


class SessionExercise(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='exercises')
    orden = models.IntegerField()
    nombre = models.CharField(max_length=200)
    series = models.IntegerField()
    repeticiones = models.CharField(max_length=50)
    descanso_segundos = models.IntegerField()
    rpe_sugerido = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = 'session_exercises'
        ordering = ['orden']


class SessionFeedback(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name='feedback')
    rpe_real = models.DecimalField(max_digits=3, decimal_places=1)
    cumplimiento = models.IntegerField()
    rating = models.IntegerField()
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'session_feedback'


class DailyCoachInsight(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coach_insights')
    fecha = models.DateField()
    texto = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_coach_insights'
        unique_together = [['user', 'fecha']]

    def __str__(self):
        return f'{self.user} - {self.fecha}'


class TrainingDNA(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='training_dna')
    texto = models.TextField()
    total_sesiones_at_generation = models.IntegerField(default=0)
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'training_dna'

    def __str__(self):
        return f'TrainingDNA — {self.user}'


class Competition(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='competitions')
    nombre = models.CharField(max_length=200)
    fecha = models.DateField()
    tipo = models.CharField(max_length=100, blank=True)
    distancia_disciplina = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'competitions'
        ordering = ['fecha']
