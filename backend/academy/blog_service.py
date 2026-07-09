"""Blog editorial de Zyfit Academy.

Único punto de verdad del catálogo público/autoría de `BlogPost`: filtros de
lectura y el conteo de vistas. La autoría (crear/editar/borrar) vive
directamente en `academy.blog_views` (mismo criterio que `academy.views` con
Course: sin una capa de servicio para el CRUD, que ya es simple vía
serializer)."""

from django.db.models import F, Q

from .blog_models import BlogPost


def catalogo_publico(*, tenant, school_id=None, tag=None, q=None):
    """Catálogo público (solo publicados) del tenant, con los filtros
    opcionales del querystring ya resueltos (ver academy.blog_views.blog_list_view)."""
    qs = BlogPost.objects.filter(tenant=tenant, publicado=True).select_related('school', 'autor')
    if school_id:
        qs = qs.filter(school_id=school_id)
    if tag:
        qs = qs.filter(etiquetas__contains=[tag])
    if q:
        qs = qs.filter(Q(titulo__icontains=q) | Q(resumen__icontains=q) | Q(contenido__icontains=q))
    return qs


def mis_posts(user, tenant):
    """Posts (borrador + publicados) de los que `user` figura como autor."""
    return BlogPost.objects.filter(tenant=tenant, autor=user).select_related('school')


def registrar_vista(post):
    """Suma una vista sin disparar `updated_at` de más — misma técnica que
    `library_service.abrir_recurso`."""
    BlogPost.objects.filter(pk=post.pk).update(vistas=F('vistas') + 1)
