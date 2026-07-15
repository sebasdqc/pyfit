"""Motor de dominio adaptativo (mastery) de Zyfit Academy.

Actualiza `StudentCompetencyMastery` a partir de evidencia real (quizzes
calificados por el servidor, entregas aprobadas por un instructor) y
recomienda la siguiente lección a estudiar CRUZANDO escuelas, priorizando
las competencias donde el estudiante tiene menor dominio — a diferencia de
`continuar`/`siguiente_paso` en `dashboard_service`, que es puramente
secuencial dentro del curso más recientemente tocado.

Funciones puras de módulo (sin clases, sin señales — convención del
proyecto). Pueden lanzar excepción libremente: el llamador SIEMPRE las
envuelve en try/except (mismo patrón que `_otorgar_insignias`/
`_registrar_actividad_estudio` en `academy.views`) para que un fallo de esta
feature nunca tumbe el flujo de aprendizaje existente.
"""

from collections import defaultdict

from .access_service import nivel_academia_de, puede_ver_leccion
from .competency_models import LessonCompetencyTag, StudentCompetencyMastery
from .models import Enrollment, LessonProgress, Submission

# EMA: nuevo_nivel = nivel_actual + (alpha_base * peso_tag) * (observado - nivel_actual)
ALPHA_QUIZ = 0.35
ALPHA_SUBMISSION = 0.5  # más peso que un quiz: hay criterio humano detrás.
OBSERVADO_SUBMISSION_APROBADA = 90.0

# Prior neutral-bajo para una competencia sin evidencia: ni penaliza como si el
# estudiante la dominara (100), ni la sobre-prioriza como si no supiera nada (0).
PRIOR_SIN_EVIDENCIA = 40.0
# Por debajo de este score, no hay candidato suficientemente relevante —
# silencio (sin recomendación) es mejor que ruido.
SCORE_MINIMO_RECOMENDACION = 20.0


def _actualizar_mastery(student, competency_id, peso_tag, observado, alpha_base):
    mastery, created = StudentCompetencyMastery.objects.get_or_create(
        student=student, competency_id=competency_id,
        defaults={'nivel': observado, 'evidencia_n': 1},
    )
    if created:
        return mastery
    alpha = alpha_base * peso_tag
    mastery.nivel = mastery.nivel + alpha * (observado - mastery.nivel)
    mastery.evidencia_n += 1
    mastery.save(update_fields=['nivel', 'evidencia_n', 'updated_at'])
    return mastery


def registrar_evidencia_quiz(quiz_attempt):
    """Un intento de quiz (aprobado o no) es evidencia de dominio de las
    competencias tageadas a la lección de ese quiz — se usa el puntaje YA
    calificado por el servidor (`grading.grade_attempt`), nunca datos crudos
    del cliente. Reintentos se procesan en orden cronológico normal: cada
    intento nuevo alimenta la media móvil, no solo el mejor puntaje."""
    lesson = quiz_attempt.quiz.lesson
    student = quiz_attempt.enrollment.student
    tags = LessonCompetencyTag.objects.filter(lesson=lesson).select_related('competency')
    for tag in tags:
        _actualizar_mastery(student, tag.competency_id, tag.peso, quiz_attempt.puntaje, ALPHA_QUIZ)


def registrar_evidencia_submission(submission):
    """Solo una entrega APROBADA es evidencia de dominio. Un rechazo es
    feedback pedagógico para reenviar corregido, no evidencia confiable de
    bajo dominio — penalizar el mastery por un rechazo desalentaría el
    reenvío y generaría ruido."""
    if submission.estado != Submission.ESTADO_APROBADA:
        return
    student = submission.enrollment.student
    tags = LessonCompetencyTag.objects.filter(lesson=submission.lesson).select_related('competency')
    for tag in tags:
        _actualizar_mastery(student, tag.competency_id, tag.peso, OBSERVADO_SUBMISSION_APROBADA, ALPHA_SUBMISSION)


def _mejor_tag(tags, mastery):
    """De una lista de LessonCompetencyTag de UNA misma lección, la que
    maximiza `peso * gap` — la competencia que más justifica recomendar esa
    lección. Devuelve (score, tag) o None si la lista está vacía."""
    mejor = None
    for tag in tags:
        gap = 100.0 - mastery.get(tag.competency_id, PRIOR_SIN_EVIDENCIA)
        score = tag.peso * gap
        if mejor is None or score > mejor[0]:
            mejor = (score, tag)
    return mejor


def _candidato_matriculado(student, nivel_acceso, mastery, excluir_lesson_ids):
    """Mejor lección no completada de cualquier matrícula ACTIVA del
    estudiante (cruzando escuelas), entre las que tienen al menos un tag de
    competencia. Es el caso fuerte del pitch: nutrición y recuperación
    pueden compartir competencia sin que el estudiante lo sepa todavía."""
    enrollments = list(
        Enrollment.objects.filter(student=student, estado=Enrollment.ESTADO_ACTIVA)
        .select_related('course', 'course__school'),
    )
    if not enrollments:
        return None
    enrollment_by_course_id = {e.course_id: e for e in enrollments}
    completados = set(
        LessonProgress.objects.filter(enrollment__in=enrollments, completado=True)
        .values_list('lesson_id', flat=True),
    )

    tags = (
        LessonCompetencyTag.objects
        .filter(lesson__module__course_id__in=enrollment_by_course_id.keys())
        .exclude(lesson_id__in=completados)
        .exclude(lesson_id__in=excluir_lesson_ids)
        .select_related('lesson', 'lesson__module', 'lesson__module__course',
                         'lesson__module__course__school', 'competency')
    )

    por_leccion = defaultdict(list)
    for tag in tags:
        if puede_ver_leccion(nivel_acceso, tag.lesson):
            por_leccion[tag.lesson_id].append(tag)

    mejor = None
    for lesson_tags in por_leccion.values():
        candidato = _mejor_tag(lesson_tags, mastery)
        if candidato and (mejor is None or candidato[0] > mejor[0]):
            score, tag = candidato
            enrollment = enrollment_by_course_id.get(tag.lesson.module.course_id)
            mejor = (score, tag, enrollment)
    return mejor


def _candidato_descubrimiento(student, nivel_acceso, mastery, course_ids_matriculado, excluir_lesson_ids):
    """Lecciones gratuitas (`Module.es_gratuito`) de escuelas en
    `Profile.escuelas_interes`, en cursos donde el estudiante NO está
    matriculado todavía. Solo se usa cuando no hay un candidato matriculado
    con score suficiente — es el "descubrí algo nuevo", no el caso principal."""
    profile = getattr(student, 'profile', None)
    escuelas_interes = getattr(profile, 'escuelas_interes', None) or []
    if not escuelas_interes:
        return None

    tags = (
        LessonCompetencyTag.objects
        .filter(
            lesson__module__course__school_id__in=escuelas_interes,
            lesson__module__es_gratuito=True,
            lesson__module__course__publicado=True,
        )
        .exclude(lesson__module__course_id__in=course_ids_matriculado)
        .exclude(lesson_id__in=excluir_lesson_ids)
        .select_related('lesson', 'lesson__module', 'lesson__module__course',
                         'lesson__module__course__school', 'competency')
    )

    por_leccion = defaultdict(list)
    for tag in tags:
        if puede_ver_leccion(nivel_acceso, tag.lesson):
            por_leccion[tag.lesson_id].append(tag)

    mejor = None
    for lesson_tags in por_leccion.values():
        candidato = _mejor_tag(lesson_tags, mastery)
        if candidato and (mejor is None or candidato[0] > mejor[0]):
            score, tag = candidato
            mejor = (score, tag, None)
    return mejor


def recomendar_siguiente(student, tenant=None, excluir_lesson_ids=()):
    """Mejor lección a recomendar cruzando escuelas, o `None` si no hay
    ningún candidato con dominio suficientemente bajo (silencio > ruido).

    `excluir_lesson_ids` son los ids de `continuar`/`siguiente_paso` del
    dashboard — nunca se duplica la misma lección en dos cards."""
    mastery = dict(
        StudentCompetencyMastery.objects.filter(student=student).values_list('competency_id', 'nivel'),
    )
    nivel_acceso = nivel_academia_de(student)

    mejor = _candidato_matriculado(student, nivel_acceso, mastery, excluir_lesson_ids)

    if mejor is None or mejor[0] < SCORE_MINIMO_RECOMENDACION:
        course_ids_matriculado = Enrollment.objects.filter(
            student=student, estado=Enrollment.ESTADO_ACTIVA,
        ).values_list('course_id', flat=True)
        descubrimiento = _candidato_descubrimiento(
            student, nivel_acceso, mastery, list(course_ids_matriculado), excluir_lesson_ids,
        )
        if descubrimiento and (mejor is None or descubrimiento[0] > mejor[0]):
            mejor = descubrimiento

    if mejor is None or mejor[0] < SCORE_MINIMO_RECOMENDACION:
        return None

    _score, tag, enrollment = mejor
    lesson = tag.lesson
    course = lesson.module.course
    return {
        'leccion_id': lesson.id,
        'leccion_titulo': lesson.titulo,
        'curso_id': course.id,
        'curso_titulo': course.titulo,
        'curso_slug': course.slug,
        'escuela_nombre': course.school.nombre if course.school else None,
        'competencia_nombre': tag.competency.nombre,
        'enrollment_id': enrollment.id if enrollment else None,
    }
