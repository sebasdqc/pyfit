"""Permisos del panel Zyfit Performance.

Dos niveles:
  - Acceso al panel  → IsPerformanceUser  (director, admin de producto o staff).
  - Gestión de altas → IsDirectorOrAdmin  (solo director técnico o admin).

El alcance por centro (¿pertenece este usuario a ESTE centro?) se resuelve en las
vistas con los helpers de scope, no aquí — un permiso global no conoce el <id> de
la ruta de forma fiable en vistas función.
"""

from rest_framework.permissions import BasePermission

from .models import CenterMembership


class IsPerformanceUser(BasePermission):
    """Cualquier cuenta con acceso al panel B2B (no atletas/coaches del consumo)."""

    message = 'Necesitas una cuenta de Zyfit Performance.'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.performance_acceso)


class IsDirectorOrAdmin(BasePermission):
    """Solo director técnico o admin de producto: dan de alta centros/staff/atletas."""

    message = 'Solo un director técnico o un admin puede realizar esta acción.'

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.is_active):
            return False
        return u.is_director or u.is_admin or u.is_staff


def user_centers(user):
    """IDs de centros que el usuario puede ver.

    El admin/staff ve todos; el resto ve los centros donde tiene una pertenencia
    activa o que dirige. Devuelve None para indicar "todos" (admin)."""
    if user.is_admin or user.is_staff:
        return None  # sin límite
    ids = set(
        CenterMembership.objects.filter(user=user, activo=True)
        .values_list('center_id', flat=True)
    )
    ids.update(
        user.centros_dirigidos.values_list('id', flat=True)
    )
    return ids
