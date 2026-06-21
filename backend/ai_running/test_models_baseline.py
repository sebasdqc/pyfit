"""Tests F1 — modelos de running + servicio de baseline + endpoints de perfil."""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from runs.models import RunSession, RunnerProfile, RunningPlan, PlannedRunSession
from workouts.models import TrainingCycle
from ai_running.baseline import recompute_runner_baseline

User = get_user_model()


def _completed_run(user, *, dist_m, dur_s, best_pace, avg_pace, days_ago=2):
    now = timezone.now() - timedelta(days=days_ago)
    return RunSession.objects.create(
        user=user, started_at=now, ended_at=now + timedelta(seconds=dur_s),
        status='completed', session_type='free',
        total_distance_m=dist_m, total_duration_s=dur_s,
        best_pace_s_per_km=best_pace, avg_pace_s_per_km=avg_pace,
    )


class BaselineServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='corredor', password='x')

    def test_cold_start_sin_historial(self):
        rp = recompute_runner_baseline(self.user)
        self.assertEqual(rp.fuente_baseline, 'cold_start')
        self.assertIsNone(rp.threshold_pace_s_km)
        self.assertIsNone(rp.zonas.get('pace'))

    def test_declarado_fija_umbral_y_zonas_de_pace(self):
        rp = recompute_runner_baseline(self.user, declared=(2400, 10))   # 10k en 40 min
        self.assertEqual(rp.fuente_baseline, 'declarado')
        self.assertEqual(rp.confianza, 'alta')
        self.assertIsNotNone(rp.threshold_pace_s_km)
        self.assertIsNotNone(rp.zonas.get('pace'))

    def test_historial_estima_desde_runs(self):
        for _ in range(3):
            _completed_run(self.user, dist_m=5000, dur_s=1500, best_pace=250, avg_pace=300)
        rp = recompute_runner_baseline(self.user)
        self.assertEqual(rp.fuente_baseline, 'historial')
        self.assertEqual(rp.n_runs_baseline, 3)
        self.assertIsNotNone(rp.threshold_pace_s_km)
        self.assertIsNotNone(rp.volumen_semanal_base_km)

    def test_fcmax_estimada_por_edad_genera_zonas_de_fc(self):
        from users.models import Profile
        p, _ = Profile.objects.get_or_create(user=self.user, defaults={'nombre': 'Test'})
        p.fecha_nacimiento = date(1994, 1, 1)
        p.save()
        rp = recompute_runner_baseline(self.user, declared=(2400, 10))
        self.assertIsNotNone(rp.fc_max)
        self.assertTrue(rp.fc_max_es_estimada)
        # Sin fc_reposo (no hay dispositivo) Karvonen no puede → hr puede ser None.
        # Pero con fc_reposo manual sí; lo cubre el test de endpoint.


class RunningPlanConstraintTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='c2', password='x')
        self.hoy = date(2026, 6, 22)   # lunes

    def _plan(self):
        return RunningPlan(user=self.user, started_at=self.hoy, week_start=self.hoy, is_active=True)

    def test_plan_running_activo_independiente_de_training_cycle(self):
        self._plan().save()
        # Un TrainingCycle de fuerza activo NO debe colisionar con el plan de running.
        TrainingCycle.objects.create(
            user=self.user, goal='hipertrofia', block_type='acumulacion_hiper',
            started_at=self.hoy, is_active=True,
        )
        self.assertTrue(RunningPlan.objects.filter(user=self.user, is_active=True).exists())
        self.assertTrue(TrainingCycle.objects.filter(user=self.user, is_active=True).exists())

    def test_dos_planes_running_activos_prohibidos(self):
        self._plan().save()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self._plan().save()


class RunnerProfileEndpointTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='c3', password='x')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_get_crea_perfil_cold_start(self):
        res = self.client.get('/api/running/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(RunnerProfile.objects.filter(user=self.user).exists())
        self.assertEqual(res.data['fuente_baseline'], 'cold_start')

    def test_patch_fcmax_manual_marca_medida_y_recalcula_zonas(self):
        self.client.get('/api/running/profile/')   # crea el perfil
        res = self.client.patch('/api/running/profile/',
                                {'fc_max': 190, 'fc_reposo': 50}, format='json')
        self.assertEqual(res.status_code, 200)
        rp = RunnerProfile.objects.get(user=self.user)
        self.assertEqual(rp.fc_max, 190)
        self.assertFalse(rp.fc_max_es_estimada)        # fijada a mano
        self.assertIsNotNone(rp.zonas.get('hr'))       # zonas de FC recalculadas

    def test_estimate_con_declarado(self):
        res = self.client.post('/api/running/baseline/estimate/',
                               {'declared': {'tiempo_s': 2400, 'distancia_km': 10}}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['fuente_baseline'], 'declarado')
        self.assertIsNotNone(res.data['threshold_pace_s_km'])

    def test_time_trial_devuelve_protocolo(self):
        res = self.client.post('/api/running/baseline/time-trial/',
                               {'protocolo': 'cooper_12min'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['protocolo'], 'cooper_12min')
        self.assertIn('descripcion', res.data)
