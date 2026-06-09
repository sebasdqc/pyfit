"""Lógica de scoring de Zyfit Academy — SIEMPRE en el servidor.

Reúne las tres operaciones que el cliente nunca debe calcular por su cuenta:
  • `grade_attempt`     — califica un intento de quiz contra la clave de respuestas.
  • `recompute_progress`— recalcula el % de avance de una matrícula y, si procede,
                          la marca como completada y emite el certificado.
  • `issue_certificate` — emite (idempotente) el certificado de una matrícula.

Se mantiene como módulo aparte (igual que `performance.wellness` / los
`calculators`) para que la fórmula tenga una única fuente de verdad auditable y
no se reparta entre vistas.
"""

import secrets

from django.utils import timezone

from .models import Certificate, Lesson, LessonProgress, Question, QuizAttempt


def _norm_ids(values):
    """Normaliza una lista de ids de opción a strings comparables."""
    return {str(v) for v in (values or [])}


def grade_attempt(quiz, respuestas: dict) -> dict:
    """Califica `respuestas` ({question_id: [opcion_ids]}) contra la clave.

    Devuelve `{puntaje, aprobado, detalle}`:
      • puntaje  — % de puntos obtenidos sobre el total (0–100, redondeado).
      • aprobado — puntaje >= quiz.puntaje_aprobacion.
      • detalle  — acierto por pregunta (sin revelar la clave).
    Una pregunta es correcta si el conjunto de opciones enviadas coincide
    EXACTAMENTE con el conjunto de opciones correctas (vale para única, múltiple
    y verdadero/falso).
    """
    preguntas = list(quiz.preguntas.all())
    total_puntos = sum(p.puntos for p in preguntas)
    obtenidos = 0
    detalle = []
    respuestas = respuestas or {}
    for p in preguntas:
        enviadas = _norm_ids(respuestas.get(str(p.id)) or respuestas.get(p.id))
        correctas = _norm_ids(p.respuestas_correctas)
        ok = bool(correctas) and enviadas == correctas
        if ok:
            obtenidos += p.puntos
        detalle.append({'question_id': p.id, 'correcta': ok, 'puntos': p.puntos})
    puntaje = round(100 * obtenidos / total_puntos) if total_puntos else 0
    return {
        'puntaje': puntaje,
        'aprobado': puntaje >= quiz.puntaje_aprobacion,
        'detalle': detalle,
    }


def _quizzes_aprobados(enrollment) -> bool:
    """True si todos los quizzes del curso tienen al menos un intento aprobado
    de esta matrícula (un curso sin quizzes cumple trivialmente)."""
    quiz_ids = set(
        Lesson.objects
        .filter(module__course=enrollment.course, tipo='quiz', quiz__isnull=False)
        .values_list('quiz__id', flat=True)
    )
    if not quiz_ids:
        return True
    aprobados = set(
        QuizAttempt.objects
        .filter(enrollment=enrollment, aprobado=True, quiz_id__in=quiz_ids)
        .values_list('quiz_id', flat=True)
    )
    return quiz_ids.issubset(aprobados)


def recompute_progress(enrollment) -> int:
    """Recalcula el % de avance de una matrícula a partir de las lecciones
    completadas y, si llegó al 100% con todos los quizzes aprobados, la marca como
    completada y emite el certificado. Devuelve el % resultante."""
    total = Lesson.objects.filter(module__course=enrollment.course).count()
    hechas = enrollment.lecciones_progreso.filter(completado=True).count()
    pct = round(100 * hechas / total) if total else 0

    completo = pct >= 100 and total > 0 and _quizzes_aprobados(enrollment)
    enrollment.progreso = pct
    update_fields = ['progreso']
    if completo and enrollment.estado != enrollment.ESTADO_COMPLETADA:
        enrollment.estado = enrollment.ESTADO_COMPLETADA
        enrollment.completado_at = timezone.now()
        update_fields += ['estado', 'completado_at']
    enrollment.save(update_fields=update_fields)

    if completo:
        issue_certificate(enrollment)
    return pct


def _codigo_unico() -> str:
    """Código de certificado verificable, legible y único (p. ej. 'ZA-9F3A1C2B')."""
    for _ in range(10):
        codigo = 'ZA-' + secrets.token_hex(4).upper()
        if not Certificate.objects.filter(codigo=codigo).exists():
            return codigo
    # Extremadamente improbable; alarga el código para garantizar unicidad.
    return 'ZA-' + secrets.token_hex(8).upper()


def issue_certificate(enrollment):
    """Emite el certificado de una matrícula completada (idempotente)."""
    cert = getattr(enrollment, 'certificado', None)
    if cert:
        return cert
    return Certificate.objects.create(enrollment=enrollment, codigo=_codigo_unico())
