"""Panel de administración de usuarios de Zyfit Academy — SOLO admin.

    GET  /api/academy/admin/usuarios/   lista (filtros: rol, q)
    POST /api/academy/admin/usuarios/   crea una cuenta (admin/profesor/estudiante)

A diferencia del registro público (`/api/auth/register/`, que siempre crea un
estudiante), este endpoint permite al admin de producto crear directamente
cuentas de instructor o de otro admin, sin pasar por el flujo de autoservicio.
Gateado por `IsAcademyAdmin` — un instructor NO puede usarlo (ver
academy.permissions).

El tenant efectivo de esta vista viene de la propia cuenta del admin que hace
la request cuando esa cuenta YA pertenece a un tenant — nunca del header
`X-Tenant-Slug` en ese caso, aunque lo traiga. Antes se resolvía 100% desde
`request.tenant` (controlado por el cliente); omitir el header hacía
`request.tenant=None`, y como `IsAcademyAdmin` solo rechaza un choque REAL
entre dos tenants concretos, un admin de un tenant podía fabricar así una
cuenta admin sin tenant que después administraba cualquier organización —
hallazgo crítico de auditoría (2026-07-09), corregido acá. Un admin GLOBAL
(`is_admin`/`is_staff`, sin `academy_tenant` propio) sigue usando el tenant
resuelto por header — es lo que permite dar de alta la primera cuenta de una
organización blanco-etiquetada nueva.
"""

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .permissions import IsAcademyAdmin
from .serializers import ACADEMY_ROL_ADMIN, ACADEMY_ROL_ESTUDIANTE, ACADEMY_ROL_PROFESOR, \
    AcademyUserCreateSerializer, AcademyUserSerializer

User = get_user_model()


def _resolve_effective_tenant(request):
    creator_tenant = request.user.academy_tenant
    return creator_tenant if creator_tenant else getattr(request, 'tenant', None)


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyAdmin])
def admin_users_view(request):
    tenant = _resolve_effective_tenant(request)

    if request.method == 'POST':
        serializer = AcademyUserCreateSerializer(data=request.data, context={'tenant': tenant})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AcademyUserSerializer(user).data, status=status.HTTP_201_CREATED)

    is_admin_rol = Q(role=User.ROLE_ADMIN) | Q(academy_admin=True)
    qs = User.objects.filter(academy_tenant=tenant).select_related('profile')
    rol = request.query_params.get('rol')
    if rol == ACADEMY_ROL_ADMIN:
        qs = qs.filter(is_admin_rol)
    elif rol == ACADEMY_ROL_PROFESOR:
        qs = qs.filter(academy_instructor=True).exclude(is_admin_rol)
    elif rol == ACADEMY_ROL_ESTUDIANTE:
        qs = qs.filter(academy_instructor=False).exclude(is_admin_rol)
    q = request.query_params.get('q')
    if q:
        qs = qs.filter(Q(email__icontains=q) | Q(first_name__icontains=q) | Q(profile__nombre__icontains=q))
    qs = qs.order_by('-date_joined')[:200]
    return Response(AcademyUserSerializer(qs, many=True).data)
