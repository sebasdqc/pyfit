from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from devices.fields import EncryptedTextField


class Exercise(models.Model):
    PATRON_CHOICES = [
        ('empuje_horizontal', 'Empuje horizontal'),
        ('empuje_vertical', 'Empuje vertical'),
        ('jalon_horizontal', 'Jalón horizontal'),
        ('jalon_vertical', 'Jalón vertical'),
        ('sentadilla', 'Sentadilla/Cuádriceps'),
        ('bisagra', 'Bisagra/Cadena posterior'),
        ('core_antiextension', 'Core — antiextensión'),
        ('core_antirrotacion', 'Core — antirrotación'),
        ('core_antiflexion', 'Core — antiflexión lateral'),
        ('cargada', 'Cargada/Movimiento olímpico'),
        ('locomocion', 'Locomoción/Transporte de carga'),
        ('aislamiento', 'Aislamiento muscular'),
    ]
    DIFICULTAD_CHOICES = [
        ('principiante', 'Principiante'),
        ('intermedio', 'Intermedio'),
        ('avanzado', 'Avanzado'),
    ]
    SPACE_CHOICES = [
        ('minimo', 'Mínimo (≈1 m²)'),
        ('medio', 'Medio (2–4 m²)'),
        ('amplio', 'Amplio (>4 m²)'),
    ]
    nombre = models.CharField(max_length=200, unique=True)
    patron_movimiento = models.CharField(max_length=30, choices=PATRON_CHOICES)
    musculos_primarios = models.JSONField(default=list)
    musculos_secundarios = models.JSONField(default=list)
    equipamiento = models.JSONField(default=list)
    dificultad = models.CharField(max_length=20, choices=DIFICULTAD_CHOICES, default='intermedio')
    contraindicaciones = models.JSONField(default=list)
    bilateral = models.BooleanField(default=True)
    es_compuesto = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)
    gif_url = models.CharField(max_length=500, blank=True, default='')
    imagen_url = models.CharField(max_length=500, blank=True, default='')
    # Enriched fields from the new normalized catalog
    technical_level = models.SmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    error_risk = models.SmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    space_required = models.CharField(max_length=10, choices=SPACE_CHOICES, null=True, blank=True)
    systemic_fatigue = models.SmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    set_duration_seconds = models.SmallIntegerField(null=True, blank=True)
    rest_seconds_default = models.SmallIntegerField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    coaching_cues = models.JSONField(default=list)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='exercises_created',
    )

    class Meta:
        db_table = 'exercises'
        ordering = ['patron_movimiento', 'nombre']

    def __str__(self):
        return self.nombre


# ─── Normalized exercise catalog ──────────────────────────────────────────────

class MuscleGroup(models.Model):
    name = models.CharField(max_length=100, unique=True)
    anatomical_group = models.CharField(max_length=50)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'muscle_groups'
        ordering = ['anatomical_group', 'name']

    def __str__(self):
        return self.name


class EquipmentItem(models.Model):
    CATEGORY_CHOICES = [
        ('Libre', 'Libre'),
        ('Máquina', 'Máquina'),
        ('Cable', 'Cable'),
        ('Accesorio', 'Accesorio'),
        ('Ninguno', 'Ninguno'),
    ]
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    is_gym_only = models.BooleanField(default=False)

    class Meta:
        db_table = 'equipment_items'
        ordering = ['category', 'name']

    def __str__(self):
        return self.name


class ContraindicationCategory(models.Model):
    SEVERITY_CHOICES = [('leve', 'Leve'), ('grave', 'Grave')]
    name = models.CharField(max_length=100, unique=True)
    body_zone = models.CharField(max_length=50)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    description = models.TextField()

    class Meta:
        db_table = 'contraindication_categories'
        ordering = ['body_zone', 'severity', 'name']

    def __str__(self):
        return f'{self.name} ({self.severity})'


class ExerciseMuscle(models.Model):
    ROLE_CHOICES = [
        ('primario', 'Primario'),
        ('secundario', 'Secundario'),
        ('estabilizador', 'Estabilizador'),
    ]
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name='muscles')
    muscle = models.ForeignKey(MuscleGroup, on_delete=models.RESTRICT, related_name='exercise_links')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    class Meta:
        db_table = 'exercise_muscles'
        unique_together = [['exercise', 'muscle']]

    def __str__(self):
        return f'{self.exercise.nombre} — {self.muscle.name} ({self.role})'


class ExerciseEquipment(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name='equipment_links')
    equipment = models.ForeignKey(EquipmentItem, on_delete=models.RESTRICT, related_name='exercise_links')
    is_required = models.BooleanField(default=True)

    class Meta:
        db_table = 'exercise_equipment'
        unique_together = [['exercise', 'equipment']]

    def __str__(self):
        req = 'requerido' if self.is_required else 'opcional'
        return f'{self.exercise.nombre} — {self.equipment.name} ({req})'


class ExerciseContraindication(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name='contraindication_links')
    contraindication = models.ForeignKey(ContraindicationCategory, on_delete=models.RESTRICT, related_name='exercise_links')
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'exercise_contraindications'
        unique_together = [['exercise', 'contraindication']]

    def __str__(self):
        return f'{self.exercise.nombre} — {self.contraindication.name}'


class ExerciseRelationship(models.Model):
    RELATIONSHIP_CHOICES = [
        ('harder', 'Más difícil'),
        ('easier', 'Más fácil'),
        ('unilateral_version', 'Versión unilateral'),
        ('equipment_alternative', 'Alternativa de equipo'),
        ('variant', 'Variante'),
    ]
    source_exercise = models.ForeignKey(
        Exercise, on_delete=models.CASCADE, related_name='relationships_as_source',
    )
    target_exercise = models.ForeignKey(
        Exercise, on_delete=models.CASCADE, related_name='relationships_as_target',
    )
    relationship_type = models.CharField(max_length=30, choices=RELATIONSHIP_CHOICES)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'exercise_relationships'
        unique_together = [['source_exercise', 'target_exercise', 'relationship_type']]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(source_exercise=models.F('target_exercise')),
                name='exercise_no_self_reference',
            )
        ]

    def __str__(self):
        return f'{self.source_exercise.nombre} →[{self.relationship_type}]→ {self.target_exercise.nombre}'


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
    # Origen de la sesión: 'ia' (generada por el motor adaptativo, default y caso
    # histórico) o 'coach' (armada manualmente por el coach del atleta y publicada).
    # El atleta la ejecuta igual sea cual sea el origen.
    ORIGEN_IA = 'ia'
    ORIGEN_COACH = 'coach'
    ORIGEN_CHOICES = [(ORIGEN_IA, 'IA'), (ORIGEN_COACH, 'Coach')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    origen = models.CharField(max_length=10, choices=ORIGEN_CHOICES, default=ORIGEN_IA, db_index=True)
    # Coach que la armó (solo cuando origen='coach'); null para sesiones de IA.
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sesiones_creadas',
    )
    checkin = models.ForeignKey('checkins.DailyCheckin', on_delete=models.SET_NULL, null=True, blank=True)
    location = models.ForeignKey('users.UserLocation', on_delete=models.SET_NULL, null=True, blank=True)
    fecha = models.DateField()
    duracion_planificada = models.IntegerField()
    rpe_target = models.DecimalField(max_digits=3, decimal_places=1)
    volumen_relativo = models.CharField(max_length=10, choices=VOLUMEN_CHOICES, blank=True)
    # Encriptado: el prompt incluye el contexto médico completo del usuario
    # (lesiones, condiciones médicas, dolor del día) — ver devices.fields.
    # EncryptedTextField. Es el campo con más copias de ese dato (una fila por
    # sesión generada), por eso es el primero en cifrarse.
    prompt_usado = EncryptedTextField(blank=True)
    respuesta_ia = models.JSONField(null=True, blank=True)
    decisiones = models.JSONField(null=True, blank=True)  # [{"icon": "...", "text": "..."}]
    evidencia = models.JSONField(null=True, blank=True)   # {"text": "...", "reference": "..."}
    logro = models.JSONField(null=True, blank=True)       # {"icon": "...", "titulo": "...", "descripcion": "..."}
    sustituciones = models.JSONField(null=True, blank=True)  # [{original, elegido, motivo, fase}]
    inicio_real = models.DateTimeField(null=True, blank=True)
    # Momento en que el atleta terminó TODOS los ejercicios (llegó a la pantalla
    # final de "ejecutar"). Distingue "sesión a medias" de "solo falta el feedback":
    # con fin_ejercicios y sin feedback, el dashboard manda directo a feedback en
    # vez de reabrir la ejecución desde cero.
    fin_ejercicios = models.DateTimeField(null=True, blank=True)
    # Observabilidad del motor adaptativo (poblados en generate_session):
    generacion_ms = models.IntegerField(null=True, blank=True)   # duración server-side de la generación (ms)
    tokens_in     = models.IntegerField(null=True, blank=True)   # prompt_tokens del LLM
    tokens_out    = models.IntegerField(null=True, blank=True)   # completion_tokens del LLM
    uso_fallback  = models.BooleanField(default=False)           # True si cayó al pool legacy (motor degradado)
    # La generación con IA corre en un task de Celery (ver ai_workout.tasks.
    # generate_session_task): la vista crea esta Session como placeholder
    # (respuesta_ia=None) y el task la completa in place. Si Groq falla, el task
    # no puede devolver un error HTTP directo (el cliente ya recibió 202), así
    # que lo deja acá para que /api/sessions/today/ lo reporte al polling.
    generacion_error = models.TextField(blank=True, default='')
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
    series_log = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'session_exercises'
        ordering = ['orden']


class SessionFeedback(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name='feedback')
    rpe_real = models.DecimalField(
        max_digits=3, decimal_places=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )
    cumplimiento = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    notas = models.TextField(blank=True, null=True)
    molestias = models.JSONField(default=list, blank=True)   # FBK-1: zonas con molestia post-sesión
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'session_feedback'


class DailyCoachInsight(models.Model):
    MODO_CHOICES = [
        ('empty',    'Sin sesiones'),
        ('first',    'Primera sesión'),
        ('building', 'Construcción (2-6 sesiones)'),
        ('full',     'Completo (7+ sesiones)'),
    ]

    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coach_insights')
    fecha      = models.DateField()
    texto      = models.TextField()                                          # mensaje
    modo       = models.CharField(max_length=20, choices=MODO_CHOICES, default='full')
    fragmento  = models.TextField(blank=True, default='')                   # palabra/frase a destacar
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_coach_insights'
        unique_together = [['user', 'fecha']]

    def __str__(self):
        return f'{self.user} - {self.fecha} [{self.modo}]'

    def to_payload(self) -> dict:
        return {'modo': self.modo, 'mensaje': self.texto, 'fragmento': self.fragmento}


class DailySaludo(models.Model):
    """Saludo del dashboard generado por IA, cacheado por usuario × día.
    Evita una llamada Groq síncrona en cada carga/refoco del dashboard.
    Se invalida al generar una sesión o registrar feedback (cambia racha/última sesión)."""
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_saludos')
    fecha      = models.DateField()
    saludo     = models.TextField()
    insight    = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_saludos'
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


class TrainingCycle(models.Model):
    GOAL_CHOICES = [
        ('hipertrofia', 'Hipertrofia'),
        ('fuerza', 'Fuerza'),
        ('potencia', 'Potencia'),
        ('salud', 'Salud'),
        ('perdida_grasa', 'Pérdida de grasa'),
    ]
    BLOCK_TYPE_CHOICES = [
        ('acumulacion_hiper',      'Acumulación (hipertrofia)'),
        ('intensificacion_hiper',  'Intensificación (hipertrofia)'),
        ('acumulacion_fuerza',     'Acumulación (fuerza)'),
        ('intensificacion_fuerza', 'Intensificación (fuerza)'),
        ('realizacion_fuerza',     'Realización (fuerza)'),
        ('fuerza_base',            'Fuerza base (potencia)'),
        ('potencia_especifica',    'Potencia específica'),
        ('pico_potencia',          'Pico de potencia'),
        ('salud_general',          'Salud general'),
        ('densidad_alta',          'Densidad alta (pérdida de grasa)'),
        ('preservacion_muscular',  'Preservación muscular'),
        ('transicion',             'Transición'),
        ('deload',                 'Deload'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='training_cycles')
    goal = models.CharField(max_length=20, choices=GOAL_CHOICES)
    block_type = models.CharField(max_length=25, choices=BLOCK_TYPE_CHOICES)
    week_number = models.PositiveSmallIntegerField(default=1)
    is_deload = models.BooleanField(default=False)
    next_session_is_deload = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    started_at = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'training_cycles'
        indexes = [models.Index(fields=['user', 'is_active'])]
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(is_active=True),
                name='unique_active_training_cycle_per_user',
            )
        ]

    def __str__(self):
        return f'{self.user} — {self.goal}/{self.block_type} semana {self.week_number}'


class DeloadTrigger(models.Model):
    TRIGGER_TYPE_CHOICES = [
        ('programmatic_week4',     'Deload programático (semana 4)'),
        ('rpe_elevated',           'RPE elevado'),
        ('doms_persistent',        'DOMS persistente'),
        ('load_drop',              'Caída de carga'),
        ('sleep_deficit',          'Déficit de sueño'),
        ('strength_plateau_peak',  'Plateau de fuerza en bloque pico'),
        ('adherence_drop',         'Caída de adherencia'),
        ('caloric_deficit_fatigue','Fatiga por déficit calórico severo'),
    ]
    ACTION_CHOICES = [
        ('deload_applied',  'Deload aplicado'),
        ('days_reduced',    'Días reducidos'),
        ('ignored_by_user', 'Ignorado por el usuario'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='deload_triggers')
    training_cycle = models.ForeignKey(
        TrainingCycle, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='deload_triggers',
    )
    trigger_type = models.CharField(max_length=30, choices=TRIGGER_TYPE_CHOICES)
    action_taken = models.CharField(max_length=20, choices=ACTION_CHOICES, blank=True)
    details = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'deload_triggers'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} — {self.trigger_type}'


class CalendarEvent(models.Model):
    TIPO_CHOICES = [
        ('competicion', 'Competición'),
        ('descanso', 'Descanso'),
        ('otro', 'Otro'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='calendar_events')
    fecha = models.DateField()
    titulo = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='otro')
    notas = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'calendar_events'
        ordering = ['fecha', 'created_at']
        indexes = [models.Index(fields=['user', 'fecha'])]

    def __str__(self):
        return f'{self.user} - {self.titulo} ({self.fecha})'


class SessionPhoto(models.Model):
    """Foto adjunta a UNA sesión (de fuerza `Session` O de running `runs.RunSession`).

    Si USE_SPACES está activo (ver pyfit.media_storage), el archivo se sube a DO
    Spaces y `image_key` guarda su key (`image_data` queda vacío). Si no, se
    preserva el comportamiento histórico: la imagen como data URI base64
    directamente en la BD (evita depender de object storage de pago). `user` se
    guarda para autorizar/listar sin joins."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name='session_photos')
    session = models.ForeignKey('workouts.Session', on_delete=models.CASCADE,
                                null=True, blank=True, related_name='photos')
    run_session = models.ForeignKey('runs.RunSession', on_delete=models.CASCADE,
                                    null=True, blank=True, related_name='photos')
    # data URI base64 (`data:image/jpeg;base64,...`), solo cuando NO se usa Spaces.
    # El móvil comprime antes de subir; la validación de mime/tamaño/SVG se hace
    # en photo_service (Pillow opcional).
    image_data = models.TextField(blank=True, default='')
    # Key del objeto en DO Spaces cuando USE_SPACES está activo. Vacío = la
    # imagen vive en `image_data` (legacy o Spaces sin configurar).
    image_key = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'session_photos'
        ordering = ['created_at']
        indexes = [models.Index(fields=['user', '-created_at'])]
        constraints = [
            # Exactamente una de las dos FKs (gym XOR running).
            models.CheckConstraint(
                condition=(
                    (models.Q(session__isnull=False) & models.Q(run_session__isnull=True))
                    | (models.Q(session__isnull=True) & models.Q(run_session__isnull=False))
                ),
                name='session_photo_exactly_one_owner',
            ),
        ]

    def __str__(self):
        owner = self.session_id or f'run:{self.run_session_id}'
        return f'SessionPhoto<{owner}>'


class DailyGenerationCount(models.Model):
    """Contador de generaciones de sesión con IA por usuario y DÍA (fecha local del
    dispositivo). Necesario porque las sesiones del día sin ejecutar se reemplazan
    (GEN-2), así que contar `Session` no refleja cuántas veces se generó. Resetea por
    calendario (una fila por fecha)."""
    DEFAULT_LIMIT = 5

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name='daily_generation_counts')
    fecha = models.DateField()
    count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'daily_generation_counts'
        unique_together = [('user', 'fecha')]
        indexes = [models.Index(fields=['user', 'fecha'])]

    @classmethod
    def reached_limit(cls, user, fecha, limit=None) -> bool:
        limit = limit or cls.DEFAULT_LIMIT
        obj = cls.objects.filter(user=user, fecha=fecha).first()
        return bool(obj and obj.count >= limit)

    @classmethod
    def record(cls, user, fecha):
        """Suma 1 de forma atómica (la fila se crea si no existe)."""
        cls.objects.get_or_create(user=user, fecha=fecha)
        cls.objects.filter(user=user, fecha=fecha).update(count=models.F('count') + 1)

    def __str__(self):
        return f'{self.user} {self.fecha}: {self.count}'
