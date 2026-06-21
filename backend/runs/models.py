from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class RunSession(models.Model):
    SESSION_TYPE_CHOICES = [
        ('free', 'Free Run'),
        ('planned', 'Planned Run'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='run_sessions')

    # Metadata
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Tipo — extensible para Planned Run
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='free')

    # FK prepared for future Planned Run module — uncomment when 'plans' app exists
    # plan_session = models.ForeignKey(
    #     'plans.PlanSession',
    #     null=True, blank=True,
    #     on_delete=models.SET_NULL,
    #     related_name='run_sessions'
    # )

    # Métricas agregadas (se calculan al completar la sesión)
    total_distance_m = models.FloatField(default=0)
    total_duration_s = models.IntegerField(default=0)
    avg_pace_s_per_km = models.IntegerField(default=0)
    best_pace_s_per_km = models.IntegerField(default=0)
    calories_burned = models.FloatField(default=0)
    elevation_gain_m = models.FloatField(default=0)
    avg_heart_rate = models.IntegerField(null=True, blank=True)  # preparado para HR monitor

    # ── Feedback post-sesión (paralelo al SessionFeedback de las sesiones de gym) ──
    # Nulos = sesión sin feedback todavía. `feedback_at` marca cuándo se registró.
    rpe_real = models.IntegerField(null=True, blank=True)        # esfuerzo percibido 1-10
    rating = models.IntegerField(null=True, blank=True)          # valoración general 1-5
    cumplimiento = models.IntegerField(null=True, blank=True)    # 0-100
    molestias = models.JSONField(default=list, blank=True)       # zonas con molestia post-sesión
    feedback_notas = models.TextField(null=True, blank=True)
    feedback_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'session_type']),
        ]
        constraints = [
            # ended_at, si existe, nunca puede ser anterior a started_at.
            models.CheckConstraint(
                condition=(
                    models.Q(ended_at__isnull=True)
                    | models.Q(ended_at__gte=models.F('started_at'))
                ),
                name='run_ended_after_started',
            ),
            # Una sesión completada siempre debe tener ended_at.
            models.CheckConstraint(
                condition=(
                    ~models.Q(status='completed')
                    | models.Q(ended_at__isnull=False)
                ),
                name='run_completed_has_ended_at',
            ),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.session_type} — {self.started_at:%Y-%m-%d %H:%M}"


class RunPoint(models.Model):
    session = models.ForeignKey(RunSession, on_delete=models.CASCADE, related_name='points')

    lat = models.FloatField()
    lng = models.FloatField()
    altitude_m = models.FloatField(null=True, blank=True)
    accuracy_m = models.FloatField()           # para filtrar puntos de baja calidad
    timestamp = models.DateTimeField()
    speed_m_s = models.FloatField(null=True, blank=True)  # velocidad instantánea del GPS

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['session', 'timestamp']),
        ]


# ─────────────────────────────────────────────────────────────────────────────
# RUNNING INTELIGENTE — datos del motor (la inteligencia vive en la app ai_running)
# ─────────────────────────────────────────────────────────────────────────────


class RunnerProfile(models.Model):
    """Perfil de corredor: umbral, FC y zonas derivadas. Los 3 escalares
    (threshold_pace, fc_max, fc_reposo) son la fuente; `zonas` es JSON derivado
    (recalculado entero al cambiar el baseline). fc_max/fc_reposo viven aquí —no en
    Profile— para no contaminar el dominio de fuerza; fc_reposo puede sembrarse de
    DeviceIntegration.resting_hr."""
    BASELINE_SOURCE = [
        ('historial',  'Estimado de Free Runs'),
        ('declarado',  'Tiempo de carrera declarado'),
        ('time_trial', 'Time-trial guiado'),
        ('manual',     'Editado a mano'),
        ('cold_start', 'Sin datos — provisional'),
    ]
    CONFIANZA = [('alta', 'Alta'), ('media', 'Media'), ('baja', 'Baja')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='runner_profile')

    # Baseline / umbral (LT2 ≈ ritmo sostenible ~1 h).
    threshold_pace_s_km = models.IntegerField(null=True, blank=True)
    vo2_estimado = models.FloatField(null=True, blank=True)
    fc_max = models.IntegerField(null=True, blank=True,
                                 validators=[MinValueValidator(120), MaxValueValidator(220)])
    fc_reposo = models.IntegerField(null=True, blank=True,
                                    validators=[MinValueValidator(30), MaxValueValidator(110)])
    fc_max_es_estimada = models.BooleanField(default=True)   # True = Tanaka por edad

    volumen_semanal_base_km = models.FloatField(null=True, blank=True)

    # Zonas derivadas: {pace:{Z1..Z5:[lo,hi]}, hr:{...}, metodo_pace, metodo_hr}.
    zonas = models.JSONField(default=dict, blank=True)

    # Trazabilidad del baseline.
    fuente_baseline = models.CharField(max_length=20, choices=BASELINE_SOURCE, default='cold_start')
    confianza = models.CharField(max_length=10, choices=CONFIANZA, default='baja')
    n_runs_baseline = models.IntegerField(default=0)
    fecha_calculo = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'runner_profiles'

    def __str__(self):
        return f"RunnerProfile<{self.user.username}> umbral={self.threshold_pace_s_km}"


class RunningPlan(models.Model):
    """Plan de running activo (mesociclo). Complementa —no reemplaza— a Competition:
    referencia opcionalmente un evento vía `meta_competition`. Su `is_active` es
    INDEPENDIENTE del TrainingCycle de fuerza (un usuario puede tener ambos)."""
    META_TIPO = [
        ('fitness_general', 'Fitness general (sin fecha)'),
        ('5k', '5K'), ('10k', '10K'), ('21k', 'Media maratón'),
        ('42k', 'Maratón'), ('otra', 'Otra distancia'),
    ]
    FASE = [
        ('base', 'Base'), ('build', 'Construcción'), ('peak', 'Pico'),
        ('taper', 'Taper'), ('recovery', 'Recuperación/Transición'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='running_plans')

    # Meta.
    meta_tipo = models.CharField(max_length=20, choices=META_TIPO, default='fitness_general')
    meta_distancia_km = models.FloatField(null=True, blank=True)
    meta_fecha = models.DateField(null=True, blank=True)        # null = modo continuo
    meta_competition = models.ForeignKey('workouts.Competition', on_delete=models.SET_NULL,
                                         null=True, blank=True, related_name='running_plans')

    # Estado de periodización.
    fase_actual = models.CharField(max_length=12, choices=FASE, default='base')
    semana_actual = models.PositiveSmallIntegerField(default=1)
    total_semanas = models.PositiveSmallIntegerField(null=True, blank=True)  # null = continuo
    km_objetivo_semana = models.FloatField(default=0)
    dias_semana = models.PositiveSmallIntegerField(
        default=3, validators=[MinValueValidator(1), MaxValueValidator(7)])
    dias_preferidos = models.JSONField(default=list, blank=True)   # [0..6], lun=0

    # Ciclo de vida.
    is_active = models.BooleanField(default=True)
    started_at = models.DateField()
    week_start = models.DateField()    # lunes ISO de la semana_actual (avance del microciclo)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'running_plans'
        indexes = [models.Index(fields=['user', 'is_active'])]
        constraints = [
            models.UniqueConstraint(
                fields=['user'], condition=models.Q(is_active=True),
                name='unique_active_running_plan_per_user',
            ),
        ]

    def __str__(self):
        return f"RunningPlan<{self.user.username}> {self.meta_tipo} {self.fase_actual} w{self.semana_actual}"


class PlannedRunSession(models.Model):
    """Sesión de carrera prescrita por el motor para un día. La estructura la fija el
    motor (`estructura_fases`); el LLM redacta y completa `respuesta_ia`. Al ejecutarse
    se vincula a la RunSession real vía `run_session` (el FK reservado en RunSession NO
    se activa, para no migrar la tabla de tracking en producción)."""
    TIPO_SESION = [
        ('easy', 'Easy/Recovery'), ('long', 'Long run'), ('tempo', 'Tempo/Umbral'),
        ('vo2', 'Intervalos VO2máx'), ('fartlek', 'Fartlek'), ('hills', 'Cuestas'),
        ('progressive', 'Progresivo'), ('strides', 'Series/Strides'),
        ('recovery', 'Recuperación'), ('rest', 'Descanso'), ('cross', 'Cross-training'),
    ]
    ESTADO = [
        ('planificada', 'Planificada'), ('ajustada', 'Ajustada por readiness'),
        ('completada', 'Completada'), ('saltada', 'Saltada'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='planned_runs')
    plan = models.ForeignKey(RunningPlan, on_delete=models.CASCADE, related_name='sessions')
    fecha = models.DateField()

    # Prescripción (la decide el motor; el LLM redacta).
    tipo_sesion = models.CharField(max_length=12, choices=TIPO_SESION)
    es_calidad = models.BooleanField(default=False)   # cacheado del catálogo (regla de espaciado)
    zona_principal = models.CharField(max_length=4, blank=True)   # 'Z1'..'Z5'
    duracion_objetivo_min = models.IntegerField(null=True, blank=True)
    distancia_objetivo_km = models.FloatField(null=True, blank=True)
    rpe_target = models.IntegerField(null=True, blank=True,
                                     validators=[MinValueValidator(1), MaxValueValidator(10)])

    estructura_fases = models.JSONField(default=dict, blank=True)   # esqueleto pre-LLM
    respuesta_ia = models.JSONField(default=dict, blank=True)       # JSON completo del LLM
    prompt_usado = models.TextField(blank=True)

    estado = models.CharField(max_length=12, choices=ESTADO, default='planificada')
    readiness_snapshot = models.JSONField(default=dict, blank=True)
    ajuste_aplicado = models.CharField(max_length=40, blank=True)

    run_session = models.ForeignKey('runs.RunSession', on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='planned_origin')

    # Salud del motor (mismo patrón que workouts.Session).
    generacion_ms = models.IntegerField(null=True, blank=True)
    tokens_in = models.IntegerField(null=True, blank=True)
    tokens_out = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'planned_run_sessions'
        ordering = ['fecha']
        constraints = [
            models.UniqueConstraint(fields=['plan', 'fecha'],
                                    name='unique_planned_run_per_plan_day'),
        ]
        indexes = [
            models.Index(fields=['user', 'fecha']),
            models.Index(fields=['plan', 'estado']),
        ]

    def __str__(self):
        return f"PlannedRun<{self.user.username}> {self.fecha} {self.tipo_sesion} [{self.estado}]"
