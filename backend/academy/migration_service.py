"""Migración del progreso anónimo (onboarding sin registro) a la cuenta nueva.

Se dispara desde el flujo de registro EXISTENTE (`users.views.register`), no
desde un endpoint separado que el visitante deba activar a mano — ver el
brief: "la migración es el evento; no se construye un camino alterno".

Reutiliza literalmente `grading.recompute_progress`, `streak_service.
record_study_activity` y `badges_service.evaluate_badges` — el MISMO evento de
"módulo completado" que ya disparan `lesson_complete`/`quiz_attempt` en
views.py, para que el usuario recién registrado reciba el crédito
correspondiente (insignia de inicio, día 1 de racha) sin lógica paralela.

Idempotente en dos niveles: (1) `AnonymousSession.migrada_en` corta en seco
una segunda ejecución sobre la misma sesión, y (2) aunque ese guard fallara,
cada operación interna (`get_or_create`, `recompute_progress`, `evaluate_badges`)
ya es idempotente por construcción — repetir la migración no duplica
matrículas/progreso ni sobre-otorga insignias/certificados."""

from django.db import transaction
from django.utils import timezone

from . import badges_service, grading, streak_service
from .models import Enrollment, LessonProgress


def migrar_progreso_anonimo(session, user):
    """Migra el progreso de `session` (AnonymousSession) a `user`. No-op si
    `session` es None o ya fue migrada."""
    if session is None or session.migrada_en is not None:
        return

    with transaction.atomic():
        enrollments_tocadas = set()
        progresos = session.progresos.select_related('lesson__module__course')
        for p in progresos:
            course = p.lesson.module.course
            enrollment, _ = Enrollment.objects.get_or_create(student=user, course=course)
            LessonProgress.objects.get_or_create(
                enrollment=enrollment, lesson=p.lesson, defaults={'completado': True},
            )
            enrollments_tocadas.add(enrollment.id)

        for enrollment_id in enrollments_tocadas:
            grading.recompute_progress(Enrollment.objects.get(id=enrollment_id))

        if enrollments_tocadas:
            # "hoy" = día del registro, nunca el día en que ocurrió la actividad
            # anónima — evita el único caso no-idempotente-entre-días de la racha
            # (ver streak_service.record_study_activity) y coincide con lo que
            # pide el brief: día 1 de racha AL REGISTRARSE.
            streak_service.record_study_activity(user, origen='migracion_anonima')
            badges_service.evaluate_badges(user)

        session.migrada_en = timezone.now()
        session.migrada_a = user
        session.save(update_fields=['migrada_en', 'migrada_a'])
