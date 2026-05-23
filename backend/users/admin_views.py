"""Endpoints API consumidos por el banner 'Modo Admin' de la app móvil.

- `GET /api/admin/me/`              — para que el cliente sepa si debe mostrar el banner.
- `GET /api/admin/users/?q=&page=`  — listado paginado para impersonar.
- `POST /api/admin/impersonate/<pk>/` — emite tokens del usuario X con un claim
                                        `impersonator_id` que permite revertir.
- `POST /api/admin/stop-impersonate/` — lee el claim del token actual y emite
                                         tokens nuevos del admin original.

Impersonación = generar un par access/refresh para `target_user` con metadatos
que identifican al admin que lo invocó. No se invalidan los tokens del admin
en ningún punto — al volver, simplemente emitimos un par fresco con su user_id.
"""

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)
User = get_user_model()


# Cuántos resultados por página al listar usuarios desde el admin
PAGE_SIZE = 25


def _serialize_user_row(u) -> dict:
    """Forma compacta consumida por el listado de la app móvil."""
    profile = getattr(u, 'profile', None)
    return {
        'id':                u.id,
        'email':             u.email,
        'nombre':            profile.nombre if profile else '',
        'is_staff':          u.is_staff,
        'is_superuser':      u.is_superuser,
        'date_joined':       u.date_joined.isoformat() if u.date_joined else None,
        'last_login':        u.last_login.isoformat() if u.last_login else None,
        'total_sesiones':   getattr(u, '_total_sesiones', 0),
        'ultima_sesion':    u._ultima_sesion.isoformat() if getattr(u, '_ultima_sesion', None) else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_me(request):
    """Estado del banner.

    Devuelve `is_staff` del usuario actual y, si corresponde, los datos del
    `impersonator` (el admin original detrás del token de impersonación).
    El cliente lo usa para decidir si pintar el banner y qué etiqueta darle.
    """
    user = request.user
    impersonator = None
    if request.auth is not None:
        imp_id = request.auth.get('impersonator_id')
        if imp_id:
            try:
                imp = User.objects.get(pk=imp_id)
                impersonator = {
                    'id':    imp.id,
                    'email': imp.email,
                }
            except User.DoesNotExist:
                impersonator = None

    return Response({
        'id':           user.id,
        'email':        user.email,
        'is_staff':     user.is_staff,
        'is_superuser': user.is_superuser,
        'impersonating': impersonator,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_users_list(request):
    """Listado paginado de usuarios. Solo staff."""
    q = (request.query_params.get('q') or '').strip()
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1

    qs = User.objects.select_related('profile').annotate(
        _total_sesiones=Count('sessions', distinct=True),
        _ultima_sesion=Max('sessions__fecha'),
    ).order_by('-date_joined')

    if q:
        qs = qs.filter(Q(email__icontains=q) | Q(profile__nombre__icontains=q))

    total = qs.count()
    start = (page - 1) * PAGE_SIZE
    end   = start + PAGE_SIZE
    items = [_serialize_user_row(u) for u in qs[start:end]]

    return Response({
        'page':       page,
        'page_size':  PAGE_SIZE,
        'total':      total,
        'has_next':   end < total,
        'results':    items,
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_impersonate(request, pk):
    """Emite tokens del usuario `pk` con un claim de impersonador."""
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if target.id == request.user.id:
        return Response({'error': 'No tiene sentido impersonarte a ti mismo'}, status=status.HTTP_400_BAD_REQUEST)

    if target.is_superuser and not request.user.is_superuser:
        # Defensa básica: un staff regular no debería poder tomar identidad
        # de un superuser. Solo superusers pueden impersonar a otros superusers.
        return Response({'error': 'Permiso insuficiente para impersonar a este usuario'}, status=status.HTTP_403_FORBIDDEN)

    refresh = RefreshToken.for_user(target)
    refresh['impersonator_id']    = request.user.id
    refresh['impersonator_email'] = request.user.email

    # Tokens de impersonación más cortos — son un préstamo, no una sesión real.
    # 4h le da margen al admin para investigar, sin volver el feature peligroso
    # si el dispositivo cae en otras manos.
    refresh.set_exp(lifetime=timedelta(hours=4))
    access = refresh.access_token
    access['impersonator_id']    = request.user.id
    access['impersonator_email'] = request.user.email

    logger.info(
        'admin_impersonate: %s (id=%s) -> %s (id=%s)',
        request.user.email, request.user.id, target.email, target.id,
    )

    return Response({
        'access':  str(access),
        'refresh': str(refresh),
        'user': {
            'id':     target.id,
            'email':  target.email,
            'nombre': getattr(getattr(target, 'profile', None), 'nombre', ''),
            'onboarding_completo': bool(
                getattr(target, 'profile', None) and target.profile.is_onboarding_complete
            ),
            'is_staff': target.is_staff,
        },
        'impersonator': {
            'id':    request.user.id,
            'email': request.user.email,
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_stop_impersonate(request):
    """Reemite tokens del admin original (leído del claim impersonator_id)."""
    if request.auth is None:
        return Response({'error': 'Sin token'}, status=status.HTTP_400_BAD_REQUEST)

    imp_id = request.auth.get('impersonator_id')
    if not imp_id:
        return Response({'error': 'No estás en una sesión impersonada'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        admin_user = User.objects.get(pk=imp_id)
    except User.DoesNotExist:
        return Response({'error': 'Usuario admin original no existe'}, status=status.HTTP_404_NOT_FOUND)

    if not admin_user.is_active:
        # La cuenta fue desactivada mientras duraba la sesión de impersonación.
        # No emitimos tokens nuevos — el admin debe contactar a soporte.
        return Response({'error': 'Tu cuenta ha sido desactivada'}, status=status.HTTP_403_FORBIDDEN)

    if not admin_user.is_staff:
        # El admin original perdió permisos durante la sesión — no le devolvemos
        # acceso. Mejor que cierre sesión y vuelva a loggearse.
        return Response({'error': 'Tu cuenta ya no tiene permisos de admin'}, status=status.HTTP_403_FORBIDDEN)

    refresh = RefreshToken.for_user(admin_user)
    logger.info(
        'admin_stop_impersonate: %s (id=%s) -> %s (id=%s)',
        request.user.email, request.user.id, admin_user.email, admin_user.id,
    )

    return Response({
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id':       admin_user.id,
            'email':    admin_user.email,
            'nombre':   getattr(getattr(admin_user, 'profile', None), 'nombre', ''),
            'is_staff': admin_user.is_staff,
            'onboarding_completo': True,   # un admin ya completó onboarding por definición
        },
    })
