"""Herramienta de notificaciones masivas para staff.

POST /zyfit-admin/broadcast/  → envía notificación a segmento de usuarios
GET  /zyfit-admin/broadcast/  → muestra formulario

Segmentos disponibles:
  all          → todos los usuarios activos
  active_7d    → activos en los últimos 7 días
  no_session_7d → sin sesión en 7+ días pero con onboarding
  rookies      → nivel Rookie (0-4 sesiones)
  no_feedback  → sesiones sin feedback en los últimos 14 días
"""

from datetime import timedelta

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Q
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from users.models import Notification, Profile, User
from workouts.models import Session


SEGMENTS = {
    'all':            'Todos los usuarios activos',
    'active_7d':      'Activos últimos 7 días',
    'no_session_7d':  'Sin sesión 7+ días (con onboarding)',
    'rookies':        'Rookies (0–4 sesiones)',
    'no_feedback':    'Sesiones sin feedback · últimas 2 semanas',
}

NOTIFICATION_TYPES = [
    ('insight', '💡 Insight'),
    ('alerta', '⚠️ Alerta'),
    ('logro', '🏆 Logro'),
    ('reencuentro', '👋 Reencuentro'),
    ('sistema', '🔧 Sistema'),
]


def _get_segment_users(segment: str):
    """Devuelve QuerySet de usuarios según el segmento seleccionado."""
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    two_weeks_ago = today - timedelta(days=14)

    if segment == 'all':
        return User.objects.filter(is_active=True)

    elif segment == 'active_7d':
        return User.objects.filter(
            is_active=True,
        ).filter(
            Q(sessions__fecha__gte=week_ago) | Q(checkins__fecha__gte=week_ago)
        ).distinct()

    elif segment == 'no_session_7d':
        has_session_recently = User.objects.filter(
            sessions__fecha__gte=week_ago
        ).distinct().values_list('id', flat=True)
        # Must have completed onboarding (has profile with nombre)
        return User.objects.filter(
            is_active=True,
            profile__nombre__gt='',
        ).exclude(id__in=has_session_recently)

    elif segment == 'rookies':
        return User.objects.filter(is_active=True).annotate(
            n_sessions=Count('sessions')
        ).filter(n_sessions__lt=5)

    elif segment == 'no_feedback':
        sessions_no_fb = Session.objects.filter(
            fecha__gte=two_weeks_ago,
            feedback__isnull=True,
        ).values_list('user_id', flat=True).distinct()
        return User.objects.filter(id__in=sessions_no_fb, is_active=True)

    return User.objects.none()


@staff_member_required
@require_http_methods(['GET', 'POST'])
def broadcast_view(request):
    segment_counts = {}
    for key in SEGMENTS:
        try:
            segment_counts[key] = _get_segment_users(key).count()
        except Exception:
            segment_counts[key] = '?'

    if request.method == 'POST':
        segment  = request.POST.get('segment', 'all')
        tipo     = request.POST.get('tipo', 'insight')
        texto    = request.POST.get('texto', '').strip()

        if not texto:
            messages.error(request, 'El mensaje no puede estar vacío.')
        elif segment not in SEGMENTS:
            messages.error(request, 'Segmento inválido.')
        elif tipo not in dict(NOTIFICATION_TYPES):
            messages.error(request, 'Tipo de notificación inválido.')
        else:
            users = _get_segment_users(segment)
            count = users.count()

            notifications = [
                Notification(user=u, tipo=tipo, texto=texto)
                for u in users
            ]
            Notification.objects.bulk_create(notifications, batch_size=500)

            messages.success(
                request,
                f'✓ Notificación enviada a {count} usuario{"s" if count != 1 else ""} '
                f'del segmento "{SEGMENTS[segment]}".'
            )
            return redirect('zyfit_broadcast')

    return render(request, 'admin/zyfit_broadcast.html', {
        'title': 'Broadcast · Notificaciones masivas',
        'site_header': 'Zyfit Control',
        'has_permission': True,
        'is_popup': False,
        'available_apps': [],
        'segments': SEGMENTS,
        'segment_counts': segment_counts,
        'notification_types': NOTIFICATION_TYPES,
    })
