"""Métricas operativas de Zyfit para el panel de admin.

Dos puntos de entrada:

1. `dashboard_callback(request, context)` — Inyecta cards de KPI directamente
   en la página principal del admin (configurado vía `UNFOLD.DASHBOARD_CALLBACK`
   en settings.py). Resultado: al entrar a `/zyfit-admin/`, lo primero que se
   ve son los números clave del producto.

2. `zyfit_metrics_view(request)` — Vista standalone (link del sidebar) que
   reusa el mismo template con datos extendidos: top ejercicios, retención,
   distribución de niveles.

Todas las consultas son agregadas (sin N+1) y se cachean implícitamente vía
las propias estadísticas. Si el dataset crece, podemos meter `cache_page` aquí.
"""

from datetime import timedelta
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Avg, Count, Q
from django.shortcuts import render
from django.utils import timezone

from users.models import Profile, User
from workouts.models import Session, SessionFeedback, UserExerciseProfile
from checkins.models import DailyCheckin


# ─── KPI core ─────────────────────────────────────────────────────────────────

def _compute_kpis() -> dict:
    """Métricas resumen — siempre se calculan en una sola pasada."""
    now      = timezone.now()
    today    = now.date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    total_users        = User.objects.count()
    new_users_week     = User.objects.filter(date_joined__date__gte=week_ago).count()
    new_users_month    = User.objects.filter(date_joined__date__gte=month_ago).count()

    # "Activo" = generó al menos una sesión O hizo un check-in en el periodo
    active_7d = User.objects.filter(
        Q(sessions__fecha__gte=week_ago) | Q(checkins__fecha__gte=week_ago)
    ).distinct().count()
    active_30d = User.objects.filter(
        Q(sessions__fecha__gte=month_ago) | Q(checkins__fecha__gte=month_ago)
    ).distinct().count()

    sessions_today      = Session.objects.filter(fecha=today).count()
    sessions_this_week  = Session.objects.filter(fecha__gte=week_ago).count()
    sessions_total      = Session.objects.count()

    checkins_today      = DailyCheckin.objects.filter(fecha=today).count()
    checkins_this_week  = DailyCheckin.objects.filter(fecha__gte=week_ago).count()

    feedback_week = SessionFeedback.objects.filter(created_at__date__gte=week_ago).aggregate(
        rpe_avg=Avg('rpe_real'),
        cump_avg=Avg('cumplimiento'),
        rating_avg=Avg('rating'),
        n=Count('id'),
    )

    return {
        'total_users':           total_users,
        'new_users_week':        new_users_week,
        'new_users_month':       new_users_month,
        'active_7d':             active_7d,
        'active_30d':            active_30d,
        'sessions_today':        sessions_today,
        'sessions_this_week':    sessions_this_week,
        'sessions_total':        sessions_total,
        'checkins_today':        checkins_today,
        'checkins_this_week':    checkins_this_week,
        'rpe_real_avg':          float(feedback_week['rpe_avg'])    if feedback_week['rpe_avg']    else None,
        'cumplimiento_avg':      float(feedback_week['cump_avg'])   if feedback_week['cump_avg']   else None,
        'rating_avg':            float(feedback_week['rating_avg']) if feedback_week['rating_avg'] else None,
        'feedback_count_week':   feedback_week['n'],
    }


def _compute_extended() -> dict:
    """Datos secundarios — sólo se piden cuando alguien entra al dashboard completo."""
    today    = timezone.now().date()
    week_ago = today - timedelta(days=7)

    # Top ejercicios por veces realizado
    top_exercises = list(
        UserExerciseProfile.objects.values('exercise_nombre')
        .annotate(total=Count('id'), veces=Avg('veces_realizado'))
        .order_by('-total')[:10]
    )

    # Distribución de niveles (Rookie/Atleta/Élite/Leyenda) — basado en total de sesiones
    nivel_buckets = {'rookie': 0, 'atleta': 0, 'elite': 0, 'leyenda': 0}
    user_session_counts = User.objects.annotate(s=Count('sessions')).values_list('s', flat=True)
    for n in user_session_counts:
        if   n >= 30: nivel_buckets['leyenda'] += 1
        elif n >= 15: nivel_buckets['elite']   += 1
        elif n >= 5:  nivel_buckets['atleta']  += 1
        else:         nivel_buckets['rookie']  += 1

    # Retención: % de usuarios que se registraron hace 7-14 días y volvieron en los últimos 7
    two_weeks_ago = today - timedelta(days=14)
    cohort = User.objects.filter(date_joined__date__gte=two_weeks_ago, date_joined__date__lt=week_ago)
    cohort_size = cohort.count()
    retained = cohort.filter(
        Q(sessions__fecha__gte=week_ago) | Q(checkins__fecha__gte=week_ago)
    ).distinct().count()
    retention_d7 = (retained / cohort_size * 100) if cohort_size else None

    # Sesiones recientes (últimas 10 a través de todos los usuarios)
    recent_sessions = list(
        Session.objects.select_related('user').order_by('-created_at')[:10]
        .values('id', 'user__email', 'fecha', 'rpe_target', 'duracion_planificada', 'created_at')
    )

    return {
        'top_exercises':   top_exercises,
        'nivel_buckets':   nivel_buckets,
        'retention_d7':    retention_d7,
        'cohort_size':     cohort_size,
        'retained_count':  retained,
        'recent_sessions': recent_sessions,
    }


# ─── Hooks ────────────────────────────────────────────────────────────────────

def dashboard_callback(request, context):
    """Pasado a UNFOLD.DASHBOARD_CALLBACK — popula la home del admin con KPIs."""
    context['zyfit_kpis'] = _compute_kpis()
    return context


@staff_member_required
def zyfit_metrics_view(request):
    """Vista dedicada (link en sidebar) con métricas extendidas."""
    ctx = {
        **(dashboard_callback(request, {}) or {}),
        **_compute_extended(),
        'title':            'Métricas Zyfit',
        'site_header':      'Zyfit Control',
        'has_permission':   True,
        'is_popup':         False,
        'available_apps':   [],
    }
    return render(request, 'admin/zyfit_metrics.html', ctx)
