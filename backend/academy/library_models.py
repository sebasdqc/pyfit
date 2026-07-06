"""Biblioteca de recursos — materiales de apoyo de Zyfit Academy.

Modelos en archivo propio para no seguir engordando `models.py`, mismo patrón
que `community_models.py`. Es una biblioteca de e-learning clásica: un catálogo
PLANO de recursos (documentos, plantillas, videos, guías, infografías,
herramientas, enlaces) que un estudiante busca, filtra por escuela/curso/tipo,
marca como favorito y abre — a diferencia de Course/Module/Lesson, que es
contenido secuencial con progreso.

El contenido lo administra staff vía Django Admin (mismo patrón que
`AcademyBadge`): no hay autoría de instructor en la web todavía. Toda la
lógica de catálogo/consumo vive en `academy.library_service`.
"""

from django.conf import settings
from django.db import models

RECURSO_DOCUMENTO = 'documento'
RECURSO_VIDEO = 'video'
RECURSO_PLANTILLA = 'plantilla'
RECURSO_GUIA = 'guia'
RECURSO_INFOGRAFIA = 'infografia'
RECURSO_HERRAMIENTA = 'herramienta'
RECURSO_ENLACE = 'enlace'
RECURSO_TIPO_CHOICES = [
    (RECURSO_DOCUMENTO, 'Documento'),
    (RECURSO_VIDEO, 'Video'),
    (RECURSO_PLANTILLA, 'Plantilla'),
    (RECURSO_GUIA, 'Guía'),
    (RECURSO_INFOGRAFIA, 'Infografía'),
    (RECURSO_HERRAMIENTA, 'Herramienta'),
    (RECURSO_ENLACE, 'Enlace'),
]


class LibraryResource(models.Model):
    """Recurso de la biblioteca. `url` apunta al material real (documento
    externo, video, herramienta) — sin object storage propio todavía, igual
    que `Course.portada`/`Lesson.video_url`.

    `school`/`course` son EJES DE FILTRO opcionales (un recurso puede ser
    general y no colgar de ninguno); `tenant` sigue el mismo patrón directo
    que `Course.tenant`/`CommunityPost.tenant` en vez de derivarse de school/
    course, para no mezclar catálogos de distintas organizaciones blanco-
    etiquetadas.
    """

    tenant = models.ForeignKey(
        'academy.Tenant', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recursos_biblioteca',
    )
    school = models.ForeignKey(
        'academy.School', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recursos_biblioteca',
    )
    course = models.ForeignKey(
        'academy.Course', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recursos_biblioteca',
    )
    tipo = models.CharField(max_length=16, choices=RECURSO_TIPO_CHOICES, default=RECURSO_DOCUMENTO)
    titulo = models.CharField(max_length=200)
    # Traducción al inglés (ver nota en School.nombre_en, models.py).
    titulo_en = models.CharField(max_length=200, blank=True, default='')
    descripcion = models.TextField(blank=True)
    descripcion_en = models.TextField(blank=True, default='')
    # Atribución libre (autor/publicación de origen), NO un FK — a diferencia
    # de Course.instructor, esto es solo texto de crédito (ej. "NSCA", "Zyfit").
    fuente = models.CharField(max_length=160, blank=True)
    url = models.URLField(max_length=500)
    # Miniatura como data URL (base64), igual patrón que Course.portada.
    miniatura = models.TextField(blank=True)
    etiquetas = models.JSONField(default=list, blank=True)
    # Freemium: recursos gratis son consumibles por cualquier estudiante (tier
    # starter); el resto exige AcademySubscription activa — ver
    # academy.access_service, mismo punto de verdad que Module.es_gratuito.
    es_gratuito = models.BooleanField(default=True)
    destacado = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)
    vistas = models.PositiveIntegerField(default=0)
    # activo=False retira el recurso del catálogo sin borrar favoritos/historial.
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_library_resources'
        ordering = ['-destacado', 'orden', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'activo', '-created_at']),
            models.Index(fields=['tipo']),
            models.Index(fields=['school']),
            models.Index(fields=['course']),
        ]

    def __str__(self):
        return self.titulo


class LibraryFavorite(models.Model):
    """Recurso marcado como favorito por un usuario."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='biblioteca_favoritos',
    )
    resource = models.ForeignKey(LibraryResource, on_delete=models.CASCADE, related_name='favoritos')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_library_favorites'
        unique_together = [['user', 'resource']]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user_id} · {self.resource_id}'
