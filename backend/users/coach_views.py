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
from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from pyfit.throttles import CoachChatRateThrottle, CoachVincularRateThrottle
from workouts.models import Session, SessionExercise, SessionFeedback
from .models import (
    Profile, CoachAthlete, CoachMessage, CoachSubscription, CoachAssignedSession,
    generar_codigo_referido, default_coach_config, COACH_CONFIG_KEYS,
)

logger = logging.getLogger(__name__)
User = get_user_model()


# ─── Permiso ──────────────────────────────────────────────────────────────────

class IsCoach(BasePermission):
    """Solo coaches con acceso activo (role='coach' + coach_activo + is_active) y,
    si ya tienen una suscripción (se crea perezosamente en `coach_billing`), con
    estado 'activa'. Sin fila de suscripción todavía = acceso normal (staff no la
    ha tocado); 'pausada'/'vencida' bloquean el portal sin desactivar la cuenta."""
    message = 'Necesitas una cuenta de coach activa.'

    def has_permission(self, request, view):
        u = request.user
        if not bool(u and u.is_authenticated and u.coach_acceso_activo):
            return False
        try:
            sub = u.coach_subscription
        except CoachSubscription.DoesNotExist:
            return True
        if sub.estado != CoachSubscription.ESTADO_ACTIVA:
            self.message = 'Tu suscripción de coach no está activa. Contacta a soporte.'
            return False
        return True


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

    # Días desde la última sesión real. 999 = sin sesiones.
    # Se usa solo la fecha de sesión (no checkin) para no inflar la recencia
    # de atletas que se conectan pero no entrenan.
    dias_inactivo = (hoy - last_session.fecha).days if last_session else 999

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
    # Sin feedback en 28d → adherencia efectiva = 0 (no inflar con consistencia).
    adher_score = adherencia if adherencia is not None else 0
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
        # Componentes reales del Zyfit Score (para el desglose de Analytics).
        'consistencia': consistencia,
        'recencia': recencia,
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


def _effective_config(link) -> dict:
    """Config normalizada del vínculo: arranca de los defaults vigentes y aplica
    solo las claves reconocidas (descarta 'manual' y claves heredadas)."""
    cfg = default_coach_config()
    cfg.update({k: bool(v) for k, v in (link.config or {}).items() if k in COACH_CONFIG_KEYS})
    return cfg


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


def _sesiones_por_semana(athlete_ids, hoy, n):
    """Conteo de sesiones por semana (de la cartera o de un atleta), oldest→newest."""
    out = []
    for i in range(n - 1, -1, -1):
        desde = hoy - timedelta(days=7 * (i + 1))
        hasta = hoy - timedelta(days=7 * i)
        out.append(Session.objects.filter(
            user_id__in=athlete_ids, fecha__gt=desde, fecha__lte=hasta,
        ).count())
    return out


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


def _ensure_subscription(coach) -> CoachSubscription:
    """Suscripción del coach, creándola perezosamente con valores por defecto la
    primera vez (igual que el código de invitación). Administrada, sin cobrador."""
    sub, _ = CoachSubscription.objects.get_or_create(coach=coach)
    return sub


@api_view(['GET'])
@permission_classes([IsCoach])
def coach_billing(request):
    """Facturación del coach: plan, estado, slots y atletas con Pro (cartera real).
    Reemplaza los datos mock de la pantalla de Ajustes."""
    coach = request.user
    sub = _ensure_subscription(coach)
    links = (CoachAthlete.objects
             .filter(coach=coach, estado=CoachAthlete.ESTADO_ACTIVO)
             .select_related('athlete__profile'))
    atletas = [{
        'id': str(l.athlete_id),
        'nombre': _coach_nombre(l.athlete),
    } for l in links]
    return Response({
        'plan': sub.plan,
        'estado': sub.estado,
        'slots_incluidos': sub.slots_incluidos,
        'slots_usados': len(atletas),
        'fecha_corte': sub.fecha_corte.isoformat() if sub.fecha_corte else None,
        'atletas_pro': atletas,
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

    # Mensajes sin leer del atleta → coach (una sola consulta para la cartera).
    unread = dict(
        CoachMessage.objects.filter(link__coach=coach, from_coach=False, leido=False)
        .values('link__athlete_id').annotate(n=Count('id'))
        .values_list('link__athlete_id', 'n')
    )
    for a, c in zip(athletes, cards):
        c['no_leidos'] = unread.get(a.id, 0)

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
    card['config'] = _effective_config(link)
    card['estado_vinculo'] = link.estado
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


# ─── Rutina manual del coach (borrador → publicar) ───────────────────────────────

def _safe_int(v, default=0, lo=None, hi=None):
    try:
        n = int(float(v))
    except (TypeError, ValueError):
        return default
    if lo is not None:
        n = max(lo, n)
    if hi is not None:
        n = min(hi, n)
    return n


def _safe_rpe(v):
    """RPE 1–10 redondeado a 0.1, o None si vacío/ inválido."""
    if v in (None, ''):
        return None
    try:
        return max(1.0, min(10.0, round(float(v), 1)))
    except (TypeError, ValueError):
        return None


def _parse_fecha(raw):
    if not raw:
        return None
    try:
        return datetime.strptime(str(raw)[:10], '%Y-%m-%d').date()
    except ValueError:
        return None


def _normalizar_contenido(body):
    """Construye el dict con la forma `respuesta_ia` a partir del cuerpo del
    constructor del coach. Sanitiza tipos y límites; descarta ejercicios sin
    nombre. Lenient: un borrador puede quedar vacío o incompleto."""
    fases_in = body.get('fases') if isinstance(body.get('fases'), list) else []
    fases = []
    for f in fases_in:
        if not isinstance(f, dict):
            continue
        ejs_in = f.get('ejercicios') if isinstance(f.get('ejercicios'), list) else []
        ejs = []
        for e in ejs_in:
            if not isinstance(e, dict):
                continue
            nombre = str(e.get('nombre') or '').strip()[:200]
            if not nombre:
                continue
            ejs.append({
                'nombre': nombre,
                'series': _safe_int(e.get('series'), 1, 1, 20),
                'repeticiones': str(e.get('repeticiones') or '').strip()[:50],
                'descanso_segundos': _safe_int(e.get('descanso_segundos'), 60, 0, 1200),
                'rpe_sugerido': _safe_rpe(e.get('rpe_sugerido')),
                'notas': str(e.get('notas') or '').strip()[:500],
            })
        fases.append({
            'nombre': (str(f.get('nombre') or '').strip()[:120] or 'Bloque'),
            'duracion_minutos': _safe_int(f.get('duracion_minutos'), 0, 0, 300),
            'ejercicios': ejs,
        })
    return {
        'titulo': str(body.get('titulo') or '').strip()[:200],
        'objetivo_sesion': str(body.get('objetivo') or '').strip()[:200],
        'duracion_total': _safe_int(body.get('duracion_total'), 45, 5, 300),
        'rpe_target': _safe_rpe(body.get('rpe_target')) or 7.0,
        'fases': fases,
        'nota_del_entrenador': str(body.get('nota') or '').strip()[:600],
    }


def _session_bloqueada(sess):
    """La sesión materializada ya no es editable porque el atleta la inició o
    cerró con feedback (no queremos pisar lo que ya hizo)."""
    return bool(sess and (sess.inicio_real is not None or _feedback_de(sess) is not None))


def _materializar_session(assigned, sess=None):
    """Crea o refresca la `Session` real (origen='coach') desde el contenido del
    borrador. No reescribe si el atleta ya la empezó. Devuelve (session, escrita).

    `sess` debe ser la fila ya releída con `select_for_update()` dentro de la misma
    transacción que hizo el caller (ver `coach_atleta_rutina`) — nunca el objeto
    cacheado de un `select_related` anterior, para no pisar con datos viejos un
    `inicio_real`/`series_log` que el atleta acaba de fijar entre la lectura y esta
    escritura."""
    c = assigned.contenido or {}
    if sess is None:
        sess = assigned.session
    if _session_bloqueada(sess):
        return sess, False
    if sess is None:
        sess = Session(user=assigned.athlete)
    sess.user = assigned.athlete
    sess.origen = Session.ORIGEN_COACH
    sess.creado_por = assigned.coach
    sess.fecha = assigned.fecha
    sess.duracion_planificada = _safe_int(c.get('duracion_total'), 45, 5, 300)
    sess.rpe_target = c.get('rpe_target') or 7
    sess.respuesta_ia = c
    sess.save()
    sess.exercises.all().delete()
    bulk, orden = [], 0
    for fase in c.get('fases', []):
        for e in fase.get('ejercicios', []):
            orden += 1
            bulk.append(SessionExercise(
                session=sess, orden=orden, nombre=str(e.get('nombre') or '')[:200],
                series=_safe_int(e.get('series'), 1, 1, 20),
                repeticiones=str(e.get('repeticiones') or '')[:50],
                descanso_segundos=_safe_int(e.get('descanso_segundos'), 60, 0, 1200),
                rpe_sugerido=e.get('rpe_sugerido'), notas=str(e.get('notas') or ''),
            ))
    if bulk:
        SessionExercise.objects.bulk_create(bulk)
    return sess, True


def _serialize_rutina(a):
    return {
        'fecha': a.fecha.isoformat(),
        'estado': a.estado,
        'titulo': a.titulo,
        'contenido': a.contenido or {},
        'session_id': a.session_id,
        # True = el atleta ya la empezó/cerró → la UI bloquea la edición.
        'bloqueada': _session_bloqueada(a.session),
        'updated_at': a.updated_at.isoformat() if a.updated_at else None,
    }


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsCoach])
def coach_atleta_rutina(request, pk):
    """Rutina manual del coach para un atleta en una fecha.

    GET  ?fecha=YYYY-MM-DD  → trae el borrador/publicada de esa fecha (o null).
    PUT  {fecha,titulo,objetivo,duracion_total,rpe_target,nota,fases,publicar}
         → guarda borrador (publicar=false) o publica (materializa la Session).
    DELETE ?fecha= → descarta la rutina (y su Session si no fue iniciada).
    """
    link = _get_link(request.user, pk)
    if not link:
        return Response({'error': 'Atleta no encontrado en tu cartera.'}, status=status.HTTP_404_NOT_FOUND)
    athlete = link.athlete

    raw_fecha = request.query_params.get('fecha') or (
        request.data.get('fecha') if isinstance(request.data, dict) else None)
    fecha = _parse_fecha(raw_fecha) or _hoy(request)

    if request.method == 'GET':
        a = (CoachAssignedSession.objects
             .filter(coach=request.user, athlete=athlete, fecha=fecha)
             .select_related('session', 'session__feedback').first())
        return Response({'rutina': _serialize_rutina(a) if a else None, 'fecha': fecha.isoformat()})

    if request.method == 'DELETE':
        with transaction.atomic():
            a = (CoachAssignedSession.objects.select_for_update()
                 .filter(coach=request.user, athlete=athlete, fecha=fecha).first())
            if not a:
                return Response(status=status.HTTP_204_NO_CONTENT)
            sess_actual = (Session.objects.select_for_update().filter(pk=a.session_id).first()
                           if a.session_id else None)
            if _session_bloqueada(sess_actual):
                return Response({'error': 'El atleta ya empezó esta sesión; no se puede eliminar.'},
                                status=status.HTTP_409_CONFLICT)
            if sess_actual:
                sess_actual.delete()
            a.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT — guardar borrador o publicar
    body = request.data if isinstance(request.data, dict) else {}
    publicar = bool(body.get('publicar'))
    contenido = _normalizar_contenido(body)

    # Validar ANTES de crear/modificar cualquier fila en la BD para evitar
    # borradores fantasma con contenido vacío cuando publicar=True falla.
    if publicar:
        total_ej = sum(len(f['ejercicios']) for f in contenido['fases'])
        if not contenido['titulo']:
            return Response({'error': 'Ponle un título a la sesión para publicarla.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if total_ej == 0:
            return Response({'error': 'Agrega al menos un ejercicio para publicarla.'},
                            status=status.HTTP_400_BAD_REQUEST)
        # Otro coach ya publicó una rutina para este atleta en esta fecha: bloquear
        # en vez de pisarla en silencio (un atleta puede tener varios coaches
        # activos y CoachAssignedSession no restringe la fecha a un solo coach).
        conflicto = (Session.objects
                     .filter(user=athlete, fecha=fecha, origen=Session.ORIGEN_COACH)
                     .exclude(creado_por=request.user)
                     .exists())
        if conflicto:
            return Response(
                {'error': 'Otro coach ya publicó una rutina para este atleta en esta fecha.'},
                status=status.HTTP_409_CONFLICT)

    with transaction.atomic():
        a, _ = CoachAssignedSession.objects.select_for_update().get_or_create(
            coach=request.user, athlete=athlete, fecha=fecha,
            defaults={'estado': CoachAssignedSession.ESTADO_BORRADOR},
        )
        # Releer la Session vinculada con lock fresco (ver docstring de
        # `_materializar_session`) — no confiar en el `select_related` de arriba.
        sess_actual = (Session.objects.select_for_update().filter(pk=a.session_id).first()
                       if a.session_id else None)
        if _session_bloqueada(sess_actual):
            return Response({'error': 'El atleta ya empezó esta sesión; no se puede editar.'},
                            status=status.HTTP_409_CONFLICT)

        a.titulo = contenido['titulo']
        a.contenido = contenido
        if publicar:
            sess, _ = _materializar_session(a, sess_actual)
            a.session = sess
            a.estado = CoachAssignedSession.ESTADO_PUBLICADA
        else:
            # Volver a borrador: si había una Session publicada SIN iniciar, se quita
            # de la vista del atleta (borrador = no visible).
            if sess_actual and not _session_bloqueada(sess_actual):
                sess_actual.delete()
                a.session = None
            a.estado = CoachAssignedSession.ESTADO_BORRADOR
        a.save()
    return Response({'rutina': _serialize_rutina(a)})


@api_view(['GET'])
@permission_classes([IsCoach])
def coach_analytics(request):
    """Analytics agregados de la cartera + por atleta. ?periodo=4|8|12 semanas."""
    coach = request.user
    hoy = _hoy(request)
    ahora = timezone.now()
    try:
        semanas = int(request.query_params.get('periodo', 4))
    except (TypeError, ValueError):
        semanas = 4
    semanas = max(1, min(12, semanas))

    links = (CoachAthlete.objects
             .filter(coach=coach, estado=CoachAthlete.ESTADO_ACTIVO)
             .select_related('athlete__profile'))
    athletes = [l.athlete for l in links]
    ids = [a.id for a in athletes]
    cards = [_athlete_card(a, hoy, ahora) for a in athletes]

    atletas_out = []
    for a, c in zip(athletes, cards):
        rpe_raw = SessionFeedback.objects.filter(
            session__user=a, session__fecha__gte=hoy - timedelta(days=28),
        ).aggregate(r=Avg('rpe_real'))['r']
        atletas_out.append({
            'id': c['id'], 'nombre': c['nombre'], 'estado': c['estado'],
            'score': c['score'], 'adherencia': c['adherencia'],
            'consistencia': c['consistencia'], 'recencia': c['recencia'],
            'rpe_promedio': round(float(rpe_raw), 1) if rpe_raw is not None else None,
            'carga_semanal': _sesiones_por_semana([a.id], hoy, semanas),
        })

    n = len(cards)
    # Adherencia media de la cartera: promedio SQL de `cumplimiento` sobre el
    # período, ignorando atletas sin feedback (mismo criterio que coach_atletas).
    # Promediar c['adherencia'] metía 0 por cada atleta sin feedback y sesgaba.
    adher_period = SessionFeedback.objects.filter(
        session__user_id__in=ids, session__fecha__gte=hoy - timedelta(days=7 * semanas),
    ).aggregate(a=Avg('cumplimiento'))['a']
    adherencia_media = int(round(adher_period)) if adher_period is not None else 0
    consistencia_media = int(round(sum(c['consistencia'] for c in cards) / n)) if n else 0
    score_promedio = int(round(sum(c['score'] for c in cards) / n)) if n else 0
    sesiones_total = Session.objects.filter(
        user_id__in=ids, fecha__gte=hoy - timedelta(days=7 * semanas),
    ).count()

    def _avg_cumpl(desde, hasta):
        return SessionFeedback.objects.filter(
            session__user_id__in=ids, session__fecha__gte=desde, session__fecha__lt=hasta,
        ).aggregate(a=Avg('cumplimiento'))['a'] or 0
    adher_delta = int(round(
        _avg_cumpl(hoy - timedelta(days=7), hoy + timedelta(days=1))
        - _avg_cumpl(hoy - timedelta(days=14), hoy - timedelta(days=7))
    ))

    sem_counts = _sesiones_por_semana(ids, hoy, semanas)
    sesiones_semana = [{'label': f'S{i + 1}', 'value': v} for i, v in enumerate(sem_counts)]

    return Response({
        'periodo_semanas': semanas,
        'metrics': {
            'adherencia_media': adherencia_media,
            'adherencia_delta': adher_delta,
            'consistencia_media': consistencia_media,
            'score_promedio': score_promedio,
            'sesiones_total': sesiones_total,
            'activos': n,
        },
        'sesiones_semana': sesiones_semana,
        'atletas': atletas_out,
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

    # Parte de la config por defecto (3 claves vigentes) e ignora 'manual' y
    # cualquier clave heredada que ya no se aplique.
    cfg = default_coach_config()
    cfg.update({k: v for k, v in (link.config or {}).items() if k in COACH_CONFIG_KEYS})
    for k in COACH_CONFIG_KEYS:
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


# ─── Gestión de la cartera (pausar / reactivar / desvincular) ────────────────────

def _get_any_link(coach, pk):
    """Vínculo coach→atleta sin importar el estado (activo o pausado). Para la
    pantalla de gestión, que necesita operar también sobre pausados."""
    return (CoachAthlete.objects
            .filter(coach=coach, athlete_id=pk)
            .select_related('athlete__profile').first())


@api_view(['GET'])
@permission_classes([IsCoach])
def coach_cartera_gestion(request):
    """Lista slim de TODA la cartera (activos + pausados) para la gestión. No
    calcula Zyfit Score (es barata): solo nombre, estado y última actividad."""
    coach = request.user
    hoy = _hoy(request)
    ahora = timezone.now()
    links = (CoachAthlete.objects
             .filter(coach=coach)
             .select_related('athlete__profile')
             .prefetch_related('athlete__sessions'))
    out = []
    for l in links:
        last = l.athlete.sessions.order_by('-fecha', '-created_at').first()
        out.append({
            'id': str(l.athlete_id),
            'nombre': _coach_nombre(l.athlete),
            'estado': l.estado,
            'ultima': _humanize_actividad(last, ahora, hoy),
            'desde': l.created_at.date().isoformat(),
        })
    # Activos primero, luego por nombre.
    out.sort(key=lambda a: (a['estado'] != CoachAthlete.ESTADO_ACTIVO, a['nombre'].lower()))
    return Response({'atletas': out})


@api_view(['PATCH'])
@permission_classes([IsCoach])
def coach_atleta_estado(request, pk):
    """Pausa o reactiva el vínculo con un atleta. Pausado lo saca de la cartera
    activa, de los analytics y del bias de la IA, sin borrar historial ni chat."""
    link = _get_any_link(request.user, pk)
    if not link:
        return Response({'error': 'Atleta no encontrado en tu cartera.'}, status=status.HTTP_404_NOT_FOUND)

    nuevo = (request.data.get('estado') or '').strip()
    if nuevo not in (CoachAthlete.ESTADO_ACTIVO, CoachAthlete.ESTADO_PAUSADO):
        return Response({'error': 'Estado inválido.'}, status=status.HTTP_400_BAD_REQUEST)
    if link.estado != nuevo:
        link.estado = nuevo
        link.save(update_fields=['estado'])
    return Response({'id': str(pk), 'estado': link.estado})


@api_view(['DELETE'])
@permission_classes([IsCoach])
def coach_atleta_desvincular(request, pk):
    """Elimina el vínculo con un atleta (incluye su chat, por cascada). El atleta
    deja de estar en la cartera; puede volver a vincularse con el código."""
    link = _get_any_link(request.user, pk)
    if not link:
        return Response({'error': 'Atleta no encontrado en tu cartera.'}, status=status.HTTP_404_NOT_FOUND)
    link.delete()
    logger.info('coach desvinculó atleta %s (coach %s)', pk, request.user.email)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([CoachVincularRateThrottle])
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

    existing = CoachAthlete.objects.filter(coach=coach, athlete=request.user).first()
    necesita_activar = not existing or existing.estado != CoachAthlete.ESTADO_ACTIVO
    if necesita_activar:
        sub = _ensure_subscription(coach)
        activos = CoachAthlete.objects.filter(coach=coach, estado=CoachAthlete.ESTADO_ACTIVO).count()
        if activos >= sub.slots_incluidos:
            return Response({'error': 'Ese coach alcanzó el límite de atletas de su plan.'},
                            status=status.HTTP_400_BAD_REQUEST)

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def coach_desvincular(request):
    """El atleta se desvincula de su coach actual (el vínculo activo más reciente).
    Borra el vínculo y su chat; la generación vuelve al prompt sin directiva."""
    link = _athlete_active_link(request.user)
    if not link:
        return Response({'error': 'No tienes un coach vinculado.'}, status=status.HTTP_400_BAD_REQUEST)
    coach_email = link.coach.email
    link.delete()
    logger.info('coach_desvincular: atleta %s salió del coach %s', request.user.email, coach_email)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Chat coach↔atleta ──────────────────────────────────────────────────────────

def _serialize_mensaje(msg):
    return {
        'id': msg.id,
        'from_coach': msg.from_coach,
        'texto': msg.texto,
        'created_at': msg.created_at.isoformat(),
    }


@api_view(['GET', 'POST'])
@permission_classes([IsCoach])
@throttle_classes([CoachChatRateThrottle])
def coach_atleta_mensajes(request, pk):
    """Chat del coach con un atleta de su cartera. GET lista (y marca como leídos
    los del atleta); POST envía un mensaje del coach."""
    link = _get_link(request.user, pk)
    if not link:
        return Response({'error': 'Atleta no encontrado en tu cartera.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'POST':
        texto = (request.data.get('texto') or '').strip()
        if not texto:
            return Response({'error': 'El mensaje está vacío.'}, status=status.HTTP_400_BAD_REQUEST)
        msg = CoachMessage.objects.create(link=link, from_coach=True, texto=texto[:2000])
        return Response(_serialize_mensaje(msg), status=status.HTTP_201_CREATED)

    # GET: marca como leídos los mensajes que envió el atleta
    CoachMessage.objects.filter(link=link, from_coach=False, leido=False).update(leido=True)
    mensajes = [_serialize_mensaje(m) for m in link.mensajes.order_by('created_at')[:200]]
    return Response({'mensajes': mensajes})


def _athlete_active_link(athlete):
    """Vínculo activo más reciente del atleta (su coach actual), o None."""
    return (CoachAthlete.objects
            .filter(athlete=athlete, estado=CoachAthlete.ESTADO_ACTIVO)
            .select_related('coach__profile')
            .order_by('-created_at').first())


def _coach_nombre(coach):
    """Nombre visible del coach: profile.nombre → first_name → local-part del email."""
    p = getattr(coach, 'profile', None)
    return (p.nombre if p else '') or coach.first_name or coach.email.split('@')[0]


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([CoachChatRateThrottle])
def coach_chat(request):
    """Chat del atleta con su coach. GET devuelve {coach, mensajes} (y marca como
    leídos los del coach); POST envía un mensaje del atleta."""
    link = _athlete_active_link(request.user)
    if not link:
        if request.method == 'POST':
            return Response({'error': 'No tienes un coach vinculado.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'coach': None, 'mensajes': []})

    coach = link.coach
    coach_nombre = _coach_nombre(coach)

    if request.method == 'POST':
        texto = (request.data.get('texto') or '').strip()
        if not texto:
            return Response({'error': 'El mensaje está vacío.'}, status=status.HTTP_400_BAD_REQUEST)
        msg = CoachMessage.objects.create(link=link, from_coach=False, texto=texto[:2000])
        return Response(_serialize_mensaje(msg), status=status.HTTP_201_CREATED)

    # GET: marca como leídos los mensajes que envió el coach
    CoachMessage.objects.filter(link=link, from_coach=True, leido=False).update(leido=True)
    mensajes = [_serialize_mensaje(m) for m in link.mensajes.order_by('created_at')[:200]]
    return Response({
        'coach': {'id': coach.id, 'nombre': coach_nombre},
        'mensajes': mensajes,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_chat_unread(request):
    """Conteo de mensajes del coach sin leer (no marca como leídos). Para el badge
    del perfil del atleta."""
    link = _athlete_active_link(request.user)
    if not link:
        return Response({'no_leidos': 0})
    n = CoachMessage.objects.filter(link=link, from_coach=True, leido=False).count()
    return Response({'no_leidos': n})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_mi_coach(request):
    """Coach activo del atleta (id + nombre) + config efectiva, sin traer mensajes.
    Liviano: alimenta el badge de generación, el aviso del check-in y el gating de
    config (checkin/feedback/ia). Devuelve {coach: {id, nombre} | null, config}.

    `config` es la config del vínculo activo, o los defaults si no hay coach, así
    el cliente siempre puede leer las tres claves sin ramificar por null."""
    link = _athlete_active_link(request.user)
    if not link:
        return Response({'coach': None, 'config': default_coach_config()})
    coach = link.coach
    return Response({
        'coach': {'id': coach.id, 'nombre': _coach_nombre(coach)},
        'config': _effective_config(link),
    })
