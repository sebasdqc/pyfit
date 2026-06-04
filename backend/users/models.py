import secrets
import string
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone


# Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) para códigos de referido
# cortos y legibles al dictarlos o escribirlos a mano.
REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'


def generar_codigo_referido(length: int = 6) -> str:
    """Genera un código de referido aleatorio (CSPRNG) con el alfabeto legible."""
    return ''.join(secrets.choice(REFERRAL_CODE_ALPHABET) for _ in range(length))


class User(AbstractUser):
    # Rol de la cuenta. Por defecto 'athlete' → todas las cuentas existentes y
    # los registros normales siguen siendo atletas y funcionan exactamente igual.
    # 'coach' identifica a un entrenador que usa el portal de coach.
    ROLE_ATHLETE = 'athlete'
    ROLE_COACH = 'coach'
    ROLE_CHOICES = [(ROLE_ATHLETE, 'Atleta'), (ROLE_COACH, 'Coach')]

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default=ROLE_ATHLETE, db_index=True,
    )
    # Un coach puede existir (role='coach') con su acceso al portal todavía
    # pendiente de activación manual por el equipo. Mientras coach_activo=False
    # el login de coach devuelve el aviso de "activación pendiente". No tiene
    # ningún efecto sobre los atletas (siempre False para ellos).
    coach_activo = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'

    @property
    def is_coach(self) -> bool:
        return self.role == self.ROLE_COACH

    @property
    def is_athlete(self) -> bool:
        return self.role == self.ROLE_ATHLETE

    @property
    def coach_acceso_activo(self) -> bool:
        """Un coach puede entrar al portal solo si su rol es coach, su acceso
        fue activado y la cuenta sigue activa."""
        return self.is_coach and self.coach_activo and self.is_active


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
    # Nivel técnico 1–5 derivado del tiempo que lleva entrenando (onboarding).
    # Acota el techo de technical_level de los ejercicios en el motor adaptativo
    # (niveles bajos → ejercicios mecánicamente más simples). null = usar `nivel`.
    nivel_experiencia = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    lesiones = models.TextField(blank=True)
    experiencia_deportiva = models.TextField(blank=True)
    estilo_entrenamiento = models.CharField(max_length=100, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    peso = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(300)],
    )
    altura = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(100), MaxValueValidator(250)],
    )
    sexo = models.CharField(max_length=20, choices=SEXO_CHOICES, blank=True)
    pais = models.CharField(max_length=80, blank=True, default='')
    dias_semana = models.IntegerField(
        default=3, validators=[MinValueValidator(1), MaxValueValidator(7)],
    )
    dias_fijos = models.BooleanField(null=True, blank=True)
    horario_preferido = models.CharField(max_length=40, blank=True)
    nivel_estres = models.CharField(max_length=20, choices=ESTRES_CHOICES, blank=True)
    tipo_trabajo = models.CharField(max_length=20, choices=TRABAJO_CHOICES, blank=True)
    ejercicios_favoritos = models.TextField(blank=True)
    ejercicios_evitar = models.TextField(blank=True)
    rm_sentadilla = models.DecimalField(
        max_digits=6, decimal_places=1, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
    )
    rm_peso_muerto = models.DecimalField(
        max_digits=6, decimal_places=1, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
    )
    rm_press_banca = models.DecimalField(
        max_digits=6, decimal_places=1, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
    )
    rm_press_hombro = models.DecimalField(
        max_digits=6, decimal_places=1, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
    )
    usa_ciclo_menstrual = models.BooleanField(default=False)

    # Onboarding extended fields
    calidad_sueno_habitual = models.CharField(max_length=30, blank=True)
    condiciones_medicas = models.JSONField(default=list, blank=True)
    notas_medicas = models.TextField(blank=True)
    motivo_limitacion = models.TextField(blank=True)
    lugares_entrenamiento = models.JSONField(default=list, blank=True)
    implementos_perfil = models.JSONField(default=list, blank=True)
    duracion_disponible = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(10), MaxValueValidator(300)],
    )
    duracion_minima = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(5), MaxValueValidator(120)],
    )
    objetivo_secundario = models.CharField(max_length=200, blank=True)
    horizonte_temporal = models.CharField(max_length=50, blank=True)
    motivacion = models.TextField(blank=True)
    razones_abandono = models.JSONField(default=list, blank=True)
    estilo_coaching = models.CharField(max_length=20, blank=True)
    tipos_entrenamiento = models.JSONField(default=list, blank=True)
    # Suscripción — el flujo de upgrade aún no está conectado a un cobrador,
    # estos campos son la fuente de verdad que el cliente consume para mostrar
    # banners de upgrade vs gestión.
    PLAN_CHOICES = [('starter', 'Starter'), ('pro', 'Pro')]
    PLAN_TIPO_CHOICES = [('mensual', 'Mensual'), ('anual', 'Anual')]
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    plan_tipo = models.CharField(max_length=20, choices=PLAN_TIPO_CHOICES, blank=True)
    plan_renovacion = models.DateField(null=True, blank=True)

    GOAL_CHOICES = [
        ('hipertrofia', 'Hipertrofia'),
        ('fuerza', 'Fuerza'),
        ('potencia', 'Potencia'),
        ('salud', 'Salud'),
        ('perdida_grasa', 'Pérdida de grasa'),
    ]
    goal = models.CharField(max_length=20, choices=GOAL_CHOICES, blank=True)
    goal_changed_at = models.DateTimeField(null=True, blank=True)
    previous_goal = models.CharField(max_length=20, choices=GOAL_CHOICES, blank=True)

    racha_actual = models.IntegerField(default=0)
    mejor_racha = models.IntegerField(default=0)
    puntos_totales = models.IntegerField(default=0)
    logros = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    avatar = models.TextField(blank=True, default='')  # base64 dataURI de la foto de perfil
    # Código de referido único por usuario. Se autogenera en save() si falta y se
    # rellena para las cuentas existentes vía migración de datos, de modo que
    # TODOS los perfiles tengan siempre uno. null permitido solo para no romper
    # la migración inicial (multiples NULL conviven con unique en Postgres).
    codigo_referido = models.CharField(max_length=12, unique=True, null=True, blank=True)
    # Código de invitación de COACH. Solo se rellena para cuentas coach (de forma
    # perezosa, la primera vez que el coach abre su portal). El atleta lo ingresa
    # para vincularse a su cartera. null para atletas → no les genera código.
    codigo_coach = models.CharField(max_length=12, unique=True, null=True, blank=True)
    # Marca de cuenta de prueba (QA, demos, el propio equipo). Las cuentas con
    # esta bandera se excluyen de las métricas de negocio (KPIs, embudo,
    # retención, churn) para que la analítica refleje usuarios reales. No afecta
    # el funcionamiento normal de la app para esa cuenta.
    is_test = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = 'profiles'

    def __str__(self):
        return self.nombre

    def asignar_codigo_referido(self):
        """Asigna un código de referido único si todavía no tiene uno.

        Reintenta ante la (improbabilísima) colisión y, como último recurso,
        alarga el código. No toca el valor si ya existe."""
        if self.codigo_referido:
            return
        for _ in range(12):
            code = generar_codigo_referido()
            if not Profile.objects.filter(codigo_referido=code).exists():
                self.codigo_referido = code
                return
        self.codigo_referido = generar_codigo_referido(10)

    def save(self, *args, **kwargs):
        # Garantiza que todo perfil tenga código de referido desde su creación,
        # sin importar la vía (registro, onboarding, admin, get_or_create…).
        if not self.codigo_referido:
            self.asignar_codigo_referido()
        super().save(*args, **kwargs)

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

    @property
    def is_onboarding_complete(self) -> bool:
        if not all([self.objetivo, self.fecha_nacimiento, self.peso, self.altura, self.sexo]):
            return False
        if not self.dias_semana or self.dias_semana < 1:
            return False
        if self.user.locations.exists():
            return True
        if isinstance(self.lugares_entrenamiento, list) and len(self.lugares_entrenamiento) > 0:
            return True
        return False


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


class Notification(models.Model):
    TIPO_CHOICES = [
        ('invitacion',   'Invitación a entrenar'),
        ('insight',      'Insight semanal'),
        ('alerta',       'Alerta de patrón'),
        ('logro',        'Logro desbloqueado'),
        ('reencuentro',  'Reencuentro'),
    ]
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    tipo       = models.CharField(max_length=20, choices=TIPO_CHOICES)
    texto      = models.TextField()
    leida      = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['leida', '-created_at']
        indexes  = [models.Index(fields=['user', 'leida', '-created_at'])]

    def __str__(self):
        return f'{self.user} — {self.tipo}'


class NotificationPreference(models.Model):
    user        = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_prefs')
    invitacion  = models.BooleanField(default=True)
    insight     = models.BooleanField(default=True)
    alerta      = models.BooleanField(default=True)
    logro       = models.BooleanField(default=True)
    reencuentro = models.BooleanField(default=True)
    hora_inicio = models.TimeField(default='07:00:00')
    hora_fin    = models.TimeField(default='22:00:00')
    silencio    = models.BooleanField(default=False)

    class Meta:
        db_table = 'notification_preferences'

    def is_enabled(self, tipo: str) -> bool:
        if self.silencio and tipo != 'alerta':
            return False
        return bool(getattr(self, tipo, True))

    def within_hora_window(self) -> bool:
        from django.utils import timezone
        now_hour = timezone.localtime(timezone.now()).hour
        return self.hora_inicio.hour <= now_hour <= self.hora_fin.hour


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
        # secrets.choice es CSPRNG (cryptographically secure). random.choices no lo es
        # y podría ser predecible si el estado del PRNG se filtra via timing u otras APIs.
        code = ''.join(secrets.choice(string.digits) for _ in range(6))
        return cls.objects.create(user=user, code=code)


class ImpersonationLog(models.Model):
    """Rastro persistente y consultable de cada impersonación ('ver como usuario').

    auditlog captura cambios de modelos, pero impersonar no cambia ningún
    modelo — es la acción más sensible del panel y necesita su propia bitácora.
    Una fila por evento (inicio/fin), con quién, a quién, cuándo e IP.
    """

    ACTION_CHOICES = [('start', 'Inicio'), ('stop', 'Fin')]

    impersonator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='impersonations_made',
    )
    target = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='impersonations_received',
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES, default='start')
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'impersonation_logs'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['-created_at'])]

    def __str__(self):
        imp = self.impersonator_id and self.impersonator.email or '?'
        tgt = self.target_id and self.target.email or '?'
        return f'{imp} → {tgt} [{self.action}]'


class CoachAthlete(models.Model):
    """Vínculo entre un coach y un atleta de su cartera.

    Un atleta puede aparecer en la cartera de varios coaches (no se restringe),
    pero un par (coach, atleta) es único. El atleta se vincula ingresando el
    `codigo_coach` del coach; el coach puede pausar el vínculo sin borrarlo.
    """
    ESTADO_ACTIVO = 'activo'
    ESTADO_PAUSADO = 'pausado'
    ESTADO_CHOICES = [(ESTADO_ACTIVO, 'Activo'), (ESTADO_PAUSADO, 'Pausado')]

    coach = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cartera',
    )
    athlete = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coaches',
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_ACTIVO)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coach_athletes'
        unique_together = [['coach', 'athlete']]
        ordering = ['-created_at']
        indexes = [models.Index(fields=['coach', 'estado'])]

    def __str__(self):
        return f'{self.coach_id} → {self.athlete_id} [{self.estado}]'
