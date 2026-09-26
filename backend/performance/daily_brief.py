"""Contrato de verdad del briefing operativo diario de Performance.

Este módulo agrega únicamente datos persistidos. No completa huecos, no estima
valores y no llama a un LLM. Cuando una fuente falta, el contrato devuelve
``null`` y lo refleja en ``coverage``.
"""

from collections import Counter, defaultdict
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from .carga_service import athlete_carga
from .models import (
    CalendarEvent,
    CenterAthlete,
    InjuryReport,
    PerformanceMetric,
    PlannedSession,
    WellnessCheckin,
    MODULE_LESIONES,
    MODULE_PLANIFICACION,
    MODULE_PSICOLOGICO,
    MODULE_RENDIMIENTO,
)
from .permissions import can_access_module
from .wellness import estado as wellness_estado


STATUS_ORDER = {
    'unknown': 0,
    'ready': 1,
    'modified': 2,
    'review': 3,
    'unavailable': 4,
}


def _display_name(user):
    full = (user.get_full_name() or '').strip()
    return full or user.first_name or user.email.split('@')[0]


def _photo(center_athlete):
    if center_athlete.foto_img:
        try:
            return center_athlete.foto_img.url
        except Exception:
            return ''
    return center_athlete.foto or ''


def _reason(code, label, severity, source, updated_at):
    return {
        'code': code,
        'label': label,
        'severity': severity,
        'source': source,
        'updated_at': updated_at.isoformat() if updated_at else None,
    }


def _raise_status(current, candidate):
    return candidate if STATUS_ORDER[candidate] > STATUS_ORDER[current] else current


def build_daily_brief(center, user, day, *, group=''):
    """Construye el briefing de ``day`` respetando scope y permisos de módulo.

    El estado operativo puede incorporar una señal restringida, pero el detalle
    clínico/psicológico se sustituye por una causa genérica si quien consulta no
    tiene permiso para la fuente. Así el entrenador sabe que debe adaptar la
    sesión sin acceder a información sensible.
    """
    can_load = can_access_module(user, center, MODULE_RENDIMIENTO)
    can_injuries = can_access_module(user, center, MODULE_LESIONES)
    can_wellness = can_access_module(user, center, MODULE_PSICOLOGICO)
    can_planning = can_access_module(user, center, MODULE_PLANIFICACION)

    athletes_qs = (
        CenterAthlete.objects.filter(center=center)
        .select_related('athlete', 'categoria')
        .order_by('athlete__first_name', 'athlete__email')
    )
    if group:
        athletes_qs = athletes_qs.filter(Q(grupo=group) | Q(categoria__nombre=group))
    roster = list(athletes_qs)
    athlete_ids = [row.athlete_id for row in roster]

    wellness_by_athlete = {
        row.athlete_id: row
        for row in WellnessCheckin.objects.filter(
            center=center, athlete_id__in=athlete_ids, fecha=day,
        )
    }

    injury_by_athlete = defaultdict(list)
    for injury in InjuryReport.objects.filter(
        center=center,
        athlete_id__in=athlete_ids,
        estado__in=['activa', 'recuperacion'],
    ).order_by('-fecha', '-created_at'):
        injury_by_athlete[injury.athlete_id].append(injury)

    # ACWR usa como máximo 28 días; limitar la consulta evita que el briefing
    # crezca con todo el historial del centro.
    chronic_start = day - timedelta(days=27)
    load_rows = PerformanceMetric.objects.filter(
        center=center,
        athlete_id__in=athlete_ids,
        tipo='carga',
        fecha__gte=chronic_start,
        fecha__lte=day,
    ).order_by('fecha')
    loads_by_athlete = defaultdict(list)
    latest_load_by_athlete = {}
    latest_load_created_at = None
    recent_load_ids = set()
    seven_days_ago = day - timedelta(days=6)
    for metric in load_rows:
        loads_by_athlete[metric.athlete_id].append((metric.fecha, metric.valor))
        latest_load_by_athlete[metric.athlete_id] = metric.created_at
        if metric.fecha >= seven_days_ago:
            recent_load_ids.add(metric.athlete_id)
        if latest_load_created_at is None or metric.created_at > latest_load_created_at:
            latest_load_created_at = metric.created_at

    results = []
    status_counts = Counter()
    complete_ids = set(wellness_by_athlete) & recent_load_ids

    for row in roster:
        wellness = wellness_by_athlete.get(row.athlete_id)
        load = athlete_carga(loads_by_athlete.get(row.athlete_id, []), day)
        injuries = injury_by_athlete.get(row.athlete_id, [])
        status = 'unknown'
        reasons = []

        if row.estado in (CenterAthlete.ESTADO_BAJA, CenterAthlete.ESTADO_LESIONADO):
            status = 'unavailable'
            reasons.append(_reason(
                'roster_unavailable', 'Marcado como no disponible', 'critical',
                'roster', row.created_at,
            ))

        active_injury = next((item for item in injuries if item.estado == 'activa'), None)
        recovering_injury = next((item for item in injuries if item.estado == 'recuperacion'), None)
        if active_injury:
            status = _raise_status(status, 'unavailable')
            label = (
                f'Lesión activa: {active_injury.zona}'
                if can_injuries else 'Restricción indicada por el área médica'
            )
            reasons.append(_reason(
                'active_injury' if can_injuries else 'restricted_medical',
                label, 'critical', 'injuries', active_injury.created_at,
            ))
        elif recovering_injury:
            status = _raise_status(status, 'modified')
            label = (
                f'En recuperación: {recovering_injury.zona}'
                if can_injuries else 'Adaptación indicada por el área médica'
            )
            reasons.append(_reason(
                'recovering_injury' if can_injuries else 'restricted_medical',
                label, 'warning', 'injuries', recovering_injury.created_at,
            ))

        if wellness:
            wellness_state = wellness_estado(wellness.indice_bienestar)
            if wellness_state == 'alerta':
                status = _raise_status(status, 'review')
                reasons.append(_reason(
                    'wellness_alert' if can_wellness else 'restricted_wellness',
                    (
                        f'Bienestar bajo ({wellness.indice_bienestar}/100)'
                        if can_wellness else 'Revisión indicada por bienestar'
                    ),
                    'critical', 'wellness', wellness.created_at,
                ))
            elif wellness_state == 'duda':
                status = _raise_status(status, 'modified')
                reasons.append(_reason(
                    'wellness_watch' if can_wellness else 'restricted_wellness',
                    (
                        f'Bienestar en observación ({wellness.indice_bienestar}/100)'
                        if can_wellness else 'Adaptación indicada por bienestar'
                    ),
                    'warning', 'wellness', wellness.created_at,
                ))

        if load and load.get('riesgo_alerta'):
            status = _raise_status(status, 'review')
            reasons.append(_reason(
                'load_risk' if can_load else 'restricted_load',
                (
                    f'Carga en {load["zona"].lower()}'
                    if can_load else 'Revisión indicada por carga'
                ),
                'critical', 'load', latest_load_by_athlete.get(row.athlete_id),
            ))

        # Una señal normal real basta para clasificar como disponible. La mera
        # ausencia de alertas no: sin medición el estado sigue siendo desconocido.
        if status == 'unknown' and (
            (wellness and wellness_estado(wellness.indice_bienestar) == 'ok')
            or (load and load.get('suficiente') and not load.get('riesgo_alerta'))
        ):
            status = 'ready'

        status_counts[status] += 1
        results.append({
            'center_athlete_id': row.id,
            'athlete_id': row.athlete_id,
            'name': _display_name(row.athlete),
            'photo': _photo(row),
            'position': row.posicion,
            'group': row.categoria.nombre if row.categoria_id else row.grupo,
            'status': status,
            'reasons': reasons,
            'wellness': ({
                'index': wellness.indice_bienestar,
                'state': wellness_estado(wellness.indice_bienestar),
                'updated_at': wellness.created_at.isoformat(),
            } if wellness and can_wellness else None),
            'load': ({
                'days_with_data': load['dias_con_datos'],
                'sufficient': load['suficiente'],
                'weekly_load_ua': load['carga_semanal_ua'],
                'acwr_ewma': load['acwr_ewma'],
                'zone': load['zona'],
                'risk_alert': load['riesgo_alerta'],
            } if load and can_load else None),
        })

    total = len(roster)
    wellness_count = len(wellness_by_athlete)
    load_count = len(recent_load_ids)
    if total == 0 or (wellness_count == 0 and load_count == 0):
        coverage_status = 'empty'
    elif wellness_count == total and load_count == total:
        coverage_status = 'complete'
    else:
        coverage_status = 'partial'

    sessions = []
    if can_planning:
        session_qs = (
            PlannedSession.objects.filter(
                microciclo__mesociclo__plan__center=center, fecha=day,
            )
            .select_related('evento')
            .order_by('orden', 'id')
        )
        sessions = [{
            'id': item.id,
            'name': item.nombre or item.get_tipo_display(),
            'type': item.tipo,
            'duration_min': item.duracion_min,
            'target_load_ua': item.carga_objetivo_ua,
            'status': item.estado,
            'event_title': item.evento.titulo if item.evento_id else None,
        } for item in session_qs]

    next_event = (
        CalendarEvent.objects.filter(center=center)
        .filter(Q(fecha_inicio__gte=day) | Q(fecha_fin__gte=day))
        .order_by('fecha_inicio', 'hora_inicio')
        .first()
    )

    latest_wellness = max(
        (item.created_at for item in wellness_by_athlete.values()), default=None,
    )
    latest_injury = max(
        (item.created_at for rows in injury_by_athlete.values() for item in rows),
        default=None,
    )

    return {
        'date': day.isoformat(),
        'timezone': center.timezone,
        'generated_at': timezone.now().isoformat(),
        'daily_loop_enabled': center.daily_loop_enabled,
        'center': {'id': center.id, 'name': center.nombre},
        'permissions': {
            'wellness_detail': can_wellness,
            'load_detail': can_load,
            'injury_detail': can_injuries,
            'planning_detail': can_planning,
        },
        'coverage': {
            'roster_total': total,
            'wellness_today': wellness_count,
            'wellness_pct': round(wellness_count / total * 100) if total else 0,
            'load_7d': load_count,
            'load_pct': round(load_count / total * 100) if total else 0,
            'complete_today': len(complete_ids),
            'missing_wellness_ids': [row.id for row in roster if row.athlete_id not in wellness_by_athlete],
            'status': coverage_status,
        },
        'freshness': {
            'wellness': latest_wellness.isoformat() if latest_wellness else None,
            'load': latest_load_created_at.isoformat() if latest_load_created_at else None,
            'injuries': latest_injury.isoformat() if latest_injury else None,
        },
        'availability': {
            key: status_counts[key]
            for key in ('ready', 'modified', 'review', 'unavailable', 'unknown')
        },
        'athletes': results,
        'sessions': sessions,
        'next_event': ({
            'id': next_event.id,
            'title': next_event.titulo,
            'type': next_event.tipo,
            'start_date': next_event.fecha_inicio.isoformat(),
            'start_time': next_event.hora_inicio.isoformat() if next_event.hora_inicio else None,
            'all_day': next_event.todo_el_dia,
            'group': next_event.grupo,
        } if next_event else None),
    }
