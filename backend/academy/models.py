"""Modelos de "Zyfit Academy" — plataforma e-learning de Zyfit.

Es una vertical independiente (igual que "Zyfit Performance"): app Django propia,
login propio, API montada bajo /api/academy/ y, más adelante, su propia web. El
propósito es OTRO: cursos en línea (entrenamiento, nutrición, salud) que un
instructor publica y un estudiante consume.

Jerarquía del catálogo (autoría):

    Course                      ← entidad raíz (un curso de un instructor)
      └── Module                ← secciones ordenadas del curso
            └── Lesson          ← lección: video / texto / quiz
                  └── Quiz      ← cuestionario (solo lecciones tipo "quiz")
                        └── Question

Jerarquía del aprendizaje (consumo):

    Enrollment                  ← matrícula de un estudiante en un curso
      ├── LessonProgress        ← lección marcada como completada
      ├── QuizAttempt           ← intento de quiz (CALIFICADO EN EL SERVIDOR)
      ├── Submission            ← entrega de un "entregable" (revisa el instructor)
      ├── EarnedBadge           ← insignia de competencia otorgada (servidor)
      └── Certificate           ← certificado emitido al completar (1:1)

Programa Evolución 360° (propuesta de innovación académica, modalidad híbrida):
los cursos pueden mezclar lecciones sincrónicas (en_vivo), asincrónicas (video /
texto / quiz), presenciales (practica) y entregables con revisión del instructor;
CourseBadge define el "Check-list de Competencias" (hitos → insignias).

Principios (heredados del resto del backend y de Zyfit Performance):
  • El rol global (instructor / admin) vive en users.User; CUALQUIER cuenta
    activa puede inscribirse como estudiante (ver User.academy_acceso).
  • El "scoring" vive SIEMPRE en el servidor (academy.grading): la calificación
    del quiz, el % de progreso y la emisión del certificado las calcula el
    backend; el cliente solo envía respuestas crudas. La clave de respuestas
    (`Question.respuestas_correctas`) nunca se expone al estudiante.
  • Tablas con prefijo `academy_*`.
"""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


# ─── Catálogos canónicos (fuente única que comparten backend y la futura web) ──

NIVEL_PRINCIPIANTE = 'principiante'
NIVEL_INTERMEDIO = 'intermedio'
NIVEL_AVANZADO = 'avanzado'
NIVEL_CHOICES = [
    (NIVEL_PRINCIPIANTE, 'Principiante'),
    (NIVEL_INTERMEDIO, 'Intermedio'),
    (NIVEL_AVANZADO, 'Avanzado'),
]

# Tipo de lección. Una lección "quiz" lleva asociado un Quiz (OneToOne).
#
# Los tres últimos tipos vienen del "Programa Evolución 360°" (modalidad híbrida
# de la propuesta de innovación académica, ver Propuesta_Evolucion_360.md):
#   • en_vivo    — sesión virtual SINCRÓNICA (ponencia en vivo con fecha y enlace).
#   • practica   — actividad PRESENCIAL inmersiva (aplicación en cancha).
#   • entregable — tarea que el estudiante sube y el INSTRUCTOR revisa/aprueba
#                  (la lección solo se completa cuando la entrega es aprobada).
LESSON_VIDEO = 'video'
LESSON_TEXTO = 'texto'
LESSON_AUDIO = 'audio'
LESSON_QUIZ = 'quiz'
LESSON_EN_VIVO = 'en_vivo'
LESSON_PRACTICA = 'practica'
LESSON_ENTREGABLE = 'entregable'
LESSON_TIPO_CHOICES = [
    (LESSON_VIDEO, 'Video'),
    (LESSON_TEXTO, 'Texto'),
    (LESSON_AUDIO, 'Audio'),
    (LESSON_QUIZ, 'Quiz'),
    (LESSON_EN_VIVO, 'Sesión en vivo'),
    (LESSON_PRACTICA, 'Práctica presencial'),
    (LESSON_ENTREGABLE, 'Entregable'),
]

# Qué sube el estudiante en una lección tipo "entregable" (hitos del check-list
# de competencias del Programa 360°): un análisis escrito, un video corto (URL)
# o una planificación de práctica.
ENTREGABLE_TEXTO = 'texto'
ENTREGABLE_VIDEO = 'video'
ENTREGABLE_PLANIFICACION = 'planificacion'
ENTREGABLE_TIPO_CHOICES = [
    (ENTREGABLE_TEXTO, 'Análisis escrito'),
    (ENTREGABLE_VIDEO, 'Video (URL)'),
    (ENTREGABLE_PLANIFICACION, 'Planificación'),
]

# Tipo de pregunta de un quiz.
Q_OPCION_UNICA = 'opcion_unica'
Q_OPCION_MULTIPLE = 'opcion_multiple'
Q_VERDADERO_FALSO = 'verdadero_falso'
QUESTION_TIPO_CHOICES = [
    (Q_OPCION_UNICA, 'Opción única'),
    (Q_OPCION_MULTIPLE, 'Opción múltiple'),
    (Q_VERDADERO_FALSO, 'Verdadero / Falso'),
]


# ─── Adaptación CONMEBOL Evolución (formación de entrenadores) ─────────────────
#
# Zyfit Academy se usa también como plataforma de la formación de entrenadores
# estilo CONMEBOL Evolución (ver formacion-conmebol.md). Esos cursos no son solo
# "principiante/intermedio/avanzado": llevan tres ejes propios del sistema de
# Licencias CONMEBOL — disciplina, nivel de licencia y modalidad — además de la
# carga horaria (el sistema cuenta en HORAS, no en minutos) y si el curso acredita
# horas de actualización para renovar la licencia (mín. 20 h cada 3 años).

# Disciplina del curso. 'general' = curso de Academy no ligado a una disciplina
# federada (p. ej. el de fuerza); el resto replica las disciplinas CONMEBOL.
DISCIPLINA_GENERAL = 'general'
DISCIPLINA_FUTBOL = 'futbol'
DISCIPLINA_FUTSAL = 'futsal'
DISCIPLINA_FUTBOL_PLAYA = 'futbol_playa'
DISCIPLINA_ARQUEROS = 'arqueros'
DISCIPLINA_PREP_FISICA = 'preparacion_fisica'
DISCIPLINA_CHOICES = [
    (DISCIPLINA_GENERAL, 'General'),
    (DISCIPLINA_FUTBOL, 'Fútbol'),
    (DISCIPLINA_FUTSAL, 'Futsal'),
    (DISCIPLINA_FUTBOL_PLAYA, 'Fútbol Playa'),
    (DISCIPLINA_ARQUEROS, 'Entrenadores de Arqueros'),
    (DISCIPLINA_PREP_FISICA, 'Preparación Física'),
]

# Nivel de licencia CONMEBOL. Vacío ('') = curso corto / taller sin licencia
# (la mayoría de la oferta Evolución Educación); C → B → A → PRO es el itinerario
# escalonado y obligatorio en orden de las Licencias de Entrenador.
LICENCIA_NINGUNA = ''
LICENCIA_C = 'C'
LICENCIA_B = 'B'
LICENCIA_A = 'A'
LICENCIA_PRO = 'PRO'
LICENCIA_CHOICES = [
    (LICENCIA_NINGUNA, 'Sin licencia (curso/taller)'),
    (LICENCIA_C, 'Licencia C'),
    (LICENCIA_B, 'Licencia B'),
    (LICENCIA_A, 'Licencia A'),
    (LICENCIA_PRO, 'Licencia PRO'),
]

# Modalidad de cursado.
MODALIDAD_PRESENCIAL = 'presencial'
MODALIDAD_VIRTUAL = 'virtual'
MODALIDAD_SEMIPRESENCIAL = 'semipresencial'
MODALIDAD_CHOICES = [
    (MODALIDAD_PRESENCIAL, 'Presencial'),
    (MODALIDAD_VIRTUAL, 'Virtual'),
    (MODALIDAD_SEMIPRESENCIAL, 'Semipresencial (blended)'),
]


class Tenant(models.Model):
    """Organización cliente de la plataforma white-label.

    Cada tenant tiene su propio subdominio (o dominio custom) y configuración de
    branding (logo, colores, tipografía). Los cursos se asocian a un tenant; un
    catálogo sin tenant (NULL) es el catálogo raíz de Zyfit.

    `branding` almacena solo los valores que sobreescriben los defaults de Zyfit
    (parcial). El endpoint público `/api/academy/tenant/config/` aplica el merge.
    """

    nombre = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    # Subdominio gestionado por Zyfit (p. ej. "conmebol.zyfit.app").
    dominio = models.CharField(max_length=253, unique=True)
    # Dominio propio del cliente (p. ej. "evolución.conmebol.com"). Vacío = sin custom.
    dominio_custom = models.CharField(max_length=253, blank=True)
    activo = models.BooleanField(default=True)
    # Solo los valores que difieren de los defaults. Estructura:
    # {
    #   "nombre_plataforma": "CONMEBOL Evolución",
    #   "logo_url":          "https://...",
    #   "favicon_url":       "https://...",
    #   "color_brand":       "#1a3e72",       ← hex
    #   "color_brand_dark":  "#13294d",
    #   "color_brand_deep":  "#0c1a30",
    #   "color_accent":      "#0066b3",
    #   "color_accent_light":"#2a82d6",
    #   "color_accent_dark": "#004a87",
    #   "color_ok":          "#1f9d6b",
    #   "color_warn":        "#e08a00",
    #   "color_danger":      "#d64545",
    #   "fuente":            "Ubuntu",        ← nombre de Google Font
    #   "tagline":           "Cree en grande",
    #   "tema":              "light"          ← o "dark"
    # }
    branding = models.JSONField(default=dict, blank=True)
    # Ajustes de comportamiento del tenant (registro libre, idiomas, etc.).
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_tenants'

    def __str__(self):
        return self.nombre


class School(models.Model):
    """Escuela — agrupa cursos por área temática (ej. Ciencia del Entrenamiento).

    Es el nivel superior de la jerarquía: Escuela → Curso → Módulo → Lección.
    Opcional: un curso puede existir sin escuela (school=NULL).
    """

    nombre = models.CharField(max_length=160)
    slug = models.SlugField(max_length=90, unique=True)
    descripcion = models.TextField(blank=True)
    orden = models.PositiveIntegerField(default=0, help_text='Orden de aparición en el catálogo.')
    tenant = models.ForeignKey(
        Tenant, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='escuelas',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_schools'
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class Course(models.Model):
    """Curso — entidad raíz de la academia.

    Lo crea y publica un instructor (o el admin de producto). Mientras
    `publicado=False` solo lo ven su autor y el admin; al publicarlo entra en el
    catálogo visible para cualquier estudiante.
    """

    # Escuela a la que pertenece el curso (nivel superior de la jerarquía).
    # NULL = curso sin escuela (catálogo plano, retrocompatible).
    school = models.ForeignKey(
        School, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cursos',
    )
    # Autor / dueño del curso. SET_NULL para no perder el curso si se borra la
    # cuenta del instructor (el contenido sobrevive a la persona).
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cursos_academy',
    )
    # Tenant al que pertenece el curso. NULL = catálogo raíz Zyfit (solo visible
    # desde el dominio base; no se mezcla con los catálogos de otros tenants).
    tenant = models.ForeignKey(
        Tenant, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cursos',
    )
    titulo = models.CharField(max_length=180)
    # Identificador legible para rutas / URL del curso (p. ej. 'fuerza-base').
    slug = models.SlugField(max_length=90, unique=True)
    resumen = models.CharField(max_length=300, blank=True, help_text='Una línea de gancho.')
    descripcion = models.TextField(blank=True)
    categoria = models.CharField(
        max_length=80, blank=True,
        help_text='Temática del curso (entrenamiento, nutrición, salud, movilidad…).',
    )
    nivel = models.CharField(max_length=20, choices=NIVEL_CHOICES, default=NIVEL_PRINCIPIANTE)

    # ── Ejes de la formación CONMEBOL Evolución (ver bloque de catálogos arriba) ──
    # Son aditivos: un curso "normal" de Academy queda con disciplina=general,
    # licencia='' (sin licencia) y modalidad=virtual, sin cambiar su significado.
    disciplina = models.CharField(
        max_length=24, choices=DISCIPLINA_CHOICES, default=DISCIPLINA_GENERAL,
        help_text='Disciplina federada del curso (fútbol, futsal, arqueros…) o "general".',
    )
    licencia = models.CharField(
        max_length=4, choices=LICENCIA_CHOICES, blank=True, default=LICENCIA_NINGUNA,
        help_text='Nivel de Licencia CONMEBOL que otorga (C/B/A/PRO). Vacío si es un curso/taller sin licencia.',
    )
    modalidad = models.CharField(
        max_length=16, choices=MODALIDAD_CHOICES, default=MODALIDAD_VIRTUAL,
    )
    # El sistema CONMEBOL cuenta la formación en HORAS (p. ej. 140 h en Licencia C).
    # Es independiente de `duracion_estimada_min` (estimación de consumo de la web).
    carga_horaria_h = models.PositiveIntegerField(
        default=0, help_text='Carga horaria oficial del curso, en horas.',
    )
    # Si el curso acredita horas para renovar una licencia (mín. 20 h cada 3 años).
    acredita_renovacion = models.BooleanField(default=False)

    # Portada como data URL (base64). Vía provisional sin object storage, igual que
    # las fotos del panel Performance; se sustituirá por DO Spaces cuando exista.
    portada = models.TextField(blank=True)
    duracion_estimada_min = models.PositiveIntegerField(default=0)
    publicado = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_courses'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['publicado', '-created_at']),
            models.Index(fields=['categoria']),
            models.Index(fields=['disciplina', 'licencia']),
        ]

    def __str__(self):
        return self.titulo


class Module(models.Model):
    """Sección ordenada de un curso (agrupa lecciones)."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modulos')
    orden = models.PositiveIntegerField(default=0)
    titulo = models.CharField(max_length=160)
    descripcion = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_modules'
        ordering = ['course', 'orden']
        indexes = [models.Index(fields=['course', 'orden'])]

    def __str__(self):
        return f'{self.titulo} ({self.course_id})'


class Lesson(models.Model):
    """Lección de un módulo: un video, una lectura o un quiz.

    `contenido` lleva el cuerpo de la lección de texto (markdown/HTML) o una
    descripción; `video_url` la URL del video (YouTube/Vimeo) en lecciones de
    video. Las lecciones de tipo quiz llevan un Quiz asociado (OneToOne).
    """

    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lecciones')
    orden = models.PositiveIntegerField(default=0)
    titulo = models.CharField(max_length=180)
    tipo = models.CharField(max_length=10, choices=LESSON_TIPO_CHOICES, default=LESSON_TEXTO)
    contenido = models.TextField(blank=True)
    video_url = models.URLField(blank=True)
    duracion_min = models.PositiveIntegerField(default=0)
    # ── Programa Evolución 360° ──
    # Lecciones "en_vivo": fecha/hora de la sesión sincrónica (el enlace de la
    # reunión va en `video_url`, que ya existe).
    fecha_en_vivo = models.DateTimeField(null=True, blank=True)
    # Lecciones "entregable": qué debe subir el estudiante. Vacío en el resto.
    entregable_tipo = models.CharField(
        max_length=16, choices=ENTREGABLE_TIPO_CHOICES, blank=True, default='',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_lessons'
        ordering = ['module', 'orden']
        indexes = [models.Index(fields=['module', 'orden'])]

    def __str__(self):
        return self.titulo


class Quiz(models.Model):
    """Cuestionario de una lección tipo quiz. Aprueba quien alcanza
    `puntaje_aprobacion` (% sobre el total de puntos de las preguntas)."""

    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='quiz')
    titulo = models.CharField(max_length=180, blank=True)
    puntaje_aprobacion = models.PositiveSmallIntegerField(
        default=70, validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Porcentaje mínimo para aprobar el quiz.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_quizzes'

    def __str__(self):
        return self.titulo or f'Quiz de {self.lesson_id}'


class Question(models.Model):
    """Pregunta de un quiz.

    `opciones` es la lista que ve el estudiante: `[{"id": "a", "texto": "..."}]`.
    `respuestas_correctas` es la CLAVE (lista de ids de opción correctos) y NUNCA
    se expone al estudiante: solo la usa el servidor para calificar.
    """

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='preguntas')
    orden = models.PositiveIntegerField(default=0)
    enunciado = models.TextField()
    # Video-Quiz Interactivo (Programa 360°): clip de juego que acompaña a la
    # pregunta — el estudiante ve la situación y responde la lectura de juego.
    video_url = models.URLField(blank=True)
    tipo = models.CharField(max_length=20, choices=QUESTION_TIPO_CHOICES, default=Q_OPCION_UNICA)
    opciones = models.JSONField(default=list, blank=True)
    respuestas_correctas = models.JSONField(default=list, blank=True)
    puntos = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_questions'
        ordering = ['quiz', 'orden']
        indexes = [models.Index(fields=['quiz', 'orden'])]

    def __str__(self):
        return self.enunciado[:60]


class Enrollment(models.Model):
    """Matrícula de un estudiante en un curso. Un par (estudiante, curso) es único.

    `progreso` (0–100) y `estado` los recalcula el servidor (academy.grading) a
    medida que el estudiante completa lecciones y aprueba quizzes.
    """

    ESTADO_ACTIVA = 'activa'
    ESTADO_COMPLETADA = 'completada'
    ESTADO_CANCELADA = 'cancelada'
    ESTADO_CHOICES = [
        (ESTADO_ACTIVA, 'Activa'),
        (ESTADO_COMPLETADA, 'Completada'),
        (ESTADO_CANCELADA, 'Cancelada'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='academy_enrollments',
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_ACTIVA)
    progreso = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completado_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'academy_enrollments'
        unique_together = [['student', 'course']]
        ordering = ['-created_at']
        indexes = [models.Index(fields=['student', '-created_at'])]

    def __str__(self):
        return f'{self.student_id} → {self.course_id} ({self.estado})'


class LessonProgress(models.Model):
    """Marca de que una lección fue completada dentro de una matrícula."""

    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name='lecciones_progreso',
    )
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='+')
    completado = models.BooleanField(default=True)
    completado_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_lesson_progress'
        unique_together = [['enrollment', 'lesson']]
        indexes = [models.Index(fields=['enrollment', 'completado'])]

    def __str__(self):
        return f'{self.enrollment_id} · lesson {self.lesson_id}'


class QuizAttempt(models.Model):
    """Intento de un quiz dentro de una matrícula. Calificado en el servidor.

    `respuestas` guarda lo enviado por el estudiante (`{question_id: [opcion_ids]}`),
    `detalle` el acierto por pregunta, y `puntaje`/`aprobado` el resultado calculado.
    Se conservan todos los intentos (historial); aprueba si algún intento aprobó.
    """

    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name='intentos',
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='intentos')
    respuestas = models.JSONField(default=dict, blank=True)
    detalle = models.JSONField(default=list, blank=True)
    puntaje = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    aprobado = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_quiz_attempts'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['enrollment', 'quiz', '-created_at'])]

    def __str__(self):
        return f'{self.enrollment_id} · quiz {self.quiz_id} = {self.puntaje}%'


class Submission(models.Model):
    """Entrega de un estudiante para una lección tipo "entregable" (Programa 360°).

    El estudiante sube su análisis/planificación (`texto`) o la URL de su video
    (`video_url`) y queda `enviada`; el instructor la revisa y la marca como
    `aprobada` (completa la lección y dispara insignias) o `rechazada` (con
    `feedback`, el estudiante puede reenviar). Un par (matrícula, lección) tiene
    una única entrega viva: reenviar la actualiza y vuelve a `enviada`.
    """

    ESTADO_ENVIADA = 'enviada'
    ESTADO_APROBADA = 'aprobada'
    ESTADO_RECHAZADA = 'rechazada'
    ESTADO_CHOICES = [
        (ESTADO_ENVIADA, 'Enviada (en revisión)'),
        (ESTADO_APROBADA, 'Aprobada'),
        (ESTADO_RECHAZADA, 'Rechazada'),
    ]

    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name='entregas',
    )
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='entregas')
    texto = models.TextField(blank=True)
    video_url = models.URLField(blank=True)
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default=ESTADO_ENVIADA)
    feedback = models.TextField(blank=True, help_text='Comentario del instructor al revisar.')
    revisado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    revisado_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_submissions'
        unique_together = [['enrollment', 'lesson']]
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['lesson', 'estado'])]

    def __str__(self):
        return f'{self.enrollment_id} · lesson {self.lesson_id} ({self.estado})'


class CourseBadge(models.Model):
    """Insignia del "Check-list de Competencias" de un curso (Programa 360°).

    Cada insignia es un hito ligado a una lección: cuando esa lección queda
    completada (p. ej. la entrega fue aprobada), el servidor la otorga
    (EarnedBadge). El hito final del check-list es el Certificado, que ya emite
    `grading.recompute_progress` al completar el curso.
    """

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='insignias')
    orden = models.PositiveIntegerField(default=0)
    nombre = models.CharField(max_length=80)
    icono = models.CharField(max_length=8, blank=True, help_text='Emoji de la insignia.')
    descripcion = models.CharField(max_length=200, blank=True)
    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name='insignias',
        help_text='Lección cuyo completado otorga la insignia.',
    )

    class Meta:
        db_table = 'academy_course_badges'
        ordering = ['course', 'orden']

    def __str__(self):
        return f'{self.icono} {self.nombre}'.strip()


class EarnedBadge(models.Model):
    """Insignia otorgada a una matrícula (la otorga SIEMPRE el servidor)."""

    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name='insignias_obtenidas',
    )
    badge = models.ForeignKey(CourseBadge, on_delete=models.CASCADE, related_name='+')
    otorgada_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_earned_badges'
        unique_together = [['enrollment', 'badge']]
        ordering = ['otorgada_at']

    def __str__(self):
        return f'{self.enrollment_id} · {self.badge_id}'


class Certificate(models.Model):
    """Certificado emitido cuando una matrícula se completa (1:1 con la matrícula).

    `codigo` es un identificador verificable público (sin datos personales en sí
    mismo); el endpoint de verificación lo resuelve a curso + estudiante.
    """

    enrollment = models.OneToOneField(
        Enrollment, on_delete=models.CASCADE, related_name='certificado',
    )
    codigo = models.CharField(max_length=24, unique=True, db_index=True)
    emitido_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_certificates'
        ordering = ['-emitido_at']

    def __str__(self):
        return self.codigo


# ─── Racha de estudio (gamificación de retención) ─────────────────────────────
#
# Espejo de la racha de entrenamiento (users.Profile.racha_actual / mejor_racha /
# puntos_totales / logros), pero NAMESPACED en Academy y por usuario a través de
# TODOS los cursos y escuelas: la regla de negocio dice que cuenta una actividad
# de estudio "en cualquier curso de las tres escuelas", así que el streak vive a
# nivel de usuario, no de matrícula. Se mantiene desacoplado a propósito del
# streak de entrenamiento (el futuro "doble streak" los combinará en la capa de
# presentación sin fusionar estos modelos). Toda la lógica vive en
# academy.streak_service (capa de servicio), igual que academy.grading para el
# scoring: los modelos solo guardan estado.


class AcademyStreak(models.Model):
    """Estado de la racha de estudio de un usuario (1:1 con la cuenta).

    A diferencia de la racha de entrenamiento (que se deriva en tiempo real de las
    sesiones con feedback), esta racha es ESTADO PERSISTENTE porque los "freezes"
    la hacen depender de eventos con historia (un freeze rellena un día perdido).
    `academy.streak_service` es el único que la escribe.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='academy_streak',
    )
    # Días de estudio consecutivos vigentes (incluye días cubiertos por freeze).
    racha_actual = models.PositiveIntegerField(default=0)
    # Mejor racha histórica (nunca decrece).
    mejor_racha = models.PositiveIntegerField(default=0)
    # Última fecha LOCAL (del alumno) con actividad de estudio válida.
    ultima_actividad = models.DateField(null=True, blank=True)
    # Última fecha cubierta por un freeze consumido (rellena un hueco sin actividad).
    # La "cobertura" de la racha es max(ultima_actividad, congelado_hasta).
    congelado_hasta = models.DateField(null=True, blank=True)
    # Freezes acumulados disponibles (se gana 1 cada N días; tope MAX_FREEZES).
    freezes_disponibles = models.PositiveSmallIntegerField(default=0)
    # Freezes consumidos en total (histórico, para estadísticas).
    freezes_usados = models.PositiveIntegerField(default=0)
    # ── Recuperación de racha (ventana post-ruptura) ──
    # Al romperse, guardamos la racha perdida aquí para poder revivirla si el
    # alumno vuelve a estudiar dentro de la ventana (racha "en riesgo").
    racha_en_riesgo = models.PositiveIntegerField(default=0)
    recuperable_hasta = models.DateTimeField(null=True, blank=True)
    # ── Historial / gamificación ──
    total_rachas_rotas = models.PositiveIntegerField(default=0)
    puntos_totales = models.PositiveIntegerField(default=0)
    logros = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_streaks'

    def __str__(self):
        return f'{self.user_id} · racha {self.racha_actual}'


class AcademyActivityDay(models.Model):
    """Bitácora de un día (local) en que el usuario tuvo actividad de estudio válida.

    Una fila por (usuario, fecha): completar una lección/módulo o rendir un quiz.
    Es idempotente por día (unique) — repetir actividad el mismo día no la duplica —
    y sirve de fuente auditable para recomputar la racha y los puntos. NO se registra
    "abrir la app" ni "navegar el catálogo": eso no es actividad de estudio.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='academy_activity_days',
    )
    fecha = models.DateField()
    # Qué disparó la actividad (para trazabilidad; no altera la racha).
    origen = models.CharField(max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_activity_days'
        unique_together = [['user', 'fecha']]
        ordering = ['-fecha']
        indexes = [models.Index(fields=['user', '-fecha'])]

    def __str__(self):
        return f'{self.user_id} · {self.fecha}'


# ─── Insignias de identidad (gamificación transversal) ────────────────────────
#
# DISTINTO de CourseBadge/EarnedBadge (arriba): aquellas son el "Check-list de
# Competencias" de un curso puntual (Programa Evolución 360°), ligadas a una
# lección y otorgadas por MATRÍCULA. Estas son insignias de IDENTIDAD del
# estudiante — escuela completada, hitos de racha, inicio de recorrido — de
# alcance GLOBAL por USUARIO y transversal a todos los cursos/escuelas. Catálogo
# data-driven a propósito (fila nueva = insignia nueva, sin tocar código); toda
# la lógica de otorgamiento vive en academy.badges_service (evaluador genérico
# único, sin funciones por insignia), igual patrón que academy.grading /
# academy.streak_service.


class AcademyBadge(models.Model):
    """Catálogo de insignias de identidad. `criterio_tipo` decide qué campo de
    criterio usar (`criterio_escuela`/`criterio_curso`/`criterio_valor`);
    `badges_service` es el único despachador. `activo=False` retira la insignia
    del otorgamiento futuro SIN borrar el historial de quienes ya la ganaron
    (por eso `AcademyEarnedBadge.badge` es CASCADE mientras que estos criterios
    son SET_NULL: borrar el catálogo nunca debe destruir historial ganado)."""

    CRITERIO_ESCUELA_COMPLETADA = 'escuela_completada'
    CRITERIO_STREAK_DIAS = 'streak_dias'
    CRITERIO_PRIMERA_LECCION = 'primera_leccion'
    CRITERIO_CURSO_COMPLETADO = 'curso_completado'
    CRITERIO_RESPUESTAS_UTILES = 'respuestas_utiles'
    CRITERIO_CHOICES = [
        (CRITERIO_ESCUELA_COMPLETADA, 'Escuela completada'),
        (CRITERIO_STREAK_DIAS, 'Racha de estudio (días)'),
        (CRITERIO_PRIMERA_LECCION, 'Primera lección completada'),
        (CRITERIO_CURSO_COMPLETADO, 'Curso completado'),
        (CRITERIO_RESPUESTAS_UTILES, 'Respuestas de Comunidad marcadas como mejor respuesta'),
    ]

    identificador = models.SlugField(max_length=60, unique=True)
    nombre = models.CharField(max_length=80)
    descripcion = models.CharField(max_length=200, blank=True)
    icono = models.CharField(max_length=8, blank=True, help_text='Emoji de la insignia.')
    criterio_tipo = models.CharField(max_length=20, choices=CRITERIO_CHOICES)
    # Solo uno de estos dos aplica según criterio_tipo (escuela_completada / curso_completado).
    criterio_escuela = models.ForeignKey(
        School, on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    criterio_curso = models.ForeignKey(
        Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    # Umbral numérico (ej. días de racha) para criterio_tipo=streak_dias.
    criterio_valor = models.PositiveIntegerField(null=True, blank=True)
    orden = models.PositiveIntegerField(default=0)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_badges'
        ordering = ['orden', 'nombre']

    def __str__(self):
        return f'{self.icono} {self.nombre}'.strip()


class AcademyEarnedBadge(models.Model):
    """Insignia de identidad otorgada a un USUARIO (no a una matrícula — a
    diferencia de EarnedBadge). La otorga SIEMPRE academy.badges_service."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='academy_insignias',
    )
    badge = models.ForeignKey(AcademyBadge, on_delete=models.CASCADE, related_name='+')
    otorgada_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_badges_earned'
        unique_together = [['user', 'badge']]
        ordering = ['-otorgada_at']

    def __str__(self):
        return f'{self.user_id} · {self.badge_id}'


# Comunidad (foro Q&A) — modelos en archivo propio para no seguir engordando
# este módulo; ver community_models.py.
from .community_models import (  # noqa: E402,F401
    CommunityPost, CommunityReply, CommunityVote, CommunityReport,
)
