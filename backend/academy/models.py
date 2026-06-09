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
      └── Certificate           ← certificado emitido al completar (1:1)

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
LESSON_VIDEO = 'video'
LESSON_TEXTO = 'texto'
LESSON_QUIZ = 'quiz'
LESSON_TIPO_CHOICES = [
    (LESSON_VIDEO, 'Video'),
    (LESSON_TEXTO, 'Texto'),
    (LESSON_QUIZ, 'Quiz'),
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


class Course(models.Model):
    """Curso — entidad raíz de la academia.

    Lo crea y publica un instructor (o el admin de producto). Mientras
    `publicado=False` solo lo ven su autor y el admin; al publicarlo entra en el
    catálogo visible para cualquier estudiante.
    """

    # Autor / dueño del curso. SET_NULL para no perder el curso si se borra la
    # cuenta del instructor (el contenido sobrevive a la persona).
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cursos_academy',
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
