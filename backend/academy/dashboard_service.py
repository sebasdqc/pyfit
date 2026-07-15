"""Home del estudiante de Zyfit Academy — capa de servicio del dashboard de progreso.

Agrega, en una sola llamada de solo lectura, todo lo que necesita pintar el Home:
progreso por escuela y curso, racha, insignias, "continuar"/"siguiente paso" y
estadísticas de por vida. Mismo patrón que `streak_service`/`grading`: funciones
de módulo (no clases), sin señales, `hoy`/`ahora` explícitos para poder testear.

NUNCA recalcula progreso ni otorga insignias: lee `Enrollment.progreso`/`estado`
(fuente única de verdad = `academy.grading.recompute_progress`) y reutiliza
`streak_service.get_or_create_state` para la racha, embebido en el payload sin
un segundo round-trip.

El Home ya NO expone un "progreso general" en % (encajaba mal con un producto
de suscripción continua: un % implica una meta que se "termina", y de ahí se
cae la suscripción). En su lugar se agregan los "puntos de aprendizaje"
(`Lesson.puntos` de las lecciones completadas) por escuela y a nivel global —
`puntos_aprendizaje` en la raíz, `puntos` por escuela. DISTINTO de
`racha['puntos_totales']` (gamificación de la racha, `streak_service`) y del
`Zyfit Score` de la app de entrenamiento (`users.coach_views`) — tres números
separados a propósito, nunca mezclar ni renombrar uno a costa del otro.
"""

import logging

from django.db.models import Max, Sum

from . import badges_service, mastery_service, streak_service
from .models import Course, Enrollment, Lesson, LessonProgress, School

logger = logging.getLogger(__name__)

BADGES_RECIENTES_MAX = 12


# ─── Helpers internos ─────────────────────────────────────────────────────────

def _puntos_by_course(user):
    """Puntos de aprendizaje ganados por curso (suma de `Lesson.puntos` de las
    lecciones ya completadas), en una sola query agregada —
    `{course_id: puntos}`. Un curso sin lecciones completadas no aparece acá
    (se lee con `.get(id, 0)`)."""
    rows = (
        LessonProgress.objects
        .filter(enrollment__student=user, completado=True)
        .values('enrollment__course_id')
        .annotate(total=Sum('lesson__puntos'))
    )
    return {row['enrollment__course_id']: row['total'] or 0 for row in rows}


def _course_status(course, enrollment, puntos_by_course):
    """Bucket (`completado`/`en_progreso`/`no_iniciado`) + campos de un curso."""
    progreso = enrollment.progreso if enrollment else 0
    if enrollment and enrollment.estado == Enrollment.ESTADO_COMPLETADA:
        estado = 'completado'
    elif enrollment and progreso > 0:
        estado = 'en_progreso'
    else:
        estado = 'no_iniciado'
    cert = getattr(enrollment, 'certificado', None) if enrollment else None
    return {
        'id': course.id,
        'titulo': course.titulo,
        'slug': course.slug,
        'estado': estado,
        'progreso': progreso,
        'enrollment_id': enrollment.id if enrollment else None,
        'certificado': cert.codigo if cert else None,
        '_puntos': puntos_by_course.get(course.id, 0),
    }


def _school_summary(school, courses, by_course_id, puntos_by_course):
    """Resumen de una escuela: `puntos` = puntos de aprendizaje acumulados en
    sus cursos publicados. `None` si la escuela no tiene cursos publicados (se
    excluye del payload, igual criterio que `schools_view`)."""
    if not courses:
        return None
    cursos_payload = [_course_status(c, by_course_id.get(c.id), puntos_by_course) for c in courses]
    puntos = sum(c.pop('_puntos') for c in cursos_payload)
    return {
        'id': school.id,
        'nombre': school.nombre,
        'slug': school.slug,
        'orden': school.orden,
        'puntos': puntos,
        'total_cursos': len(cursos_payload),
        'cursos_completados': sum(1 for c in cursos_payload if c['estado'] == 'completado'),
        'cursos_en_progreso': sum(1 for c in cursos_payload if c['estado'] == 'en_progreso'),
        'cursos_no_iniciados': sum(1 for c in cursos_payload if c['estado'] == 'no_iniciado'),
        'cursos': cursos_payload,
    }


def _recent_badges(enrollments):
    """Insignias ganadas por el estudiante, más recientes primero, capadas a
    `BADGES_RECIENTES_MAX` (el Home no necesita el historial completo)."""
    ganadas = []
    for e in enrollments:
        for earned in e.insignias_obtenidas.all():
            badge = earned.badge
            ganadas.append({
                'id': badge.id,
                'nombre': badge.nombre,
                'icono': badge.icono,
                'descripcion': badge.descripcion,
                'curso_id': e.course_id,
                'curso_titulo': e.course.titulo,
                'otorgada_at': earned.otorgada_at.isoformat(),
                '_otorgada_at_raw': earned.otorgada_at,
            })
    ganadas.sort(key=lambda b: b['_otorgada_at_raw'], reverse=True)
    recientes = [{k: v for k, v in b.items() if k != '_otorgada_at_raw'} for b in ganadas]
    return {'total': len(ganadas), 'recientes': recientes[:BADGES_RECIENTES_MAX]}


def _last_activity_by_enrollment(user):
    """`{enrollment_id: último completado_at}` — una sola query agregada."""
    rows = (
        LessonProgress.objects.filter(enrollment__student=user)
        .values('enrollment_id')
        .annotate(last=Max('completado_at'))
    )
    return {row['enrollment_id']: row['last'] for row in rows}


def _ordered_lessons(course_id):
    """Lecciones de un curso en orden de módulo/lección. Solo se llama para el
    curso elegido como destino de continuar/siguiente-paso, nunca por curso del
    catálogo completo."""
    return list(
        Lesson.objects.filter(module__course_id=course_id)
        .select_related('module')
        .order_by('module__orden', 'orden')
        .values('id', 'titulo', 'tipo', 'module__titulo')
    )


def _next_incomplete_lesson(course_id, completed_lesson_ids):
    for lesson in _ordered_lessons(course_id):
        if lesson['id'] not in completed_lesson_ids:
            return {
                'id': lesson['id'],
                'titulo': lesson['titulo'],
                'tipo': lesson['tipo'],
                'modulo_titulo': lesson['module__titulo'],
            }
    return None


def _target_payload(enrollment, leccion):
    if leccion is None:
        return None
    course = enrollment.course
    return {
        'enrollment_id': enrollment.id,
        'curso_id': course.id,
        'curso_titulo': course.titulo,
        'curso_slug': course.slug,
        'escuela_nombre': course.school.nombre if course.school_id else None,
        'progreso': enrollment.progreso,
        'leccion': leccion,
    }


def _recomendacion_ia(user, tenant, continuar, siguiente_paso):
    """Siguiente lección recomendada por el motor de mastery adaptativo
    (`mastery_service`), cruzando escuelas — DISTINTA de `continuar`/
    `siguiente_paso` (puramente secuencial dentro del curso más reciente).
    Failure-safe: cualquier fallo devuelve `None` (sin recomendación) en vez
    de tumbar el resto del Home — esta feature es aditiva, nunca crítica."""
    excluir = {t['leccion']['id'] for t in (continuar, siguiente_paso) if t}
    try:
        return mastery_service.recomendar_siguiente(user, tenant=tenant, excluir_lesson_ids=excluir)
    except Exception:
        logger.exception('mastery_service.recomendar_siguiente failed (user=%s)', user.id)
        return None


def _continue_and_next_step(enrollments, last_activity):
    """`continuar` = próxima lección incompleta de la matrícula activa tocada
    más recientemente (por `LessonProgress.completado_at`). `siguiente_paso` es
    lo mismo cuando existe; si el estudiante nunca completó una lección, cae a
    la primera lección de su matrícula activa más antigua sin tocar. Ambos
    `None` solo si no hay matrículas activas."""
    activas = [e for e in enrollments if e.estado == Enrollment.ESTADO_ACTIVA]
    if not activas:
        return None, None

    tocadas = [e for e in activas if last_activity.get(e.id)]
    if tocadas:
        ultima = max(tocadas, key=lambda e: last_activity[e.id])
        completadas = set(
            LessonProgress.objects.filter(enrollment=ultima, completado=True)
            .values_list('lesson_id', flat=True)
        )
        leccion = _next_incomplete_lesson(ultima.course_id, completadas)
        continuar = _target_payload(ultima, leccion)
        if continuar is not None:
            return continuar, continuar

    # Sin actividad registrada (o la última tocada ya no tiene pendientes):
    # siguiente paso = primera lección de la matrícula activa sin tocar más
    # antigua; si todas fueron tocadas, la matrícula activa más antigua.
    sin_tocar = sorted((e for e in activas if not last_activity.get(e.id)),
                        key=lambda e: e.created_at)
    candidatas = sin_tocar or sorted(activas, key=lambda e: e.created_at)
    for e in candidatas:
        leccion = _next_incomplete_lesson(e.course_id, set())
        siguiente = _target_payload(e, leccion)
        if siguiente is not None:
            return None, siguiente
    return None, None


def _lifetime_stats(enrollments, racha):
    """Estadísticas simples de por vida. `minutos_estimados_invertidos` es una
    ESTIMACIÓN a partir de `Lesson.duracion_min` (metadata del instructor) — no
    hay tracking real de tiempo de reproducción en el esquema."""
    minutos = LessonProgress.objects.filter(
        enrollment_id__in=[e.id for e in enrollments], completado=True,
    ).aggregate(total=Sum('lesson__duracion_min'))['total']
    return {
        'cursos_completados': sum(1 for e in enrollments if e.estado == Enrollment.ESTADO_COMPLETADA),
        'cursos_activos': sum(1 for e in enrollments if e.estado == Enrollment.ESTADO_ACTIVA),
        'total_inscripciones': len(enrollments),
        'mejor_racha': racha['mejor_racha'],
        'minutos_estimados_invertidos': minutos or 0,
    }


# ─── API pública del servicio ─────────────────────────────────────────────────

def build_dashboard(user, tenant=None, hoy=None, ahora=None) -> dict:
    """Punto de entrada único del Home del estudiante. Todo se calcula en vivo
    a partir de Enrollment/LessonProgress/EarnedBadge/AcademyStreak — no escribe
    nada (a diferencia de streak_service) ni cachea nada."""
    schools = list(School.objects.filter(tenant=tenant).order_by('orden', 'nombre'))
    courses = (
        Course.objects.filter(school__in=schools, publicado=True)
        .select_related('school')
        .order_by('school__orden', 'created_at')
    )
    cursos_por_escuela = {}
    for course in courses:
        cursos_por_escuela.setdefault(course.school_id, []).append(course)

    enrollments = list(
        Enrollment.objects.filter(student=user)
        .select_related('course', 'course__school', 'certificado')
        .prefetch_related('insignias_obtenidas__badge')
    )
    by_course_id = {e.course_id: e for e in enrollments}
    puntos_by_course = _puntos_by_course(user)

    escuelas = []
    for school in schools:
        summary = _school_summary(school, cursos_por_escuela.get(school.id) or [], by_course_id, puntos_by_course)
        if summary is not None:
            escuelas.append(summary)

    puntos_aprendizaje = sum(escuela['puntos'] for escuela in escuelas)

    last_activity = _last_activity_by_enrollment(user)
    continuar, siguiente_paso = _continue_and_next_step(enrollments, last_activity)
    racha = streak_service.get_or_create_state(user, hoy=hoy, ahora=ahora)
    recomendacion_ia = _recomendacion_ia(user, tenant, continuar, siguiente_paso)

    return {
        'puntos_aprendizaje': puntos_aprendizaje,
        'tiene_matriculas': bool(enrollments),
        'escuelas': escuelas,
        'racha': racha,
        'recomendacion_ia': recomendacion_ia,
        # 'insignias' = Check-list de Competencias por curso (CourseBadge/EarnedBadge,
        # Programa Evolución 360°, otorgadas por matrícula). 'insignias_identidad' =
        # catálogo global de identidad (AcademyBadge/AcademyEarnedBadge, por usuario:
        # escuela completada, racha, inicio). Son DOS sistemas separados a propósito
        # (ver academy.badges_service); el cliente los unifica en una sola galería.
        'insignias': _recent_badges(enrollments),
        'insignias_identidad': badges_service.catalog_state(user),
        'continuar': continuar,
        'siguiente_paso': siguiente_paso,
        'stats': _lifetime_stats(enrollments, racha),
    }
