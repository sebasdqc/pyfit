"""Endpoints del Portal de Coach (Fase 1 — cartera real).

- GET  /api/coach/me/        — datos del coach + código de invitación + conteo.
- GET  /api/coach/atletas/   — cartera del coach con métricas derivadas reales.
- POST /api/coach/vincular/  — un ATLETA se vincula a un coach por código.

Toda la data de la cartera (estado, Zyfit Score, adherencia, última actividad)
se calcula a partir de tablas que ya existen: sessions, session_feedback y
daily_checkin. No hay datos mock en estos endpoints.
"""

import logging
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from workouts.models import Session, SessionFeedback
from .models import Profile, CoachAthlete, generar_codigo_referido, default_coach_config

logger = logging.getLogger(__name__)
User = get_user_model()


# ─── Permiso ──────────────────────────────────────────────────────────────────

class IsCoach(BasePermission):
    """Solo coaches con acceso activo (role='coach' + coach_activo + is_active)."""
    message = 'Necesitas una cuenta de coach activa.'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.coach_acceso_activo)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _hoy(request):
    """Fecha local del dispositivo (header X-Local-Date) o fecha del servidor."""
    raw = request.META.get('HTTP_X_LOCAL_DATE', '')
    if raw:
        try:
            return datetime.strptime(raw[:10], '%Y-%m-%d').date()
        except ValueError:
            pass
    return timezone.localdate()


def _clamp(n: int) -> int:
    return max(0, min(100, int(round(n))))


def _ensure_codigo_coach(coach) -> str:
    """Devuelve el código de invitación del coach, generándolo perezosamente.

    Solo se crea cuando el coach abre su portal por primera vez; los atletas
    nunca pasan por aquí, así que su codigo_coach se queda en null."""
    profile, _ = Profile.objects.get_or_create(
        user=coach,
        defaults={'nombre': coach.first_name or coach.email.split('@')[0]},
    )
    if not profile.codigo_coach:
        for _ in range(12):
            code = generar_codigo_referido()
            if not Profile.objects.filter(codigo_coach=code).exists():
                profile.codigo_coach = code
                profile.save(update_fields=['codigo_coach'])
                break
    return profile.codigo_coach


def _humanize_actividad(last_session, ahora, hoy) -> str:
    """'hace 4 h' / 'ayer' / 'hace 3 días' a partir de la última sesión.

    Se basa en la FECHA de entrenamiento; solo baja a granularidad de horas
    cuando la sesión es de hoy (ahí sí usa created_at)."""
    if not last_session:
        return 'sin sesiones'
    dias = (hoy - last_session.fecha).days
    if dias >= 2:
        return f'hace {dias} días'
    if dias == 1:
        return 'ayer'
    horas = max(0, (ahora - last_session.created_at).total_seconds() / 3600)
    if horas < 1:
        return 'hace minutos'
    return f'hace {int(horas)} h'


def _athlete_card(athlete, hoy, ahora) -> dict:
    """Calcula la tarjeta de cartera de un atleta (la forma que consume la UI).

    Zyfit Score (0–100) = 0.45·consistencia + 0.40·adherencia + 0.15·recencia
      · consistencia: sesiones reales vs. esperadas (dias_semana × 4) en 4 semanas
      · adherencia:   promedio de `cumplimiento` del feedback en 4 semanas
      · recencia:     100 si entrenó hoy/ayer, decae ~11 pts por día de inactividad
    """
    profile = getattr(athlete, 'profile', None)
    nombre = (profile.nombre if profile else '') or athlete.first_name or athlete.email.split('@')[0]
    dias_semana = (profile.dias_semana if profile and profile.dias_semana else 3)

    hace_28 = hoy - timedelta(days=28)
    n_ses = athlete.sessions.filter(fecha__gte=hace_28).count()
    # Última sesión por FECHA de entrenamiento (no por created_at, que puede
    # divergir si se genera una sesión para una fecha pasada/futura).
    last_session = athlete.sessions.order_by('-fecha', '-created_at').first()
    last_checkin = athlete.checkins.order_by('-fecha').first()

    # Días desde la última actividad (sesión o check-in). 999 = sin actividad.
    fechas = [d for d in (
        last_session.fecha if last_session else None,
        last_checkin.fecha if last_checkin else None,
    ) if d is not None]
    dias_inactivo = (hoy - max(fechas)).days if fechas else 999

    # Consistencia
    esperadas = dias_semana * 4
    consistencia = _clamp(n_ses / esperadas * 100) if esperadas else 0

    # Adherencia (promedio de cumplimiento del feedback en 28 días)
    adher_raw = SessionFeedback.objects.filter(
        session__user=athlete, session__fecha__gte=hace_28,
    ).aggregate(a=Avg('cumplimiento'))['a']
    adherencia = int(round(adher_raw)) if adher_raw is not None else None

    # Recencia
    recencia = _clamp(100 - max(0, dias_inactivo - 1) * 11) if dias_inactivo < 999 else 0

    # Zyfit Score
    adher_score = adherencia if adherencia is not None else consistencia
    score = _clamp(0.45 * consistencia + 0.40 * adher_score + 0.15 * recencia)

    # Estado de la rutina / actividad
    rutina_activa = bool(last_session and (hoy - last_session.fecha).days <= 7)
    sin_rutina = not rutina_activa
    inactivo = dias_inactivo >= 5
    sin_checkin = last_checkin is None or (hoy - last_checkin.fecha).days >= 3

    # Tags de problema
    problemas = []
    if sin_checkin:
        problemas.append('Sin check-in')
    if sin_rutina:
        problemas.append('Sin rutina activa')
    if score < 60:
        problemas.append('Score bajo')

    # Estado general (coherente con los umbrales de score: <60 nunca es "al día")
    if inactivo or score < 45:
        estado = 'alerta'
    elif sin_rutina or score < 60 or (adherencia is not None and adherencia < 60):
        estado = 'pendiente'
    else:
        estado = 'al_dia'

    ultima = _humanize_actividad(last_session, ahora, hoy)

    # Línea descriptiva del hero del detalle
    if inactivo:
        situacion = f'Sin actividad hace {dias_inactivo} días'
    elif sin_rutina:
        situacion = 'Sin rutina activa'
    elif score < 60:
        situacion = 'Score bajando'
    else:
        situacion = f'Última sesión {ultima}'

    return {
        'id': str(athlete.id),
        'nombre': nombre,
        'ultima': ultima,
        'situacion': situacion,
        'estado': estado,
        'problemas': problemas,
        'rutinaActiva': rutina_activa,
        'sinRutina': sin_rutina,
        'inactivo': inactivo,
        'score': score,
        'adherencia': adherencia if adherencia is not None else 0,
    }


# ─── Helpers de detalle / historial ─────────────────────────────────────────────

_DIAS_ABBR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']      # weekday() Mon=0
_MESES_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
               'jul', 'ago', 'sep', 'oct', 'nov', 'dic']


def _humanize_fecha(fecha, hoy) -> str:
    """'Hoy' / 'Ayer' / 'Lun 25 may' a partir de la fecha de la sesión."""
    d = (hoy - fecha).days
    if d == 0:
        return 'Hoy'
    if d == 1:
        return 'Ayer'
    return f'{_DIAS_ABBR[fecha.weekday()]} {fecha.day} {_MESES_ABBR[fecha.month - 1]}'


def _get_link(coach, pk):
    """Vínculo ACTIVO coach→atleta, o None. Es la barrera de autorización: un
    coach solo puede ver atletas de su propia cartera."""
    return (CoachAthlete.objects
            .filter(coach=coach, athlete_id=pk, estado=CoachAthlete.ESTADO_ACTIVO)
            .select_related('athlete__profile').first())


def _athlete_detail_metrics(athlete, hoy, link) -> dict:
    """Métricas del tab Perfil del detalle (consistencia, sesiones/mes, RPE, antigüedad)."""
    profile = getattr(athlete, 'profile', None)
    dias_semana = (profile.dias_semana if profile and profile.dias_semana else 3)

    hace_28 = hoy - timedelta(days=28)
    n_ses_28 = athlete.sessions.filter(fecha__gte=hace_28).count()
    esperadas = dias_semana * 4
    consistencia = _clamp(n_ses_28 / esperadas * 100) if esperadas else 0

    sesiones_mes = athlete.sessions.filter(fecha__gte=hoy - timedelta(days=30)).count()

    # RPE promedio de las últimas 5 sesiones con feedback
    ult_rpe = list(
        SessionFeedback.objects.filter(session__user=athlete)
        .order_by('-session__fecha', '-created_at')
        .values_list('rpe_real', flat=True)[:5]
    )
    rpe_prom = round(sum(float(x) for x in ult_rpe) / len(ult_rpe), 1) if ult_rpe else None

    # Antigüedad con este coach
    dias_coach = (hoy - link.created_at.date()).days
    if dias_coach >= 60:
        antiguedad = f'{dias_coach // 30} meses'
    elif dias_coach >= 30:
        antiguedad = '1 mes'
    elif dias_coach >= 1:
        antiguedad = f'{dias_coach} días'
    else:
        antiguedad = 'hoy'

    return {
        'consistencia': consistencia,
        'sesiones_mes': sesiones_mes,
        'sesiones_target': esperadas,
        'rpe_promedio': rpe_prom,
        'antiguedad': antiguedad,
    }


def _feedback_de(session):
    try:
        return session.feedback
    except ObjectDoesNotExist:
        return None


def _session_history_item(session, hoy) -> dict:
    """Una fila del Historial: completados/total, barras por ejercicio, RPE y min.

    Las barras se derivan de series_log (datos reales de ejecución): 'skip' si el
    ejercicio no se registró, 'alto' si alguna serie tuvo dificultad ≥ 4, si no
    'done'. Si la sesión no tiene series_log pero sí feedback, se estima a partir
    del cumplimiento."""
    exercises = list(session.exercises.all())
    total = len(exercises)
    feedback = _feedback_de(session)

    barras, logged = [], 0
    any_log = False
    for ex in exercises:
        log = ex.series_log if isinstance(ex.series_log, list) else None
        if log:
            any_log = True
            logged += 1
            alto = any(
                isinstance(s, dict) and s.get('dificultad') not in (None, '')
                and float(s.get('dificultad')) >= 4
                for s in log
            )
            barras.append('alto' if alto else 'done')
        else:
            barras.append('skip')

    if any_log:
        completados = logged
    elif feedback is not None and total:
        completados = int(round(feedback.cumplimiento / 100 * total))
        barras = ['done'] * completados + ['skip'] * (total - completados)
    else:
        completados = 0

    rpe = float(feedback.rpe_real) if feedback else float(session.rpe_target)

    return {
        'fecha': _humanize_fecha(session.fecha, hoy),
        'rpe': round(rpe, 1),
        'completados': completados,
        'total': total,
        'min': session.duracion_planificada,
        'barras': barras,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsCoach])
def coach_me(request):
    coach = request.user
    profile = getattr(coach, 'profile', None)
    codigo = _ensure_codigo_coach(coach)
    total = CoachAthlete.objects.filter(coach=coach, estado=CoachAthlete.ESTADO_ACTIVO).count()
    return Response({
        'id': coach.id,
        'email': coach.email,
        'nombre': (profile.nombre if profile else '') or coach.first_name or coach.email.split('@')[0],
        'codigo_coach': codigo,
        'total_atletas': total,
    })


@api_view(['GET'])
@permission_classes([IsCoach])
def coach_atletas(request):
    """Cartera del coach con métricas derivadas. Devuelve la lista completa;
    el filtrado (Atención / Sin rutina / Inactivos) lo hace el cliente."""
    coach = request.user
    hoy = _hoy(request)
    ahora = timezone.now()

    links = (CoachAthlete.objects
             .filter(coach=coach, estado=CoachAthlete.ESTADO_ACTIVO)
             .select_related('athlete__profile'))
    athletes = [l.athlete for l in links]
    athlete_ids = [a.id for a in athletes]

    cards = [_athlete_card(a, hoy, ahora) for a in athletes]

    # Métricas de cartera
    activos = len(cards)
    atencion_hoy = sum(1 for c in cards if c['estado'] != 'al_dia')

    def _avg_cumpl(desde, hasta):
        return SessionFeedback.objects.filter(
            session__user_id__in=athlete_ids,
            session__fecha__gte=desde, session__fecha__lt=hasta,
        ).aggregate(a=Avg('cumplimiento'))['a'] or 0

    esta_sem = _avg_cumpl(hoy - timedelta(days=7), hoy + timedelta(days=1))
    sem_previa = _avg_cumpl(hoy - timedelta(days=14), hoy - timedelta(days=7))

    return Response({
        'metrics': {
            'activos': activos,
            'atencion_hoy': atencion_hoy,
            'adherencia': int(round(esta_sem)),
            'adherencia_delta': int(round(esta_sem - sem_previa)),
        },
        'atletas': cards,
    })


@api_view(['GET'])
@permission_classes([IsCoach])
def coach_atleta_detalle(request, pk):
    """Detalle de un atleta de la cartera (hero + métricas del tab Perfil)."""
    link = _get_link(request.user, pk)
    if not link:
        return Response({'error': 'Atleta no encontrado en tu cartera.'}, status=status.HTTP_404_NOT_FOUND)

    hoy = _hoy(request)
    athlete = link.athlete
    card = _athlete_card(athlete, hoy, timezone.now())
    card['metrics'] = _athlete_detail_metrics(athlete, hoy, link)
    card['desde'] = link.created_at.date().isoformat()
    card['config'] = link.config or default_coach_config()
    card['directiva'] = link.directiva or {}
    card['directiva_updated_at'] = (
        link.directiva_updated_at.isoformat() if link.directiva_updated_at else None
    )
    return Response(card)


@api_view(['PUT'])
@permission_classes([IsCoach])
def coach_atleta_directiva(request, pk):
    """Guarda la directiva del coach para el atleta. La generación diaria del
    atleta la inyecta en el prompt de IA como guía de alta prioridad."""
    link = _get_link(request.user, pk)
    if not link:
        return Response({'error': 'Atleta no encontrado en tu cartera.'}, status=status.HTTP_404_NOT_FOUND)

    body = request.data if isinstance(request.data, dict) else {}
    directiva = {
        'objetivo': str(body.get('objetivo') or '').strip()[:120],
        'foco':     str(body.get('foco') or '').strip()[:200],
        'evitar':   str(body.get('evitar') or '').strip()[:200],
        'nota':     str(body.get('nota') or '').strip()[:400],
    }
    link.directiva = directiva
    link.directiva_updated_at = timezone.now()
    link.save(update_fields=['directiva', 'directiva_updated_at'])
    return Response({
        'directiva': directiva,
        'directiva_updated_at': link.directiva_updated_at.isoformat(),
    })


@api_view(['PATCH'])
@permission_classes([IsCoach])
def coach_atleta_config(request, pk):
    """Actualiza la configuración del atleta que controla el coach. Acepta un
    dict parcial (solo las claves que cambian) y lo fusiona."""
    link = _get_link(request.user, pk)
    if not link:
        return Response({'error': 'Atleta no encontrado en tu cartera.'}, status=status.HTTP_404_NOT_FOUND)

    incoming = request.data.get('config')
    if not isinstance(incoming, dict):
        incoming = request.data if isinstance(request.data, dict) else {}

    cfg = dict(link.config or default_coach_config())
    for k in ('checkin', 'feedback', 'ia', 'manual'):
        if k in incoming:
            cfg[k] = bool(incoming[k])
    link.config = cfg
    link.save(update_fields=['config'])
    return Response({'config': cfg})


@api_view(['GET'])
@permission_classes([IsCoach])
def coach_atleta_sesiones(request, pk):
    """Historial de sesiones del atleta (últimas 20). Solo si está en la cartera."""
    link = _get_link(request.user, pk)
    if not link:
        return Response({'error': 'Atleta no encontrado en tu cartera.'}, status=status.HTTP_404_NOT_FOUND)

    hoy = _hoy(request)
    sesiones = (Session.objects.filter(user_id=pk)
                .select_related('feedback')
                .prefetch_related('exercises')
                .order_by('-fecha', '-created_at')[:20])
    return Response({'sesiones': [_session_history_item(s, hoy) for s in sesiones]})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def coach_vincular(request):
    """Un atleta se vincula a un coach ingresando su código de invitación."""
    codigo = (request.data.get('codigo') or '').strip().upper()
    if not codigo:
        return Response({'error': 'Ingresa un código de coach.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        profile = Profile.objects.select_related('user').get(codigo_coach=codigo)
    except Profile.DoesNotExist:
        return Response({'error': 'Código de coach inválido.'}, status=status.HTTP_404_NOT_FOUND)

    coach = profile.user
    if not coach.coach_acceso_activo:
        return Response({'error': 'Ese coach no tiene una cuenta activa.'}, status=status.HTTP_400_BAD_REQUEST)
    if coach.id == request.user.id:
        return Response({'error': 'No puedes vincularte a tu propia cuenta.'}, status=status.HTTP_400_BAD_REQUEST)

    link, created = CoachAthlete.objects.get_or_create(
        coach=coach, athlete=request.user,
        defaults={'estado': CoachAthlete.ESTADO_ACTIVO},
    )
    if not created and link.estado != CoachAthlete.ESTADO_ACTIVO:
        link.estado = CoachAthlete.ESTADO_ACTIVO
        link.save(update_fields=['estado'])

    logger.info('coach_vincular: atleta %s → coach %s (created=%s)', request.user.email, coach.email, created)
    return Response({
        'detail': f'Te vinculaste con {profile.nombre or coach.email}.',
        'coach_nombre': profile.nombre or coach.email.split('@')[0],
        'ya_estaba': not created,
    })
