"""Lecturas agregadas para el panel académico de instructores.

El panel entrega señales de aprendizaje para mejorar un curso, no un ranking de
alumnos. Por eso devuelve solo datos agregados y mantiene toda consulta acotada
al curso que el instructor ya puede editar.
"""

from collections import defaultdict
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from .competency_models import LessonCompetencyTag
from .models import (
    LESSON_AUDIO, LESSON_VIDEO,
    Enrollment, Lesson, LessonProgress, Question, Quiz, QuizAttempt, Submission,
)


MINIMUM_QUESTION_SAMPLE = 3
INACTIVITY_DAYS = 14


def _percentage(numerator, denominator):
    return round((numerator / denominator) * 100) if denominator else 0


def _alert(identifier, severity, title, detail, count=0):
    return {
        'id': identifier,
        'severity': severity,
        'title': title,
        'detail': detail,
        'count': count,
    }


def build_course_analytics(course):
    """Construye un reporte agregado y estable para un curso.

    La definición de ``sin actividad`` no infiere desinterés a partir de un
    único dato: exige que la matrícula tenga al menos INACTIVITY_DAYS y que no
    haya completado lecciones, rendido quizzes ni actualizado una entrega en
    ese período.
    """
    now = timezone.now()
    inactive_before = now - timedelta(days=INACTIVITY_DAYS)
    enrollments = list(course.enrollments.all().only(
        'id', 'estado', 'progreso', 'created_at', 'completado_at',
    ))
    enrollment_ids = [enrollment.id for enrollment in enrollments]
    total_enrollments = len(enrollments)

    lessons = list(
        Lesson.objects.filter(module__course=course)
        .select_related('module')
        .order_by('module__orden', 'orden')
    )
    lesson_ids = [lesson.id for lesson in lessons]
    quiz_by_id = {
        quiz.id: quiz
        for quiz in Quiz.objects.filter(lesson_id__in=lesson_ids).select_related('lesson__module')
    }

    questions = list(
        Question.objects.filter(quiz_id__in=quiz_by_id)
        .select_related('quiz__lesson__module')
        .order_by('quiz__lesson__module__orden', 'quiz__lesson__orden', 'orden')
    )
    question_metrics = {
        question.id: {
            'question_id': question.id,
            'enunciado': question.enunciado,
            'leccion_id': question.quiz.lesson_id,
            'leccion_titulo': question.quiz.lesson.titulo,
            'modulo_titulo': question.quiz.lesson.module.titulo,
            'respuestas': 0,
            'aciertos': 0,
        }
        for question in questions
    }

    completed_by_lesson = {
        row['lesson_id']: row['total']
        for row in LessonProgress.objects.filter(
            enrollment_id__in=enrollment_ids, completado=True,
        ).values('lesson_id').annotate(total=Count('id'))
    }
    last_activity = {enrollment.id: enrollment.created_at for enrollment in enrollments}
    for row in LessonProgress.objects.filter(
        enrollment_id__in=enrollment_ids, completado=True,
    ).values('enrollment_id', 'completado_at'):
        last_activity[row['enrollment_id']] = max(last_activity[row['enrollment_id']], row['completado_at'])

    attempts = list(
        QuizAttempt.objects.filter(enrollment_id__in=enrollment_ids)
        .only('enrollment_id', 'quiz_id', 'detalle', 'puntaje', 'aprobado', 'created_at')
    )
    for attempt in attempts:
        last_activity[attempt.enrollment_id] = max(last_activity[attempt.enrollment_id], attempt.created_at)
        for detail in attempt.detalle or []:
            if not isinstance(detail, dict):
                continue
            try:
                question_id = int(detail.get('question_id'))
            except (TypeError, ValueError):
                continue
            metric = question_metrics.get(question_id)
            if metric is None or 'correcta' not in detail:
                continue
            metric['respuestas'] += 1
            metric['aciertos'] += int(bool(detail['correcta']))

    for row in Submission.objects.filter(enrollment_id__in=enrollment_ids).values('enrollment_id', 'updated_at'):
        last_activity[row['enrollment_id']] = max(last_activity[row['enrollment_id']], row['updated_at'])

    completadas = sum(enrollment.estado == Enrollment.ESTADO_COMPLETADA for enrollment in enrollments)
    sin_iniciar = sum(enrollment.estado == Enrollment.ESTADO_ACTIVA and enrollment.progreso == 0 for enrollment in enrollments)
    en_progreso = sum(
        enrollment.estado == Enrollment.ESTADO_ACTIVA and enrollment.progreso > 0
        for enrollment in enrollments
    )
    sin_actividad = sum(
        enrollment.estado == Enrollment.ESTADO_ACTIVA
        and enrollment.created_at <= inactive_before
        and last_activity[enrollment.id] <= inactive_before
        for enrollment in enrollments
    )

    lesson_progress = [
        {
            'lesson_id': lesson.id,
            'titulo': lesson.titulo,
            'modulo_titulo': lesson.module.titulo,
            'tipo': lesson.tipo,
            'completadas': completed_by_lesson.get(lesson.id, 0),
            'tasa_completado': _percentage(completed_by_lesson.get(lesson.id, 0), total_enrollments),
        }
        for lesson in lessons
    ]

    difficult_questions = []
    for metric in question_metrics.values():
        responses = metric['respuestas']
        if not responses:
            continue
        metric['tasa_acierto'] = _percentage(metric['aciertos'], responses)
        metric['muestra_suficiente'] = responses >= MINIMUM_QUESTION_SAMPLE
        difficult_questions.append(metric)
    difficult_questions.sort(key=lambda metric: (
        not metric['muestra_suficiente'], metric['tasa_acierto'], -metric['respuestas'], metric['question_id'],
    ))

    tags_by_lesson = defaultdict(list)
    for tag in LessonCompetencyTag.objects.filter(lesson_id__in=lesson_ids).select_related('competency'):
        tags_by_lesson[tag.lesson_id].append(tag.competency.nombre)
    concept_metrics = defaultdict(lambda: {'respuestas': 0, 'aciertos': 0})
    for metric in difficult_questions:
        for competency_name in tags_by_lesson.get(metric['leccion_id'], []):
            concept_metrics[competency_name]['respuestas'] += metric['respuestas']
            concept_metrics[competency_name]['aciertos'] += metric['aciertos']
    concepts = [
        {
            'competencia': name,
            'respuestas': metrics['respuestas'],
            'tasa_acierto': _percentage(metrics['aciertos'], metrics['respuestas']),
        }
        for name, metrics in concept_metrics.items()
    ]
    concepts.sort(key=lambda item: (item['tasa_acierto'], -item['respuestas'], item['competencia']))

    media_missing = [
        lesson for lesson in lessons
        if lesson.tipo in (LESSON_VIDEO, LESSON_AUDIO) and not (lesson.video_url or '').strip()
    ]
    questions_missing_feedback = sum(
        not (question.feedback_correcta or '').strip() or not (question.feedback_incorrecta or '').strip()
        for question in questions
    )
    quizzes_without_questions = sum(
        not any(question.quiz_id == quiz_id for question in questions)
        for quiz_id in quiz_by_id
    )
    alerts = []
    if sin_actividad:
        alerts.append(_alert(
            'inactive_learners', 'warn', 'Actividad detenida',
            f'{sin_actividad} matrícula(s) activa(s) no registra(n) actividad en {INACTIVITY_DAYS} días.',
            sin_actividad,
        ))
    if media_missing:
        alerts.append(_alert(
            'missing_media', 'warn', 'Recursos multimedia pendientes',
            f'{len(media_missing)} lección(es) de video o audio aún no tiene(n) un enlace reproducible.',
            len(media_missing),
        ))
    if quizzes_without_questions:
        alerts.append(_alert(
            'empty_quizzes', 'danger', 'Quizzes sin preguntas',
            f'{quizzes_without_questions} quiz(ces) no tiene(n) preguntas publicables.',
            quizzes_without_questions,
        ))
    if questions_missing_feedback:
        alerts.append(_alert(
            'missing_feedback', 'warn', 'Feedback de quiz incompleto',
            f'{questions_missing_feedback} pregunta(s) necesita(n) feedback para acierto o error.',
            questions_missing_feedback,
        ))

    approved_attempts = sum(attempt.aprobado for attempt in attempts)
    return {
        'course': {'id': course.id, 'titulo': course.titulo},
        'generated_at': now.isoformat(),
        'summary': {
            'matriculas': total_enrollments,
            'completadas': completadas,
            'en_progreso': en_progreso,
            'sin_iniciar': sin_iniciar,
            'sin_actividad': sin_actividad,
            'dias_inactividad': INACTIVITY_DAYS,
            'progreso_promedio': round(sum(enrollment.progreso for enrollment in enrollments) / total_enrollments) if total_enrollments else 0,
            'tasa_finalizacion': _percentage(completadas, total_enrollments),
            'intentos_quiz': len(attempts),
            'promedio_quiz': round(sum(attempt.puntaje for attempt in attempts) / len(attempts)) if attempts else 0,
            'tasa_aprobacion_quiz': _percentage(approved_attempts, len(attempts)),
        },
        'lesson_progress': lesson_progress,
        'difficult_questions': difficult_questions[:12],
        'questions_with_responses': len(difficult_questions),
        'minimum_question_sample': MINIMUM_QUESTION_SAMPLE,
        'concepts': concepts[:8],
        'competency_mapping_active': bool(tags_by_lesson),
        'alerts': alerts,
    }
