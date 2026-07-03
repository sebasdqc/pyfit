"""Endpoints AllowAny para el onboarding SIN registro (probar antes de
registrarse). Un visitante sin cuenta consume contenido `es_gratuito` bajo un
identificador de sesión anónima (header `X-Anon-Session`) en vez de un JWT.

Reutilizan el MISMO `access_service.puede_ver_modulo`/`puede_ver_leccion` y
los MISMOS serializers que ya usan las vistas autenticadas — un anónimo
siempre resuelve a `NIVEL_STARTER`; no se crea una segunda capa de control de
acceso (ver academy.access_service).

Son endpoints DEDICADOS, no una reescritura de `course_detail`/`lesson_detail`
(views.py): así el árbol de permisos ya probado de las vistas autenticadas —
`IsAcademyUser` sigue siendo el único gate de streak/badges/certificados/
tutor/comunidad — queda intacto y sin riesgo de regresión.

El progreso anónimo (`AnonymousProgress`) NUNCA dispara racha/insignias/
certificados: eso prohibido en modo anónimo por el brief y solo ocurre al
migrar el progreso tras el registro (ver academy.migration_service)."""

import hmac
import uuid
from datetime import timedelta

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import access_service
from .models import AnonymousProgress, AnonymousSession, Course, Lesson
from .serializers import CourseDetailSerializer, CourseSerializer, LessonSerializer

# Ventana razonable antes de purgar una sesión anónima nunca convertida (ver
# anon_sweep) — ni tan corta que un visitante que vuelve en unas semanas
# pierda su progreso, ni indefinida (acumularía datos huérfanos).
ANON_SESSION_TTL_DIAS = 30

_CONTEXTO_ANONIMO = {'include_answers': False, 'nivel_academia': access_service.NIVEL_STARTER}


def _get_session(request):
    """Sesión anónima referenciada por el header `X-Anon-Session`, o None si
    falta, es inválida, o no existe (p. ej. ya fue barrida por expiración)."""
    raw = request.headers.get('X-Anon-Session', '').strip()
    if not raw:
        return None
    try:
        session_id = uuid.UUID(raw)
    except ValueError:
        return None
    return AnonymousSession.objects.filter(pk=session_id).first()


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def anon_session(request):
    """POST crea una sesión anónima nueva (el cliente persiste el id devuelto
    en almacenamiento local y lo manda como `X-Anon-Session` en el resto de
    las llamadas de este archivo). GET rehidrata la UI al reabrir la app y
    avisa si ya completó todo el contenido gratis disponible (dispara el
    prompt de registro en el frontend)."""
    if request.method == 'POST':
        session = AnonymousSession.objects.create(
            expires_at=timezone.now() + timedelta(days=ANON_SESSION_TTL_DIAS),
        )
        return Response(
            {'id': str(session.id), 'expires_at': session.expires_at},
            status=status.HTTP_201_CREATED,
        )

    session = _get_session(request)
    if session is None:
        return Response({'detail': 'Sesión anónima no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
    tenant = getattr(request, 'tenant', None)
    completadas = list(session.progresos.values_list('lesson_id', flat=True))
    total_gratis = Lesson.objects.filter(
        module__es_gratuito=True, module__course__publicado=True, module__course__tenant=tenant,
    ).count()
    return Response({
        'id': str(session.id),
        'expires_at': session.expires_at,
        'migrada': session.migrada_en is not None,
        'lecciones_completadas': completadas,
        'todo_gratis_completado': total_gratis > 0 and len(completadas) >= total_gratis,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def anon_catalogo(request):
    """Catálogo público (solo cursos publicados) — mismo serializer que el
    catálogo autenticado, sin datos de matrícula."""
    tenant = getattr(request, 'tenant', None)
    qs = Course.objects.filter(tenant=tenant, publicado=True)
    return Response(CourseSerializer(qs, many=True, context=_CONTEXTO_ANONIMO).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def anon_curso_detail(request, pk):
    """Árbol del curso (módulos → lecciones) con el mismo gating `bloqueado`
    que ve un estudiante Free autenticado — un anónimo SIEMPRE es starter."""
    tenant = getattr(request, 'tenant', None)
    course = get_object_or_404(Course, pk=pk, tenant=tenant, publicado=True)
    return Response(CourseDetailSerializer(course, context=_CONTEXTO_ANONIMO).data)


def _leccion_gratis_o_404(lesson_id, tenant):
    return get_object_or_404(
        Lesson, pk=lesson_id, module__course__publicado=True, module__course__tenant=tenant,
    )


def _bloqueo_registro(lesson):
    """403 si `lesson` no pertenece a un módulo gratis. Mensaje `requiere_registro`
    (distinto de `requiere_academy_pro`) para que el frontend sepa qué modal
    mostrar — pedir cuenta, no pedir suscripción."""
    if access_service.puede_ver_leccion(access_service.NIVEL_STARTER, lesson):
        return None
    return Response(
        {'detail': 'requiere_registro', 'modulo': lesson.module.titulo, 'curso': lesson.module.course.titulo},
        status=status.HTTP_403_FORBIDDEN,
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def anon_leccion_detail(request, lesson_id):
    """Contenido de una lección de un módulo gratis."""
    lesson = _leccion_gratis_o_404(lesson_id, getattr(request, 'tenant', None))
    bloqueo = _bloqueo_registro(lesson)
    if bloqueo:
        return bloqueo
    return Response(LessonSerializer(lesson, context=_CONTEXTO_ANONIMO).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def anon_leccion_completar(request, lesson_id):
    """Marca una lección gratis como completada dentro de la sesión anónima.

    NUNCA dispara racha/insignias/certificados (prohibido en modo anónimo por
    el brief) — eso solo ocurre al migrar el progreso tras el registro (ver
    academy.migration_service.migrar_progreso_anonimo)."""
    session = _get_session(request)
    if session is None:
        return Response({'detail': 'Falta X-Anon-Session o la sesión no existe.'},
                        status=status.HTTP_400_BAD_REQUEST)
    lesson = _leccion_gratis_o_404(lesson_id, getattr(request, 'tenant', None))
    bloqueo = _bloqueo_registro(lesson)
    if bloqueo:
        return bloqueo
    AnonymousProgress.objects.get_or_create(session=session, lesson=lesson)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([AllowAny])
def anon_sweep(request):
    """Barrido de sesiones anónimas vencidas y nunca convertidas — mismo
    patrón que `views.streak_sweep`: secreto compartido `X-Cron-Secret` +
    `settings.CRON_SECRET`, comparación en tiempo constante. Reutiliza el
    mismo cron externo (GitHub Actions) que ya dispara el barrido del streak."""
    secret = getattr(settings, 'CRON_SECRET', '') or ''
    if not secret:
        return Response({'detail': 'Cron deshabilitado (falta CRON_SECRET).'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)
    provided = request.headers.get('X-Cron-Secret', '')
    if not hmac.compare_digest(provided, secret):
        return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
    vencidas = AnonymousSession.objects.filter(expires_at__lt=timezone.now(), migrada_en__isnull=True)
    borradas = vencidas.count()
    vencidas.delete()
    return Response({'borradas': borradas})
