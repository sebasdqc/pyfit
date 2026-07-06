"""Endpoints de la Biblioteca de recursos de Zyfit Academy.

    GET  /api/academy/library/               catálogo (filtros: tipo, school,
                                               course, q, destacados=1, favoritos=1)
    POST /api/academy/library/<id>/favorito/  alternar favorito
    POST /api/academy/library/<id>/abrir/     registra la apertura y devuelve la URL

El contenido lo administra staff vía Django Admin (mismo patrón que
AcademyBadge) — aquí solo vive el catálogo/consumo del estudiante, ver
academy.library_service para la lógica.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from . import access_service, library_service
from .permissions import IsAcademyUser
from .serializers import LibraryResourceSerializer


def _int_or_none(value):
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def library_view(request):
    tenant = getattr(request, 'tenant', None)
    qs = library_service.catalogo(
        tenant=tenant,
        tipo=request.query_params.get('tipo') or None,
        school_id=_int_or_none(request.query_params.get('school')),
        course_id=_int_or_none(request.query_params.get('course')),
        q=request.query_params.get('q') or None,
        destacados=bool(request.query_params.get('destacados')),
    )
    if request.query_params.get('favoritos'):
        qs = library_service.filtrar_favoritos(request.user, qs)

    context = {
        'locale': getattr(request, 'locale', 'es'),
        'nivel': access_service.nivel_academia_de(request.user),
        'favoritos_ids': library_service.favoritos_ids_de(request.user, qs),
    }
    return Response(LibraryResourceSerializer(qs, many=True, context=context).data)


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def library_favorite_view(request, pk):
    favorito = library_service.alternar_favorito(request.user, pk)
    return Response({'favorito': favorito})


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def library_open_view(request, pk):
    tenant = getattr(request, 'tenant', None)
    url = library_service.abrir_recurso(request.user, pk, tenant)
    return Response({'url': url})
