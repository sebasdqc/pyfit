"""Repaso espaciado de Zyfit Academy (sistema de cajas tipo Leitner).

Idea: lo que se aprende de verdad es lo que se vuelve a recuperar de memoria
justo antes de olvidarlo. Cada pregunta que el alumno respondió en un quiz entra
a su mazo personal. Si la acierta al repasarla, sube de caja y tarda más en
volver a salir; si la falla, vuelve a la caja 0 y sale mañana.

    caja:       0    1    2    3     4     5
    próxima en: 1 d  3 d  7 d  14 d  30 d  60 d

Reglas de seguridad (el dinero de esto es la clave de respuestas):
  - El servidor califica; la clave NUNCA viaja con la pregunta.
  - Solo se puede responder una pregunta que YA TOCA (`proxima_revision <= hoy`).
    Si no, un alumno podría pedir cualquier pregunta fuera de turno para leer su
    clave en la respuesta. También evita contestar dos veces la misma.
  - Solo entran preguntas de cursos donde el alumno está matriculado y de
    lecciones que su plan puede ver (freemium, mismo `access_service`).
"""

from collections import Counter
from datetime import date, timedelta

from django.db import transaction

from . import access_service
from .models import Enrollment, QuestionReview

INTERVALOS_DIAS = [1, 3, 7, 14, 30, 60]
CAJA_MAX = len(INTERVALOS_DIAS) - 1
DOMINADA_DESDE = 4          # caja a partir de la cual la pregunta se considera dominada
LIMITE_SESION = 15          # preguntas por sesión de repaso (evita sesiones eternas)


class ReviewError(Exception):
    """Error de negocio mostrable al alumno. `code` lo distingue en el front."""

    def __init__(self, message, code='error'):
        super().__init__(message)
        self.code = code


def _proxima(caja: int, hoy: date) -> date:
    return hoy + timedelta(days=INTERVALOS_DIAS[caja])


def registrar_resultados_quiz(user, detalle, hoy: date):
    """Mete al mazo las preguntas de un intento de quiz recién calificado.

    `detalle` es la lista de `{question_id, correcta}` que devuelve
    `grading.grade_attempt`. Pregunta nueva: acierto → caja 1 (vuelve en 3 días),
    fallo → caja 0 (mañana). Pregunta que ya estaba en el mazo: un fallo la
    devuelve a la caja 0; un acierto solo la sube si YA tocaba (repetir un quiz
    el mismo día no debe inflar el dominio).
    """
    ids = [d['question_id'] for d in detalle]
    if not ids:
        return
    existentes = {r.question_id: r for r in QuestionReview.objects.filter(user=user, question_id__in=ids)}
    nuevos, cambiados = [], []
    for d in detalle:
        ok = bool(d.get('correcta'))
        r = existentes.get(d['question_id'])
        if r is None:
            caja = 1 if ok else 0
            nuevos.append(QuestionReview(
                user=user, question_id=d['question_id'], caja=caja,
                proxima_revision=_proxima(caja, hoy), ultima_revision=hoy,
                aciertos=1 if ok else 0, fallos=0 if ok else 1,
            ))
        elif not ok:
            r.caja, r.fallos = 0, r.fallos + 1
            r.proxima_revision, r.ultima_revision = _proxima(0, hoy), hoy
            cambiados.append(r)
        elif r.proxima_revision <= hoy:
            r.caja = min(r.caja + 1, CAJA_MAX)
            r.aciertos += 1
            r.proxima_revision, r.ultima_revision = _proxima(r.caja, hoy), hoy
            cambiados.append(r)
    if nuevos:
        QuestionReview.objects.bulk_create(nuevos, ignore_conflicts=True)
    if cambiados:
        QuestionReview.objects.bulk_update(
            cambiados, ['caja', 'aciertos', 'fallos', 'proxima_revision', 'ultima_revision', 'updated_at'],
        )


def _pendientes_qs(user, nivel, hoy):
    """Repasos que tocan hoy, acotados a cursos matriculados y al plan del alumno."""
    matriculados = (
        Enrollment.objects.filter(student=user).exclude(estado=Enrollment.ESTADO_CANCELADA)
        .values('course_id')
    )
    qs = QuestionReview.objects.filter(
        user=user, proxima_revision__lte=hoy,
        question__quiz__lesson__module__course_id__in=matriculados,
    )
    if nivel != access_service.NIVEL_PRO:
        qs = qs.filter(question__quiz__lesson__module__es_gratuito=True)
    return qs


def resumen(user, nivel, hoy: date) -> dict:
    """Cifras para el encabezado del repaso y la tarjeta del Home."""
    todas = QuestionReview.objects.filter(user=user)
    cajas = Counter(todas.values_list('caja', flat=True))
    total = sum(cajas.values())
    pendientes = _pendientes_qs(user, nivel, hoy).count()
    proxima = None
    if not pendientes:
        futura = todas.filter(proxima_revision__gt=hoy).order_by('proxima_revision').first()
        proxima = futura.proxima_revision.isoformat() if futura else None
    return {
        'pendientes': pendientes,
        'total': total,
        'dominadas': sum(n for caja, n in cajas.items() if caja >= DOMINADA_DESDE),
        'proxima_fecha': proxima,
    }


def cola(user, nivel, hoy: date, limite: int = LIMITE_SESION) -> list:
    """Preguntas para repasar ahora, las más atrasadas primero. Sin clave."""
    reviews = (
        _pendientes_qs(user, nivel, hoy)
        .select_related('question__quiz__lesson__module__course')
        .order_by('proxima_revision', 'caja', 'id')[:limite]
    )
    out = []
    for r in reviews:
        q = r.question
        lesson = q.quiz.lesson
        out.append({
            'question_id': q.id,
            'enunciado': q.enunciado,
            'tipo': q.tipo,
            'opciones': q.opciones,
            'video_url': q.video_url,
            'curso': lesson.module.course.titulo,
            'leccion': lesson.titulo,
            'caja': r.caja,
        })
    return out


@transaction.atomic
def responder(user, nivel, question_id, respuestas, hoy: date) -> dict:
    """Califica un repaso, actualiza la caja y devuelve el resultado con feedback."""
    if not respuestas:
        raise ReviewError('Elige al menos una opción.', 'vacia')
    review = (
        QuestionReview.objects.select_for_update()
        .select_related('question__quiz__lesson__module')
        .filter(user=user, question_id=question_id).first()
    )
    if review is None:
        raise ReviewError('Esta pregunta no está en tu repaso.', 'no_existe')
    pregunta = review.question
    if not access_service.puede_ver_leccion(nivel, pregunta.quiz.lesson):
        raise ReviewError('Esta pregunta requiere Academy Pro.', 'requiere_academy_pro')
    if review.proxima_revision > hoy:
        raise ReviewError('Esta pregunta aún no toca repasarla.', 'no_toca')

    correctas = {str(v) for v in (pregunta.respuestas_correctas or [])}
    enviadas = {str(v) for v in respuestas}
    ok = bool(correctas) and enviadas == correctas

    if ok:
        review.caja = min(review.caja + 1, CAJA_MAX)
        review.aciertos += 1
    else:
        review.caja = 0
        review.fallos += 1
    review.ultima_revision = hoy
    review.proxima_revision = _proxima(review.caja, hoy)
    review.save(update_fields=[
        'caja', 'aciertos', 'fallos', 'ultima_revision', 'proxima_revision', 'updated_at',
    ])

    feedback = pregunta.feedback_correcta if ok else pregunta.feedback_incorrecta
    return {
        'correcta': ok,
        # La clave se revela DESPUÉS de responder (como el feedback del quiz): el
        # alumno aprende de ver cuál era la correcta.
        'correctas': sorted(correctas),
        'feedback': (feedback or '').strip(),
        'caja': review.caja,
        'dominada': review.caja >= DOMINADA_DESDE,
        'proxima_revision': review.proxima_revision.isoformat(),
        'dias': INTERVALOS_DIAS[review.caja],
    }
