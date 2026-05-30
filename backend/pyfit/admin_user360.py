"""Vista 'Usuario 360' — todo sobre un usuario en una sola página del admin.

Antes, analizar a un usuario obligaba a saltar entre los listados de User,
Profile, Sesiones, Check-ins, Feedback, Lesiones y AdaptationProfile filtrando
por email en cada uno. Esta vista consolida el cuadro completo en una página:
identidad + perfil + estado de adaptación + racha + últimas sesiones/check-ins
+ feedback + lesiones + dispositivo, con enlaces de salto al resto del admin.
"""

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Avg, Count
from django.http import Http404
from django.shortcuts import render

from users.models import User
from workouts.models import SessionFeedback


def _nivel_label(n: int) -> str:
    if n >= 30:
        return 'Leyenda'
    if n >= 15:
        return 'Élite'
    if n >= 5:
        return 'Atleta'
    return 'Rookie'


@staff_member_required
def zyfit_user_detail_view(request, user_id):
    try:
        user = User.objects.select_related('profile', 'adaptation_profile').get(pk=user_id)
    except User.DoesNotExist:
        raise Http404('Usuario no encontrado')

    profile = getattr(user, 'profile', None)
    adapt   = getattr(user, 'adaptation_profile', None)

    total_sessions = user.sessions.count()
    total_checkins = user.checkins.count()
    recent_sessions = list(
        user.sessions.select_related('feedback', 'location').order_by('-fecha', '-created_at')[:10]
    )
    # Adjuntar feedback de forma segura (OneToOne inverso lanza DoesNotExist).
    # El nombre no puede empezar con "_" o el template de Django lo rechaza.
    for s in recent_sessions:
        try:
            s.fb_obj = s.feedback
        except SessionFeedback.DoesNotExist:
            s.fb_obj = None
    recent_checkins = list(user.checkins.select_related('location').order_by('-fecha')[:10])
    injuries = list(user.injuries.filter(activa=True))
    device = user.device_integrations.order_by('-updated_at').first()
    competitions = list(user.competitions.order_by('fecha')[:5])

    fb_agg = SessionFeedback.objects.filter(session__user=user).aggregate(
        n=Count('id'), rpe=Avg('rpe_real'), cumpl=Avg('cumplimiento'), rating=Avg('rating'),
    )

    last_session = recent_sessions[0].fecha if recent_sessions else None
    last_checkin = recent_checkins[0].fecha if recent_checkins else None
    last_activity = max([d for d in (last_session, last_checkin) if d], default=None)

    ctx = {
        'title':          f'Usuario · {user.email}',
        'site_header':    'Zyfit Control',
        'has_permission': True,
        'is_popup':       False,
        'available_apps': [],
        'u':              user,
        'profile':        profile,
        'adapt':          adapt,
        'edad':           profile.edad if profile else None,
        'nivel_label':    _nivel_label(total_sessions),
        'total_sessions': total_sessions,
        'total_checkins': total_checkins,
        'recent_sessions': recent_sessions,
        'recent_checkins': recent_checkins,
        'injuries':       injuries,
        'device':         device,
        'competitions':   competitions,
        'fb_n':           fb_agg['n'],
        'fb_rpe':         float(fb_agg['rpe'])    if fb_agg['rpe']    else None,
        'fb_cumpl':       float(fb_agg['cumpl'])  if fb_agg['cumpl']  else None,
        'fb_rating':      float(fb_agg['rating']) if fb_agg['rating'] else None,
        'last_activity':  last_activity,
    }
    return render(request, 'admin/zyfit_user360.html', ctx)
