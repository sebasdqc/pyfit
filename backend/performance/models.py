"""Modelos de la vertical B2B "Zyfit Performance".

Jerarquía:

    SportsCenter                  ← entidad raíz (un club / centro de alto rendimiento)
      ├── CenterMembership        ← staff del centro, cada uno con su ROL fino
      ├── CenterAthlete           ← atletas del equipo (los registra el director)
      └── datos por módulo:
            PerformanceMetric     ← módulo RENDIMIENTO
            InjuryReport          ← módulo LESIONES
            PhysicalTest          ← módulo TEST
            TrainingPlan          ← módulo PLANIFICACIÓN
            PsychAssessment       ← módulo PSICOLÓGICO

Todo cuelga de un centro. El rol global de la cuenta (director_tecnico / admin /
atleta) vive en users.User.role; el rol fino "dentro de este centro" vive en
CenterMembership.rol. Un mismo User puede tener varias pertenencias (p. ej.
director en un centro y fisioterapeuta en otro).

Los cinco identificadores de módulo son la fuente única de verdad que comparten
la barra lateral del panel web y el control de acceso por pertenencia.
"""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


# ─── Módulos del panel (barra lateral izquierda) ──────────────────────────────
# IDs canónicos; el frontend pinta el sidebar a partir de esta misma lista.
MODULE_RENDIMIENTO = 'rendimiento'
MODULE_LESIONES = 'lesiones'
MODULE_TEST = 'test'
MODULE_PLANIFICACION = 'planificacion'
MODULE_PSICOLOGICO = 'psicologico'

MODULE_CHOICES = [
    (MODULE_RENDIMIENTO, 'Rendimiento'),
    (MODULE_LESIONES, 'Lesiones'),
    (MODULE_TEST, 'Test'),
    (MODULE_PLANIFICACION, 'Planificación'),
    (MODULE_PSICOLOGICO, 'Psicológico'),
]

ALL_MODULES = [m[0] for m in MODULE_CHOICES]

# ─── Públicos del producto (segmento / tipo de centro) ────────────────────────
# Los tres que la landing pública ya diferencia en "Para quién"
# (/para-quien/:segment). Mismos IDs a propósito, y definidos ACÁ ARRIBA porque
# ya no son un detalle del onboarding: los usan dos cosas distintas.
#
#   PerformanceOnboarding.segmento → ATRIBUCIÓN. Quién llegó y desde dónde.
#                                    Se lee en el admin, no toca la interfaz.
#   SportsCenter.tipo              → PRODUCTO. Cómo se comporta el panel.
#
# Son dos campos con dos trabajos, no una duplicación: la experiencia es una
# propiedad de la organización, no de la persona (un mismo fisioterapeuta puede
# trabajar para un club y para un colegio, y debe ver el panel correcto en cada
# centro).
SEGMENTO_EQUIPOS = 'equipos'
SEGMENTO_INSTITUCIONES = 'instituciones'
SEGMENTO_ATLETAS = 'atletas'

SEGMENTO_CHOICES = [
    (SEGMENTO_EQUIPOS, 'Equipos deportivos'),
    (SEGMENTO_INSTITUCIONES, 'Instituciones educativas'),
    (SEGMENTO_ATLETAS, 'Atletas de alto rendimiento'),
]



class SportsCenter(models.Model):
    """Centro deportivo de alto rendimiento — entidad raíz del vertical B2B.

    Todos los roles de staff y todos los atletas se desglosan dentro de un
    centro. Lo crea el admin de producto; el director técnico lo gestiona.
    """

    nombre = models.CharField(max_length=160)
    # Público del centro: es lo que MANDA sobre cómo se comporta el panel
    # (navegación, vocabulario, tarjetas del dashboard). Se siembra con la
    # respuesta del onboarding de quien crea el centro y el director lo puede
    # corregir después desde el admin.
    #
    # Default 'equipos' a propósito: es exactamente el panel que ya venían
    # usando todos los centros existentes, así que la migración no cambia nada
    # para nadie.
    #
    # ⚠️ NO es un permiso. Que el panel oculte un módulo por tipo de centro es
    # relevancia, no seguridad: el límite real sigue siendo
    # permissions.can_access_module en el servidor.
    tipo = models.CharField(
        max_length=20, choices=SEGMENTO_CHOICES, default=SEGMENTO_EQUIPOS,
    )
    # Identificador legible para rutas / subdominio del panel (p. ej. 'cd-aguilas').
    slug = models.SlugField(max_length=80, unique=True)
    ciudad = models.CharField(max_length=120, blank=True)
    pais = models.CharField(max_length=80, blank=True)
    disciplina = models.CharField(
        max_length=120, blank=True,
        help_text='Deporte principal del centro (fútbol, atletismo, natación…).',
    )
    # Director principal / dueño de la cuenta del centro. SET_NULL para no perder
    # el centro si se borra la cuenta; el resto del staff vive en CenterMembership.
    director_principal = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='centros_dirigidos',
    )
    # Exige consentimiento de la tutoría para tratar datos de salud,
    # psicométricos y antropométricos de los menores del centro (ver
    # permissions.puede_registrar_dato_sensible).
    #
    # Default False a propósito, y NO porque un menor en un club merezca menos
    # protección que uno en un colegio — merece la misma. Es que activarlo de
    # golpe en los centros que ya existen bloquearía el registro de lesiones de
    # cualquier atleta sin fecha de nacimiento cargada, que hoy son muchos: se
    # rompería el panel de gente que está trabajando. Los centros nuevos de tipo
    # `instituciones` nacen con esto en True (ver centers_view), y cualquier otro
    # centro puede activarlo desde Ajustes cuando tenga las fechas cargadas.
    proteccion_menores = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'performance_centers'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class CenterMembership(models.Model):
    """Pertenencia de un miembro de staff a un centro, con su rol específico.

    Captura "múltiples roles de staff dentro del mismo centro": cada rol mapea a
    uno o más de los cinco módulos. `modulos` es la whitelist efectiva de módulos
    a los que ese staff accede (el director técnico ve los cinco). Un par
    (centro, usuario) es único: una persona tiene un rol por centro.
    """

    ROL_DIRECTOR = 'director_tecnico'
    ROL_PREPARADOR = 'preparador_fisico'    # rendimiento
    ROL_FISIO = 'fisioterapeuta'            # lesiones
    ROL_ANALISTA = 'analista'               # test
    ROL_PLANIFICADOR = 'planificador'       # planificación
    ROL_PSICOLOGO = 'psicologo'             # psicológico
    ROL_CHOICES = [
        (ROL_DIRECTOR, 'Director técnico'),
        (ROL_PREPARADOR, 'Preparador físico'),
        (ROL_FISIO, 'Fisioterapeuta'),
        (ROL_ANALISTA, 'Analista de test'),
        (ROL_PLANIFICADOR, 'Planificador'),
        (ROL_PSICOLOGO, 'Psicólogo'),
    ]

    # Módulos por defecto que ve cada rol. El director ve todos; cada especialista
    # ve su módulo. Editable luego por centro vía el campo `modulos`.
    DEFAULT_MODULES = {
        ROL_DIRECTOR: ALL_MODULES,
        ROL_PREPARADOR: [MODULE_RENDIMIENTO, MODULE_PLANIFICACION, MODULE_TEST],
        ROL_FISIO: [MODULE_LESIONES],
        ROL_ANALISTA: [MODULE_TEST, MODULE_RENDIMIENTO],
        ROL_PLANIFICADOR: [MODULE_PLANIFICACION],
        ROL_PSICOLOGO: [MODULE_PSICOLOGICO],
    }

    center = models.ForeignKey(
        SportsCenter, on_delete=models.CASCADE, related_name='memberships',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='center_memberships',
    )
    rol = models.CharField(max_length=30, choices=ROL_CHOICES)
    # Whitelist de módulos visibles para este staff dentro del centro.
    modulos = models.JSONField(default=list, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'performance_memberships'
        unique_together = [['center', 'user']]
        ordering = ['center', 'rol']
        indexes = [models.Index(fields=['center', 'activo'])]

    def __str__(self):
        return f'{self.user_id} @ {self.center_id} [{self.rol}]'

    def save(self, *args, **kwargs):
        # Si no se especifican módulos, se siembran a partir del rol.
        if not self.modulos:
            self.modulos = list(self.DEFAULT_MODULES.get(self.rol, []))
        super().save(*args, **kwargs)

    def puede_ver(self, modulo: str) -> bool:
        return modulo in (self.modulos or [])


class CenterAthlete(models.Model):
    """Atleta del equipo, registrado en un centro (Paso 2 del vertical).

    A diferencia del vínculo coach↔atleta del producto de consumo (donde el
    ATLETA ingresa un código de invitación), aquí es el DIRECTOR TÉCNICO quien
    registra al atleta dentro del centro. `registrado_por` deja constancia de
    qué staff lo dio de alta.
    """

    ESTADO_ACTIVO = 'activo'
    ESTADO_LESIONADO = 'lesionado'
    ESTADO_BAJA = 'baja'
    ESTADO_CHOICES = [
        (ESTADO_ACTIVO, 'Activo'),
        (ESTADO_LESIONADO, 'Lesionado'),
        (ESTADO_BAJA, 'Baja'),
    ]

    center = models.ForeignKey(
        SportsCenter, on_delete=models.CASCADE, related_name='atletas',
    )
    athlete = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='center_athlete_links',
    )
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='atletas_registrados',
    )
    dorsal = models.CharField(max_length=10, blank=True)
    posicion = models.CharField(max_length=80, blank=True)
    grupo = models.CharField(
        max_length=80, blank=True,
        help_text=(
            'LEGADO: subgrupo como texto libre. Para instituciones educativas usar '
            '`categoria` (modelo Categoria), que sí permite comparar entre categorías '
            'y seguir al alumno entre temporadas. Se conserva para no perder datos ya '
            'cargados; no se migra automáticamente porque el texto libre no es fiable '
            'como fuente (la misma categoría escrita de tres formas serían tres filas).'
        ),
    )
    categoria = models.ForeignKey(
        'Categoria', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='atletas',
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_ACTIVO)
    foto = models.TextField(
        blank=True,
        help_text=(
            'Foto del atleta como data URL (base64). Vía LEGADA / fallback: se usa '
            'solo cuando DO Spaces no está configurado (USE_SPACES=False). Con Spaces '
            'activo, la foto vive en `foto_img` y este campo queda vacío. Se conserva '
            'para no perder fotos antiguas en filas ya existentes.'
        ),
    )
    # Foto en object storage (DO Spaces / S3) cuando está configurado. El serializer
    # decodifica el data URL que envía el cliente y lo sube aquí; `.url` devuelve la
    # URL firmada. FileField (no ImageField) para no exigir Pillow: el tipo de imagen
    # ya se valida en el serializer a partir del data URL.
    foto_img = models.FileField(upload_to='athletes/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'performance_center_athletes'
        unique_together = [['center', 'athlete']]
        ordering = ['-created_at']
        indexes = [models.Index(fields=['center', 'estado'])]

    def __str__(self):
        return f'{self.athlete_id} @ {self.center_id} [{self.estado}]'

    @property
    def fecha_nacimiento(self):
        """Fecha de nacimiento del alumno/atleta, o None si no está cargada.

        Vive en users.Profile — no se duplica acá. Si no hay Profile o el campo
        está vacío devuelve None, y quien decide sobre menores debe tratar ese
        None como "no sé" (ver `es_menor`)."""
        perfil = getattr(self.athlete, 'profile', None)
        return getattr(perfil, 'fecha_nacimiento', None) if perfil else None

    def edad(self, hoy=None):
        """Edad en años cumplidos, o None si no hay fecha de nacimiento."""
        nacimiento = self.fecha_nacimiento
        if not nacimiento:
            return None
        from datetime import date
        hoy = hoy or date.today()
        return hoy.year - nacimiento.year - (
            (hoy.month, hoy.day) < (nacimiento.month, nacimiento.day)
        )

    def es_menor(self, hoy=None) -> bool:
        """¿Hay que tratar a esta persona como menor de edad?

        Sin fecha de nacimiento devuelve True: NO se asume mayoría de edad. Un
        dato faltante no puede convertirse en permiso para tratar datos de salud
        de un chico sin autorización — se falla hacia el lado seguro y el centro
        resuelve cargando la fecha."""
        edad = self.edad(hoy)
        return True if edad is None else edad < EDAD_MAYORIA

    def consentimiento_vigente(self):
        """Consentimiento no revocado más reciente, o None."""
        return self.consentimientos.filter(revocado_en__isnull=True).first()


# ─── Mixin común a los registros de módulo ────────────────────────────────────

class CenterRecord(models.Model):
    """Base abstracta de todo dato que un staff registra sobre un atleta.

    Centraliza el centro, el atleta, quién lo registró y la fecha — el patrón se
    repite en los cinco módulos.
    """

    center = models.ForeignKey(
        SportsCenter, on_delete=models.CASCADE, related_name='+',
    )
    athlete = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+',
    )
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    fecha = models.DateField()
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        ordering = ['-fecha', '-created_at']


# ─── Módulo RENDIMIENTO ───────────────────────────────────────────────────────

class PerformanceMetric(CenterRecord):
    """Métrica de rendimiento de un atleta (GPS, fuerza, potencia, carga…)."""

    TIPO_CHOICES = [
        ('velocidad', 'Velocidad'),
        ('fuerza', 'Fuerza'),
        ('potencia', 'Potencia'),
        ('resistencia', 'Resistencia'),
        ('carga', 'Carga de trabajo'),
        ('otro', 'Otro'),
    ]

    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='otro')
    metrica = models.CharField(max_length=120)   # p. ej. 'distancia total', 'CMJ'
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    unidad = models.CharField(max_length=20, blank=True)

    class Meta(CenterRecord.Meta):
        db_table = 'performance_metrics'
        indexes = [models.Index(fields=['center', 'athlete', '-fecha'])]


# ─── Módulo LESIONES ──────────────────────────────────────────────────────────

class InjuryReport(CenterRecord):
    """Parte de lesión gestionado por el área médica / fisioterapia del centro.

    Lleva los datos clínicos del parte (zona, tipo de tejido, severidad, estado,
    tratamiento, alta estimada) y la ubicación sobre el MAPA CORPORAL del panel:
    `vista` (frente/espalda) + `zona_x`/`zona_y`, coordenadas sobre el maniquí de
    viewBox 200×415 que se fijan pulsando el sitio de la lesión en la UI. Así el
    mapa de lesiones se dibuja con datos reales, no con coordenadas inventadas.
    """

    SEVERIDAD_CHOICES = [
        ('leve', 'Leve'), ('moderada', 'Moderada'), ('grave', 'Grave'),
    ]
    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('recuperacion', 'En recuperación'),
        ('alta', 'Alta'),
    ]
    # Tipo de tejido lesionado (relevante clínicamente y para el color/ícono).
    TIPO_CHOICES = [
        ('muscular', 'Muscular'),
        ('articular', 'Articular'),
        ('ligamentosa', 'Ligamentosa'),
        ('tendinosa', 'Tendinosa'),
        ('osea', 'Ósea'),
    ]
    VISTA_CHOICES = [('frente', 'Frente'), ('espalda', 'Espalda')]

    zona = models.CharField(max_length=80)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='muscular')
    diagnostico = models.CharField(max_length=200, blank=True)
    mecanismo = models.CharField(
        max_length=120, blank=True,
        help_text='Mecanismo lesional (sprint, contacto, sobrecarga, esguince…).',
    )
    severidad = models.CharField(max_length=20, choices=SEVERIDAD_CHOICES, default='leve')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activa')
    tratamiento = models.TextField(blank=True)
    fecha_alta_estimada = models.DateField(null=True, blank=True)
    # Ubicación en el mapa corporal del panel (maniquí de viewBox 200×415).
    vista = models.CharField(max_length=10, choices=VISTA_CHOICES, default='frente')
    zona_x = models.PositiveSmallIntegerField(
        default=100, validators=[MinValueValidator(0), MaxValueValidator(200)],
    )
    zona_y = models.PositiveSmallIntegerField(
        default=200, validators=[MinValueValidator(0), MaxValueValidator(415)],
    )

    class Meta(CenterRecord.Meta):
        db_table = 'performance_injury_reports'
        indexes = [models.Index(fields=['center', 'estado'])]


# ─── Módulo TEST ──────────────────────────────────────────────────────────────

class TestDefinition(models.Model):
    """Espejo en BD del catálogo de calculadoras de test.

    La FUENTE ÚNICA de verdad del catálogo es el REGISTRY de
    `performance.calculators` (código); esta tabla es su reflejo persistido, que se
    siembra con `manage.py seed_tests`. Sirve para que el admin (Unfold) y otros
    consumidores SQL vean/auditen el catálogo y para activar o desactivar tests sin
    tocar código. El cálculo NUNCA usa esta tabla: corre siempre contra el REGISTRY
    en el servidor.
    """

    FAMILIA_CHOICES = [
        ('fisico', 'Físico'),
        ('tecnico', 'Técnico'),
        ('tactico', 'Táctico'),
    ]

    slug = models.SlugField(max_length=60, unique=True)
    familia = models.CharField(max_length=20, choices=FAMILIA_CHOICES)
    nombre = models.CharField(max_length=160)
    descripcion = models.TextField(blank=True)
    # Esquema de inputs que el frontend renderiza (copiado del calculador).
    input_schema = models.JSONField(default=list, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'performance_test_definitions'
        ordering = ['familia', 'slug']

    def __str__(self):
        return f'{self.nombre} ({self.slug})'


class PhysicalTest(CenterRecord):
    """Resultado de un test estandarizado de un atleta.

    Dos vías de registro:
      • Con calculadora (recomendada): el cliente envía `test_slug` + `inputs`
        crudos y el SERVIDOR calcula. `inputs` guarda la entrada ya validada y
        `resultados` la salida rica del motor; `resultado`/`unidad` quedan vacíos.
      • Manual / legado: el cliente envía `nombre` + `resultado` (+ `unidad`), un
        único valor numérico, sin pasar por el motor.
    """

    # Slug de la calculadora usada (performance.calculators). Vacío = entrada manual.
    test_slug = models.SlugField(max_length=60, blank=True, db_index=True)
    nombre = models.CharField(max_length=120)
    categoria = models.CharField(max_length=80, blank=True)
    # Entrada validada y salida calculada por el servidor (vía calculadora).
    inputs = models.JSONField(default=dict, blank=True)
    resultados = models.JSONField(default=dict, blank=True)
    # Vía manual/legado: un único valor. Nulo en entradas con calculadora.
    resultado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unidad = models.CharField(max_length=20, blank=True)

    class Meta(CenterRecord.Meta):
        db_table = 'performance_tests'
        indexes = [
            models.Index(fields=['center', 'athlete', '-fecha']),
            models.Index(fields=['center', 'test_slug', '-fecha']),
        ]


# ─── Módulo PLANIFICACIÓN: periodización (macro → meso → micro) ───────────────
# TrainingPlan actúa como MACROCICLO (temporada o gran fase). De él cuelgan sus
# mesociclos (fases) y de cada uno sus microciclos (semanas). Vocabulario de
# periodización clásica de equipo (Matveyev/Bompa); lo estructura manualmente el
# cuerpo técnico (NO es el motor adaptativo del consumo).

class TrainingPlan(models.Model):
    """Macrociclo: plan / periodización de entrenamiento de un centro.

    Puede ser individual (athlete != null) o de equipo (athlete == null). No
    hereda de CenterRecord porque su sujeto es el centro/grupo, no siempre un
    atleta, y tiene rango de fechas en vez de una fecha puntual. Sus fases se
    modelan en Mesocycle y las semanas de cada fase en Microcycle.
    """

    center = models.ForeignKey(
        SportsCenter, on_delete=models.CASCADE, related_name='planes',
    )
    athlete = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True,
        related_name='+',
    )
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    nombre = models.CharField(max_length=160)
    objetivo = models.CharField(max_length=200, blank=True)
    # Grupo / categoría del centro al que se aplica el plan (p. ej. "Primer
    # equipo", "Sub-18"). Plan de equipo si athlete es null; individual si no.
    grupo = models.CharField(max_length=80, blank=True)
    descripcion = models.TextField(blank=True)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'performance_plans'
        ordering = ['-fecha_inicio']
        indexes = [models.Index(fields=['center', '-fecha_inicio'])]

    def __str__(self):
        return self.nombre


class Mesocycle(models.Model):
    """Fase del macrociclo (típicamente 3–6 semanas), ordenada dentro del plan.

    El `tipo` son las fases clásicas de la periodización por equipos; el cuerpo
    técnico fija el énfasis y la carga objetivo de cada fase.
    """

    TIPO_PREP_GENERAL = 'prep_general'
    TIPO_PREP_ESPECIFICA = 'prep_especifica'
    TIPO_PRECOMPETITIVO = 'precompetitivo'
    TIPO_COMPETITIVO = 'competitivo'
    TIPO_TRANSICION = 'transicion'
    TIPO_CHOICES = [
        (TIPO_PREP_GENERAL, 'Preparación general'),
        (TIPO_PREP_ESPECIFICA, 'Preparación específica'),
        (TIPO_PRECOMPETITIVO, 'Precompetitivo'),
        (TIPO_COMPETITIVO, 'Competitivo'),
        (TIPO_TRANSICION, 'Transición'),
    ]
    CARGA_CHOICES = [
        ('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta'), ('pico', 'Pico'),
    ]

    plan = models.ForeignKey(
        TrainingPlan, on_delete=models.CASCADE, related_name='mesociclos',
    )
    orden = models.PositiveIntegerField(default=0)
    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default=TIPO_PREP_GENERAL)
    enfasis = models.CharField(max_length=200, blank=True)
    carga_objetivo = models.CharField(max_length=10, choices=CARGA_CHOICES, default='media')
    duracion_semanas = models.PositiveIntegerField(default=4)
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'performance_mesocycles'
        ordering = ['plan', 'orden']
        indexes = [models.Index(fields=['plan', 'orden'])]

    def __str__(self):
        return f'{self.nombre} ({self.tipo})'


class Microcycle(models.Model):
    """Semana de un mesociclo, ordenada dentro de la fase.

    `carga_relativa` (0–100 %) es la palanca que dibuja la onda de carga del
    macrociclo; `tipo` es el carácter de la semana (carga, choque, recuperación…).
    """

    TIPO_AJUSTE = 'ajuste'
    TIPO_CARGA = 'carga'
    TIPO_CHOQUE = 'choque'
    TIPO_ACTIVACION = 'activacion'
    TIPO_COMPETITIVO = 'competitivo'
    TIPO_RECUPERACION = 'recuperacion'
    TIPO_CHOICES = [
        (TIPO_AJUSTE, 'Ajuste'),
        (TIPO_CARGA, 'Carga'),
        (TIPO_CHOQUE, 'Choque'),
        (TIPO_ACTIVACION, 'Activación'),
        (TIPO_COMPETITIVO, 'Competitivo'),
        (TIPO_RECUPERACION, 'Recuperación'),
    ]
    NIVEL_CHOICES = [('bajo', 'Bajo'), ('medio', 'Medio'), ('alto', 'Alto')]

    mesociclo = models.ForeignKey(
        Mesocycle, on_delete=models.CASCADE, related_name='microciclos',
    )
    orden = models.PositiveIntegerField(default=0)
    # Fecha de inicio de la semana (opcional; ancla el microciclo al calendario).
    fecha_inicio = models.DateField(null=True, blank=True)
    nombre = models.CharField(max_length=120, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default=TIPO_CARGA)
    # Carga relativa de la semana (% respecto al pico del macrociclo).
    carga_relativa = models.PositiveIntegerField(default=50)
    volumen = models.CharField(max_length=10, choices=NIVEL_CHOICES, default='medio')
    intensidad = models.CharField(max_length=10, choices=NIVEL_CHOICES, default='medio')
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'performance_microcycles'
        ordering = ['mesociclo', 'orden']
        indexes = [models.Index(fields=['mesociclo', 'orden'])]

    def __str__(self):
        return f'{self.nombre or self.tipo} ({self.carga_relativa}%)'


class PlannedSession(models.Model):
    """Sesión de UN día dentro de un microciclo (semana).

    Resuelve la granularidad que faltaba en la periodización clásica
    (Micro/Meso/TrainingPlan solo tenían metadatos de fase, sin días ni
    contenido) y da un lugar donde colgar sesiones generadas con IA. La
    prescripción numérica (tipo/duración/RPE objetivo) la fija el cuerpo
    técnico; si se genera con IA, el LLM solo redacta/completa `contenido` y
    `respuesta_ia` — igual patrón que `runs.PlannedRunSession` (el motor manda
    los números, el LLM redacta).

    La comparación con carga/bienestar REAL nunca se cachea aquí: se calcula
    en caliente (team_session_generator.py / planning_advisor.py) a partir de
    `microciclo.fecha_inicio` + `dia_semana`, para no arrastrar datos viejos si
    el técnico reordena o edita la semana después.
    """

    ORIGEN_MANUAL = 'manual'
    ORIGEN_IA = 'ia'
    ORIGEN_CHOICES = [(ORIGEN_MANUAL, 'Manual'), (ORIGEN_IA, 'IA')]

    TIPO_FUERZA = 'fuerza'
    TIPO_TECNICO_TACTICO = 'tecnico_tactico'
    TIPO_FISICO = 'fisico'
    TIPO_RECUPERACION = 'recuperacion'
    TIPO_PARTIDO = 'partido'
    TIPO_DESCANSO = 'descanso'
    TIPO_OTRO = 'otro'
    TIPO_CHOICES = [
        (TIPO_FUERZA, 'Fuerza'),
        (TIPO_TECNICO_TACTICO, 'Técnico-táctico'),
        (TIPO_FISICO, 'Físico / condicional'),
        (TIPO_RECUPERACION, 'Recuperación'),
        (TIPO_PARTIDO, 'Partido'),
        (TIPO_DESCANSO, 'Descanso'),
        (TIPO_OTRO, 'Otro'),
    ]

    ESTADO_BORRADOR = 'borrador'
    ESTADO_GENERADA = 'generada'
    ESTADO_PUBLICADA = 'publicada'
    ESTADO_CHOICES = [
        (ESTADO_BORRADOR, 'Borrador'),
        (ESTADO_GENERADA, 'Generada con IA'),
        (ESTADO_PUBLICADA, 'Publicada'),
    ]

    microciclo = models.ForeignKey(
        Microcycle, on_delete=models.CASCADE, related_name='sesiones',
    )
    # 0=lunes .. 6=domingo.
    dia_semana = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(6)],
    )
    # Calculada por el serializer/view desde microciclo.fecha_inicio + dia_semana
    # (no vía señales). Null si el microciclo no tiene fecha_inicio.
    fecha = models.DateField(null=True, blank=True)
    # Desempate para doble sesión el mismo día (mañana/tarde).
    orden = models.PositiveSmallIntegerField(default=0)

    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default=TIPO_TECNICO_TACTICO)
    nombre = models.CharField(max_length=160, blank=True)
    duracion_min = models.PositiveIntegerField(null=True, blank=True)
    rpe_objetivo = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    # RPE × duración previsto, comparable con el sRPE real del módulo Carga interna.
    carga_objetivo_ua = models.PositiveIntegerField(null=True, blank=True)

    # Vínculo formal opcional día↔evento (a diferencia de TrainingPlan.grupo,
    # que sigue siendo un string suelto porque a ese nivel la relación es difusa).
    evento = models.ForeignKey(
        'performance.CalendarEvent', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sesiones_planificadas',
    )

    origen = models.CharField(max_length=10, choices=ORIGEN_CHOICES, default=ORIGEN_MANUAL)
    # Estructura final: fases/bloques + variantes individuales (RTP/ACWR alto).
    # JSON, no filas hijas: no hay necesidad de analítica cruzada por ejercicio
    # como en el consumo individual (workouts.SessionExercise).
    contenido = models.JSONField(default=dict, blank=True)
    respuesta_ia = models.JSONField(null=True, blank=True)
    prompt_usado = models.TextField(blank=True)
    generacion_ms = models.IntegerField(null=True, blank=True)
    tokens_in = models.IntegerField(null=True, blank=True)
    tokens_out = models.IntegerField(null=True, blank=True)

    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default=ESTADO_BORRADOR)
    notas = models.TextField(blank=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'performance_planned_sessions'
        ordering = ['microciclo', 'dia_semana', 'orden']
        indexes = [
            models.Index(fields=['microciclo', 'dia_semana']),
            models.Index(fields=['fecha']),
        ]

    def __str__(self):
        return f'{self.nombre or self.tipo} (día {self.dia_semana})'


# ─── Módulo PSICOLÓGICO ───────────────────────────────────────────────────────

class PsychAssessment(CenterRecord):
    """Evaluación psicológica de un atleta (datos sensibles, acceso restringido
    al rol de psicólogo y al director técnico).

    Dos vías:
      • Con instrumento (cuestionarios validados): se envía `instrument` +
        `subescalas` y el SERVIDOR calcula `resultados` (índices compuestos) desde
        `performance.psicometria`. `puntuacion` guarda el índice principal.
      • Manual / legado: `tipo` + `puntuacion` (un único valor).
    """

    TIPO_CHOICES = [
        ('estado_animo', 'Estado de ánimo'),
        ('ansiedad', 'Ansiedad'),
        ('motivacion', 'Motivación'),
        ('estres', 'Estrés'),
        ('cohesion', 'Cohesión de equipo'),
        ('otro', 'Otro'),
    ]

    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='otro')
    # Slug del instrumento (performance.psicometria). Vacío = entrada manual.
    instrument = models.CharField(max_length=40, blank=True)
    # Puntuaciones de subescala (entrada validada) y resultados calculados (servidor).
    subescalas = models.JSONField(default=dict, blank=True)
    resultados = models.JSONField(default=dict, blank=True)
    # Índice principal (índice compuesto del instrumento o valor manual).
    puntuacion = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    class Meta(CenterRecord.Meta):
        db_table = 'performance_psych_assessments'
        indexes = [models.Index(fields=['center', 'athlete', '-fecha'])]


class WellnessCheckin(CenterRecord):
    """Check-in de bienestar de un atleta (autopercepción, escala 1–7, mayor = mejor).

    Subescalas tipo Hooper-Mackinnon + ánimo. El `indice_bienestar` (0–100) lo
    calcula el servidor al guardar, desde `performance.wellness` (única fuente de
    la fórmula). Un check-in por atleta y día.
    """

    sueno = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(7)])
    fatiga = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(7)])
    estres = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(7)])
    dolor_muscular = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(7)])
    animo = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(7)])
    # Índice agregado 0–100 (mayor = mejor), calculado en save().
    indice_bienestar = models.PositiveSmallIntegerField(default=0)

    class Meta(CenterRecord.Meta):
        db_table = 'performance_wellness_checkins'
        unique_together = [['center', 'athlete', 'fecha']]
        indexes = [models.Index(fields=['center', 'athlete', '-fecha'])]

    def save(self, *args, **kwargs):
        from .wellness import ITEM_NAMES, compute_index
        self.indice_bienestar = compute_index({n: getattr(self, n) for n in ITEM_NAMES})
        super().save(*args, **kwargs)


class TacticalPlay(models.Model):
    """Jugada de la PIZARRA TÁCTICA (módulo Simulador).

    Tablero de una cancha donde el cuerpo técnico coloca jugadores (de la
    plantilla del centro), rivales y un balón, y dibuja supuestos de jugada con
    distintos trazos (pase, conducción, movimiento sin balón, bloqueo).

    REGLA CLAVE — coordenadas NORMALIZADAS: todo lo que se coloca o se dibuja se
    guarda en valores relativos al ancho/alto del campo (x, y ∈ [0, 1]), NUNCA
    en píxeles, para que la jugada se vea igual en cualquier dispositivo. El
    serializer valida que así sea.

    Pensado para crecer a ANIMACIÓN sin cambiar el esquema: la escena se guarda
    como una lista ordenada de `frames` (keyframes). Hoy la UI produce un único
    frame (estático); cuando se añadan animaciones, se guardan más frames y se
    interpola entre ellos. Forma de `escena`:

        {
          "version": 1,
          "frames": [
            {
              "fichas": [
                {"id": "...", "tipo": "jugador"|"rival"|"balon",
                 "ref": <id atleta|null>, "etiqueta": "10", "x": 0.5, "y": 0.6}
              ],
              "trazos": [
                {"id": "...", "tipo": "pase"|"conduccion"|"mov_sin_balon"|"bloqueo",
                 "puntos": [{"x": 0.5, "y": 0.6}, {"x": 0.7, "y": 0.4}]}
              ]
            }
          ]
        }
    """

    center = models.ForeignKey(
        SportsCenter, on_delete=models.CASCADE, related_name='jugadas',
    )
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='jugadas_registradas',
    )
    nombre = models.CharField(max_length=140)
    descripcion = models.TextField(blank=True)
    formacion = models.CharField(
        max_length=40, blank=True, help_text='Formación, p. ej. "4-3-3" (opcional).',
    )
    campo = models.CharField(
        max_length=20, default='completo',
        help_text='Vista de cancha: completo | medio (para futuros set pieces).',
    )
    escena = models.JSONField(
        default=dict, blank=True,
        help_text='Documento de la escena con coordenadas normalizadas (0..1). Ver docstring.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'performance_tactical_plays'
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['center', '-updated_at'])]

    def __str__(self):
        return f'{self.nombre} @ {self.center_id}'


# ─── Módulo CALENDARIO ────────────────────────────────────────────────────────

class CalendarEvent(models.Model):
    """Evento del CALENDARIO del centro: la línea de tiempo de la temporada.

    Cubre tanto "contenedores" largos —que enmarcan el trabajo del año—
      • temporada      (rango largo: pretemporada → fin de la liga)
      • torneo         (una copa / competición concreta)
      • concentracion  (stage / gira)
    como eventos puntuales del día a día
      • partido        (con rival y, opcionalmente, hora y localía)
      • entrenamiento
      • evaluacion     (día de tests físicos / médicos)
      • descanso       (día libre / recuperación)
      • otro

    No hereda de CenterRecord: su sujeto es el centro o un GRUPO (no un atleta) y
    tiene rango de fechas en vez de una fecha puntual. Un evento de un solo día
    deja `fecha_fin` en null (se interpreta = fecha_inicio).
    """

    TIPO_TEMPORADA = 'temporada'
    TIPO_TORNEO = 'torneo'
    TIPO_CONCENTRACION = 'concentracion'
    TIPO_PARTIDO = 'partido'
    TIPO_ENTRENAMIENTO = 'entrenamiento'
    TIPO_EVALUACION = 'evaluacion'
    TIPO_DESCANSO = 'descanso'
    TIPO_OTRO = 'otro'
    TIPO_CHOICES = [
        (TIPO_TEMPORADA, 'Temporada'),
        (TIPO_TORNEO, 'Torneo'),
        (TIPO_CONCENTRACION, 'Concentración'),
        (TIPO_PARTIDO, 'Partido'),
        (TIPO_ENTRENAMIENTO, 'Entrenamiento'),
        (TIPO_EVALUACION, 'Evaluación'),
        (TIPO_DESCANSO, 'Descanso'),
        (TIPO_OTRO, 'Otro'),
    ]

    # Localía del partido (solo aplica a tipo=partido; informativo para los demás).
    LOCALIA_LOCAL = 'local'
    LOCALIA_VISITA = 'visita'
    LOCALIA_NEUTRAL = 'neutral'
    LOCALIA_CHOICES = [
        (LOCALIA_LOCAL, 'Local'),
        (LOCALIA_VISITA, 'Visitante'),
        (LOCALIA_NEUTRAL, 'Cancha neutral'),
    ]

    center = models.ForeignKey(
        SportsCenter, on_delete=models.CASCADE, related_name='eventos',
    )
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='eventos_registrados',
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default=TIPO_OTRO)
    titulo = models.CharField(max_length=160)
    descripcion = models.TextField(blank=True)
    fecha_inicio = models.DateField()
    # null = evento de un solo día (se interpreta igual a fecha_inicio).
    fecha_fin = models.DateField(null=True, blank=True)
    # Hora de inicio (opcional). Si todo_el_dia, se ignora en la UI.
    hora_inicio = models.TimeField(null=True, blank=True)
    todo_el_dia = models.BooleanField(default=True)
    ubicacion = models.CharField(max_length=160, blank=True)
    # Categoría / equipo del centro al que aplica el evento (p. ej. "Sub-18").
    grupo = models.CharField(max_length=80, blank=True)
    # Solo para partidos: rival y localía.
    rival = models.CharField(max_length=120, blank=True)
    localia = models.CharField(max_length=10, choices=LOCALIA_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'performance_calendar_events'
        ordering = ['fecha_inicio', 'hora_inicio']
        indexes = [models.Index(fields=['center', 'fecha_inicio'])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=models.F('fecha_inicio')),
                name='calendarevent_fin_after_inicio',
            ),
        ]

    def __str__(self):
        return f'{self.titulo} ({self.fecha_inicio})'


# ─── Onboarding de primer inicio de sesión ────────────────────────────────────
# Perfilado que se pide una sola vez, la primera vez que alguien entra al panel.
# Vive en la app `performance` (no en users.Profile) a propósito: son datos
# exclusivos del producto B2B y Profile ya carga el onboarding de Zyfit Academy
# (`onboarding_academia_completo`) además del onboarding fitness de la app móvil.
# Mezclarlos ahí haría que un cambio de un producto tocara a los tres.

CARGO_CHOICES = [
    ('preparador_fisico', 'Preparador físico'),
    ('entrenador', 'Entrenador / DT'),
    ('analista', 'Analista de rendimiento'),
    ('coordinador', 'Coordinador deportivo'),
    ('director_deportivo', 'Director deportivo'),
    ('dueno', 'Dueño / directivo del club'),
    ('fisioterapeuta', 'Fisioterapeuta / kinesiólogo'),
    ('medico', 'Médico deportivo'),
    ('nutricionista', 'Nutricionista deportivo'),
    ('psicologo', 'Psicólogo deportivo'),
    ('atleta', 'Atleta independiente'),
    # Propios de instituciones educativas
    ('profesor_ef', 'Profesor de educación física'),
    ('director_institucion', 'Director de la institución'),
    # Propio de atletas individuales
    ('entrenador_personal', 'Entrenador personal'),
    ('otro', 'Otro'),
]

DISCIPLINA_CHOICES = [
    ('futbol', 'Fútbol'),
    ('futsal', 'Futsal'),
    ('basquet', 'Básquetbol'),
    ('voley', 'Vóleibol'),
    ('handball', 'Handball'),
    ('rugby', 'Rugby'),
    ('atletismo', 'Atletismo'),
    ('natacion', 'Natación'),
    ('ciclismo', 'Ciclismo'),
    ('tenis', 'Tenis'),
    ('combate', 'Deportes de combate'),
    ('multideporte', 'Multideporte'),
    ('otro', 'Otro'),
]

# "solo_1" es su propia categoría, no un rango: cambia el producto de un panel
# de plantel a un seguimiento individual (preparador con un solo atleta).
TAMANO_PLANTEL_CHOICES = [
    ('solo_1', 'Solo 1 atleta'),
    ('2_15', '2 a 15 atletas'),
    ('16_30', '16 a 30 atletas'),
    ('31_60', '31 a 60 atletas'),
    ('61_mas', 'Más de 60 atletas'),
]

# Cada necesidad corresponde a algo que el panel YA hace (una sección real del
# sidebar). No listar aquí nada que no exista todavía: el onboarding no debe
# prometer funcionalidad inexistente.
NECESIDAD_CHOICES = [
    ('rendimiento', 'Seguimiento de rendimiento'),
    ('lesiones', 'Control y prevención de lesiones'),
    ('tests', 'Tests y evaluaciones físicas'),
    ('carga', 'Carga de entrenamiento y ACWR'),
    ('planificacion', 'Planificación y periodización'),
    ('gps', 'Datos GPS de sesiones y partidos'),
    ('psicologico', 'Bienestar y psicología deportiva'),
    ('calendario', 'Calendario de temporada'),
    ('reportes', 'Reportes e informes'),
    ('asesor_ia', 'Asesor con inteligencia artificial'),
]

NECESIDAD_IDS = {c[0] for c in NECESIDAD_CHOICES}

CANAL_CHOICES = [
    ('recomendacion', 'Recomendación de un colega'),
    ('equipo_zyfit', 'Contacto del equipo Zyfit'),
    ('redes', 'Redes sociales'),
    ('buscador', 'Búsqueda en internet'),
    ('evento', 'Congreso, curso o evento'),
    ('academy', 'Zyfit Academy'),
    ('prensa', 'Prensa o publicación deportiva'),
    ('otro', 'Otro'),
]


class PerformanceOnboarding(models.Model):
    """Respuestas del wizard de primer inicio de sesión del panel.

    Se crea vacío la primera vez que el frontend consulta el endpoint y se va
    completando paso a paso (guardado progresivo): si alguien cierra el
    navegador a mitad del wizard, retoma donde estaba en vez de empezar de cero.

    `completado` es la única fuente de verdad de "ya pasó por el onboarding" y
    se expone en el payload de /me/ y del login, para que el frontend decida el
    destino de la sesión sin una petición extra.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='performance_onboarding',
    )
    # Público al que pertenece la cuenta. Es la primera pregunta del wizard
    # porque encuadra a todas las siguientes: el listado de cargos y parte del
    # copy cambian según el segmento.
    segmento = models.CharField(max_length=20, choices=SEGMENTO_CHOICES, blank=True)
    # ISO 3166-1 alfa-2 ('AR', 'CL', …). El nombre visible lo resuelve el
    # frontend con Intl.DisplayNames en el idioma activo, así no hay que
    # mantener una tabla de países traducida en el backend.
    pais = models.CharField(max_length=2, blank=True, default='')
    cargo = models.CharField(max_length=30, choices=CARGO_CHOICES, blank=True)
    # Solo se usa cuando cargo == 'otro'; texto corto que el usuario escribe.
    cargo_otro = models.CharField(max_length=80, blank=True, default='')
    disciplina = models.CharField(max_length=20, choices=DISCIPLINA_CHOICES, blank=True)
    disciplina_otro = models.CharField(max_length=80, blank=True, default='')
    tamano_plantel = models.CharField(max_length=10, choices=TAMANO_PLANTEL_CHOICES, blank=True)
    # Lista de IDs de NECESIDAD_CHOICES (multi-selección). Se valida en la vista.
    necesidades = models.JSONField(default=list, blank=True)
    canal = models.CharField(max_length=20, choices=CANAL_CHOICES, blank=True)
    canal_otro = models.CharField(max_length=120, blank=True, default='')

    completado = models.BooleanField(default=False)
    completado_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'performance_onboarding'
        verbose_name = 'Onboarding de Performance'
        verbose_name_plural = 'Onboardings de Performance'

    def __str__(self):
        estado = 'completo' if self.completado else 'en curso'
        return f'Onboarding de {self.user_id} ({estado})'


# ─── Categorías (instituciones educativas) ────────────────────────────────────
# `CenterAthlete.grupo` era texto libre ("sub-18", "Sub 18", "SUB-18"…): servía
# para etiquetar, no para comparar entre categorías ni para seguir a un alumno a
# través de los años. Una institución trabaja sobre categorías, no sobre un
# plantel: es su unidad real.
#
# `grupo` se conserva y NO se migra automáticamente — el texto libre existente no
# es fiable como fuente para crear categorías (mismas categorías escritas de
# tres formas distintas se convertirían en tres filas). La asignación es manual
# y explícita.

class Categoria(models.Model):
    """Categoría / cohorte dentro de un centro (Sub-14, Primer equipo, …).

    `temporada` permite que la MISMA categoría exista año tras año y que un
    alumno la atraviese: es lo que habilita la lectura longitudinal que hoy no
    existe (un chico pasa seis años en la institución cruzando categorías).
    """

    center = models.ForeignKey(
        SportsCenter, on_delete=models.CASCADE, related_name='categorias',
    )
    nombre = models.CharField(max_length=80)
    # Texto libre a propósito: hay temporadas '2026', '2026/27' y 'Ciclo lectivo
    # 2026' según el país y el deporte. Normalizarlo a un entero rompería la
    # mitad de los casos reales.
    temporada = models.CharField(max_length=20, blank=True, default='')
    # Orden de presentación (Sub-12 antes que Sub-14). Sin esto se ordenarían
    # alfabéticamente y "Sub-10" caería después de "Sub-1".
    orden = models.PositiveSmallIntegerField(default=0)
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='categorias_a_cargo',
    )
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'performance_categorias'
        ordering = ['orden', 'nombre']
        # Una categoría es única por centro Y temporada: "Sub-14 2026" y
        # "Sub-14 2027" son filas distintas, y es justamente lo que permite
        # comparar la misma categoría entre años.
        unique_together = [['center', 'nombre', 'temporada']]
        indexes = [models.Index(fields=['center', 'activa'])]

    def __str__(self):
        return f'{self.nombre} {self.temporada}'.strip()


# ─── Consentimiento para datos de menores ─────────────────────────────────────
# Una institución educativa trabaja con alumnos menores de edad, y el panel
# guarda sobre ellos datos de salud (lesiones), psicométricos (BRUMS, ansiedad
# competitiva) y antropométricos. Eso NO se puede registrar sin autorización de
# quien ejerce la tutoría.
#
# Decisiones tomadas (ver también permissions.puede_registrar_dato_sensible):
#
#   · Umbral: 18 años. Las leyes de la región fijan distintos umbrales para el
#     consentimiento digital (13–16 según el país), pero para DATOS DE SALUD de
#     un menor la autorización del tutor es el denominador común. Se elige el
#     criterio más protector en vez de intentar codificar cada jurisdicción.
#   · Sin fecha de nacimiento NO se asume mayoría de edad: se trata como menor
#     y se exige consentimiento. Fallar hacia el lado seguro.
#   · El consentimiento es POR ALUMNO y por categoría de dato, revocable, y deja
#     constancia de quién lo registró.
#   · Esto habilita el cumplimiento; NO lo garantiza. El texto del formulario,
#     la base legal y los plazos de conservación los define el centro con su
#     asesoría — el panel provee el mecanismo y la trazabilidad.

# Categorías de dato que exigen consentimiento explícito para un menor. Los
# datos de rendimiento puro (carga, tests físicos) no entran acá: son la
# finalidad ordinaria del servicio que la institución contrató.
DATO_SALUD = 'salud'
DATO_PSICOLOGICO = 'psicologico'
DATO_ANTROPOMETRICO = 'antropometrico'

DATO_SENSIBLE_CHOICES = [
    (DATO_SALUD, 'Salud y lesiones'),
    (DATO_PSICOLOGICO, 'Evaluación psicológica'),
    (DATO_ANTROPOMETRICO, 'Antropometría y maduración'),
]

DATOS_SENSIBLES = [c[0] for c in DATO_SENSIBLE_CHOICES]


def dict_datos_sensibles():
    """{id: etiqueta} de las categorías de dato sensible, para mensajes de error."""
    return dict(DATO_SENSIBLE_CHOICES)

# Edad a partir de la cual el propio atleta consiente por sí mismo.
EDAD_MAYORIA = 18


class ConsentimientoTutor(models.Model):
    """Autorización de quien ejerce la tutoría para tratar datos sensibles de un
    alumno menor de edad.

    Es un registro de trazabilidad, no el documento en sí: `documento_ref`
    apunta al consentimiento firmado que conserva la institución (expediente,
    formulario en papel, gestor documental). El panel guarda QUIÉN autorizó,
    QUÉ alcance, CUÁNDO y QUIÉN lo registró.
    """

    RELACION_CHOICES = [
        ('madre', 'Madre'),
        ('padre', 'Padre'),
        ('tutor', 'Tutor/a legal'),
        ('otro', 'Otro'),
    ]

    athlete = models.ForeignKey(
        CenterAthlete, on_delete=models.CASCADE, related_name='consentimientos',
    )
    tutor_nombre = models.CharField(max_length=160)
    tutor_relacion = models.CharField(max_length=20, choices=RELACION_CHOICES, default='tutor')
    tutor_email = models.EmailField(blank=True, default='')
    # Lista de DATOS_SENSIBLES autorizados. Vacía = ninguno (equivale a no tener
    # consentimiento); se valida en el serializer.
    alcance = models.JSONField(default=list, blank=True)
    # Referencia al documento firmado que conserva la institución.
    documento_ref = models.CharField(max_length=200, blank=True, default='')
    otorgado_en = models.DateField()
    # Revocación: no se borra la fila, se marca. Perder la constancia de que
    # hubo consentimiento sería perder justamente la trazabilidad.
    revocado_en = models.DateField(null=True, blank=True)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='consentimientos_registrados',
    )
    notas = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'performance_consentimientos'
        ordering = ['-otorgado_en', '-created_at']
        indexes = [models.Index(fields=['athlete', 'revocado_en'])]

    def __str__(self):
        estado = 'revocado' if self.revocado_en else 'vigente'
        return f'Consentimiento de {self.athlete_id} ({estado})'

    @property
    def vigente(self) -> bool:
        return self.revocado_en is None

    def autoriza(self, dato: str) -> bool:
        return self.vigente and dato in (self.alcance or [])
