"""Evaluador de insignias de identidad de Zyfit Academy — SIEMPRE en el servidor.

Insignias de identidad (escuela completada, hitos de racha, inicio de
recorrido) son GLOBALES por usuario y transversales a cursos/escuelas —
DISTINTAS de `CourseBadge`/`EarnedBadge` (Check-list de Competencias por
curso, ligado a una matrícula, del Programa Evolución 360°) y de
`Certificate` (credencial formal verificable). No comparten tabla ni lógica
de emisión con ninguna de las dos.

Catálogo data-driven a propósito: `evaluate_badges` es el ÚNICO evaluador,
genérico, que despacha por `AcademyBadge.criterio_tipo` — añadir una insignia
nueva es una fila en el catálogo (ver `seed_academy_badges`), no código nuevo.

Se llama como efecto colateral síncrono desde `academy.views` (al final de
`lesson_complete` / `quiz_attempt` / `submission_review`, DESPUÉS de que
`grading.recompute_progress` y `streak_service.record_study_activity` ya
corrieron) — el proyecto no usa Django signals en ningún lado, este módulo
sigue el mismo patrón explícito que `grading.py`/`streak_service.py`.
"""

from django.db.models import Count

from .models import (
    AcademyBadge, AcademyEarnedBadge, Course, Enrollment, LessonProgress,
)


def evaluate_badges(user):
    """Revisa el catálogo activo de insignias NO obtenidas por `user` y otorga
    (idempotente) las que ya se cumplen. Devuelve las `AcademyEarnedBadge`
    recién otorgadas en esta llamada (para la celebración en el cliente)."""
    ya_ganadas = set(
        AcademyEarnedBadge.objects.filter(user=user).values_list('badge_id', flat=True)
    )
    pendientes = list(AcademyBadge.objects.filter(activo=True).exclude(id__in=ya_ganadas))
    if not pendientes:
        return []

    ctx = _build_context(user, pendientes)
    nuevas = []
    for badge in pendientes:
        if _cumple_criterio(badge, ctx):
            earned, created = AcademyEarnedBadge.objects.get_or_create(user=user, badge=badge)
            if created:
                nuevas.append(earned)
    return nuevas


def _build_context(user, pendientes) -> dict:
    """Arma en batch solo los datos que los criterios pendientes necesitan —
    1 query por TIPO de criterio presente, nunca por insignia individual."""
    tipos = {b.criterio_tipo for b in pendientes}
    ctx = {}

    if AcademyBadge.CRITERIO_ESCUELA_COMPLETADA in tipos:
        escuela_ids = {b.criterio_escuela_id for b in pendientes if b.criterio_escuela_id}
        ctx['escuelas_completadas'] = _escuelas_completadas(user, escuela_ids)

    if AcademyBadge.CRITERIO_CURSO_COMPLETADO in tipos:
        ctx['cursos_completados'] = set(
            Enrollment.objects.filter(student=user, estado=Enrollment.ESTADO_COMPLETADA)
            .values_list('course_id', flat=True)
        )

    if AcademyBadge.CRITERIO_STREAK_DIAS in tipos:
        # Reverse OneToOneField: RelatedObjectDoesNotExist hereda de AttributeError,
        # así que getattr(..., None) es el patrón correcto (no hace falta try/except).
        streak = getattr(user, 'academy_streak', None)
        ctx['racha_actual'] = streak.racha_actual if streak else 0

    if AcademyBadge.CRITERIO_PRIMERA_LECCION in tipos:
        ctx['tiene_leccion_completada'] = LessonProgress.objects.filter(
            enrollment__student=user, completado=True,
        ).exists()

    return ctx


def _escuelas_completadas(user, escuela_ids) -> set:
    """Ids de escuela cuyos cursos PUBLICADOS están TODOS en estado 'completada'
    para `user`. Mismo criterio de "escuela 100%" que ya usa
    `dashboard_service._school_summary` (promedio de Enrollment.progreso sobre
    cursos publicados). Una escuela sin cursos publicados NUNCA cuenta como
    completada (evita el vacío-verdadero)."""
    if not escuela_ids:
        return set()
    total_por_escuela = dict(
        Course.objects.filter(school_id__in=escuela_ids, publicado=True)
        .values('school_id').annotate(n=Count('id')).values_list('school_id', 'n')
    )
    completados_por_escuela = dict(
        Enrollment.objects.filter(
            student=user, estado=Enrollment.ESTADO_COMPLETADA,
            course__school_id__in=escuela_ids, course__publicado=True,
        )
        .values('course__school_id').annotate(n=Count('id')).values_list('course__school_id', 'n')
    )
    return {
        escuela_id for escuela_id, total in total_por_escuela.items()
        if total > 0 and completados_por_escuela.get(escuela_id, 0) >= total
    }


def _cumple_criterio(badge, ctx) -> bool:
    """Despachador genérico por `criterio_tipo` — el único lugar que interpreta
    los tipos de criterio; NO hay una función distinta por insignia."""
    if badge.criterio_tipo == AcademyBadge.CRITERIO_ESCUELA_COMPLETADA:
        return badge.criterio_escuela_id in ctx.get('escuelas_completadas', set())
    if badge.criterio_tipo == AcademyBadge.CRITERIO_CURSO_COMPLETADO:
        return badge.criterio_curso_id in ctx.get('cursos_completados', set())
    if badge.criterio_tipo == AcademyBadge.CRITERIO_STREAK_DIAS:
        return bool(badge.criterio_valor) and ctx.get('racha_actual', 0) >= badge.criterio_valor
    if badge.criterio_tipo == AcademyBadge.CRITERIO_PRIMERA_LECCION:
        return ctx.get('tiene_leccion_completada', False)
    return False


def catalog_state(user) -> dict:
    """Catálogo activo + estado obtenida/no para `user`. Fuente ÚNICA de este
    payload (la usan tanto `GET /badges/` como el dashboard, para que ambos
    coincidan siempre). SOLO LECTURA — nunca dispara `evaluate_badges`: el
    desbloqueo es siempre efecto colateral de una acción real, nunca de
    "revisar si gané algo"."""
    badges = list(AcademyBadge.objects.filter(activo=True).select_related('criterio_escuela'))
    otorgadas = dict(
        AcademyEarnedBadge.objects.filter(user=user, badge__in=badges)
        .values_list('badge_id', 'otorgada_at')
    )
    items = [{
        'id': b.id,
        'identificador': b.identificador,
        'nombre': b.nombre,
        'descripcion': b.descripcion,
        'icono': b.icono,
        'criterio_tipo': b.criterio_tipo,
        'escuela_slug': b.criterio_escuela.slug if b.criterio_escuela_id else None,
        'obtenida': b.id in otorgadas,
        'otorgada_at': otorgadas[b.id].isoformat() if b.id in otorgadas else None,
    } for b in badges]
    return {
        'total': len(items),
        'total_obtenidas': sum(1 for i in items if i['obtenida']),
        'items': items,
    }
