"""Modelos del Tutor IA de Zyfit Academy.

Tres piezas:

  • TutorChunk        — fragmento indexado del contenido de un curso + su embedding
                        (la fuente de grounding del RAG). Guarda trazabilidad
                        (escuela/curso/módulo/lección) para poder CITAR la fuente.
  • TutorConversation — hilo de conversación de un alumno (atado a users.User, el
                        mismo modelo de usuario del resto del ecosistema).
  • TutorMessage      — cada mensaje del hilo; en los del tutor se guardan las
                        fuentes citadas, el uso de tokens y el feedback (útil/no útil).
  • TutorDailyUsage   — contador por (usuario, día) para el límite diario por tier
                        (freemium: starter=free vs pro). Espejo namespaced de
                        workouts.DailyGenerationCount.

Decisión de arquitectura (ver capa de servicio): el embedding se guarda como lista
de floats en un JSONField y la búsqueda vectorial se resuelve por coseno EN PROCESO
(el corpus de cursos es pequeño y estático). Así NO hace falta pgvector y el índice
funciona igual en SQLite (dev/tests) y en PostgreSQL (prod).
"""

from django.conf import settings
from django.db import models


class TutorChunk(models.Model):
    """Fragmento indexado del contenido de un curso, con su embedding.

    Es idempotente por (`lesson`, `chunk_index`); `content_hash` permite detectar
    si el texto cambió para re-embeber solo lo necesario al re-indexar.
    """

    # Lección/curso de origen (para filtrar por curso y poder enlazar al módulo).
    lesson = models.ForeignKey(
        'academy.Lesson', on_delete=models.CASCADE, related_name='tutor_chunks',
    )
    course = models.ForeignKey(
        'academy.Course', on_delete=models.CASCADE, related_name='tutor_chunks',
    )
    # Trazabilidad desnormalizada: permite citar la fuente sin joins y sobrevive a
    # cambios de nombre (se refresca en cada re-indexado).
    escuela_nombre = models.CharField(max_length=160, blank=True)
    escuela_slug = models.SlugField(max_length=90, blank=True)
    curso_titulo = models.CharField(max_length=180)
    curso_slug = models.SlugField(max_length=90)
    modulo_titulo = models.CharField(max_length=160, blank=True)
    modulo_orden = models.PositiveIntegerField(default=0)
    leccion_titulo = models.CharField(max_length=180)
    leccion_orden = models.PositiveIntegerField(default=0)
    chunk_index = models.PositiveIntegerField(default=0)

    contenido = models.TextField()
    content_hash = models.CharField(max_length=64, db_index=True)
    # Vector de embedding como lista de floats (coseno en proceso; sin pgvector).
    embedding = models.JSONField(default=list, blank=True)
    embedding_model = models.CharField(max_length=120, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_tutor_chunks'
        ordering = ['course', 'modulo_orden', 'leccion_orden', 'chunk_index']
        unique_together = [['lesson', 'chunk_index']]
        indexes = [models.Index(fields=['course', 'chunk_index'])]

    def __str__(self):
        return f'{self.curso_slug} · {self.leccion_titulo} #{self.chunk_index}'

    def fuente(self) -> dict:
        """Representación compacta de la fuente para citar en la respuesta / UI."""
        return {
            'chunk_id': self.id,
            'course_id': self.course_id,
            'curso_slug': self.curso_slug,
            'curso': self.curso_titulo,
            'escuela': self.escuela_nombre,
            'modulo': self.modulo_titulo,
            'leccion': self.leccion_titulo,
            'lesson_id': self.lesson_id,
        }


class TutorConversation(models.Model):
    """Hilo de conversación de un alumno con el tutor (atado a users.User)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='tutor_conversations',
    )
    # Curso activo cuando se abrió el hilo (contexto; opcional).
    course = models.ForeignKey(
        'academy.Course', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    titulo = models.CharField(max_length=140, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_tutor_conversations'
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['user', '-updated_at'])]

    def __str__(self):
        return f'{self.user_id} · {self.titulo or self.id}'


class TutorMessage(models.Model):
    """Un mensaje de un hilo. En los del tutor se guardan fuentes + uso + feedback."""

    ROLE_USER = 'user'
    ROLE_ASSISTANT = 'assistant'
    ROLE_CHOICES = [(ROLE_USER, 'Usuario'), (ROLE_ASSISTANT, 'Tutor')]

    FEEDBACK_NONE = ''
    FEEDBACK_UP = 'util'
    FEEDBACK_DOWN = 'no_util'
    FEEDBACK_CHOICES = [
        (FEEDBACK_NONE, 'Sin feedback'),
        (FEEDBACK_UP, 'Útil'),
        (FEEDBACK_DOWN, 'No útil'),
    ]

    conversation = models.ForeignKey(
        TutorConversation, on_delete=models.CASCADE, related_name='mensajes',
    )
    role = models.CharField(max_length=12, choices=ROLE_CHOICES)
    contenido = models.TextField()
    # Solo mensajes del tutor: lista de fuentes citadas (ver TutorChunk.fuente()).
    fuentes = models.JSONField(default=list, blank=True)
    # true si la respuesta fue una redirección por guardrail (sin llamar a la IA).
    redirigido = models.BooleanField(default=False)
    feedback = models.CharField(
        max_length=8, choices=FEEDBACK_CHOICES, blank=True, default=FEEDBACK_NONE,
    )
    # Métricas de uso (solo mensajes del tutor), mismo patrón que Session.tokens_*.
    tokens_in = models.PositiveIntegerField(null=True, blank=True)
    tokens_out = models.PositiveIntegerField(null=True, blank=True)
    generacion_ms = models.PositiveIntegerField(null=True, blank=True)
    modelo = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_tutor_messages'
        ordering = ['created_at']
        indexes = [models.Index(fields=['conversation', 'created_at'])]

    def __str__(self):
        return f'{self.conversation_id} · {self.role}'


class TutorDailyUsage(models.Model):
    """Contador por (usuario, fecha) para el límite diario por tier del tutor.

    Espejo de workouts.DailyGenerationCount pero namespaced en Academy. El límite
    depende del plan del usuario (users.Profile.plan): starter=free vs pro. Solo se
    incrementa cuando la pregunta llega efectivamente a la IA — las redirecciones
    por guardrail NO gastan cuota.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='tutor_daily_usage',
    )
    fecha = models.DateField()
    count = models.PositiveIntegerField(default=0)
    tokens_in = models.PositiveIntegerField(default=0)
    tokens_out = models.PositiveIntegerField(default=0)

    # Límite de mensajes/día por plan (confirmado con producto: free 3, pro 30).
    LIMITS = {'starter': 3, 'pro': 30}
    DEFAULT_LIMIT = 3

    class Meta:
        db_table = 'academy_tutor_daily_usage'
        unique_together = [['user', 'fecha']]
        indexes = [models.Index(fields=['user', 'fecha'])]

    def __str__(self):
        return f'{self.user_id} · {self.fecha} = {self.count}'

    @classmethod
    def limit_for(cls, user) -> int:
        """Pro si CUALQUIERA de los dos productos está activo: la suscripción
        "Zyfit Pro" del entrenador principal (`users.Profile.plan`) o "Zyfit
        Academy Pro" (paquete separado — ver `academy.access_service`; el
        tutor vive dentro de Academy, así que pagar cualquiera de los dos debe
        subir su cuota diaria)."""
        from academy.access_service import NIVEL_PRO, nivel_academia_de
        plan_principal = getattr(getattr(user, 'profile', None), 'plan', 'starter') or 'starter'
        plan_efectivo = 'pro' if (plan_principal == 'pro' or nivel_academia_de(user) == NIVEL_PRO) else 'starter'
        return cls.LIMITS.get(plan_efectivo, cls.DEFAULT_LIMIT)

    @classmethod
    def used_today(cls, user, fecha) -> int:
        obj = cls.objects.filter(user=user, fecha=fecha).first()
        return obj.count if obj else 0

    @classmethod
    def reached_limit(cls, user, fecha) -> bool:
        return cls.used_today(user, fecha) >= cls.limit_for(user)

    @classmethod
    def record(cls, user, fecha, tokens_in=0, tokens_out=0):
        """Incremento atómico del contador del día (get_or_create + F())."""
        cls.objects.get_or_create(user=user, fecha=fecha)
        cls.objects.filter(user=user, fecha=fecha).update(
            count=models.F('count') + 1,
            tokens_in=models.F('tokens_in') + (tokens_in or 0),
            tokens_out=models.F('tokens_out') + (tokens_out or 0),
        )
