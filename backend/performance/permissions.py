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


def can_access_module(user, center, modulo) -> bool:
    """¿Puede este usuario ver `modulo` DENTRO de `center`?

    Cierra el gating fino que antes solo aplicaba la barra lateral del frontend
    (un staff podía leer/escribir un módulo ajeno cambiando la URL). La regla:

      - admin/staff de producto  → ve todos los módulos en cualquier centro.
      - director principal del centro → ve todos (gestiona el centro completo).
      - resto del staff → solo los módulos de su pertenencia (whitelist
        `CenterMembership.modulos`, sembrada por rol en save()).

    Esto protege en particular el módulo PSICOLÓGICO (datos de salud sensibles):
    por defecto solo el psicólogo y el director técnico lo tienen en su whitelist,
    así que ningún otro rol puede leer evaluaciones psicológicas.

    El alcance por centro (¿pertenece a ESTE centro?) se valida aparte con los
    helpers de scope de las vistas; aquí se asume que `center` ya está en scope.
    """
    if user.is_admin or user.is_staff:
        return True
    if getattr(center, 'director_principal_id', None) == user.id:
        return True
    membership = (
        CenterMembership.objects
        .filter(center=center, user=user, activo=True)
        .first()
    )
    return bool(membership and membership.puede_ver(modulo))
