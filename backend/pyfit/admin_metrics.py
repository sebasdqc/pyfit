"""Métricas operativas de Zyfit para el panel de admin.

Dos puntos de entrada:

1. `dashboard_callback(request, context)` — Inyecta cards de KPI directamente
   en la página principal del admin (configurado vía `UNFOLD.DASHBOARD_CALLBACK`
   en settings.py). Resultado: al entrar a `/zyfit-admin/`, lo primero que se
   ve son los números clave del producto.

2. `zyfit_metrics_view(request)` — Vista standalone (link del sidebar) que
   reusa el mismo template con datos extendidos: embudo de onboarding,
   retención cohort D1/D7/D30, distribución horaria, top ejercicios, etc.

Todas las consultas son agregadas. Si el dataset crece >50k usuarios la
distribución horaria puede empezar a doler — ahí cacheamos.
"""

import os
from collections import Counter
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


# ─── Embudo de onboarding ────────────────────────────────────────────────────

def _compute_funnel() -> list:
    """Cinco etapas — cada una se mide como subset de la anterior (descendente).

    Las "etapas válidas" son cuentas de usuarios distintos que cumplieron
    al menos una vez la condición. Ningún `cohort cleanup` — esto refleja
    el estado actual del negocio, no de un cohort específico.
    """
    total = User.objects.count()

    onboarding_done = Profile.objects.exclude(objetivo='').filter(
        fecha_nacimiento__isnull=False, peso__isnull=False, altura__isnull=False,
    ).exclude(sexo='').count()

    has_checkin = User.objects.filter(checkins__isnull=False).distinct().count()
    has_session = User.objects.filter(sessions__isnull=False).distinct().count()
    has_feedback = User.objects.filter(sessions__feedback__isnull=False).distinct().count()

    def pct(n, base):
        return round(n / base * 100, 1) if base else 0

    return [
        {'label': 'Registrados',         'value': total,           'pct': 100.0},
        {'label': 'Onboarding completo', 'value': onboarding_done, 'pct': pct(onboarding_done, total)},
        {'label': 'Hicieron check-in',   'value': has_checkin,     'pct': pct(has_checkin,    total)},
        {'label': 'Generaron sesión',    'value': has_session,     'pct': pct(has_session,    total)},
        {'label': 'Dieron feedback',     'value': has_feedback,    'pct': pct(has_feedback,   total)},
    ]


# ─── Retention cohorts ───────────────────────────────────────────────────────

def _retention_cohort(window_days: int) -> dict:
    """Calcula retención para una ventana dada.

    Lógica: tomamos a los usuarios registrados hace `window_days * 2`
    a `window_days` días (la "cohorte"). De ellos, contamos cuántos tienen
    actividad (sesión o check-in) en los últimos `window_days` días.

    Esto aproxima D1/D7/D30 sin necesitar event tracking detallado.
    """
    today = timezone.now().date()
    cutoff_end   = today - timedelta(days=window_days)
    cutoff_start = today - timedelta(days=window_days * 2)

    cohort = User.objects.filter(
        date_joined__date__gte=cutoff_start,
        date_joined__date__lt=cutoff_end,
    )
    cohort_size = cohort.count()
    if cohort_size == 0:
        return {'window_days': window_days, 'cohort_size': 0, 'retained': 0, 'pct': None}

    retained = cohort.filter(
        Q(sessions__fecha__gte=cutoff_end) | Q(checkins__fecha__gte=cutoff_end)
    ).distinct().count()

    return {
        'window_days': window_days,
        'cohort_size': cohort_size,
        'retained':    retained,
        'pct':         round(retained / cohort_size * 100, 1),
    }


# ─── Distribución horaria de sesiones ────────────────────────────────────────

def _compute_hourly_distribution() -> list:
    """Histograma de cuándo se CREAN las sesiones (hora local del servidor).

    Útil para ver picos de uso y, en futuro, decidir cuándo escalar workers
    o disparar campañas de re-engagement.
    """
    # Cogemos los últimos 30 días para que la muestra sea suficiente sin
    # tirar el SQL completo.
    cutoff = timezone.now() - timedelta(days=30)
    rows = Session.objects.filter(created_at__gte=cutoff).values_list('created_at', flat=True)

    counter = Counter()
    for dt in rows:
        local = timezone.localtime(dt)
        counter[local.hour] += 1

    # Pasamos a una lista de 24 entradas con 0s donde no hubo nada — facilita
    # iterar en el template y mantiene la escala constante.
    total = max(counter.values()) if counter else 0
    distribution = []
    for h in range(24):
        n = counter.get(h, 0)
        distribution.append({
            'hour':    h,
            'count':   n,
            'pct':     round(n / total * 100) if total else 0,
        })
    return distribution


# ─── Health / observabilidad ─────────────────────────────────────────────────

def _system_health() -> dict:
    """Indicadores ligeros del estado del sistema sin depender de Sentry."""
    cutoff = timezone.now() - timedelta(days=7)
    total_sessions_week = Session.objects.filter(created_at__gte=cutoff).count()
    sessions_with_response = Session.objects.filter(
        created_at__gte=cutoff, respuesta_ia__isnull=False,
    ).count()
    sessions_with_feedback = Session.objects.filter(
        created_at__gte=cutoff, feedback__isnull=False,
    ).count()

    def pct(n, base):
        return round(n / base * 100, 1) if base else None

    return {
        'generate_success_rate':  pct(sessions_with_response, total_sessions_week),
        'feedback_rate':          pct(sessions_with_feedback, total_sessions_week),
        'sessions_week_total':    total_sessions_week,
        'sentry_dsn_configured':  bool(os.environ.get('SENTRY_DSN', '').strip()),
    }


# ─── Datos secundarios ───────────────────────────────────────────────────────

def _compute_extended() -> dict:
    """Datos secundarios — sólo se piden cuando alguien entra al dashboard completo."""
    today    = timezone.now().date()

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

    # Sesiones recientes (últimas 10 a través de todos los usuarios)
    recent_sessions = list(
        Session.objects.select_related('user').order_by('-created_at')[:10]
        .values('id', 'user__email', 'fecha', 'rpe_target', 'duracion_planificada', 'created_at')
    )

    return {
        'funnel':           _compute_funnel(),
        'retention_d1':     _retention_cohort(1),
        'retention_d7':     _retention_cohort(7),
        'retention_d30':    _retention_cohort(30),
        'hourly':           _compute_hourly_distribution(),
        'system_health':    _system_health(),
        'top_exercises':    top_exercises,
        'nivel_buckets':    nivel_buckets,
        'recent_sessions':  recent_sessions,
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
