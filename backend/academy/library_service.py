"""Biblioteca de recursos de Zyfit Academy.

Único punto de verdad del catálogo/consumo de `LibraryResource`: filtros,
favoritos y el gating freemium al abrir un recurso (mismo criterio que
`academy.access_service` usa para módulos/lecciones). El contenido en sí lo
administra staff vía Django Admin (ver `academy.admin`), igual patrón que
`AcademyBadge`.
"""

from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from . import access_service
from .library_models import LibraryFavorite, LibraryResource


def catalogo(*, tenant, tipo=None, school_id=None, course_id=None, q=None, destacados=False):
    """Catálogo de recursos activos del tenant, con los filtros opcionales del
    querystring ya resueltos (ver academy.library_views.library_view)."""
    qs = LibraryResource.objects.filter(tenant=tenant, activo=True).select_related('school', 'course')
    if tipo:
        qs = qs.filter(tipo=tipo)
    if school_id:
        qs = qs.filter(school_id=school_id)
    if course_id:
        qs = qs.filter(course_id=course_id)
    if destacados:
        qs = qs.filter(destacado=True)
    if q:
        qs = qs.filter(Q(titulo__icontains=q) | Q(descripcion__icontains=q) | Q(fuente__icontains=q))
    return qs


def filtrar_favoritos(user, qs):
    """Restringe un queryset ya filtrado a solo los recursos favoritos del usuario."""
    favorito_ids = LibraryFavorite.objects.filter(user=user).values_list('resource_id', flat=True)
    return qs.filter(id__in=favorito_ids)


def favoritos_ids_de(user, qs) -> set:
    """IDs de `qs` que el usuario ya marcó como favorito — para que el
    serializer pinte `favorito` sin una query por fila."""
    return set(
        LibraryFavorite.objects.filter(user=user, resource__in=qs).values_list('resource_id', flat=True)
    )


def alternar_favorito(user, resource_id) -> bool:
    """Marca/desmarca un recurso como favorito. Devuelve el nuevo estado."""
    resource = get_object_or_404(LibraryResource, pk=resource_id, activo=True)
    fav, created = LibraryFavorite.objects.get_or_create(user=user, resource=resource)
    if not created:
        fav.delete()
        return False
    return True


def abrir_recurso(user, resource_id, tenant) -> str:
    """Registra la apertura (suma una vista) y devuelve la URL real del
    recurso. Lanza PermissionDenied si es de pago y el usuario no tiene
    Zyfit Academy Pro — mismo criterio que puede_ver_modulo/puede_ver_leccion."""
    resource = get_object_or_404(LibraryResource, pk=resource_id, tenant=tenant, activo=True)
    nivel = access_service.nivel_academia_de(user)
    if not (resource.es_gratuito or nivel == access_service.NIVEL_PRO):
        raise PermissionDenied('Este recurso requiere Zyfit Academy Pro.')
    LibraryResource.objects.filter(pk=resource.pk).update(vistas=F('vistas') + 1)
    return resource.url
