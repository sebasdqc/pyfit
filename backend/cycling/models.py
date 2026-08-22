from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()

# ─────────────────────────────────────────────────────────────────────────────
# CICLISMO — Fase 3 del plan running+ciclismo. Espejo de runs/models.py,
# adaptado a las diferencias reales del deporte (ver ai_cycling/
# training_science_cycling.py para la ciencia detrás de cada decisión):
#   · potencia/cadencia en vez de ritmo — RideSession.avg_power_w en vez de
#     RunSession.avg_pace_s_per_km.
#   · CyclistProfile.zonas ancla en FTHR (o Karvonen si no hay test) — NUNCA
#     en potencia sola, porque la mayoría no tiene potenciómetro.
#   · PlannedRide NO tiene distancia_objetivo — ciclismo se prescribe en
#     tiempo, la distancia es un resultado, no un insumo.
#   · RidePlan.horas_objetivo_semana en vez de km_objetivo_semana.
#
# ⚠️ Deliberadamente SIN un RidePoint (tracking GPS punto a punto, análogo a
# RunPoint) en esta fase: eso es una feature de tracking en vivo con cambios
# nativos en mobile (mismo motivo por el que RunPoint obligó a dejar Expo Go
# — ver mobile/CLAUDE.md), no una decisión de modelo de datos. Si se pide
# tracking en vivo de ciclismo, esa es su propia fase, no una extensión
# silenciosa de este archivo.
#
# También deliberadamente SIN motor adaptativo (el equivalente a
# ai_running/adaptive_engine_running.py) ni endpoints/serializers todavía —
# la Fase 3 del plan es "Modelos", nada más. Con estos 4 modelos ciclismo
# tiene dónde persistir datos, pero AÚN NO genera ni sirve ninguna sesión.
# ─────────────────────────────────────────────────────────────────────────────


class RideSession(models.Model):
    SESSION_TYPE_CHOICES = [
        ('free', 'Free Ride'),
        ('planned', 'Planned Ride'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ride_sessions')

    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='free')

    # Métricas agregadas (se calculan al completar la sesión).
    total_distance_m = models.FloatField(default=0)
    total_duration_s = models.IntegerField(default=0)
    # Potencia/cadencia: null si no hay potenciómetro — NO son el ancla del
    # producto (ver CyclistProfile), son un enriquecimiento opcional.
    avg_power_w = models.IntegerField(null=True, blank=True)
    normalized_power_w = models.IntegerField(null=True, blank=True)   # NP, Coggan
    avg_cadence_rpm = models.IntegerField(null=True, blank=True)
    avg_heart_rate = models.IntegerField(null=True, blank=True)
    calories_burned = models.FloatField(default=0)
    elevation_gain_m = models.FloatField(default=0)

    # ── Feedback post-sesión (mismo patrón que RunSession/SessionFeedback) ──
    rpe_real = models.IntegerField(null=True, blank=True)
    rating = models.IntegerField(null=True, blank=True)
    cumplimiento = models.IntegerField(null=True, blank=True)
    molestias = models.JSONField(default=list, blank=True)
    feedback_notas = models.TextField(null=True, blank=True)
    feedback_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ride_sessions'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'session_type']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(ended_at__isnull=True)
                    | models.Q(ended_at__gte=models.F('started_at'))
                ),
                name='ride_ended_after_started',
            ),
            models.CheckConstraint(
                condition=(
                    ~models.Q(status='completed')
                    | models.Q(ended_at__isnull=False)
                ),
                name='ride_completed_has_ended_at',
            ),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.session_type} — {self.started_at:%Y-%m-%d %H:%M}"


class CyclistProfile(models.Model):
    """Perfil de ciclista: umbral (FTHR/FTP) y zonas derivadas. Espejo de
    RunnerProfile. `zonas` es JSON derivado de
    ai_cycling.training_science_cycling.derive_zones() — recalculado entero
    al cambiar el baseline.

    ⚠️ FTHR es el ancla PRIMARIA del producto (FC + RPE); ftp_w es opcional,
    solo se llena si el ciclista declara un potenciómetro. Un CyclistProfile
    con ftp_w=None y fthr_bpm poblado es el caso ESPERADO, no uno degradado."""
    BASELINE_SOURCE = [
        ('test_20min', 'Test de 20-30 min declarado'),
        ('manual',     'Editado a mano'),
        ('cold_start', 'Sin datos — provisional'),
    ]
    CONFIANZA = [('alta', 'Alta'), ('media', 'Media'), ('baja', 'Baja')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cyclist_profile')

    # Baseline / umbral. Ver ai_cycling.training_science_cycling.estimate_threshold().
    fthr_bpm = models.IntegerField(null=True, blank=True,
                                   validators=[MinValueValidator(80), MaxValueValidator(220)])
    ftp_w = models.IntegerField(null=True, blank=True,
                                validators=[MinValueValidator(30), MaxValueValidator(600)])
    fc_max = models.IntegerField(null=True, blank=True,
                                 validators=[MinValueValidator(120), MaxValueValidator(220)])
    fc_reposo = models.IntegerField(null=True, blank=True,
                                    validators=[MinValueValidator(30), MaxValueValidator(110)])
    fc_max_es_estimada = models.BooleanField(default=True)   # True = Tanaka por edad

    volumen_semanal_base_horas = models.FloatField(null=True, blank=True)

    # Zonas derivadas: {hr:{Z1..Z7/SS:[lo,hi]}|None, power:{...}|None,
    # metodo_hr, metodo_power}.
    zonas = models.JSONField(default=dict, blank=True)

    # Trazabilidad del baseline.
    fuente_baseline = models.CharField(max_length=20, choices=BASELINE_SOURCE, default='cold_start')
    confianza = models.CharField(max_length=10, choices=CONFIANZA, default='baja')
    fecha_calculo = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cyclist_profiles'

    def __str__(self):
        return f"CyclistProfile<{self.user.username}> FTHR={self.fthr_bpm} FTP={self.ftp_w}"


class RidePlan(models.Model):
    """Plan de ciclismo activo (mesociclo). Espejo de RunningPlan — mismo
    patrón: `is_active` independiente del TrainingCycle de fuerza y del
    RunningPlan de running (un usuario puede tener los tres)."""
    META_TIPO = [
        ('fitness_general', 'Fitness general (sin fecha)'),
        ('gran_fondo', 'Gran fondo'), ('crono', 'Contrarreloj'),
        ('ruta_competitiva', 'Ruta competitiva'), ('otra', 'Otra'),
    ]
    FASE = [
        ('base', 'Base'), ('build', 'Construcción'), ('peak', 'Pico'),
        ('taper', 'Taper'), ('recovery', 'Recuperación/Transición'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ride_plans')

    # Meta.
    meta_tipo = models.CharField(max_length=20, choices=META_TIPO, default='fitness_general')
    meta_distancia_km = models.FloatField(null=True, blank=True)
    meta_fecha = models.DateField(null=True, blank=True)        # null = modo continuo
    meta_competition = models.ForeignKey('workouts.Competition', on_delete=models.SET_NULL,
                                         null=True, blank=True, related_name='ride_plans')

    # Estado de periodización.
    fase_actual = models.CharField(max_length=12, choices=FASE, default='base')
    semana_actual = models.PositiveSmallIntegerField(default=1)
    total_semanas = models.PositiveSmallIntegerField(null=True, blank=True)  # null = continuo
    horas_objetivo_semana = models.FloatField(default=0)
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
        db_table = 'ride_plans'
        indexes = [models.Index(fields=['user', 'is_active'])]
        constraints = [
            models.UniqueConstraint(
                fields=['user'], condition=models.Q(is_active=True),
                name='unique_active_ride_plan_per_user',
            ),
        ]

    def __str__(self):
        return f"RidePlan<{self.user.username}> {self.meta_tipo} {self.fase_actual} w{self.semana_actual}"


class PlannedRide(models.Model):
    """Sesión de ciclismo prescrita por el motor para un día. Espejo de
    PlannedRunSession — misma separación: la estructura la fija el motor
    (`estructura_fases`), el LLM redacta y completa `respuesta_ia`.

    Sin `distancia_objetivo_km`: ciclismo se prescribe en tiempo (ver
    ai_cycling.training_science_cycling.prescribe_ride_session — sin
    bifurcación distancia/tiempo, la distancia es un resultado)."""
    TIPO_SESION = [
        ('easy', 'Easy/Base'), ('long_ride', 'Salida larga'), ('tempo', 'Tempo'),
        ('sweet_spot', 'Sweet Spot'), ('threshold', 'Umbral (FTP)'),
        ('vo2max', 'Intervalos VO2máx'), ('anaerobic', 'Capacidad anaeróbica'),
        ('sprints', 'Sprints'), ('recovery', 'Recuperación'), ('rest', 'Descanso'),
        ('cross', 'Cross-training'),
    ]
    ESTADO = [
        ('planificada', 'Planificada'), ('ajustada', 'Ajustada por readiness'),
        ('completada', 'Completada'), ('saltada', 'Saltada'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='planned_rides')
    plan = models.ForeignKey(RidePlan, on_delete=models.CASCADE, related_name='sessions')
    fecha = models.DateField()

    # Prescripción (la decide el motor; el LLM redacta).
    tipo_sesion = models.CharField(max_length=12, choices=TIPO_SESION)
    es_calidad = models.BooleanField(default=False)   # cacheado del catálogo (regla de espaciado)
    zona_principal = models.CharField(max_length=4, blank=True)   # 'Z1'..'Z7'/'SS'
    duracion_objetivo_min = models.IntegerField(null=True, blank=True)
    rpe_target = models.IntegerField(null=True, blank=True,
                                     validators=[MinValueValidator(1), MaxValueValidator(10)])

    estructura_fases = models.JSONField(default=dict, blank=True)   # esqueleto pre-LLM
    respuesta_ia = models.JSONField(default=dict, blank=True)       # JSON completo del LLM
    prompt_usado = models.TextField(blank=True)

    estado = models.CharField(max_length=12, choices=ESTADO, default='planificada')
    readiness_snapshot = models.JSONField(default=dict, blank=True)
    ajuste_aplicado = models.CharField(max_length=40, blank=True)

    ride_session = models.ForeignKey('cycling.RideSession', on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='planned_origin')

    # Salud del motor (mismo patrón que workouts.Session / PlannedRunSession).
    generacion_ms = models.IntegerField(null=True, blank=True)
    tokens_in = models.IntegerField(null=True, blank=True)
    tokens_out = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'planned_rides'
        ordering = ['fecha']
        constraints = [
            models.UniqueConstraint(fields=['plan', 'fecha'],
                                    name='unique_planned_ride_per_plan_day'),
        ]
        indexes = [
            models.Index(fields=['user', 'fecha']),
            models.Index(fields=['plan', 'estado']),
        ]

    def __str__(self):
        return f"PlannedRide<{self.user.username}> {self.fecha} {self.tipo_sesion} [{self.estado}]"
