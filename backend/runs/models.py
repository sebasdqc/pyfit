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
        # Sesión `active`/`paused` que quedó huérfana (crash de la app, doble
        # inicio) y se cerró automáticamente al arrancar una carrera nueva —
        # ver RunSessionCreateSerializer.create(). No es un CheckConstraint de
        # "una sola activa por usuario" a propósito: no hay forma de verificar
        # desde acá si datos ya en producción lo violarían, y una migración que
        # falla al aplicar tumba el deploy (ver backend/CLAUDE.md).
        ('abandoned', 'Abandoned'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='run_sessions')

    # Metadata
    started_at = models.DateTimeField()
    # Fecha LOCAL del dispositivo al crear la sesión (header X-Local-Date, mismo
    # patrón que checkins.DailyCheckin.fecha) — no derivable de forma confiable
    # desde `started_at` después del hecho: el server corre en TIME_ZONE=UTC sin
    # activación de timezone por request, así que `started_at.date()`/
    # `timezone.localdate()` bucketean por el día UTC, no el día del atleta. Una
    # carrera nocturna en UTC- puede caer en el día siguiente y desalinear el
    # volumen semanal (regla del 10%) y la serie de sRPE del ACWR. Nullable:
    # filas previas a este campo caen al fallback de `started_at.date()` en
    # RunningAdaptiveEngineService._local_date().
    local_date = models.DateField(null=True, blank=True, db_index=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Tipo — extensible para Planned Run
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='free')

    # Trail Running: se hereda del check-in del día (foco 'trail') al crear la carrera.
    # Cambia el rótulo de la tarjeta para compartir ("TRAIL RUNNING" en vez de "CARRERA").
    is_trail = models.BooleanField(default=False)

    # FK prepared for future Planned Run module — uncomment when 'plans' app exists
    # plan_session = models.ForeignKey(
    #     'plans.PlanSession',
    #     null=True, blank=True,
    #     on_delete=models.SET_NULL,
    #     related_name='run_sessions'
    # )

    # Métricas agregadas (se calculan al completar la sesión). MinValueValidator
    # valida en formularios/serializers (full_clean) — el CheckConstraint de
    # abajo es el que realmente blinda contra escrituras que lo saltean (admin,
    # shell, un management command futuro), igual que ya hace SessionFeedback
    # (workouts/models.py) con sus propios rangos.
    total_distance_m = models.FloatField(default=0, validators=[MinValueValidator(0)])
    total_duration_s = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    avg_pace_s_per_km = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    best_pace_s_per_km = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    calories_burned = models.FloatField(default=0, validators=[MinValueValidator(0)])
    elevation_gain_m = models.FloatField(default=0, validators=[MinValueValidator(0)])
    avg_heart_rate = models.IntegerField(null=True, blank=True)  # preparado para HR monitor

    # ── Feedback post-sesión (paralelo al SessionFeedback de las sesiones de gym) ──
    # Nulos = sesión sin feedback todavía. `feedback_at` marca cuándo se registró.
    # Mismos rangos que workouts.SessionFeedback (rpe_real 1-10, cumplimiento
    # 0-100, rating 1-5) — antes solo se validaban en RunFeedbackSerializer.
    rpe_real = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)])
    rating = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    cumplimiento = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
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
            # El patrón de query dominante del módulo: generate_run_session (ACWR
            # y volumen semanal), Zyfit Score y el historial (`GET /api/runs/`)
            # filtran+ordenan por (user, started_at) en cada request — sin esto,
            # cada uno era un full scan de las filas del usuario.
            models.Index(fields=['user', 'started_at']),
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
            # Blindaje a nivel de BD de las métricas agregadas y del feedback —
            # los validators de arriba solo corren si algo llama full_clean()
            # (formularios/DRF); esto atrapa admin, shell, o un management
            # command futuro que haga .save() directo.
            models.CheckConstraint(
                condition=models.Q(total_distance_m__gte=0),
                name='run_distance_non_negative',
            ),
            models.CheckConstraint(
                condition=models.Q(total_duration_s__gte=0),
                name='run_duration_non_negative',
            ),
            models.CheckConstraint(
                condition=models.Q(avg_pace_s_per_km__gte=0),
                name='run_avg_pace_non_negative',
            ),
            models.CheckConstraint(
                condition=models.Q(best_pace_s_per_km__gte=0),
                name='run_best_pace_non_negative',
            ),
            models.CheckConstraint(
                condition=models.Q(calories_burned__gte=0),
                name='run_calories_non_negative',
            ),
            models.CheckConstraint(
                condition=models.Q(elevation_gain_m__gte=0),
                name='run_elevation_non_negative',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(rpe_real__isnull=True)
                    | models.Q(rpe_real__gte=1, rpe_real__lte=10)
                ),
                name='run_rpe_real_in_range',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(rating__isnull=True)
                    | models.Q(rating__gte=1, rating__lte=5)
                ),
                name='run_rating_in_range',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(cumplimiento__isnull=True)
                    | models.Q(cumplimiento__gte=0, cumplimiento__lte=100)
                ),
                name='run_cumplimiento_in_range',
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
        constraints = [
            # Protege contra el reintento de red: `flushPoints` (mobile) reencola
            # el batch completo si el POST falla, aunque el servidor ya lo haya
            # insertado — sin esto, un timeout tras un insert exitoso duplica
            # las filas. Con esto + bulk_create(ignore_conflicts=True), el
            # reintento simplemente no inserta de nuevo lo que ya existe.
            models.UniqueConstraint(fields=['session', 'timestamp'], name='unique_point_per_session_timestamp'),
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

    # Salud del motor. `narracion_fallback` = True si Groq falló/no respondió
    # JSON válido y se usó la narración determinística de respaldo
    # (`_fallback_narration` en ai_running/views.py) — antes esto no quedaba
    # registrado en ningún lado, sin observabilidad de cuántas sesiones se
    # redactan sin LLM.
    generacion_ms = models.IntegerField(null=True, blank=True)
    tokens_in = models.IntegerField(null=True, blank=True)
    tokens_out = models.IntegerField(null=True, blank=True)
    narracion_fallback = models.BooleanField(default=False)

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


class RunTypeProfile(models.Model):
    """Progresión por tipo de sesión — equivalente a `workouts.UserExerciseProfile`
    del motor de fuerza, pero por `tipo_sesion` (vo2/tempo/easy/...) en vez de por
    ejercicio individual (running no tiene un catálogo de "ejercicios" que
    progresar uno a uno). Se actualiza en `run_feedback` cuando el feedback llega
    de una RunSession vinculada a una PlannedRunSession (Free Runs sin vincular no
    tienen `tipo_sesion` al que atribuir el dato). Se consume en
    `generate_run_session` vía `training_science_running.pace_bias_from_profile()`
    para afinar el ritmo objetivo de la PRÓXIMA sesión de ese tipo — sin esto, el
    motor solo reaccionaba a la readiness del día, nunca al historial de esfuerzo
    reportado en sesiones pasadas del mismo tipo."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='run_type_profiles')
    tipo_sesion = models.CharField(max_length=12, choices=PlannedRunSession.TIPO_SESION)
    veces_realizado = models.IntegerField(default=0)
    rpe_promedio_real = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    rpe_promedio_target = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    cumplimiento_promedio = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ultima_vez = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'run_type_profiles'
        constraints = [
            models.UniqueConstraint(fields=['user', 'tipo_sesion'], name='unique_run_type_profile_per_user'),
        ]
        indexes = [
            models.Index(fields=['user', 'tipo_sesion']),
        ]

    def __str__(self):
        return f"RunTypeProfile<{self.user.username}> {self.tipo_sesion} x{self.veces_realizado}"
