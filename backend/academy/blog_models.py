"""Blog editorial de Zyfit Academy — contenido de marketing/SEO público.

Modelo en archivo propio, mismo patrón que `community_models.py`/
`library_models.py`: no sigue engordando `models.py`. A diferencia de
Course/Module/Lesson (contenido secuencial con progreso) o LibraryResource
(catálogo administrado 100% por staff), el blog lo escriben los propios
instructores desde un editor en `academy-web` (`/instructor/blog`) y es
público sin cuenta — no tiene gating freemium ni AnonymousSession, ver
`academy.blog_service`/`academy.blog_views`.
"""

from django.conf import settings
from django.db import models


class BlogPost(models.Model):
    """Publicación del blog. `school`/`etiquetas` son ejes de filtro opcionales
    (un post puede ser general y no colgar de ninguna escuela) — mismo criterio
    que `LibraryResource.school`. `publicado_en` se estampa una única vez, la
    primera vez que `publicado` pasa a True (ver `blog_views._marcar_publicacion`),
    y nunca se sobreescribe aunque el post se edite después."""

    tenant = models.ForeignKey(
        'academy.Tenant', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='blog_posts',
    )
    school = models.ForeignKey(
        'academy.School', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='blog_posts',
    )
    # Autor / dueño del post. SET_NULL para no perder el contenido si se borra
    # la cuenta del instructor (mismo criterio que Course.instructor).
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='blog_posts',
    )
    titulo = models.CharField(max_length=200)
    # Identificador legible para la URL pública (/blog/<slug>).
    slug = models.SlugField(max_length=140, unique=True)
    resumen = models.CharField(max_length=300, blank=True, help_text='Bajada para la tarjeta y el SEO.')
    # Texto plano, mismo criterio que Lesson.contenido — no renderiza markdown,
    # se muestra dividido en párrafos por líneas en blanco (ver BlogPostPage.tsx).
    contenido = models.TextField(blank=True)
    # Data URL de imagen o URL externa — mismo criterio que Course.portada
    # (validate_portada en el serializer).
    portada = models.TextField(blank=True)
    etiquetas = models.JSONField(default=list, blank=True)
    # Mientras publicado=False solo lo ve su autor y el admin (borrador) —
    # mismo criterio que Course.publicado.
    publicado = models.BooleanField(default=False)
    publicado_en = models.DateTimeField(null=True, blank=True)
    vistas = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_blog_posts'
        ordering = ['-publicado_en', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'publicado', '-publicado_en']),
            models.Index(fields=['school']),
            models.Index(fields=['autor']),
        ]

    def __str__(self):
        return self.titulo
