"""
Training Cycle service — manages TrainingCycle lifecycle.

  init_cycle              → create a new active cycle (replaces any existing one)
  advance_week_if_needed  → calendar-based week progression + deload scheduling
  apply_goal_transition   → Section 8 of periodization standards (Case A / Case B)
"""
import logging
from datetime import date

from workouts.models import TrainingCycle

logger = logging.getLogger(__name__)

GOAL_FIRST_BLOCK: dict[str, str] = {
    'hipertrofia':   'acumulacion_hiper',
    'fuerza':        'acumulacion_fuerza',
    'potencia':      'fuerza_base',
    'salud':         'salud_general',
    'perdida_grasa': 'densidad_alta',
}

# Programmatic work weeks before a deload is triggered
GOAL_DELOAD_AFTER_WEEKS: dict[str, int] = {
    'hipertrofia':   3,
    'fuerza':        3,
    'potencia':      3,
    'salud':         5,
    'perdida_grasa': 3,
}

# Total weeks per block (used to determine first / second half for goal transitions)
BLOCK_TOTAL_WEEKS: dict[str, int] = {
    'acumulacion_hiper':      4,
    'intensificacion_hiper':  4,
    'acumulacion_fuerza':     4,
    'intensificacion_fuerza': 4,
    'realizacion_fuerza':     4,
    'fuerza_base':            4,
    'potencia_especifica':    3,
    'pico_potencia':          3,
    'salud_general':          6,
    'densidad_alta':          4,
    'preservacion_muscular':  4,
    'transicion':             2,
    'deload':                 1,
}

# Next block in sequence for each (goal, current_block). None = macrocycle complete → restart.
GOAL_BLOCK_SEQUENCE: dict[str, dict[str, str | None]] = {
    'hipertrofia': {
        'acumulacion_hiper':     'intensificacion_hiper',
        'intensificacion_hiper': None,
    },
    'fuerza': {
        'acumulacion_fuerza':      'intensificacion_fuerza',
        'intensificacion_fuerza':  'realizacion_fuerza',
        'realizacion_fuerza':      None,
    },
    'potencia': {
        'fuerza_base':         'potencia_especifica',
        'potencia_especifica': 'pico_potencia',
        'pico_potencia':       None,
    },
    'salud': {
        'salud_general': None,
    },
    'perdida_grasa': {
        'densidad_alta':         'preservacion_muscular',
        'preservacion_muscular': None,
    },
}


def init_cycle(user, goal: str) -> TrainingCycle:
    """
    Creates a new active TrainingCycle, deactivating any existing one.
    Raises ValueError for an unrecognised goal.
    """
    if goal not in GOAL_FIRST_BLOCK:
        raise ValueError(f'Invalid goal: {goal!r}. Valid values: {list(GOAL_FIRST_BLOCK)}')

    TrainingCycle.objects.filter(user=user, is_active=True).update(is_active=False)

    cycle = TrainingCycle.objects.create(
        user=user,
        goal=goal,
        block_type=GOAL_FIRST_BLOCK[goal],
        week_number=1,
        is_deload=False,
        next_session_is_deload=False,
        is_active=True,
        started_at=date.today(),
    )
    logger.info('init_cycle user=%s goal=%s block=%s', user.id, goal, cycle.block_type)
    return cycle


def advance_week_if_needed(
    cycle: TrainingCycle,
    user_goal: str | None = None,
) -> TrainingCycle:
    """
    Advances week_number based on calendar days elapsed since the current
    block started (cycle.started_at). Safe to call multiple times per week —
    only advances when a new calendar week has genuinely elapsed.

    When leaving a deload week and user_goal != cycle.goal, a new cycle is
    created for user_goal instead of continuing the old goal's sequence.
    """
    if not cycle.is_active:
        return cycle

    days_elapsed = max(0, (date.today() - cycle.started_at).days)
    computed_week = days_elapsed // 7 + 1

    if computed_week <= cycle.week_number:
        return cycle  # Already current

    deload_after = GOAL_DELOAD_AFTER_WEEKS.get(cycle.goal, 3)

    # Advance one step at a time to respect deload boundaries
    while cycle.week_number < computed_week:
        if cycle.is_deload:
            # Leaving a deload week → check for pending goal transition
            if user_goal and user_goal != cycle.goal:
                cycle.is_active = False
                cycle.save(update_fields=['is_active'])
                logger.info(
                    'advance_week post_deload_goal_transition user=%s %s→%s',
                    cycle.user_id, cycle.goal, user_goal,
                )
                return init_cycle(cycle.user, user_goal)

            # No goal transition → advance to the next block
            cycle.is_deload = False
            cycle.next_session_is_deload = False
            next_block = GOAL_BLOCK_SEQUENCE.get(cycle.goal, {}).get(cycle.block_type)
            if next_block is None:
                # Macrocycle complete → restart from block 1
                cycle.block_type = GOAL_FIRST_BLOCK.get(cycle.goal, cycle.block_type)
                logger.info(
                    'advance_week macrocycle_complete user=%s goal=%s → restart',
                    cycle.user_id, cycle.goal,
                )
            else:
                cycle.block_type = next_block
                logger.info(
                    'advance_week next_block user=%s goal=%s block=%s',
                    cycle.user_id, cycle.goal, next_block,
                )
            cycle.week_number = 1
            cycle.started_at = date.today()
            # Recompute: we just reset to week 1 so exit the loop
            break
        else:
            cycle.week_number += 1
            if cycle.week_number > deload_after:
                cycle.is_deload = True
                cycle.week_number = 1
                cycle.started_at = date.today()
                logger.info(
                    'advance_week programmatic_deload user=%s goal=%s',
                    cycle.user_id, cycle.goal,
                )
                break
            elif cycle.week_number == deload_after:
                cycle.next_session_is_deload = True

    cycle.save(update_fields=[
        'block_type', 'week_number', 'is_deload', 'next_session_is_deload', 'started_at',
    ])
    return cycle


def apply_goal_transition(user, old_goal: str, new_goal: str) -> TrainingCycle | None:
    """
    Handles a user changing their goal. Implements Section 8.

    Case A — first half of current block → restart immediately with new goal.
    Case B — second half → schedule deload and transition after it completes.

    Returns the relevant TrainingCycle (new or existing), or None if no change.
    """
    if not new_goal or old_goal == new_goal:
        return None

    try:
        cycle = TrainingCycle.objects.get(user=user, is_active=True)
    except TrainingCycle.DoesNotExist:
        return init_cycle(user, new_goal)

    block_weeks = BLOCK_TOTAL_WEEKS.get(cycle.block_type, 4)
    midpoint = block_weeks / 2

    if cycle.week_number <= midpoint:
        # Case A: first half → restart now
        logger.info(
            'goal_transition CaseA user=%s %s→%s week=%d/%d — restart',
            user.id, old_goal, new_goal, cycle.week_number, block_weeks,
        )
        return init_cycle(user, new_goal)

    # Case B: second half → finish the current block, then transition
    cycle.next_session_is_deload = True
    cycle.save(update_fields=['next_session_is_deload'])
    logger.info(
        'goal_transition CaseB user=%s %s→%s week=%d/%d — complete block first',
        user.id, old_goal, new_goal, cycle.week_number, block_weeks,
    )
    return cycle
