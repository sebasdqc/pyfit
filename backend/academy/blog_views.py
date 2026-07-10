"""Endpoints del Blog de Zyfit Academy — contenido editorial con autoría de
instructor, público sin cuenta (a diferencia de Course, sin gating freemium).

    GET  /api/academy/blog/                catálogo público (solo publicados)
    GET  /api/academy/blog/<slug>/         detalle público por slug
    GET  /api/academy/blog/mias/           mis publicaciones (borrador+publicadas)
    POST /api/academy/blog/mias/           crear publicación
    GET/PATCH/DELETE /api/academy/blog/mias/<int:pk>/  leer/editar/eliminar

Lectura pública (`blog_list_view`/`blog_detail_view`): AllowAny, endpoints
DEDICADOS (mismo criterio que anon_views.py) — no reescriben las vistas de
autoría. Autoría (`blog_mine_view`/`blog_manage_detail_view`): `IsAcademyUser`
+ chequeo manual de `is_author`/`can_edit_post`, mismo patrón que
`academy.views.courses_view`/`course_detail` con Course."""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import blog_service
from .blog_models import BlogPost
from .permissions import IsAcademyUser, can_edit_post, is_author
from .serializers import BlogPostDetailSerializer, BlogPostSerializer


def _int_or_none(value):
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _marcar_publicacion(post):
    """Estampa `publicado_en` la PRIMERA vez que el post pasa a publicado —
    nunca se sobreescribe en ediciones posteriores."""
    if post.publicado and post.publicado_en is None:
        post.publicado_en = timezone.now()
        post.save(update_fields=['publicado_en'])


@api_view(['GET'])
@permission_classes([AllowAny])
def blog_list_view(request):
    """Catálogo público. Filtros: `school`, `tag`, `q`."""
    tenant = getattr(request, 'tenant', None)
    qs = blog_service.catalogo_publico(
        tenant=tenant,
        school_id=_int_or_none(request.query_params.get('school')),
        tag=request.query_params.get('tag') or None,
        q=request.query_params.get('q') or None,
    )
    return Response(BlogPostSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def blog_detail_view(request, slug):
    """Detalle público por slug. Un borrador solo lo ve su autor o el admin
    (preview antes de publicar) — cualquier otro visitante recibe 404, no 403,
    para no filtrar que el slug existe."""
    tenant = getattr(request, 'tenant', None)
    post = get_object_or_404(BlogPost, slug=slug, tenant=tenant)
    u = request.user
    if not post.publicado and not (u and u.is_authenticated and can_edit_post(u, post)):
        return Response(status=status.HTTP_404_NOT_FOUND)
    if post.publicado:
        blog_service.registrar_vista(post)
        post.vistas += 1  # refleja el incremento en la respuesta sin otra query (update() no toca la instancia en memoria)
    return Response(BlogPostDetailSerializer(post).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyUser])
def blog_mine_view(request):
    """GET lista mis publicaciones (admin ve las de todo el tenant); POST crea una."""
    tenant = getattr(request, 'tenant', None)
    u = request.user

    if request.method == 'POST':
        if not is_author(u):
            return Response({'detail': 'Solo un instructor o admin puede crear publicaciones.'},
                            status=status.HTTP_403_FORBIDDEN)
        serializer = BlogPostDetailSerializer(data=request.data, context={'tenant': tenant})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        post = serializer.save(autor=u, tenant=tenant)
        _marcar_publicacion(post)
        return Response(BlogPostDetailSerializer(post).data, status=status.HTTP_201_CREATED)

    if not is_author(u):
        return Response({'detail': 'Solo un instructor o admin puede gestionar el blog.'},
                        status=status.HTTP_403_FORBIDDEN)
    ve_todos = u.is_admin or u.is_staff or u.academy_admin
    qs = BlogPost.objects.filter(tenant=tenant) if ve_todos else blog_service.mis_posts(u, tenant)
    return Response(BlogPostSerializer(qs, many=True).data)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAcademyUser])
def blog_manage_detail_view(request, pk):
    """Lee (con `contenido`, para precargar el editor SIN sumar una vista —
    a diferencia de `blog_detail_view`, pensado para lectores), edita o
    elimina un post propio (autor dueño o admin)."""
    tenant = getattr(request, 'tenant', None)
    post = get_object_or_404(BlogPost, pk=pk, tenant=tenant)
    if not can_edit_post(request.user, post):
        return Response({'detail': 'Solo el autor o un admin puede editar esta publicación.'},
                        status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        return Response(BlogPostDetailSerializer(post).data)

    if request.method == 'DELETE':
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = BlogPostDetailSerializer(post, data=request.data, partial=True, context={'tenant': tenant})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    _marcar_publicacion(post)
    return Response(BlogPostDetailSerializer(post).data)
