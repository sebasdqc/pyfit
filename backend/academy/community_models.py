"""Comunidad — foro Q&A asíncrono entre alumnos de Zyfit Academy.

Capa de engagement OPCIONAL: ningún flujo de progreso, certificación, racha o
insignia CORE depende de estos modelos (la única insignia relacionada,
"Colaborador", es igualmente opcional y se resuelve en `academy.badges_service`
como un criterio más del catálogo data-driven).

Autosostenible sin moderación humana: todo post/respuesta pasa por
`community_service.moderar_texto` (guardrails determinísticos + Groq, la MISMA
integración de IA que ya usa el tutor — ver `community_service.py`) al crearse,
y el sistema de reportes de alumnos oculta contenido automáticamente al superar
un umbral (`settings.COMMUNITY_REPORT_THRESHOLD`). El panel de Django Admin
(Unfold) es un panel de revisión OPCIONAL, nunca un prerrequisito operativo.
"""

from django.conf import settings
from django.db import models
from django.db.models import CheckConstraint, Q, UniqueConstraint

from .models import Course, Module, School, Tenant

ESTADO_VISIBLE = 'visible'
ESTADO_OCULTO_IA = 'oculto_ia'
ESTADO_OCULTO_REPORTES = 'oculto_reportes'
ESTADO_OCULTO_MANUAL = 'oculto_manual'
ESTADO_CHOICES = [
    (ESTADO_VISIBLE, 'Visible'),
    (ESTADO_OCULTO_IA, 'Oculto (IA)'),
    (ESTADO_OCULTO_REPORTES, 'Oculto (reportes)'),
    (ESTADO_OCULTO_MANUAL, 'Oculto (manual)'),
]


class CommunityPost(models.Model):
    """Pregunta de un alumno, opcionalmente anclada a un curso/módulo, o
    general dentro de una escuela.

    `moderacion_resultado` guarda la clasificación del chequeo automático
    (`{"categoria", "razon", "fuente"}`) como dato de auditoría 1-a-1 —no
    necesita ciclo de vida propio, a diferencia de `CommunityReport` (N-a-1,
    por eso sí es su propia tabla)."""

    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_posts',
    )
    escuela = models.ForeignKey(School, on_delete=models.CASCADE, related_name='community_posts')
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, null=True, blank=True, related_name='community_posts',
    )
    curso = models.ForeignKey(
        Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='community_posts',
    )
    modulo = models.ForeignKey(
        Module, on_delete=models.SET_NULL, null=True, blank=True, related_name='community_posts',
    )
    titulo = models.CharField(max_length=200)
    contenido = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_VISIBLE, db_index=True)
    moderacion_resultado = models.JSONField(null=True, blank=True)
    reportes_count = models.PositiveIntegerField(default=0)
    respuestas_count = models.PositiveIntegerField(default=0)
    mejor_respuesta = models.ForeignKey(
        'CommunityReply', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_community_posts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['escuela', 'estado']),
            models.Index(fields=['curso', 'estado']),
        ]

    def __str__(self):
        return self.titulo


class CommunityReply(models.Model):
    """Respuesta de un alumno a un `CommunityPost`.

    `es_mejor_respuesta` está denormalizado (además de `CommunityPost.mejor_respuesta`)
    para poder ordenar/renderizar sin join extra; ambos se mantienen sincronizados
    dentro de la misma transacción en `community_service.marcar_mejor_respuesta`."""

    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='respuestas')
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_replies',
    )
    contenido = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_VISIBLE, db_index=True)
    moderacion_resultado = models.JSONField(null=True, blank=True)
    votos_count = models.PositiveIntegerField(default=0)
    reportes_count = models.PositiveIntegerField(default=0)
    es_mejor_respuesta = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_community_replies'
        ordering = ['-es_mejor_respuesta', '-votos_count', 'created_at']
        indexes = [models.Index(fields=['post', 'estado'])]

    def __str__(self):
        return f'Respuesta {self.id} a post {self.post_id}'


class CommunityVote(models.Model):
    """Upvote de un alumno a una respuesta. Un usuario vota como máximo una vez
    por respuesta (toggle en `community_service.votar_respuesta`)."""

    reply = models.ForeignKey(CommunityReply, on_delete=models.CASCADE, related_name='votos')
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_votos',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_community_votes'
        unique_together = [['reply', 'usuario']]

    def __str__(self):
        return f'{self.usuario_id} → {self.reply_id}'


class CommunityReport(models.Model):
    """Reporte de un alumno sobre un post o una respuesta (exactamente uno de
    los dos). No usa `GenericForeignKey` (sin precedente en el proyecto) sino
    dos FKs nullable con un `CheckConstraint` que exige exactamente una."""

    MOTIVO_SPAM = 'spam'
    MOTIVO_OFENSIVO = 'ofensivo'
    MOTIVO_FUERA_DE_TEMA = 'fuera_de_tema'
    MOTIVO_OTRO = 'otro'
    MOTIVO_CHOICES = [
        (MOTIVO_SPAM, 'Spam'),
        (MOTIVO_OFENSIVO, 'Ofensivo'),
        (MOTIVO_FUERA_DE_TEMA, 'Fuera de tema'),
        (MOTIVO_OTRO, 'Otro'),
    ]

    post = models.ForeignKey(
        CommunityPost, on_delete=models.CASCADE, null=True, blank=True, related_name='reportes',
    )
    reply = models.ForeignKey(
        CommunityReply, on_delete=models.CASCADE, null=True, blank=True, related_name='reportes',
    )
    reportado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_reportes',
    )
    motivo = models.CharField(max_length=20, choices=MOTIVO_CHOICES)
    detalle = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_community_reports'
        ordering = ['-created_at']
        constraints = [
            CheckConstraint(
                condition=(
                    Q(post__isnull=False, reply__isnull=True)
                    | Q(post__isnull=True, reply__isnull=False)
                ),
                name='community_report_exactamente_un_target',
            ),
            UniqueConstraint(
                fields=['post', 'reportado_por'], condition=Q(post__isnull=False),
                name='community_report_unico_por_post_y_usuario',
            ),
            UniqueConstraint(
                fields=['reply', 'reportado_por'], condition=Q(reply__isnull=False),
                name='community_report_unico_por_reply_y_usuario',
            ),
        ]

    def __str__(self):
        target = f'post {self.post_id}' if self.post_id else f'respuesta {self.reply_id}'
        return f'Reporte de {self.reportado_por_id} sobre {target} ({self.motivo})'
