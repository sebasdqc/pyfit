"""Exportación de datos operativos desde el panel de administración.

Tres endpoints GET autenticados como staff:
  /zyfit-admin/export/users/     → CSV de usuarios + perfil
  /zyfit-admin/export/sessions/  → CSV de sesiones con feedback
  /zyfit-admin/export/feedback/  → CSV de feedback detallado

Soporta filtros de fecha vía query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
"""

import csv
from datetime import date, timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count
from django.http import HttpResponse
from django.utils import timezone

from users.models import Profile, User
from workouts.models import Session, SessionFeedback
from checkins.models import DailyCheckin


def _parse_date_range(request) -> tuple:
    """Extrae ?from= y ?to= del request, con defaults sensatos."""
    today = timezone.now().date()
    try:
        from_date = date.fromisoformat(request.GET.get('from', ''))
    except ValueError:
        from_date = today - timedelta(days=30)
    try:
        to_date = date.fromisoformat(request.GET.get('to', ''))
    except ValueError:
        to_date = today
    return from_date, to_date


@staff_member_required
def export_users_csv(request):
    """CSV completo de usuarios + perfil."""
    from_date, to_date = _parse_date_range(request)

    users = User.objects.filter(
        date_joined__date__gte=from_date,
        date_joined__date__lte=to_date,
    ).select_related('profile').annotate(
        _n_sessions=Count('sessions', distinct=True),
        _n_checkins=Count('checkins', distinct=True),
    ).order_by('-date_joined')

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="pyfit_usuarios_{from_date}_{to_date}.csv"'
    response.write('﻿')  # UTF-8 BOM for Excel

    writer = csv.writer(response)
    writer.writerow([
        'id', 'email', 'username', 'date_joined', 'last_login', 'is_active', 'is_staff',
        'nombre', 'sexo', 'fecha_nacimiento', 'peso_kg', 'altura_cm',
        'nivel', 'objetivo', 'dias_semana', 'nivel_estres', 'tipo_trabajo',
        'racha_actual', 'mejor_racha', 'puntos_totales',
        'total_sesiones', 'total_checkins',
    ])

    for u in users:
        p = getattr(u, 'profile', None)
        total_sessions = u._n_sessions
        total_checkins = u._n_checkins
        writer.writerow([
            u.id, u.email, u.username,
            u.date_joined.strftime('%Y-%m-%d %H:%M') if u.date_joined else '',
            u.last_login.strftime('%Y-%m-%d %H:%M') if u.last_login else '',
            u.is_active, u.is_staff,
            p.nombre if p else '', p.sexo if p else '',
            p.fecha_nacimiento if p else '', p.peso if p else '',
            p.altura if p else '', p.nivel if p else '',
            p.objetivo if p else '', p.dias_semana if p else '',
            p.nivel_estres if p else '', p.tipo_trabajo if p else '',
            p.racha_actual if p else 0, p.mejor_racha if p else 0,
            p.puntos_totales if p else 0,
            total_sessions, total_checkins,
        ])

    return response


@staff_member_required
def export_sessions_csv(request):
    """CSV de sesiones con feedback incluido."""
    from_date, to_date = _parse_date_range(request)

    sessions = Session.objects.filter(
        fecha__gte=from_date,
        fecha__lte=to_date,
    ).select_related('user', 'feedback').order_by('-fecha')

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="pyfit_sesiones_{from_date}_{to_date}.csv"'
    response.write('﻿')

    writer = csv.writer(response)
    writer.writerow([
        'id', 'usuario', 'fecha', 'duracion_planificada_min',
        'rpe_target', 'volumen_relativo', 'created_at',
        'tiene_feedback', 'rpe_real', 'cumplimiento_pct', 'rating',
    ])

    for s in sessions:
        fb = getattr(s, 'feedback', None)
        writer.writerow([
            s.id, s.user.email, s.fecha,
            s.duracion_planificada, s.rpe_target, s.volumen_relativo,
            s.created_at.strftime('%Y-%m-%d %H:%M') if s.created_at else '',
            bool(fb),
            fb.rpe_real if fb else '',
            fb.cumplimiento if fb else '',
            fb.rating if fb else '',
        ])

    return response


@staff_member_required
def export_feedback_csv(request):
    """CSV detallado de feedback post-sesión."""
    from_date, to_date = _parse_date_range(request)

    feedbacks = SessionFeedback.objects.filter(
        created_at__date__gte=from_date,
        created_at__date__lte=to_date,
    ).select_related('session', 'session__user').order_by('-created_at')

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="pyfit_feedback_{from_date}_{to_date}.csv"'
    response.write('﻿')

    writer = csv.writer(response)
    writer.writerow([
        'feedback_id', 'session_id', 'usuario', 'fecha_sesion',
        'rpe_target', 'rpe_real', 'rpe_diff',
        'cumplimiento_pct', 'rating', 'notas', 'created_at',
    ])

    for fb in feedbacks:
        s = fb.session
        rpe_diff = None
        if fb.rpe_real is not None and s.rpe_target is not None:
            rpe_diff = round(float(fb.rpe_real) - float(s.rpe_target), 1)
        writer.writerow([
            fb.id, s.id, s.user.email, s.fecha,
            s.rpe_target, fb.rpe_real, rpe_diff,
            fb.cumplimiento, fb.rating, fb.notas or '',
            fb.created_at.strftime('%Y-%m-%d %H:%M') if fb.created_at else '',
        ])

    return response


@staff_member_required
def export_hub_view(request):
    """Vista HTML del hub de exportación."""
    from django.shortcuts import render
    from datetime import date, timedelta

    today = date.today()
    default_from = today - timedelta(days=30)

    return render(request, 'admin/zyfit_export_hub.html', {
        'title': 'Exportar datos',
        'site_header': 'Zyfit Control',
        'has_permission': True,
        'is_popup': False,
        'available_apps': [],
        'today': today.isoformat(),
        'default_from': default_from.isoformat(),
    })
