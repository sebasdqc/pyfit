"""Métricas operativas de Zyfit para el panel de admin.

Dos puntos de entrada:

1. `dashboard_callback(request, context)` — Inyecta el contexto de la home del
   admin (configurado vía `UNFOLD.DASHBOARD_CALLBACK` en settings.py). Tras el
   rediseño, la home muestra un único KPI hero: el Activation Rate a 7 días
   (`_compute_activation_rate`). El resto de métricas vive en la vista dedicada.

2. `zyfit_metrics_view(request)` — Vista standalone (link del sidebar) que
   reusa el mismo template con datos extendidos: embudo de onboarding,
   retención cohort D1/D7/D30, distribución horaria, top ejercicios, etc.
   Acepta `?period=7|30|90` o `?from=&to=` para acotar el bloque de período.

Regla de alcance de los datos (importante):
  • Analítica de negocio (KPIs, embudo, retención, churn, niveles, top usuarios,
    bloque de período) → SOLO usuarios reales: se excluyen `is_staff` y las
    cuentas marcadas `Profile.is_test`. Así los números reflejan usuarios reales.
  • Observabilidad / operación (salud del sistema, distribución horaria, top
    ejercicios, lista de sesiones recientes) → TODOS los usuarios, para que el
    equipo vea su propia actividad de prueba mientras testea.

Caché: fuera de DEBUG, los bloques agregados se cachean 60s (LocMem). El home
del admin se recalcularía en cada carga; con caché es instantáneo y los datos
siguen siendo esencialmente "en vivo".
"""

import os
from collections import Counter
from datetime import date, timedelta

from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.core.cache import cache
from django.db.models import (
    Avg, Count, DateField, DurationField, Exists, ExpressionWrapper, F, Max, Min, OuterRef, Q,
)
from django.db.models.functions import TruncDate
from django.shortcuts import render
from django.utils import timezone

from users.models import Profile, User, UserLocation
from workouts.models import Session, SessionFeedback, UserExerciseProfile
from checkins.models import DailyCheckin


_CACHE_TTL = 60  # segundos


def _cached(key, fn, ttl=_CACHE_TTL):
    """Devuelve `fn()` cacheado `ttl` segundos. En DEBUG nunca cachea (dev/tests)."""
    if settings.DEBUG:
        return fn()
    val = cache.get(key)
    if val is None:
        val = fn()
        cache.set(key, val, ttl)
    return val


# ─── Universo de usuarios "reales" (excluye staff y cuentas de prueba) ──────────

def _real_users():
    """Usuarios que cuentan para analítica de negocio: ni staff ni cuentas test.

    Los usuarios sin Profile se conservan (no tienen `is_test=True`)."""
    return User.objects.filter(is_staff=False).exclude(profile__is_test=True)


def _real_sessions():
    return Session.objects.filter(user__is_staff=False).exclude(user__profile__is_test=True)


def _real_checkins():
    return DailyCheckin.objects.filter(user__is_staff=False).exclude(user__profile__is_test=True)


def _real_feedback():
    return SessionFeedback.objects.filter(
        session__user__is_staff=False
    ).exclude(session__user__profile__is_test=True)


# ─── KPI core ─────────────────────────────────────────────────────────────────

def _compute_kpis() -> dict:
    """Métricas resumen — siempre se calculan en una sola pasada. Solo reales."""
    now      = timezone.now()
    today    = now.date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    real = _real_users()

    total_users        = real.count()
    new_users_week     = real.filter(date_joined__date__gte=week_ago).count()
    new_users_month    = real.filter(date_joined__date__gte=month_ago).count()

    # "Activo" = generó al menos una sesión O hizo un check-in en el periodo
    active_7d = real.filter(
        Q(sessions__fecha__gte=week_ago) | Q(checkins__fecha__gte=week_ago)
    ).distinct().count()
    active_30d = real.filter(
        Q(sessions__fecha__gte=month_ago) | Q(checkins__fecha__gte=month_ago)
    ).distinct().count()

    sessions_today      = _real_sessions().filter(fecha=today).count()
    sessions_this_week  = _real_sessions().filter(fecha__gte=week_ago).count()
    sessions_total      = _real_sessions().count()

    checkins_today      = _real_checkins().filter(fecha=today).count()
    checkins_this_week  = _real_checkins().filter(fecha__gte=week_ago).count()

    feedback_week = _real_feedback().filter(created_at__date__gte=week_ago).aggregate(
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
    """Cinco etapas — cada una como subset (descendente) sobre usuarios reales.

    "Onboarding completo" replica EXACTAMENTE `Profile.is_onboarding_complete`
    (campos escalares + dias_semana>=1 + tener ubicación o lista de lugares no
    vacía), no una aproximación que sobreestima.
    """
    real = _real_users()
    total = real.count()

    has_loc = UserLocation.objects.filter(user=OuterRef('user'))
    onboarding_done = (
        Profile.objects.filter(
            user__is_staff=False, is_test=False,
            fecha_nacimiento__isnull=False, peso__isnull=False, altura__isnull=False,
            dias_semana__gte=1,
        )
        .exclude(objetivo='').exclude(sexo='')
        .annotate(_has_loc=Exists(has_loc))
        .filter(Q(_has_loc=True) | (Q(lugares_entrenamiento__isnull=False) & ~Q(lugares_entrenamiento=[])))
        .count()
    )

    has_checkin = real.filter(checkins__isnull=False).distinct().count()
    has_session = real.filter(sessions__isnull=False).distinct().count()
    has_feedback = real.filter(sessions__feedback__isnull=False).distinct().count()

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
    """Retención aproximada por cohorte (solo usuarios reales).

    Cohorte = usuarios reales registrados entre `window_days*2` y `window_days`
    días atrás. Retenidos = los que tienen actividad (sesión o check-in) en los
    últimos `window_days` días. Aproxima D1/D7/D30 sin event tracking detallado.
    Excluir staff/test mejora mucho la señal en cohortes pequeñas.
    """
    today = timezone.now().date()
    cutoff_end   = today - timedelta(days=window_days)
    cutoff_start = today - timedelta(days=window_days * 2)

    cohort = _real_users().filter(
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


# ─── Distribución horaria de sesiones (observabilidad — todos) ─────────────────

def _compute_hourly_distribution() -> list:
    """Histograma de cuándo se CREAN las sesiones (hora local del servidor).

    Útil para ver picos de uso y decidir cuándo escalar workers o disparar
    campañas. Observabilidad: incluye a todos.
    """
    cutoff = timezone.now() - timedelta(days=30)
    rows = Session.objects.filter(created_at__gte=cutoff).values_list('created_at', flat=True)

    counter = Counter()
    for dt in rows:
        local = timezone.localtime(dt)
        counter[local.hour] += 1

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
    """Indicadores del estado del sistema (operación — incluye a todos)."""
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


# ─── Tendencias semana a semana (solo reales) ──────────────────────────────────

def _compute_trends() -> dict:
    """Deltas semana actual vs semana anterior para detectar tendencias."""
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    two_weeks_ago = today - timedelta(days=14)

    real = _real_users()
    rs   = _real_sessions()
    rc   = _real_checkins()

    sessions_this_week = rs.filter(fecha__gte=week_ago).count()
    sessions_prev_week = rs.filter(fecha__gte=two_weeks_ago, fecha__lt=week_ago).count()

    users_this_week = real.filter(date_joined__date__gte=week_ago).count()
    users_prev_week = real.filter(date_joined__date__gte=two_weeks_ago, date_joined__date__lt=week_ago).count()

    active_this = real.filter(
        Q(sessions__fecha__gte=week_ago) | Q(checkins__fecha__gte=week_ago)
    ).distinct().count()
    active_prev = real.filter(
        Q(sessions__fecha__gte=two_weeks_ago, sessions__fecha__lt=week_ago) |
        Q(checkins__fecha__gte=two_weeks_ago, checkins__fecha__lt=week_ago)
    ).distinct().count()

    checkins_this = rc.filter(fecha__gte=week_ago).count()
    checkins_prev = rc.filter(fecha__gte=two_weeks_ago, fecha__lt=week_ago).count()

    def delta(curr, prev):
        if prev == 0:
            return None
        return round((curr - prev) / prev * 100, 1)

    return {
        'sessions_delta':  delta(sessions_this_week, sessions_prev_week),
        'users_delta':     delta(users_this_week, users_prev_week),
        'active_delta':    delta(active_this, active_prev),
        'checkins_delta':  delta(checkins_this, checkins_prev),
        'sessions_curr':   sessions_this_week,
        'sessions_prev':   sessions_prev_week,
        'users_curr':      users_this_week,
        'users_prev':      users_prev_week,
        'active_curr':     active_this,
        'active_prev':     active_prev,
        'checkins_curr':   checkins_this,
        'checkins_prev':   checkins_prev,
    }


# ─── Churn risk (solo reales, sin N+1) ─────────────────────────────────────────

def _churn_risk_users() -> list:
    """Usuarios reales activos (≤30d) pero silenciosos 7+ días.

    Una sola query: anota última sesión / último check-in / total de sesiones,
    acota en SQL a "previamente activo y ahora en silencio", y solo itera sobre
    ese subconjunto reducido. Devuelve hasta 20 (más antiguos primero).
    """
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Conjuntos por id (subconsultas) — NULL-safe. Excluir/filtrar directamente
    # sobre `Q(Max(...)>=x) | Q(Max(...)>=x)` falla cuando una de las fechas es
    # NULL (sin check-ins): `False OR NULL = NULL` y `NOT NULL` descarta la fila.
    previously_active_ids = _real_users().filter(
        Q(sessions__fecha__gte=month_ago) | Q(checkins__fecha__gte=month_ago)
    ).values_list('id', flat=True)
    recently_active_ids = _real_users().filter(
        Q(sessions__fecha__gte=week_ago) | Q(checkins__fecha__gte=week_ago)
    ).values_list('id', flat=True)

    candidates = (
        _real_users()
        .select_related('profile')
        .annotate(
            _last_session=Max('sessions__fecha'),
            _last_checkin=Max('checkins__fecha'),
            _n_sessions=Count('sessions', distinct=True),
        )
        .filter(id__in=previously_active_ids)       # activo en los últimos 30d…
        .exclude(id__in=recently_active_ids)        # …pero silencioso en los últimos 7d
    )

    results = []
    for user in candidates:
        last_activity = None
        for d in (user._last_session, user._last_checkin):
            if d and (last_activity is None or d > last_activity):
                last_activity = d
        if last_activity is None:
            continue
        days_silent = (today - last_activity).days
        profile = getattr(user, 'profile', None)
        nombre = profile.nombre if profile and profile.nombre else user.email.split('@')[0]
        results.append({
            'email':          user.email,
            'nombre':         nombre,
            'last_activity':  last_activity,
            'days_silent':    days_silent,
            'total_sessions': user._n_sessions,
        })

    results.sort(key=lambda x: x['days_silent'], reverse=True)
    return results[:20]


# ─── Calidad IA (solo reales, rango parametrizable) ────────────────────────────

def _ai_quality_metrics(from_date=None, to_date=None) -> dict:
    """Calidad de las sesiones generadas — feedback de usuarios reales en rango.

    Compara RPE target vs real, distribución de cumplimiento y de rating.
    Por defecto: últimos 30 días.
    """
    today = timezone.now().date()
    if from_date is None:
        from_date = today - timedelta(days=30)
    if to_date is None:
        to_date = today

    feedbacks = _real_feedback().filter(
        created_at__date__gte=from_date, created_at__date__lte=to_date,
    ).select_related('session')

    rpe_diffs = []
    cumplimientos = []
    ratings = []

    for fb in feedbacks:
        if fb.rpe_real is not None and fb.session.rpe_target is not None:
            rpe_diffs.append(float(fb.rpe_real) - float(fb.session.rpe_target))
        if fb.cumplimiento is not None:
            cumplimientos.append(float(fb.cumplimiento))
        if fb.rating is not None:
            ratings.append(int(fb.rating))

    def avg(lst):
        return round(sum(lst) / len(lst), 2) if lst else None

    cum_buckets = {'perfect': 0, 'good': 0, 'partial': 0, 'poor': 0}
    for c in cumplimientos:
        if c >= 90:   cum_buckets['perfect'] += 1
        elif c >= 70: cum_buckets['good']    += 1
        elif c >= 50: cum_buckets['partial'] += 1
        else:         cum_buckets['poor']    += 1

    rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in ratings:
        if r in rating_dist:
            rating_dist[r] += 1

    # Clase de salud del RPE bias por BANDA (no igualdad de float): el target
    # "perfecto" es bias≈0, pero ±0.5 sigue siendo bueno. Se calcula aquí para
    # no hacer aritmética de floats en el template.
    rpe_bias = avg(rpe_diffs)
    if rpe_bias is None:
        rpe_bias_health = ''
    elif abs(rpe_bias) <= 0.5:
        rpe_bias_health = 'health-good'
    elif abs(rpe_bias) <= 1.5:
        rpe_bias_health = 'health-warn'
    else:
        rpe_bias_health = 'health-bad'

    return {
        'rpe_bias':          rpe_bias,   # positivo = se sintió más duro que el target
        'rpe_bias_health':   rpe_bias_health,
        'cumplimiento_avg':  avg(cumplimientos),
        'rating_avg':        avg(ratings),
        'total_feedback':    len(ratings),
        'cum_buckets':       cum_buckets,
        'rating_dist':       rating_dist,
        'rpe_diff_samples':  len(rpe_diffs),
    }


# ─── Bloque de período (D4 — rango parametrizable, solo reales) ────────────────

def _compute_period(from_date: date, to_date: date) -> dict:
    """Métricas de negocio dentro de un rango de fechas elegido por el admin."""
    real = _real_users()

    new_users = real.filter(
        date_joined__date__gte=from_date, date_joined__date__lte=to_date,
    ).count()
    active_users = real.filter(
        Q(sessions__fecha__gte=from_date, sessions__fecha__lte=to_date) |
        Q(checkins__fecha__gte=from_date, checkins__fecha__lte=to_date)
    ).distinct().count()
    sessions = _real_sessions().filter(fecha__gte=from_date, fecha__lte=to_date).count()
    checkins = _real_checkins().filter(fecha__gte=from_date, fecha__lte=to_date).count()
    fb = _real_feedback().filter(
        created_at__date__gte=from_date, created_at__date__lte=to_date,
    ).aggregate(n=Count('id'), rpe=Avg('rpe_real'), cumpl=Avg('cumplimiento'), rating=Avg('rating'))

    return {
        'from':             from_date,
        'to':               to_date,
        'days':             (to_date - from_date).days + 1,
        'new_users':        new_users,
        'active_users':     active_users,
        'sessions':         sessions,
        'checkins':         checkins,
        'feedback_count':   fb['n'],
        'rpe_avg':          float(fb['rpe'])    if fb['rpe']    else None,
        'cumplimiento_avg': float(fb['cumpl'])  if fb['cumpl']  else None,
        'rating_avg':       float(fb['rating']) if fb['rating'] else None,
        'ai_quality':       _ai_quality_metrics(from_date, to_date),
    }


def _parse_period(request):
    """Lee `?period=7|30|90` o `?from=&to=`. Default: últimos 30 días."""
    today = timezone.now().date()
    preset = request.GET.get('period')
    if preset in ('7', '30', '90'):
        return today - timedelta(days=int(preset) - 1), today, preset
    try:
        from_date = date.fromisoformat(request.GET.get('from', ''))
    except ValueError:
        from_date = today - timedelta(days=29)
    try:
        to_date = date.fromisoformat(request.GET.get('to', ''))
    except ValueError:
        to_date = today
    if from_date > to_date:
        from_date, to_date = to_date, from_date
    return from_date, to_date, 'custom'


# ─── Datos secundarios ───────────────────────────────────────────────────────

def _compute_extended() -> dict:
    """Datos secundarios — sólo se piden cuando alguien entra al dashboard completo."""
    # Top ejercicios (observabilidad — todos)
    top_exercises = list(
        UserExerciseProfile.objects.values('exercise_nombre')
        .annotate(total=Count('id'), veces=Avg('veces_realizado'))
        .order_by('-total')[:10]
    )

    # Distribución de niveles (negocio — solo reales) basada en total de sesiones
    nivel_buckets = {'rookie': 0, 'atleta': 0, 'elite': 0, 'leyenda': 0}
    user_session_counts = _real_users().annotate(s=Count('sessions')).values_list('s', flat=True)
    for n in user_session_counts:
        if   n >= 30: nivel_buckets['leyenda'] += 1
        elif n >= 15: nivel_buckets['elite']   += 1
        elif n >= 5:  nivel_buckets['atleta']  += 1
        else:         nivel_buckets['rookie']  += 1

    # Sesiones recientes (observabilidad — todos, incluye tests del equipo)
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


# ─── Dashboard de hoy ─────────────────────────────────────────────────────────

def _compute_dashboard_today(churn_risk: list) -> dict:
    """Datos de hoy para el dashboard principal del admin.

    Recibe `churn_risk` ya calculado para no recomputarlo (se comparte con la
    vista de métricas). Diseñado para respuesta rápida.
    """
    now       = timezone.now()
    today     = now.date()
    yesterday = today - timedelta(days=1)
    week_ago  = today - timedelta(days=7)

    # Hoy (negocio — solo reales)
    sessions_today   = _real_sessions().filter(fecha=today).count()
    checkins_today   = _real_checkins().filter(fecha=today).count()
    new_users_today  = _real_users().filter(date_joined__date=today).count()
    feedback_today   = _real_feedback().filter(created_at__date=today).count()
    sessions_yesterday = _real_sessions().filter(fecha=yesterday).count()

    alerts = []

    # Alerta: tasa de éxito generate baja (operación — todas las sesiones)
    week_sessions = Session.objects.filter(created_at__date__gte=week_ago).count()
    week_with_ai  = Session.objects.filter(created_at__date__gte=week_ago, respuesta_ia__isnull=False).count()
    success_rate  = round(week_with_ai / week_sessions * 100, 1) if week_sessions else None
    if success_rate is not None and success_rate < 90:
        alerts.append({
            'level': 'error',
            'icon':  '🔴',
            'msg':   f'Generate success rate baja: {success_rate}% esta semana ({week_sessions} intentos)',
        })

    # Alerta: feedback rate baja
    week_with_feedback = Session.objects.filter(created_at__date__gte=week_ago, feedback__isnull=False).count()
    fb_rate = round(week_with_feedback / week_sessions * 100, 1) if week_sessions else None
    if fb_rate is not None and fb_rate < 30:
        alerts.append({
            'level': 'warn',
            'icon':  '🟡',
            'msg':   f'Feedback rate baja: {fb_rate}% — considera enviar un broadcast de recordatorio',
        })

    # Alerta: usuarios en churn risk
    n_churn = len(churn_risk)
    if n_churn >= 3:
        alerts.append({
            'level': 'warn',
            'icon':  '🟡',
            'msg':   f'{n_churn} usuarios en riesgo de churn (activos 30d, silenciosos 7+d)',
        })

    # Alerta: ninguna sesión hoy (si ya son las 18:00+)
    if sessions_today == 0 and now.hour >= 18:
        alerts.append({
            'level': 'warn',
            'icon':  '🟡',
            'msg':   'Sin sesiones generadas hoy — ¿hay algún problema con la API de Groq?',
        })

    if not alerts:
        alerts.append({
            'level': 'ok',
            'icon':  '🟢',
            'msg':   'Todo bien — sin alertas activas',
        })

    # Últimas 5 sesiones con usuario (observabilidad — todos)
    recent = list(
        Session.objects.select_related('user', 'feedback')
        .order_by('-created_at')[:5]
        .values('id', 'user__email', 'fecha', 'duracion_planificada', 'rpe_target', 'created_at')
    )

    # Usuarios más activos esta semana (negocio — solo reales)
    top_users = list(
        _real_sessions().filter(fecha__gte=week_ago)
        .values('user__email')
        .annotate(n=Count('id'))
        .order_by('-n')[:5]
    )

    return {
        'sessions_today':     sessions_today,
        'sessions_yesterday': sessions_yesterday,
        'checkins_today':     checkins_today,
        'new_users_today':    new_users_today,
        'feedback_today':     feedback_today,
        'alerts':             alerts,
        'recent_sessions':    recent,
        'top_users_week':     top_users,
        'success_rate':       success_rate,
        'fb_rate':            fb_rate,
        'n_churn':            n_churn,
    }


# ─── Activation Rate a 7 días (KPI hero del dashboard) ─────────────────────────
#
# Indicador más crítico de la beta cerrada: % de usuarios que completan ≥3
# sesiones dentro de sus primeros 7 días desde el registro. Solo se evalúa la
# cohorte con la VENTANA YA CERRADA (registrados hace 7–14 días): los registrados
# hace menos de 7 días aún no cumplieron su semana, así que no entran al cálculo.
#
# Nota de definición: el schema no tiene un flag de "sesión completada", y el
# resto del panel trata cada `Session` generada como la unidad de actividad. Por
# eso aquí "completar una sesión" = existe una `Session` con `fecha` dentro de la
# ventana. Si más adelante se quiere endurecer a "sesión ejecutada", basta con
# añadir `sessions__inicio_real__isnull=False` al filtro del Count.

ACTIVATION_GOAL_PCT     = 40   # meta de la beta cerrada
ACTIVATION_MIN_SESSIONS = 3    # sesiones que definen "activado"
ACTIVATION_WINDOW_DAYS  = 7    # ventana desde el registro


def _activation_for_cohort(reg_from: date, reg_to: date) -> tuple:
    """(activados, tamaño) de la cohorte real registrada en [reg_from, reg_to).

    "Activado" = ≥ACTIVATION_MIN_SESSIONS sesiones cuya `fecha` cae dentro de los
    primeros ACTIVATION_WINDOW_DAYS días desde el registro de ESE usuario. Solo
    usuarios reales (sin staff ni cuentas de prueba), coherente con el resto de la
    analítica de negocio del panel.

    El conteo por-usuario se resuelve en SQL con un Count condicional cuyo límite
    superior es una expresión por fila (fecha de registro + 7 días): evita iterar
    en Python y evita una query por usuario.
    """
    cohort = _real_users().filter(
        date_joined__date__gte=reg_from,
        date_joined__date__lt=reg_to,
    )
    cohort_size = cohort.count()
    if cohort_size == 0:
        return 0, 0

    reg_date   = TruncDate('date_joined')
    window_end = ExpressionWrapper(
        reg_date + timedelta(days=ACTIVATION_WINDOW_DAYS),
        output_field=DateField(),
    )

    activated = (
        cohort.annotate(
            _first7=Count('sessions', distinct=True, filter=Q(
                sessions__fecha__gte=reg_date,
                sessions__fecha__lte=window_end,
            )),
        )
        .filter(_first7__gte=ACTIVATION_MIN_SESSIONS)
        .count()
    )
    return activated, cohort_size


def _compute_activation_rate() -> dict:
    """Activation rate de la cohorte con ventana cerrada + delta vs. la previa."""
    today = timezone.now().date()

    # Cohorte actual: registrados hace 7–14 días (su ventana de 7 días ya cerró).
    cur_act, cur_size = _activation_for_cohort(
        today - timedelta(days=14), today - timedelta(days=7),
    )
    # Cohorte de la semana anterior: registrados hace 14–21 días (para el delta).
    prev_act, prev_size = _activation_for_cohort(
        today - timedelta(days=21), today - timedelta(days=14),
    )

    rate      = round(cur_act / cur_size * 100, 1) if cur_size else None
    prev_rate = round(prev_act / prev_size * 100, 1) if prev_size else None
    delta     = round(rate - prev_rate, 1) if (rate is not None and prev_rate is not None) else None

    if rate is None:
        estado = 'empty'
    elif rate < 30:
        estado = 'alerta'
    elif rate < ACTIVATION_GOAL_PCT:
        estado = 'precaucion'
    else:
        estado = 'meta'

    return {
        'rate':         rate,             # % actual (None si la cohorte está vacía)
        'goal':         ACTIVATION_GOAL_PCT,
        # Avance hacia la meta (0–100) para la barra; >100% se recorta a 100.
        'progress':     min(round(rate / ACTIVATION_GOAL_PCT * 100), 100) if rate is not None else 0,
        'activated':    cur_act,
        'cohort_size':  cur_size,
        'prev_rate':    prev_rate,
        'delta':        delta,            # puntos porcentuales vs. semana anterior
        'estado':       estado,           # alerta | precaucion | meta | empty
        'min_sessions': ACTIVATION_MIN_SESSIONS,
        'window_days':  ACTIVATION_WINDOW_DAYS,
    }


# ─── Fila de KPIs principales (período 7/30/90) ───────────────────────────────
#
# Cuatro indicadores de salud general bajo el North Star. Responden al selector
# de período del dashboard (7/30/90 días), salvo "Usuarios totales" cuyo número
# es el acumulado total (solo el delta del período cambia con la selección).
#
# "Sesión completada" = el usuario llegó al feedback post-sesión (existe
# SessionFeedback). Una sesión solo generada NO cuenta. El tiempo de sesión se
# mide entre `Session.inicio_real` (inicio de ejecución, lo setea el endpoint
# `session_iniciar`) y `SessionFeedback.created_at` (cierre del feedback): ambos
# timestamps ya existen en el schema, no hace falta añadir campos.
#
# Rangos de estado (criterio para la beta cerrada; se ajustan en estas constantes):
#   • Usuarios totales:  nuevos en período >0 → meta · =0 → precaución.
#   • Retención 30d:     ≥40% meta · 25–39% precaución · <25% alerta.
#   • Sesiones/usuario:  normalizado a la semana → ≥2.5/sem meta · 1.0–2.5 prec. · <1.0 alerta.
#   • Tiempo de sesión:  25–75 min meta · 15–25 ó 75–120 precaución · <15 ó >120 alerta.

HOME_PERIODS          = (7, 30, 90)
RETENTION_WINDOW_DAYS = 30     # ventana para "volver" tras la primera sesión

SESSIONS_PER_WEEK_GOAL    = 2.5   # sesiones completadas/usuario/semana → meta
SESSIONS_PER_WEEK_CAUTION = 1.0

SESSION_MIN_GOOD_MIN    = 25   # banda saludable de duración de sesión (min)
SESSION_MAX_GOOD_MIN    = 75
SESSION_MIN_OK_MIN      = 15
SESSION_MAX_OK_MIN      = 120
SESSION_OUTLIER_MAX_MIN = 240  # >4h = ruido (app dejada abierta) → se excluye


def _home_period_days(request) -> int:
    """Lee `?period=7|30|90` para la home. Default 7 días."""
    try:
        p = int(request.GET.get('period', 7))
    except (TypeError, ValueError):
        p = 7
    return p if p in HOME_PERIODS else 7


def _compute_total_users(period_days: int) -> dict:
    """Card 1 — Usuarios totales (acumulado) + nuevos en el período.

    Universo: usuarios reales (sin staff ni cuentas de prueba), coherente con el
    resto de la analítica de negocio del panel. El número es el acumulado total
    sin filtro de cohorte ni activación; solo el delta varía con el período.
    """
    today = timezone.now().date()
    from_date = today - timedelta(days=period_days - 1)
    real = _real_users()
    total  = real.count()
    nuevos = real.filter(date_joined__date__gte=from_date).count()
    return {
        'total':       total,
        'nuevos':      nuevos,
        'period_days': period_days,
        'estado':      'meta' if nuevos > 0 else 'precaucion',
    }


def _retention_30d_for_cohort(win_start: date, win_end: date) -> tuple:
    """(retenidos, tamaño) de la cohorte cuya PRIMERA sesión completada cae en
    [win_start, win_end). Retenido = ≥1 sesión completada adicional dentro de los
    30 días siguientes a la primera. Solo usuarios reales.

    Cohorte pequeña (beta): dos queries — la primera fija (id, primera_fecha) por
    usuario; la segunda trae las fechas de sus sesiones completadas y se evalúa la
    ventana por-usuario en Python (cada usuario tiene su propio día de referencia).
    """
    cohort = list(
        _real_users()
        .annotate(_first=Min('sessions__fecha', filter=Q(sessions__feedback__isnull=False)))
        .filter(_first__gte=win_start, _first__lt=win_end)
        .values_list('id', '_first')
    )
    n = len(cohort)
    if n == 0:
        return 0, 0

    first_by_user = dict(cohort)
    rows = (
        Session.objects.filter(user_id__in=first_by_user.keys(), feedback__isnull=False)
        .values_list('user_id', 'fecha')
    )
    dates_by_user = {}
    for uid, fecha in rows:
        dates_by_user.setdefault(uid, []).append(fecha)

    retained = 0
    for uid, first in first_by_user.items():
        window_end = first + timedelta(days=RETENTION_WINDOW_DAYS)
        if any(first < d <= window_end for d in dates_by_user.get(uid, ())):
            retained += 1
    return retained, n


def _compute_retention_30d(period_days: int) -> dict:
    """Card 2 — Retención a 30 días (cohorte con ventana cerrada) + delta vs. la previa.

    El período selecciona el ANCHO de la ventana de cohorte, que siempre termina
    hace 30 días para garantizar que cada usuario ya tuvo sus 30 días completos.
    """
    today = timezone.now().date()
    base = today - timedelta(days=RETENTION_WINDOW_DAYS)   # primera sesión ≤ hace 30 días

    cur_ret, cur_n   = _retention_30d_for_cohort(base - timedelta(days=period_days), base)
    prev_ret, prev_n = _retention_30d_for_cohort(
        base - timedelta(days=2 * period_days), base - timedelta(days=period_days),
    )

    rate      = round(cur_ret / cur_n * 100, 1) if cur_n else None
    prev_rate = round(prev_ret / prev_n * 100, 1) if prev_n else None
    delta     = round(rate - prev_rate, 1) if (rate is not None and prev_rate is not None) else None

    if rate is None:
        estado = 'empty'
    elif rate >= 40:
        estado = 'meta'
    elif rate >= 25:
        estado = 'precaucion'
    else:
        estado = 'alerta'

    return {
        'rate':        rate,
        'retained':    cur_ret,
        'cohort_size': cur_n,
        'delta':       delta,
        'prev_rate':   prev_rate,
        'estado':      estado,
        'period_days': period_days,
    }


def _compute_sessions_per_user(period_days: int) -> dict:
    """Card 3 — Sesiones completadas por usuario activo en el período.

    Completada = con feedback. Usuario activo = usuario real con ≥1 sesión
    completada en el período. El estado se evalúa normalizado a la semana para que
    sea comparable entre períodos.
    """
    today = timezone.now().date()
    from_date = today - timedelta(days=period_days - 1)

    completed = _real_sessions().filter(
        feedback__isnull=False, fecha__gte=from_date, fecha__lte=today,
    )
    total  = completed.count()
    active = completed.values('user_id').distinct().count()
    avg    = round(total / active, 2) if active else None

    if avg is None:
        estado = 'empty'
    else:
        per_week = avg / (period_days / 7)
        if per_week >= SESSIONS_PER_WEEK_GOAL:
            estado = 'meta'
        elif per_week >= SESSIONS_PER_WEEK_CAUTION:
            estado = 'precaucion'
        else:
            estado = 'alerta'

    return {
        'avg':         avg,
        'total':       total,
        'active':      active,
        'estado':      estado,
        'period_days': period_days,
    }


def _compute_session_time(period_days: int) -> dict:
    """Card 4 — Tiempo promedio de sesión (min): inicio de ejecución → cierre del feedback.

    `Session.inicio_real` (inicio) y `SessionFeedback.created_at` (cierre) ya
    existen. Se promedia sobre las sesiones completadas del período que tengan
    ambos timestamps; se excluyen duraciones ≤0 o > SESSION_OUTLIER_MAX_MIN (app
    dejada abierta). `n` indica la cobertura (puede ser parcial si no todas las
    sesiones se ejecutaron dentro de la app).
    """
    today = timezone.now().date()
    from_date = today - timedelta(days=period_days - 1)

    qs = (
        _real_sessions()
        .filter(
            feedback__isnull=False, inicio_real__isnull=False,
            fecha__gte=from_date, fecha__lte=today,
        )
        .annotate(_dur=ExpressionWrapper(
            F('feedback__created_at') - F('inicio_real'),
            output_field=DurationField(),
        ))
        .filter(_dur__gt=timedelta(0), _dur__lte=timedelta(minutes=SESSION_OUTLIER_MAX_MIN))
    )
    agg = qs.aggregate(prom=Avg('_dur'), n=Count('id'))
    prom_td, n = agg['prom'], agg['n']
    avg_min = round(prom_td.total_seconds() / 60, 1) if prom_td else None

    if avg_min is None:
        estado = 'empty'
    elif SESSION_MIN_GOOD_MIN <= avg_min <= SESSION_MAX_GOOD_MIN:
        estado = 'meta'
    elif SESSION_MIN_OK_MIN <= avg_min <= SESSION_MAX_OK_MIN:
        estado = 'precaucion'
    else:
        estado = 'alerta'

    return {
        'avg_min':     avg_min,
        'n':           n,
        'estado':      estado,
        'period_days': period_days,
    }


def _kpi_row(period_days: int) -> dict:
    """Los cuatro cards de la fila de KPIs para el período dado."""
    return {
        'usuarios':  _compute_total_users(period_days),
        'retencion': _compute_retention_30d(period_days),
        'sesiones':  _compute_sessions_per_user(period_days),
        'tiempo':    _compute_session_time(period_days),
    }


# ─── Hooks ────────────────────────────────────────────────────────────────────

def _home_payload() -> dict:
    """Payload de la home del admin.

    Tras el rediseño la home muestra un único KPI hero: el Activation Rate a 7
    días. El resto de métricas (KPIs, tendencias, pulso, embudo, retención…) vive
    en la vista dedicada `zyfit_metrics_view`. Cacheable 60s."""
    return {
        'activation': _compute_activation_rate(),
    }


def dashboard_callback(request, context):
    """Pasado a UNFOLD.DASHBOARD_CALLBACK — popula la home del admin.

    `activation` (North Star) es independiente del período. La fila de KPIs sí
    responde a `?period=7|30|90`, con caché por período."""
    period_days = _home_period_days(request)
    context.update(_cached('zyfit:home', _home_payload))
    context.update({
        'kpi_row':     _cached(f'zyfit:kpirow:{period_days}', lambda: _kpi_row(period_days)),
        'kpi_period':  period_days,
        'kpi_periods': HOME_PERIODS,
    })
    return context


@staff_member_required
def zyfit_metrics_view(request):
    """Vista dedicada (link en sidebar) con métricas extendidas + bloque de período."""
    from_date, to_date, preset = _parse_period(request)

    def base_payload():
        churn = _churn_risk_users()
        return {
            'zyfit_kpis':      _compute_kpis(),
            'trends':          _compute_trends(),
            'dashboard_today': _compute_dashboard_today(churn),
            'churn_risk':      churn,
            **_compute_extended(),
        }

    base   = _cached('zyfit:metrics_base', base_payload)
    period = _cached(f'zyfit:period:{from_date}:{to_date}', lambda: _compute_period(from_date, to_date))

    ctx = {
        **base,
        'period':         period,
        'period_preset':  preset,
        'period_from':    from_date.isoformat(),
        'period_to':      to_date.isoformat(),
        'title':          'Métricas Zyfit',
        'site_header':    'Zyfit Control',
        'has_permission': True,
        'is_popup':       False,
        'available_apps': [],
    }
    return render(request, 'admin/zyfit_metrics.html', ctx)
