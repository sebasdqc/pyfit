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
    #
    # Los dos primeros roles son del producto de consumo (app móvil):
    #   - 'athlete' identifica a un usuario normal de la app.
    #   - 'coach'   identifica a un entrenador que usa el portal de coach.
    # Los dos siguientes pertenecen a la vertical B2B "Zyfit Performance"
    # (panel web para centros deportivos de alto rendimiento):
    #   - 'director_tecnico' dirige un centro y registra a sus atletas.
    #   - 'admin'            soy yo, administrador del producto (acceso total al panel).
    # Son aditivos: ningún atleta/coach existente cambia, y el default sigue
    # siendo 'athlete'. El rol fino de cada staff DENTRO de un centro vive en
    # performance.CenterMembership (un mismo User puede ser director en un centro
    # y, p.ej., fisioterapeuta en otro); este campo es la identidad global.
    ROLE_ATHLETE = 'athlete'
    ROLE_COACH = 'coach'
    ROLE_DIRECTOR = 'director_tecnico'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = [
        (ROLE_ATHLETE, 'Atleta'),
        (ROLE_COACH, 'Coach'),
        (ROLE_DIRECTOR, 'Director técnico'),
        (ROLE_ADMIN, 'Admin de producto'),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default=ROLE_ATHLETE, db_index=True,
    )
    # Un coach puede existir (role='coach') con su acceso al portal todavía
    # pendiente de activación manual por el equipo. Mientras coach_activo=False
    # el login de coach devuelve el aviso de "activación pendiente". No tiene
    # ningún efecto sobre los atletas (siempre False para ellos).
    coach_activo = models.BooleanField(default=False)
    # Acceso de AUTORÍA en la vertical e-learning "Zyfit Academy": un instructor
    # crea y publica cursos. Es aditivo (default False) y no afecta a nadie: los
    # estudiantes (cualquier cuenta activa) se inscriben SIN este flag (ver la
    # propiedad `academy_acceso`). El admin de producto (is_admin/is_staff) también
    # puede crear cursos sin necesitar este flag.
    academy_instructor = models.BooleanField(default=False)
    # Acceso de ADMINISTRACIÓN dentro de Zyfit Academy (gestionar cuentas
    # admin/instructor/estudiante desde su propio panel, moderar Comunidad,
    # editar cualquier curso/post de su organización). Deliberadamente
    # SEPARADO de `role`/`is_admin`: ese campo es GLOBAL entre los 3
    # productos y concede además acceso B2B completo a Zyfit Performance
    # (incluido el módulo Psicológico, datos de salud) en TODOS los centros.
    # Antes de este flag, el panel de admin de Academy promovía cuentas a
    # `role=ROLE_ADMIN` para representar "admin", filtrando sin querer ese
    # acceso cruzado — hallazgo crítico de auditoría (2026-07-09). Aditivo,
    # default False; ver academy.permissions.
    academy_admin = models.BooleanField(default=False)
    # Organización de Academy (white-label) a la que pertenece esta cuenta —
    # NULL = sin restricción (catálogo raíz o cuenta anterior a este campo).
    # Se estampa SOLO al registrarse (ver users.views.register), según el
    # tenant resuelto por academy.middleware.TenantMiddleware en ese momento;
    # nunca se reasigna después. `academy.permissions.IsAcademyUser` la usa
    # para impedir que una cuenta de un tenant navegue el catálogo/comunidad
    # de OTRO tenant agregando `X-Tenant-Slug` a mano (hallazgo de auditoría:
    # antes cualquier cuenta activa entraba a cualquier tenant con solo
    # cambiar ese header). Referencia por string ('academy.Tenant') para no
    # acoplar este módulo al import de la app academy.
    academy_tenant = models.ForeignKey(
        'academy.Tenant', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='miembros',
    )
    # Verificación de email tras registro por contraseña — evita cuentas basura
    # con emails inexistentes/ajenos y asegura que la recuperación de contraseña
    # sea posible. NO bloquea login/onboarding (solo informativo + reenvío desde
    # Ajustes): un gate duro en el registro empeoraría el drop-off ya alto del
    # onboarding (ver auditoría). Cuentas creadas por Google/Apple entran ya
    # verificadas (el proveedor ya confirmó el email).
    email_verificado = models.BooleanField(default=False)

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
    def is_director(self) -> bool:
        """Director técnico de la vertical B2B Zyfit Performance."""
        return self.role == self.ROLE_DIRECTOR

    @property
    def is_admin(self) -> bool:
        """Administrador de producto (rol B2B). Es independiente de `is_staff`
        de Django, que sigue gobernando el acceso al admin web."""
        return self.role == self.ROLE_ADMIN

    @property
    def coach_acceso_activo(self) -> bool:
        """Un coach puede entrar al portal solo si su rol es coach, su acceso
        fue activado y la cuenta sigue activa."""
        return self.is_coach and self.coach_activo and self.is_active

    @property
    def performance_acceso(self) -> bool:
        """Acceso al panel web de Zyfit Performance. Lo tienen los directores
        técnicos, el admin de producto, cualquier staff de Django y cualquier
        miembro con una membresía de centro activa (preparador, fisio, etc.). El
        alcance fino (a qué centros y módulos) lo resuelve performance.CenterMembership."""
        if not self.is_active:
            return False
        if self.role in (self.ROLE_DIRECTOR, self.ROLE_ADMIN) or self.is_staff:
            return True
        # Staff de un centro: cualquiera con membresía activa. Carga diferida del
        # modelo para no introducir una dependencia de importación users→performance.
        from django.apps import apps
        try:
            Membership = apps.get_model('performance', 'CenterMembership')
        except LookupError:
            return False
        return Membership.objects.filter(user=self, activo=True).exists()

    @property
    def academy_acceso(self) -> bool:
        """Acceso a la plataforma e-learning "Zyfit Academy".

        Hoy es ABIERTO a cualquier cuenta activa: entra como ESTUDIANTE (navega el
        catálogo publicado, se inscribe, completa lecciones, rinde quizzes y obtiene
        certificados). La AUTORÍA de cursos (crear/publicar) la habilita aparte el
        flag `academy_instructor` (más is_admin / is_staff). Si en el futuro se
        quiere cerrar la academia a una población concreta, basta endurecer esta
        propiedad (p. ej. exigir `academy_instructor` o una inscripción/whitelist),
        igual que hace `performance_acceso` con la vertical B2B."""
        return bool(self.is_active)


class Profile(models.Model):
    NIVEL_CHOICES = [('principiante', 'Principiante'), ('intermedio', 'Intermedio'), ('avanzado', 'Avanzado')]
    SEXO_CHOICES = [('masculino', 'Masculino'), ('femenino', 'Femenino'), ('otro', 'Otro')]
    ESTRES_CHOICES = [('bajo', 'Bajo'), ('moderado', 'Moderado'), ('alto', 'Alto')]
    TRABAJO_CHOICES = [('sedentario', 'Sedentario'), ('mixto', 'Mixto'), ('activo', 'Activo')]
    HORARIO_CHOICES = [('mañana', 'Mañana'), ('mediodia', 'Mediodía'), ('tarde', 'Tarde'), ('noche', 'Noche')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    nombre = models.CharField(max_length=100)
    # Handle público (p. ej. "@sebastian") para el footer de las tarjetas
    # compartibles (WorkoutShareCard). Distinto de User.username (interno,
    # igual al email) — este lo elige el usuario y puede quedar vacío.
    # Unicidad e formato ("^[a-z0-9_]{3,20}$") se validan en ProfileSerializer,
    # no a nivel de BD, para no chocar con múltiples '' de quien no lo definió.
    usuario = models.CharField(max_length=20, blank=True, default='')
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
    ciudad = models.CharField(max_length=120, blank=True, default='')
    profesion = models.CharField(max_length=150, blank=True, default='')
    intereses = models.JSONField(default=list, blank=True)
    # Handles/URLs por red: claves libres entre {instagram, tiktok, linkedin,
    # twitter, sitio_web} — validadas en la vista, no aquí (JSONField sin schema).
    redes_sociales = models.JSONField(default=dict, blank=True)

    # ── Onboarding de Zyfit Academy (distinto del onboarding fitness de mobile,
    #    ver is_onboarding_complete más abajo) ─────────────────────────────────
    PERFIL_DEPORTIVO_CHOICES = [
        ('atleta', 'Atleta'),
        ('profesional', 'Profesional del deporte'),
        ('entusiasta', 'Entusiasta'),
    ]
    perfil_deportivo = models.CharField(max_length=20, choices=PERFIL_DEPORTIVO_CHOICES, blank=True)
    anios_experiencia_deporte = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(80)],
    )
    MODALIDAD_ACADEMIA_CHOICES = [('virtual', 'Virtual'), ('presencial', 'Presencial'), ('mixta', 'Mixta')]
    modalidad_preferida = models.CharField(max_length=20, choices=MODALIDAD_ACADEMIA_CHOICES, blank=True)
    DISPONIBILIDAD_ACADEMIA_CHOICES = [
        ('manana', 'Mañana'), ('tarde', 'Tarde'), ('noche', 'Noche'),
        ('fin_semana', 'Fin de semana'), ('flexible', 'Flexible'),
    ]
    disponibilidad_estudio = models.CharField(max_length=20, choices=DISPONIBILIDAD_ACADEMIA_CHOICES, blank=True)
    # IDs de academy.School marcadas como de interés en el onboarding.
    escuelas_interes = models.JSONField(default=list, blank=True)
    # True apenas termina o SALTA el wizard de /bienvenida — no vuelve a
    # mostrarse después, sin importar si quedaron campos vacíos.
    onboarding_academia_completo = models.BooleanField(default=False)

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
    PLAN_TIPO_CHOICES = [('mensual', 'Mensual'), ('semestral', 'Semestral'), ('anual', 'Anual')]
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
    push_token = models.CharField(max_length=250, blank=True, default='')

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
        ('community_respuesta',       'Nueva respuesta en tu pregunta de Comunidad'),
        ('community_mejor_respuesta', 'Tu respuesta fue marcada como mejor respuesta'),
    ]
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    tipo       = models.CharField(max_length=30, choices=TIPO_CHOICES)
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
    # Cubre AMBOS tipos de Comunidad (community_respuesta/community_mejor_respuesta):
    # es una capa de engagement opcional, no fragmentamos la UI de preferencias
    # por un feature secundario. Ver academy.community_service._notificar.
    comunidad   = models.BooleanField(default=True)
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


class EmailVerificationCode(models.Model):
    """Mismo patrón que PasswordResetCode, para el flujo de verificación de
    email tras el registro (ver User.email_verificado)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'email_verification_codes'

    def is_valid(self):
        return timezone.now() < self.created_at + timedelta(minutes=15)

    @classmethod
    def generate_for(cls, user):
        cls.objects.filter(user=user).delete()
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


def default_coach_config():
    """Config por defecto que el coach controla para cada atleta de su cartera.

    Las tres claves se aplican de verdad en el flujo del atleta (ver
    `coach_mi_coach` y `generate_session`): `checkin` decide si el check-in diario
    es obligatorio, `feedback` si se pide feedback post-sesión, `ia` si el atleta
    puede generar rutinas con IA. No incluye 'manual' (no existe edición manual de
    rutinas); las filas antiguas que aún tengan esa clave la ignoran sin efecto."""
    return {'checkin': True, 'feedback': True, 'ia': True}


# Claves de configuración que el coach controla y que SÍ se aplican en el flujo
# del atleta. Fuente única de verdad para validar el PATCH y leer la config.
COACH_CONFIG_KEYS = ('checkin', 'feedback', 'ia')


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
    # Configuración del atleta que controla el coach (check-in, feedback, IA,
    # rutina manual). Persistida por par coach↔atleta.
    config = models.JSONField(default=default_coach_config, blank=True)
    # Directiva del coach (Fase 3): guía {objetivo, foco, evitar, nota} que la
    # generación diaria del atleta inyecta en el prompt de IA como alta prioridad.
    directiva = models.JSONField(default=dict, blank=True)
    directiva_updated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coach_athletes'
        unique_together = [['coach', 'athlete']]
        ordering = ['-created_at']
        indexes = [models.Index(fields=['coach', 'estado'])]

    def __str__(self):
        return f'{self.coach_id} → {self.athlete_id} [{self.estado}]'


class CoachSubscription(models.Model):
    """Suscripción del portal de coach (plan, slots, fecha de corte).

    No hay cobrador conectado todavía: la suscripción es administrada (igual que
    la activación del coach). Se crea perezosamente con valores por defecto la
    primera vez que el coach abre su facturación, igual que `codigo_coach`. Es la
    fuente de verdad que la pantalla de Ajustes consume (reemplaza los datos mock).
    """
    ESTADO_ACTIVA = 'activa'
    ESTADO_PAUSADA = 'pausada'
    ESTADO_VENCIDA = 'vencida'
    ESTADO_CHOICES = [
        (ESTADO_ACTIVA, 'Activa'), (ESTADO_PAUSADA, 'Pausada'), (ESTADO_VENCIDA, 'Vencida'),
    ]

    coach = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coach_subscription',
    )
    plan = models.CharField(max_length=40, default='Coach Pro')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_ACTIVA)
    # Slots de atletas incluidos en el plan. El uso real se deriva de la cartera
    # (no se persiste un contador para no desincronizarse de CoachAthlete).
    slots_incluidos = models.IntegerField(default=15)
    fecha_corte = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coach_subscriptions'

    def __str__(self):
        return f'{self.coach_id} · {self.plan} [{self.estado}]'


class CoachAssignedSession(models.Model):
    """Rutina manual que el coach arma para un atleta en una fecha (Fase rutina-manual).

    Es el CONTENEDOR del borrador: el contenido vive aquí (no como Session) para
    que los borradores NUNCA contaminen las consultas del atleta (dashboard,
    historial, estadísticas, fatiga). Solo al PUBLICAR se materializa una
    `workouts.Session` real (origen='coach') que el atleta consume por el camino
    de siempre; el FK `session` apunta a esa fila materializada.

    `contenido` replica la forma de `Session.respuesta_ia`:
      {titulo, objetivo_sesion, duracion_total, rpe_target,
       fases: [{nombre, duracion_minutos, ejercicios: [{nombre, series,
                repeticiones, descanso_segundos, rpe_sugerido, notas}]}],
       nota_del_entrenador}
    """
    ESTADO_BORRADOR = 'borrador'
    ESTADO_PUBLICADA = 'publicada'
    ESTADO_CHOICES = [(ESTADO_BORRADOR, 'Borrador'), (ESTADO_PUBLICADA, 'Publicada')]

    coach = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rutinas_asignadas',
    )
    athlete = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rutinas_de_coach',
    )
    fecha = models.DateField()
    titulo = models.CharField(max_length=200, blank=True)
    contenido = models.JSONField(default=dict, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_BORRADOR)
    # Session materializada al publicar (null mientras es borrador). SET_NULL para
    # no borrar la rutina si el atleta elimina su sesión.
    session = models.ForeignKey(
        'workouts.Session', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'coach_assigned_sessions'
        unique_together = [['coach', 'athlete', 'fecha']]
        ordering = ['-fecha']
        indexes = [models.Index(fields=['athlete', 'fecha'])]

    def __str__(self):
        return f'{self.coach_id}→{self.athlete_id} {self.fecha} [{self.estado}]'


class CoachMessage(models.Model):
    """Mensaje del chat coach↔atleta, asociado a un vínculo CoachAthlete."""
    link = models.ForeignKey(CoachAthlete, on_delete=models.CASCADE, related_name='mensajes')
    from_coach = models.BooleanField()   # True = lo envió el coach; False = el atleta
    texto = models.TextField()
    leido = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coach_messages'
        ordering = ['created_at']
        indexes = [models.Index(fields=['link', 'created_at'])]

    def __str__(self):
        return f'{"coach" if self.from_coach else "atleta"}: {self.texto[:30]}'
