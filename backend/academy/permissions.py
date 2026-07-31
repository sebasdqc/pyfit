"""Permisos de Zyfit Academy.

Dos niveles, en paralelo a Zyfit Performance:
  - Acceso a la academia → IsAcademyUser       (cualquier cuenta activa = estudiante).
  - Autoría de contenido → IsInstructorOrAdmin  (instructor o admin de producto).

El "dueño" de un curso concreto (¿puede editar ESTE curso?) se resuelve con el
helper `can_edit_course`, porque un permiso global no conoce el <id> de la ruta de
forma fiable en vistas función.
"""

from rest_framework.permissions import BasePermission


def tenant_mismatch(user, request) -> bool:
    """¿Esta cuenta pertenece a un tenant DISTINTO del resuelto para este
    request? Solo bloquea un choque real entre dos tenants concretos: si
    cualquiera de los dos lados es None (cuenta sin tenant asignado, o
    request sin X-Tenant-Slug/Host de tenant) no se considera choque — evita
    bloquear cuentas anteriores a `User.academy_tenant` o el catálogo raíz.
    Único punto de verdad, usado por `IsAcademyUser` y `academy_login`."""
    user_tenant_id = getattr(user, 'academy_tenant_id', None)
    request_tenant = getattr(request, 'tenant', None)
    return bool(user_tenant_id and request_tenant and user_tenant_id != request_tenant.id)


class IsAcademyUser(BasePermission):
    """Acceso a la academia. Hoy: cualquier cuenta activa (entra como estudiante).

    También rechaza el caso en que la cuenta pertenece a OTRO tenant blanco-
    etiquetado que el resuelto para este request (ver `tenant_mismatch`) —
    cierra el hallazgo de auditoría donde `X-Tenant-Slug` controlado por el
    cliente permitía a cualquier cuenta navegar el catálogo/comunidad de una
    organización de la que nunca fue miembro."""

    message = 'Necesitas una cuenta activa de Zyfit para acceder a la academia.'

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.academy_acceso):
            return False
        return not tenant_mismatch(u, request)


class IsInstructorOrAdmin(BasePermission):
    """Solo instructores o admin (de producto o de Academy): crean y publican
    cursos."""

    message = 'Solo un instructor o un admin puede gestionar contenido de la academia.'

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.is_active):
            return False
        return u.academy_instructor or u.is_admin or u.is_staff or u.academy_admin


class IsAcademyAdmin(BasePermission):
    """Admin de producto (o staff de Django) O admin scoped a Academy
    (`User.academy_admin`, ver el modelo): a diferencia de IsInstructorOrAdmin,
    un instructor NO puede gestionar cuentas — crear un admin/instructor/
    estudiante es una acción de privilegio distinto a la autoría de contenido.

    `academy_admin` es deliberadamente DISTINTO de `is_admin`/`role`: ese es
    global entre los 3 productos (concede además acceso B2B completo a Zyfit
    Performance). Un admin de Academy debe poder administrar su organización
    de punta a punta sin heredar ningún acceso fuera de Academy."""

    message = 'Solo un administrador puede gestionar usuarios de la academia.'

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.is_active
                and (u.is_admin or u.is_staff or u.academy_admin)):
            return False
        return not tenant_mismatch(u, request)


def tenant_clash(user, obj) -> bool:
    """¿Este objeto (curso, post, …) pertenece a un tenant DISTINTO del de la
    cuenta? Misma semántica deliberadamente laxa que `tenant_mismatch`: solo
    hay choque si AMBOS lados son un tenant concreto. Si cualquiera es None
    (cuenta anterior a `User.academy_tenant`, o contenido del catálogo raíz de
    Zyfit) no se bloquea — mantener este criterio evita romper las cuentas y el
    contenido que existen desde antes del modelo multi-tenant."""
    user_tenant_id = getattr(user, 'academy_tenant_id', None)
    obj_tenant_id = getattr(obj, 'tenant_id', None)
    return bool(user_tenant_id and obj_tenant_id and user_tenant_id != obj_tenant_id)


def is_author(user) -> bool:
    """¿Puede esta cuenta CREAR/gestionar contenido (no necesariamente este curso)?"""
    return bool(
        user and user.is_authenticated and user.is_active
        and (user.academy_instructor or user.is_admin or user.is_staff or user.academy_admin)
    )


def can_edit_course(user, course) -> bool:
    """¿Puede este usuario editar/publicar ESTE curso?

    El admin/staff de producto de Zyfit edita cualquier curso; el admin de
    Academy solo dentro de SU organización (`tenant_clash`); un instructor solo
    los suyos (los que figura como `instructor`).

    ⚠️ El chequeo de tenant vive acá y no solo en el lookup de la vista por el
    hallazgo de auditoría 2026-07-30: los endpoints de quiz/preguntas
    resolvían Lesson/Quiz por PK global y llamaban a este helper como único
    control, así que un `academy_admin` podía editar y borrar contenido de
    otro tenant. Cualquier endpoint futuro que use este helper sin filtrar por
    tenant en el lookup queda cubierto."""
    if user.is_admin or user.is_staff:
        return True
    if user.academy_admin and not tenant_clash(user, course):
        return True
    return course.instructor_id == user.id


def can_edit_post(user, post) -> bool:
    """¿Puede este usuario editar/publicar ESTE post del blog? Mismo criterio
    que `can_edit_course`: admin/staff/admin de Academy edita cualquiera, un
    instructor solo los suyos (los que figura como `autor`)."""
    if user.is_admin or user.is_staff:
        return True
    if user.academy_admin and not tenant_clash(user, post):
        return True
    return post.autor_id == user.id
