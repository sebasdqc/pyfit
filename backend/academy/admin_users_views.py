"""Panel de administración de usuarios de Zyfit Academy — SOLO admin.

    GET  /api/academy/admin/usuarios/   lista (filtros: rol, q)
    POST /api/academy/admin/usuarios/   crea una cuenta (admin/profesor/estudiante)

A diferencia del registro público (`/api/auth/register/`, que siempre crea un
estudiante), este endpoint permite al admin de producto crear directamente
cuentas de instructor o de otro admin, sin pasar por el flujo de autoservicio.
Gateado por `IsAcademyAdmin` — un instructor NO puede usarlo (ver
academy.permissions). El scoping por tenant sigue el mismo criterio que
courses_view/schools_view: `request.tenant` (resuelto por TenantMiddleware),
y `IsAcademyAdmin` ya rechaza un choque real entre el tenant del admin y el
de la request antes de llegar aquí.
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


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyAdmin])
def admin_users_view(request):
    tenant = getattr(request, 'tenant', None)

    if request.method == 'POST':
        serializer = AcademyUserCreateSerializer(data=request.data, context={'tenant': tenant})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AcademyUserSerializer(user).data, status=status.HTTP_201_CREATED)

    qs = User.objects.filter(academy_tenant=tenant).select_related('profile')
    rol = request.query_params.get('rol')
    if rol == ACADEMY_ROL_ADMIN:
        qs = qs.filter(role=User.ROLE_ADMIN)
    elif rol == ACADEMY_ROL_PROFESOR:
        qs = qs.filter(academy_instructor=True).exclude(role=User.ROLE_ADMIN)
    elif rol == ACADEMY_ROL_ESTUDIANTE:
        qs = qs.filter(academy_instructor=False).exclude(role=User.ROLE_ADMIN)
    q = request.query_params.get('q')
    if q:
        qs = qs.filter(Q(email__icontains=q) | Q(first_name__icontains=q) | Q(profile__nombre__icontains=q))
    qs = qs.order_by('-date_joined')[:200]
    return Response(AcademyUserSerializer(qs, many=True).data)
