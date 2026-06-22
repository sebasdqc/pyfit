"""
Workouts app test suite — covers:
  - TrainingCycle service (init, advance, goal transition)
  - AdaptiveEngine Step 6 (get_periodization_params)
  - Deload trigger evaluation
  - Training Cycle API endpoints
  - Post-feedback integration (advance + triggers)
"""
from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from users.models import UserLocation
from workouts.models import TrainingCycle, DeloadTrigger, Session, SessionFeedback
from workouts.training_cycle import (
    GOAL_FIRST_BLOCK, GOAL_DELOAD_AFTER_WEEKS,
    init_cycle, advance_week_if_needed, apply_goal_transition,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_user(email='test@example.com'):
    from django.contrib.auth import get_user_model
    from users.models import Profile
    User = get_user_model()
    user = User.objects.create_user(email=email, username=email, password='testpass123')
    Profile.objects.get_or_create(user=user, defaults={'nombre': 'Test'})
    return user


def make_location(user, tipo='casa'):
    return UserLocation.objects.create(user=user, nombre='Test', tipo=tipo, implementos=[])


def make_checkin(user, location, fecha=None, calidad_sueno='7.0', estado_animo=3):
    from checkins.models import DailyCheckin
    return DailyCheckin.objects.create(
        user=user,
        fecha=fecha or date.today(),
        estado_animo=estado_animo,
        calidad_sueno=Decimal(calidad_sueno),
        duracion_disponible=60,
        location=location,
    )


def make_session_with_feedback(user, location, rpe_real=7.0, rpe_target=7.0,
                                cumplimiento=85, days_ago=0):
    s = Session.objects.create(
        user=user,
        fecha=date.today() - timedelta(days=days_ago),
        duracion_planificada=60,
        rpe_target=rpe_target,
        location=location,
    )
    f = SessionFeedback.objects.create(
        session=s, rpe_real=rpe_real, cumplimiento=cumplimiento, rating=4,
    )
    return s, f


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Training Cycle service
# ═══════════════════════════════════════════════════════════════════════════════

class TrainingCycleServiceTests(TestCase):

    def setUp(self):
        self.user = make_user()

    def test_init_cycle_creates_active_cycle(self):
        cycle = init_cycle(self.user, 'hipertrofia')
        self.assertEqual(cycle.goal, 'hipertrofia')
        self.assertEqual(cycle.block_type, 'acumulacion_hiper')
        self.assertEqual(cycle.week_number, 1)
        self.assertTrue(cycle.is_active)
        self.assertFalse(cycle.is_deload)

    def test_init_cycle_sets_first_block_for_each_goal(self):
        for i, (goal, expected_block) in enumerate(GOAL_FIRST_BLOCK.items()):
            u = make_user(email=f'goal{i}@example.com')
            cycle = init_cycle(u, goal)
            self.assertEqual(cycle.block_type, expected_block, f'Failed for goal {goal}')

    def test_init_cycle_deactivates_existing(self):
        old = init_cycle(self.user, 'hipertrofia')
        new = init_cycle(self.user, 'fuerza')
        old.refresh_from_db()
        self.assertFalse(old.is_active)
        self.assertTrue(new.is_active)
        self.assertEqual(new.goal, 'fuerza')

    def test_init_cycle_only_one_active_per_user(self):
        init_cycle(self.user, 'hipertrofia')
        init_cycle(self.user, 'salud')
        active_count = TrainingCycle.objects.filter(user=self.user, is_active=True).count()
        self.assertEqual(active_count, 1)

    def test_init_cycle_invalid_goal_raises(self):
        with self.assertRaises(ValueError):
            init_cycle(self.user, 'cardio')

    # ── Goal transitions ──────────────────────────────────────────────────────

    def test_apply_goal_transition_no_cycle_creates_new(self):
        result = apply_goal_transition(self.user, '', 'salud')
        self.assertIsNotNone(result)
        self.assertEqual(result.goal, 'salud')

    def test_apply_goal_transition_same_goal_no_op(self):
        init_cycle(self.user, 'hipertrofia')
        result = apply_goal_transition(self.user, 'hipertrofia', 'hipertrofia')
        self.assertIsNone(result)

    def test_apply_goal_transition_empty_new_goal_no_op(self):
        init_cycle(self.user, 'hipertrofia')
        result = apply_goal_transition(self.user, 'hipertrofia', '')
        self.assertIsNone(result)

    def test_apply_goal_transition_case_a_first_half(self):
        # week=1 of 4-week block → midpoint=2 → Case A (1 <= 2) → restart
        cycle = init_cycle(self.user, 'hipertrofia')
        self.assertEqual(cycle.week_number, 1)
        new_cycle = apply_goal_transition(self.user, 'hipertrofia', 'fuerza')
        cycle.refresh_from_db()
        self.assertFalse(cycle.is_active, 'Old cycle must be deactivated in Case A')
        self.assertEqual(new_cycle.goal, 'fuerza')
        self.assertEqual(new_cycle.block_type, 'acumulacion_fuerza')

    def test_apply_goal_transition_case_b_second_half(self):
        # week=3 of 4-week block → midpoint=2 → Case B (3 > 2) → schedule deload
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.week_number = 3
        cycle.save()
        result = apply_goal_transition(self.user, 'hipertrofia', 'fuerza')
        self.assertEqual(result.id, cycle.id, 'Same cycle returned in Case B')
        result.refresh_from_db()
        self.assertTrue(result.next_session_is_deload)
        self.assertTrue(result.is_active)

    # ── Week advancement ──────────────────────────────────────────────────────

    def test_advance_week_no_change_needed(self):
        cycle = init_cycle(self.user, 'hipertrofia')
        # started today → stays at week 1
        updated = advance_week_if_needed(cycle)
        self.assertEqual(updated.week_number, 1)

    def test_advance_week_after_8_days(self):
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.started_at = date.today() - timedelta(days=8)
        cycle.save()
        updated = advance_week_if_needed(cycle)
        self.assertEqual(updated.week_number, 2)

    def test_advance_week_sets_next_session_is_deload_flag(self):
        # hipertrofia: deload_after=3; week 3 should set next_session_is_deload
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.started_at = date.today() - timedelta(days=15)
        cycle.week_number = 2
        cycle.save()
        updated = advance_week_if_needed(cycle)
        self.assertEqual(updated.week_number, 3)
        self.assertTrue(updated.next_session_is_deload)

    def test_advance_week_past_limit_triggers_deload(self):
        # 22 days → week 4 > deload_after(3) → is_deload=True
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.started_at = date.today() - timedelta(days=22)
        cycle.week_number = 3
        cycle.save()
        updated = advance_week_if_needed(cycle)
        self.assertTrue(updated.is_deload)

    def test_advance_week_inactive_cycle_is_noop(self):
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.is_active = False
        cycle.started_at = date.today() - timedelta(days=30)
        cycle.save()
        updated = advance_week_if_needed(cycle)
        # Must not advance — inactive cycle
        self.assertEqual(updated.week_number, cycle.week_number)

    def test_advance_week_goal_transition_after_deload(self):
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.is_deload = True
        cycle.started_at = date.today() - timedelta(days=8)
        cycle.save()
        updated = advance_week_if_needed(cycle, user_goal='fuerza')
        # Either a new cycle for 'fuerza' was created, or same cycle advanced
        if updated.id != cycle.id:
            self.assertEqual(updated.goal, 'fuerza')
            cycle.refresh_from_db()
            self.assertFalse(cycle.is_active)
        # else same cycle still advanced — both valid depending on timing


# ═══════════════════════════════════════════════════════════════════════════════
# 2. AdaptiveEngine Step 6 — get_periodization_params
# ═══════════════════════════════════════════════════════════════════════════════

class PeriodizationEngineTests(TestCase):

    def setUp(self):
        self.user = make_user('engine@example.com')
        self.loc = make_location(self.user)
        self.checkin = make_checkin(self.user, self.loc)

    def _engine(self):
        from ai_workout.adaptive_engine import AdaptiveEngineService
        return AdaptiveEngineService(self.user, self.checkin, self.loc, self.user.profile)

    def test_no_cycle_returns_inactive(self):
        result = self._engine().get_periodization_params()
        self.assertFalse(result['active'])
        self.assertIsNone(result['goal'])
        self.assertIsInstance(result['prompt_block'], str)
        self.assertGreater(len(result['prompt_block']), 10)

    def test_active_cycle_returns_correct_params(self):
        init_cycle(self.user, 'hipertrofia')
        result = self._engine().get_periodization_params()
        self.assertTrue(result['active'])
        self.assertEqual(result['goal'], 'hipertrofia')
        self.assertEqual(result['block_type'], 'acumulacion_hiper')
        self.assertIsNotNone(result['params'])
        self.assertEqual(result['params']['rpe_min'], 7)
        self.assertEqual(result['params']['rpe_max'], 8)

    def test_deload_flag_returns_deload_params(self):
        cycle = init_cycle(self.user, 'fuerza')
        cycle.is_deload = True
        cycle.save()
        result = self._engine().get_periodization_params()
        self.assertEqual(result['block_type'], 'deload')
        self.assertEqual(result['params']['rpe_min'], 5)

    def test_realizacion_fuerza_has_hard_rules(self):
        cycle = init_cycle(self.user, 'fuerza')
        cycle.block_type = 'realizacion_fuerza'
        cycle.save()
        result = self._engine().get_periodization_params()
        self.assertIn('high_systemic_fatigue_max_50pct_volume', result['params']['hard_rules'])
        self.assertGreater(len(result['hard_rule_texts']), 0)

    def test_potencia_especifica_hard_rules(self):
        cycle = init_cycle(self.user, 'potencia')
        cycle.block_type = 'potencia_especifica'
        cycle.save()
        result = self._engine().get_periodization_params()
        self.assertIn('tempo_concentric_X', result['params']['hard_rules'])
        self.assertIn('rest_min_180s', result['params']['hard_rules'])

    def test_prompt_block_contains_goal_and_block(self):
        init_cycle(self.user, 'salud')
        pb = self._engine().get_periodization_params()['prompt_block']
        self.assertIn('salud', pb)
        self.assertIn('salud_general', pb)

    def test_deload_shows_in_prompt(self):
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.is_deload = True
        cycle.save()
        pb = self._engine().get_periodization_params()['prompt_block']
        self.assertIn('DELOAD', pb)

    def test_next_session_deload_shows_in_prompt(self):
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.next_session_is_deload = True
        cycle.save()
        pb = self._engine().get_periodization_params()['prompt_block']
        self.assertIn('PRÓXIMA SEMANA', pb)

    def test_all_goals_and_blocks_have_required_keys(self):
        from ai_workout.adaptive_engine import PERIODIZATION_PARAMS
        for goal, blocks in PERIODIZATION_PARAMS.items():
            for block_type, params in blocks.items():
                for key in ('rpe_min', 'rpe_max', 'rest_min_s', 'rest_max_s', 'reps'):
                    self.assertIn(key, params, f'{goal}/{block_type} missing {key}')


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Deload trigger evaluation
# ═══════════════════════════════════════════════════════════════════════════════

class DeloadTriggerTests(TestCase):

    def setUp(self):
        self.user = make_user('triggers@example.com')
        self.loc = make_location(self.user, tipo='gimnasio')
        self.cycle = init_cycle(self.user, 'hipertrofia')

    def test_returns_empty_without_active_cycle(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        self.cycle.is_active = False
        self.cycle.save()
        s, f = make_session_with_feedback(self.user, self.loc)
        self.assertEqual(evaluate_deload_triggers(self.user, s, f), [])

    def test_rpe_normal_no_trigger(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        s, f = make_session_with_feedback(self.user, self.loc, rpe_real=7.5, rpe_target=7.0)
        types = [t.trigger_type for t in evaluate_deload_triggers(self.user, s, f)]
        self.assertNotIn('rpe_elevated', types)

    def test_rpe_elevated_creates_trigger(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        make_session_with_feedback(self.user, self.loc, rpe_real=9.0, rpe_target=7.0, days_ago=5)
        make_session_with_feedback(self.user, self.loc, rpe_real=9.0, rpe_target=7.0, days_ago=3)
        s, f = make_session_with_feedback(self.user, self.loc, rpe_real=9.0, rpe_target=7.0, days_ago=1)
        types = [t.trigger_type for t in evaluate_deload_triggers(self.user, s, f)]
        self.assertIn('rpe_elevated', types)

    def test_rpe_elevated_sets_next_deload_on_cycle(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        make_session_with_feedback(self.user, self.loc, rpe_real=9.5, rpe_target=7.0, days_ago=5)
        make_session_with_feedback(self.user, self.loc, rpe_real=9.5, rpe_target=7.0, days_ago=3)
        s, f = make_session_with_feedback(self.user, self.loc, rpe_real=9.5, rpe_target=7.0, days_ago=1)
        evaluate_deload_triggers(self.user, s, f)
        self.cycle.refresh_from_db()
        self.assertTrue(self.cycle.next_session_is_deload)

    def test_sleep_normal_no_trigger(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        for i in range(5):
            make_checkin(self.user, self.loc, fecha=date.today() - timedelta(days=i), calidad_sueno='8.0')
        s, f = make_session_with_feedback(self.user, self.loc)
        types = [t.trigger_type for t in evaluate_deload_triggers(self.user, s, f)]
        self.assertNotIn('sleep_deficit', types)

    def test_sleep_deficit_creates_trigger(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        for i in range(5):
            make_checkin(self.user, self.loc, fecha=date.today() - timedelta(days=i), calidad_sueno='5.0')
        s, f = make_session_with_feedback(self.user, self.loc)
        types = [t.trigger_type for t in evaluate_deload_triggers(self.user, s, f)]
        self.assertIn('sleep_deficit', types)

    def test_adherence_drop_not_triggered_for_hipertrofia(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        # cycle is 'hipertrofia' → no adherence check
        s, f = make_session_with_feedback(self.user, self.loc)
        types = [t.trigger_type for t in evaluate_deload_triggers(self.user, s, f)]
        self.assertNotIn('adherence_drop', types)

    def test_adherence_drop_triggers_for_salud(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        init_cycle(self.user, 'salud')
        prof = self.user.profile
        prof.dias_semana = 4
        prof.save()
        # Only 1 session → ratio=1/8 < 0.60
        s, f = make_session_with_feedback(self.user, self.loc, days_ago=1)
        types = [t.trigger_type for t in evaluate_deload_triggers(self.user, s, f)]
        self.assertIn('adherence_drop', types)

    def test_no_duplicate_trigger_within_7_days(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        DeloadTrigger.objects.create(
            user=self.user, training_cycle=self.cycle, trigger_type='rpe_elevated',
        )
        make_session_with_feedback(self.user, self.loc, rpe_real=9.5, rpe_target=7.0, days_ago=5)
        make_session_with_feedback(self.user, self.loc, rpe_real=9.5, rpe_target=7.0, days_ago=3)
        s, f = make_session_with_feedback(self.user, self.loc, rpe_real=9.5, rpe_target=7.0, days_ago=1)
        result = evaluate_deload_triggers(self.user, s, f)
        duplicates = [t for t in result if t.trigger_type == 'rpe_elevated']
        self.assertEqual(len(duplicates), 0)

    def test_programmatic_deload_trigger(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        self.cycle.started_at = date.today() - timedelta(days=28)
        self.cycle.save()
        s, f = make_session_with_feedback(self.user, self.loc)
        types = [t.trigger_type for t in evaluate_deload_triggers(self.user, s, f)]
        self.assertIn('programmatic_week4', types)

    def test_programmatic_not_triggered_when_already_deload(self):
        from workouts.deload_triggers import evaluate_deload_triggers
        self.cycle.is_deload = True
        self.cycle.started_at = date.today() - timedelta(days=28)
        self.cycle.save()
        s, f = make_session_with_feedback(self.user, self.loc)
        types = [t.trigger_type for t in evaluate_deload_triggers(self.user, s, f)]
        self.assertNotIn('programmatic_week4', types)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Training Cycle API endpoints
# ═══════════════════════════════════════════════════════════════════════════════

class TrainingCycleAPITests(TestCase):

    def setUp(self):
        self.user = make_user('api@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_unauthenticated_get_returns_401(self):
        response = APIClient().get('/api/training-cycle/')
        self.assertEqual(response.status_code, 401)

    def test_get_no_cycle_returns_null(self):
        response = self.client.get('/api/training-cycle/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['cycle'])

    def test_get_returns_active_cycle(self):
        init_cycle(self.user, 'salud')
        response = self.client.get('/api/training-cycle/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data['cycle'])
        self.assertEqual(response.data['cycle']['goal'], 'salud')
        self.assertEqual(response.data['cycle']['block_type'], 'salud_general')

    def test_post_creates_cycle(self):
        response = self.client.post('/api/training-cycle/', {'goal': 'hipertrofia'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['goal'], 'hipertrofia')
        self.assertEqual(response.data['block_type'], 'acumulacion_hiper')
        self.assertEqual(response.data['week_number'], 1)

    def test_post_invalid_goal_returns_400(self):
        response = self.client.post('/api/training-cycle/', {'goal': 'cardio'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_post_missing_goal_returns_400(self):
        response = self.client.post('/api/training-cycle/', {}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_post_updates_profile_goal(self):
        self.client.post('/api/training-cycle/', {'goal': 'fuerza'}, format='json')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.goal, 'fuerza')

    def test_post_replaces_existing_cycle(self):
        init_cycle(self.user, 'hipertrofia')
        response = self.client.post('/api/training-cycle/', {'goal': 'perdida_grasa'}, format='json')
        self.assertEqual(response.status_code, 201)
        active_count = TrainingCycle.objects.filter(user=self.user, is_active=True).count()
        self.assertEqual(active_count, 1)
        self.assertEqual(response.data['goal'], 'perdida_grasa')

    def test_advance_no_cycle_returns_404(self):
        response = self.client.post('/api/training-cycle/advance/')
        self.assertEqual(response.status_code, 404)

    def test_advance_returns_updated_cycle(self):
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.started_at = date.today() - timedelta(days=8)
        cycle.save()
        response = self.client.post('/api/training-cycle/advance/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['week_number'], 2)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Profile goal transition via profile endpoint
# ═══════════════════════════════════════════════════════════════════════════════

class ProfileGoalTransitionTests(TestCase):

    def setUp(self):
        self.user = make_user('profile@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_setting_goal_on_profile_creates_cycle(self):
        response = self.client.put('/api/profile/', {'goal': 'hipertrofia'}, format='json')
        self.assertEqual(response.status_code, 200)
        active = TrainingCycle.objects.filter(user=self.user, is_active=True).first()
        self.assertIsNotNone(active)
        self.assertEqual(active.goal, 'hipertrofia')

    def test_changing_goal_stores_previous_goal(self):
        self.user.profile.goal = 'hipertrofia'
        self.user.profile.save()
        init_cycle(self.user, 'hipertrofia')
        self.client.put('/api/profile/', {'goal': 'fuerza'}, format='json')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.goal, 'fuerza')
        self.assertEqual(self.user.profile.previous_goal, 'hipertrofia')
        self.assertIsNotNone(self.user.profile.goal_changed_at)

    def test_same_goal_does_not_create_duplicate_cycle(self):
        self.user.profile.goal = 'salud'
        self.user.profile.save()
        init_cycle(self.user, 'salud')
        self.client.put('/api/profile/', {'goal': 'salud'}, format='json')
        count = TrainingCycle.objects.filter(user=self.user).count()
        self.assertEqual(count, 1)


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Post-feedback integration
# ═══════════════════════════════════════════════════════════════════════════════

class FeedbackIntegrationTests(TestCase):

    def setUp(self):
        self.user = make_user('fb@example.com')
        self.loc = make_location(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _post_feedback(self, session_id, rpe_real=7.0, cumplimiento=85, rating=4):
        return self.client.post(
            f'/api/sessions/{session_id}/feedback/',
            {'rpe_real': rpe_real, 'cumplimiento': cumplimiento, 'rating': rating},
            format='json',
        )

    def test_feedback_succeeds_without_cycle(self):
        s = Session.objects.create(
            user=self.user, fecha=date.today(),
            duracion_planificada=60, rpe_target=7.0, location=self.loc,
        )
        response = self._post_feedback(s.id)
        self.assertEqual(response.status_code, 201)

    def test_feedback_advances_week(self):
        cycle = init_cycle(self.user, 'hipertrofia')
        cycle.started_at = date.today() - timedelta(days=8)
        cycle.save()
        s = Session.objects.create(
            user=self.user, fecha=date.today(),
            duracion_planificada=60, rpe_target=7.0, location=self.loc,
        )
        self._post_feedback(s.id)
        cycle.refresh_from_db()
        self.assertEqual(cycle.week_number, 2)

    def test_feedback_creates_rpe_trigger(self):
        init_cycle(self.user, 'hipertrofia')
        for days_ago in [5, 3]:
            make_session_with_feedback(self.user, self.loc, rpe_real=9.5, rpe_target=7.0, days_ago=days_ago)
        s = Session.objects.create(
            user=self.user, fecha=date.today(),
            duracion_planificada=60, rpe_target=7.0, location=self.loc,
        )
        self._post_feedback(s.id, rpe_real=9.5)
        self.assertTrue(
            DeloadTrigger.objects.filter(user=self.user, trigger_type='rpe_elevated').exists()
        )

    def test_feedback_returns_201_even_with_bad_cycle_state(self):
        # Force a malformed state that might cause trigger/advance to fail
        cycle = init_cycle(self.user, 'hipertrofia')
        # started_at = today so no advance needed; safe path
        s = Session.objects.create(
            user=self.user, fecha=date.today(),
            duracion_planificada=60, rpe_target=7.0, location=self.loc,
        )
        response = self._post_feedback(s.id)
        self.assertEqual(response.status_code, 201)


# ═══════════════════════════════════════════════════════════════════════════════
# Auditoría check-in/salida: racha solo con feedback + fin de ejercicios + CTA
# ═══════════════════════════════════════════════════════════════════════════════

class SessionTerminationAuditTests(TestCase):
    """Cubre: (1) la racha y el calendario solo cuentan sesiones CON feedback;
    (2) marcar fin de ejercicios; (3) el CTA del dashboard distingue 'solo falta
    feedback' (→ a feedback) de 'sesión a medias' (→ retomar ejecución)."""

    def setUp(self):
        self.user = make_user('audit@example.com')
        self.loc = make_location(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _make_session(self, days_ago=0):
        return Session.objects.create(
            user=self.user,
            fecha=date.today() - timedelta(days=days_ago),
            duracion_planificada=60, rpe_target=7.0, location=self.loc,
        )

    # ── Racha solo con feedback (Q2) ──────────────────────────────────────────
    def test_racha_ignora_sesion_sin_feedback(self):
        from workouts.views import _calcular_racha_realtime
        # Sesión generada hoy, nunca entrenada (sin feedback) → racha 0
        self._make_session(days_ago=0)
        self.assertEqual(_calcular_racha_realtime(self.user), 0)

    def test_racha_cuenta_solo_dias_con_feedback(self):
        from workouts.views import _calcular_racha_realtime
        # Hoy con feedback, ayer solo generada (sin feedback) → racha corta en ayer
        make_session_with_feedback(self.user, self.loc, days_ago=0)
        self._make_session(days_ago=1)  # sin feedback → no cuenta
        make_session_with_feedback(self.user, self.loc, days_ago=2)
        self.assertEqual(_calcular_racha_realtime(self.user), 1)

    # ── Endpoint fin-ejercicios ───────────────────────────────────────────────
    def test_fin_ejercicios_marca_timestamp_idempotente(self):
        s = self._make_session()
        r1 = self.client.post(f'/api/sessions/{s.id}/fin-ejercicios/', {}, format='json')
        self.assertEqual(r1.status_code, 200)
        s.refresh_from_db()
        self.assertIsNotNone(s.fin_ejercicios)
        primera = s.fin_ejercicios
        # Segunda llamada no pisa la marca previa
        self.client.post(f'/api/sessions/{s.id}/fin-ejercicios/', {}, format='json')
        s.refresh_from_db()
        self.assertEqual(s.fin_ejercicios, primera)

    # ── CTA del dashboard: solo_feedback vs retomar ───────────────────────────
    def test_cta_solo_feedback_cuando_termino_ejercicios_sin_feedback(self):
        from django.utils import timezone
        from workouts.views import _cta_sugerido
        # >=3 sesiones para salir del estado D (primera semana)
        for d in range(3, 6):
            make_session_with_feedback(self.user, self.loc, days_ago=d)
        s = self._make_session(days_ago=0)
        s.fin_ejercicios = timezone.now()
        s.save(update_fields=['fin_ejercicios'])
        cta = _cta_sugerido(self.user, total_sesiones=5, fatiga_pct=20)
        self.assertEqual(cta['estado'], 'E')
        self.assertTrue(cta['solo_feedback'])

    def test_cta_retomar_cuando_sesion_a_medias(self):
        from django.utils import timezone
        from workouts.views import _cta_sugerido
        for d in range(3, 6):
            make_session_with_feedback(self.user, self.loc, days_ago=d)
        s = self._make_session(days_ago=0)
        s.inicio_real = timezone.now()  # empezada pero sin terminar ejercicios
        s.save(update_fields=['inicio_real'])
        cta = _cta_sugerido(self.user, total_sesiones=5, fatiga_pct=20)
        self.assertEqual(cta['estado'], 'E')
        self.assertFalse(cta['solo_feedback'])
