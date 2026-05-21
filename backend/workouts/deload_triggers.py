"""
Adaptive deload trigger evaluation.

Called after session feedback is saved. Each check is independent.
Triggers are deduplicated: if the same trigger_type was already registered
in the last 7 days, it is not re-created.

Never raises — all exceptions are caught so feedback saves are never blocked.
"""
import logging
from datetime import date, timedelta

logger = logging.getLogger(__name__)

# Duplicate-suppression window in days
_DEDUP_WINDOW_DAYS = 7

# calidad_sueno threshold (hours): <= this value is considered "poor sleep"
_POOR_SLEEP_HOURS = 6.0

# Min consecutive poor-sleep checkins to trigger sleep_deficit
_SLEEP_DEFICIT_DAYS = 4


def evaluate_deload_triggers(user, session, feedback) -> list:
    """
    Evaluates all adaptive triggers post-feedback.
    Returns a list of created DeloadTrigger instances (may be empty).
    """
    from workouts.models import TrainingCycle, DeloadTrigger

    try:
        cycle = TrainingCycle.objects.get(user=user, is_active=True)
    except TrainingCycle.DoesNotExist:
        return []

    created: list = []

    checks = [
        _check_rpe_elevated,
        _check_sleep_deficit,
        _check_adherence_drop,
        _check_programmatic_deload,
    ]

    for check in checks:
        try:
            result = check(user, session, feedback, cycle)
        except Exception:
            logger.error('deload_trigger check %s failed for user %s', check.__name__, user.id, exc_info=True)
            continue

        if result is None:
            continue

        trigger_type = result['trigger_type']
        if _already_triggered(user, trigger_type):
            logger.debug('deload_trigger %s already exists for user %s — skipping', trigger_type, user.id)
            continue

        try:
            trigger = DeloadTrigger.objects.create(
                user=user,
                training_cycle=cycle,
                trigger_type=trigger_type,
                action_taken='',
                details=result.get('details'),
            )
            created.append(trigger)
            logger.info(
                'deload_trigger created user=%s type=%s details=%s',
                user.id, trigger_type, result.get('details'),
            )

            # Flag the cycle so the next session is a deload
            # (adherence_drop is different: reduce days, not deload)
            if trigger_type != 'adherence_drop':
                if not cycle.next_session_is_deload and not cycle.is_deload:
                    cycle.next_session_is_deload = True
                    cycle.save(update_fields=['next_session_is_deload'])
        except Exception:
            logger.error(
                'deload_trigger creation failed user=%s type=%s', user.id, trigger_type, exc_info=True,
            )

    return created


# ─── Individual checks ────────────────────────────────────────────────────────

def _already_triggered(user, trigger_type: str, days: int = _DEDUP_WINDOW_DAYS) -> bool:
    from workouts.models import DeloadTrigger
    cutoff = date.today() - timedelta(days=days)
    return DeloadTrigger.objects.filter(
        user=user,
        trigger_type=trigger_type,
        created_at__date__gte=cutoff,
    ).exists()


def _check_rpe_elevated(user, session, feedback, cycle) -> dict | None:
    """
    Trigger: avg session RPE >= prescribed RPE + 1.5 in at least 2 of the last
    3 sessions with feedback within 7 days.
    """
    from workouts.models import Session
    cutoff = date.today() - timedelta(days=7)
    recent = list(
        Session.objects.filter(
            user=user,
            fecha__gte=cutoff,
            feedback__isnull=False,
        ).select_related('feedback').order_by('-fecha')[:3]
    )
    if len(recent) < 2:
        return None

    elevated = [
        s for s in recent
        if float(s.feedback.rpe_real) >= float(s.rpe_target) + 1.5
    ]
    if len(elevated) < 2:
        return None

    avg_excess = round(
        sum(float(s.feedback.rpe_real) - float(s.rpe_target) for s in elevated) / len(elevated), 2
    )
    return {
        'trigger_type': 'rpe_elevated',
        'details': {'elevated_sessions': len(elevated), 'avg_excess': avg_excess},
    }


def _check_sleep_deficit(user, session, feedback, cycle) -> dict | None:
    """
    Trigger: calidad_sueno <= 6 hours in at least 4 of the last 7 checkins.
    """
    from checkins.models import DailyCheckin
    cutoff = date.today() - timedelta(days=7)
    checkins = DailyCheckin.objects.filter(user=user, fecha__gte=cutoff)
    low_sleep = [c for c in checkins if float(c.calidad_sueno) <= _POOR_SLEEP_HOURS]
    if len(low_sleep) < _SLEEP_DEFICIT_DAYS:
        return None
    return {
        'trigger_type': 'sleep_deficit',
        'details': {'low_sleep_days': len(low_sleep), 'threshold_hours': _POOR_SLEEP_HOURS},
    }


def _check_adherence_drop(user, session, feedback, cycle) -> dict | None:
    """
    Trigger (salud only): completed sessions < 60% of programmed in the last 14 days.
    """
    if cycle.goal != 'salud':
        return None

    try:
        dias_semana = user.profile.dias_semana or 3
    except Exception:
        dias_semana = 3

    from workouts.models import Session
    cutoff = date.today() - timedelta(days=14)
    actual = Session.objects.filter(
        user=user, fecha__gte=cutoff, feedback__isnull=False,
    ).count()

    programmed = dias_semana * 2  # 2 weeks × days/week
    if programmed == 0:
        return None

    ratio = actual / programmed
    if ratio >= 0.60:
        return None

    return {
        'trigger_type': 'adherence_drop',
        'details': {
            'actual_sessions': actual,
            'programmed_sessions': programmed,
            'adherence_ratio': round(ratio, 2),
        },
    }


def _check_programmatic_deload(user, session, feedback, cycle) -> dict | None:
    """
    Trigger: the current work block has exceeded its programmed week count
    and no deload has been scheduled yet.
    """
    if cycle.is_deload or cycle.next_session_is_deload:
        return None

    from workouts.training_cycle import GOAL_DELOAD_AFTER_WEEKS
    deload_after = GOAL_DELOAD_AFTER_WEEKS.get(cycle.goal, 3)
    days_elapsed = max(0, (date.today() - cycle.started_at).days)
    current_week = days_elapsed // 7 + 1

    if current_week <= deload_after:
        return None

    return {
        'trigger_type': 'programmatic_week4',
        'details': {'current_week': current_week, 'deload_after': deload_after},
    }
