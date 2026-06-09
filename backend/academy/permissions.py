"""Permisos de Zyfit Academy.

Dos niveles, en paralelo a Zyfit Performance:
  - Acceso a la academia → IsAcademyUser       (cualquier cuenta activa = estudiante).
  - Autoría de contenido → IsInstructorOrAdmin  (instructor o admin de producto).

El "dueño" de un curso concreto (¿puede editar ESTE curso?) se resuelve con el
helper `can_edit_course`, porque un permiso global no conoce el <id> de la ruta de
forma fiable en vistas función.
"""

from rest_framework.permissions import BasePermission


class IsAcademyUser(BasePermission):
    """Acceso a la academia. Hoy: cualquier cuenta activa (entra como estudiante)."""

    message = 'Necesitas una cuenta activa de Zyfit para acceder a la academia.'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.academy_acceso)


class IsInstructorOrAdmin(BasePermission):
    """Solo instructores o admin de producto: crean y publican cursos."""

    message = 'Solo un instructor o un admin puede gestionar contenido de la academia.'

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.is_active):
            return False
        return u.academy_instructor or u.is_admin or u.is_staff


def is_author(user) -> bool:
    """¿Puede esta cuenta CREAR/gestionar contenido (no necesariamente este curso)?"""
    return bool(
        user and user.is_authenticated and user.is_active
        and (user.academy_instructor or user.is_admin or user.is_staff)
    )


def can_edit_course(user, course) -> bool:
    """¿Puede este usuario editar/publicar ESTE curso?

    El admin/staff de producto edita cualquier curso; un instructor solo los
    suyos (los que figura como `instructor`)."""
    if user.is_admin or user.is_staff:
        return True
    return course.instructor_id == user.id
