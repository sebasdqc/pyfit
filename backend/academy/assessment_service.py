"""Diagnóstico inicial y evaluación final de un curso.

Para saber si un curso ENSEÑA hay que medir antes y después con las MISMAS
preguntas: la diferencia es la ganancia de aprendizaje. Reglas que protegen la
validez de la medición:

  - Ninguna de las dos devuelve la clave ni el feedback. Si el alumno viera las
    respuestas del diagnóstico, la final mediría memoria de la clave.
  - El diagnóstico solo se hace ANTES de empezar (sin lecciones completadas ni
    quizzes rendidos: rendir un quiz ya enseña la clave). Se hace una sola vez.
  - La final solo se hace al completar el curso, una sola vez, y reutiliza
    exactamente las preguntas del diagnóstico.
  - Las preguntas salen de lecciones que el plan del alumno puede ver.
  - Son opcionales: nunca bloquean el progreso ni el certificado.
"""

from . import access_service
from .models import CourseAssessment, Enrollment, Question

PREGUNTAS_POR_EVALUACION = 8
MINIMO_PREGUNTAS = 3


class AssessmentError(Exception):
    def __init__(self, message, code='error'):
        super().__init__(message)
        self.code = code


def _preguntas_disponibles(course, nivel):
    qs = (
        Question.objects.filter(quiz__lesson__module__course=course)
        .select_related('quiz__lesson__module')
        .order_by('quiz__lesson__module__orden', 'quiz__lesson__orden', 'orden')
    )
    if nivel != access_service.NIVEL_PRO:
        qs = qs.filter(quiz__lesson__module__es_gratuito=True)
    return list(qs)


def seleccionar(course, nivel, n=PREGUNTAS_POR_EVALUACION):
    """Muestra repartida a lo largo del curso (no las primeras n): índices
    equiespaciados sobre las preguntas ordenadas. Determinista."""
    todas = _preguntas_disponibles(course, nivel)
    if len(todas) <= n:
        return todas
    return [todas[int(i * len(todas) / n)] for i in range(n)]


def _evaluaciones(enrollment):
    return {a.kind: a for a in enrollment.evaluaciones.all()}


def _ganancia(diag, final):
    if not (diag and final):
        return None
    pre, post = diag.puntaje, final.puntaje
    return {
        'diagnostico': pre,
        'final': post,
        'puntos': post - pre,
        # Ganancia normalizada (Hake): qué fracción de lo que FALTABA por
        # aprender se aprendió. Comparable entre alumnos de distinto punto de partida.
        'normalizada': round(100 * (post - pre) / (100 - pre)) if pre < 100 else None,
    }


def _ya_empezo(enrollment) -> bool:
    return enrollment.lecciones_progreso.filter(completado=True).exists() or enrollment.intentos.exists()


def estado(enrollment, nivel) -> dict:
    evals = _evaluaciones(enrollment)
    diag, final = evals.get(CourseAssessment.KIND_DIAGNOSTICO), evals.get(CourseAssessment.KIND_FINAL)
    hay_preguntas = len(_preguntas_disponibles(enrollment.course, nivel)) >= MINIMO_PREGUNTAS
    return {
        'disponible': hay_preguntas,
        'diagnostico': {'hecho': bool(diag), 'puntaje': diag.puntaje if diag else None},
        'final': {'hecho': bool(final), 'puntaje': final.puntaje if final else None},
        'puede_diagnostico': hay_preguntas and diag is None and not _ya_empezo(enrollment),
        'puede_final': hay_preguntas and final is None and enrollment.estado == Enrollment.ESTADO_COMPLETADA,
        'ganancia': _ganancia(diag, final),
        'total_preguntas': min(PREGUNTAS_POR_EVALUACION, len(_preguntas_disponibles(enrollment.course, nivel))),
    }


def _validar_kind(enrollment, nivel, kind):
    if kind not in dict(CourseAssessment.KIND_CHOICES):
        raise AssessmentError('Tipo de evaluación no válido.', 'kind')
    e = estado(enrollment, nivel)
    if kind == CourseAssessment.KIND_DIAGNOSTICO:
        if e['diagnostico']['hecho']:
            raise AssessmentError('Ya hiciste el diagnóstico de este curso.', 'ya_hecha')
        if not e['puede_diagnostico']:
            raise AssessmentError('El diagnóstico solo se hace antes de empezar el curso.', 'no_disponible')
    else:
        if e['final']['hecho']:
            raise AssessmentError('Ya hiciste la evaluación final de este curso.', 'ya_hecha')
        if not e['puede_final']:
            raise AssessmentError('La evaluación final se habilita al completar el curso.', 'no_disponible')


def _preguntas_de(enrollment, nivel, kind):
    """Las del diagnóstico fijado si existe (para la final); si no, una muestra nueva."""
    if kind == CourseAssessment.KIND_FINAL:
        diag = _evaluaciones(enrollment).get(CourseAssessment.KIND_DIAGNOSTICO)
        if diag:
            por_id = {q.id: q for q in Question.objects.filter(id__in=diag.preguntas)}
            return [por_id[i] for i in diag.preguntas if i in por_id]
    return seleccionar(enrollment.course, nivel)


def preguntas(enrollment, nivel, kind):
    """Preguntas a mostrar, sin clave ni feedback."""
    _validar_kind(enrollment, nivel, kind)
    return [
        {'id': q.id, 'enunciado': q.enunciado, 'tipo': q.tipo, 'opciones': q.opciones, 'video_url': q.video_url}
        for q in _preguntas_de(enrollment, nivel, kind)
    ]


def calificar(enrollment, nivel, kind, respuestas) -> dict:
    _validar_kind(enrollment, nivel, kind)
    respuestas = respuestas if isinstance(respuestas, dict) else {}
    qs = _preguntas_de(enrollment, nivel, kind)
    if len(qs) < MINIMO_PREGUNTAS:
        raise AssessmentError('Este curso aún no tiene suficientes preguntas.', 'no_disponible')
    detalle, ok_total = {}, 0
    for q in qs:
        enviadas = {str(v) for v in (respuestas.get(str(q.id)) or [])}
        correctas = {str(v) for v in (q.respuestas_correctas or [])}
        ok = bool(correctas) and enviadas == correctas
        detalle[str(q.id)] = ok
        ok_total += ok
    puntaje = round(100 * ok_total / len(qs))
    CourseAssessment.objects.create(
        enrollment=enrollment, kind=kind, preguntas=[q.id for q in qs],
        respuestas=respuestas, detalle=detalle, puntaje=puntaje,
    )
    enrollment.refresh_from_db()
    return {'kind': kind, 'puntaje': puntaje, 'correctas': ok_total, 'total': len(qs),
            'ganancia': estado(enrollment, nivel)['ganancia']}
