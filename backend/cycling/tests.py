"""Tests de modelos y API de cycling/ — Fase 3 del plan running+ciclismo, más
la robustez de datos agregada después (índices/constraints/atomicidad,
mismo patrón que runs/tests.py)."""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone as tz
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from workouts.models import Competition

from .models import CyclistProfile, CyclistTypeProfile, PlannedRide, RidePlan, RideSession

User = get_user_model()
NOW = tz.now()
MONDAY = date(2026, 6, 22)


def make_user(username='cyclist@test.com'):
    return User.objects.create_user(username=username, email=username, password='x')


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def iso(dt):
    return dt.isoformat().replace('+00:00', 'Z')


class RideSessionConstraintTests(TestCase):
    def setUp(self):
        self.user = make_user('constraints@test.com')

    def test_ended_before_started_is_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RideSession.objects.create(
                    user=self.user, started_at=NOW,
                    ended_at=NOW - timedelta(hours=1), status='active',
                )

    def test_completed_without_ended_at_is_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RideSession.objects.create(user=self.user, started_at=NOW, status='completed')

    def test_valid_completed_session_is_allowed(self):
        session = RideSession.objects.create(
            user=self.user, started_at=NOW, ended_at=NOW + timedelta(hours=1),
            status='completed',
        )
        self.assertEqual(session.status, 'completed')

    def test_potencia_y_cadencia_son_opcionales(self):
        # El caso ESPERADO: sin potenciómetro, avg_power_w/normalized_power_w
        # quedan None y la sesión sigue siendo válida — ancla FC+RPE.
        session = RideSession.objects.create(user=self.user, started_at=NOW)
        self.assertIsNone(session.avg_power_w)
        self.assertIsNone(session.normalized_power_w)
        self.assertIsNone(session.avg_cadence_rpm)

    def test_negative_distance_rejected_at_db_level(self):
        """Antes solo el serializer de feedback validaba rangos — mismo fix
        que runs.RunSession."""
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RideSession.objects.create(
                    user=self.user, started_at=NOW, status='active', total_distance_m=-5,
                )

    def test_rpe_real_out_of_range_rejected_at_db_level(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RideSession.objects.create(
                    user=self.user, started_at=NOW, status='active', rpe_real=11,
                )

    def test_negative_power_rejected_at_db_level(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RideSession.objects.create(
                    user=self.user, started_at=NOW, status='active', avg_power_w=-10,
                )

    def test_null_feedback_and_power_fields_are_allowed(self):
        session = RideSession.objects.create(
            user=self.user, started_at=NOW, status='active',
            rpe_real=None, avg_power_w=None,
        )
        self.assertIsNone(session.rpe_real)


class RideSessionAPITests(TestCase):
    """Fixes de robustez agregados después de la Fase 3 — mismo patrón que
    runs.RunSessionAbandonsOrphanedTests."""

    def setUp(self):
        self.user = make_user('api@test.com')
        self.client = auth_client(self.user)

    def test_create_captura_local_date_del_header(self):
        # _get_write_date solo acepta el header dentro de ±1 día de
        # date.today() (protección contra manipular racha/adherencia) —
        # usar una fecha relativa, no un literal que expira con el tiempo.
        ayer = date.today() - timedelta(days=1)
        res = self.client.post(
            '/api/rides/', {'started_at': iso(NOW), 'session_type': 'free'},
            format='json', HTTP_X_LOCAL_DATE=ayer.isoformat(),
        )
        self.assertEqual(res.status_code, 201)
        ride = RideSession.objects.get(pk=res.data['id'])
        self.assertEqual(ride.local_date, ayer)

    def test_starting_new_session_abandons_prior_active_ones(self):
        old_active = RideSession.objects.create(user=self.user, started_at=NOW, status='active')
        old_paused = RideSession.objects.create(
            user=self.user, started_at=NOW - timedelta(hours=1), status='paused')
        res = self.client.post(
            '/api/rides/', {'started_at': iso(NOW + timedelta(minutes=5)), 'session_type': 'free'},
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        old_active.refresh_from_db()
        old_paused.refresh_from_db()
        self.assertEqual(old_active.status, 'abandoned')
        self.assertEqual(old_paused.status, 'abandoned')

    def test_does_not_touch_other_users_sessions(self):
        other = make_user('other_api@test.com')
        other_active = RideSession.objects.create(user=other, started_at=NOW, status='active')
        self.client.post(
            '/api/rides/', {'started_at': iso(NOW + timedelta(minutes=5)), 'session_type': 'free'},
            format='json',
        )
        other_active.refresh_from_db()
        self.assertEqual(other_active.status, 'active')

    def test_feedback_actualiza_cyclist_type_profile(self):
        """Mismo patrón que runs — el feedback de una salida vinculada a un
        PlannedRide alimenta el promedio de RPE/cumplimiento POR TIPO, que
        luego sesga la próxima prescripción de ese tipo (power_bias_from_profile)."""
        plan = RidePlan.objects.create(user=self.user, started_at=date.today(),
                                       week_start=date.today())
        ride = RideSession.objects.create(user=self.user, started_at=NOW)
        PlannedRide.objects.create(
            user=self.user, plan=plan, fecha=date.today(), tipo_sesion='sweet_spot',
            ride_session=ride, rpe_target=6,
        )
        res = self.client.post(
            f'/api/rides/{ride.id}/feedback/', {'rpe_real': 7, 'cumplimiento': 90},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        ctp = CyclistTypeProfile.objects.get(user=self.user, tipo_sesion='sweet_spot')
        self.assertEqual(ctp.veces_realizado, 1)
        self.assertEqual(ctp.rpe_promedio_real, 7)
        self.assertEqual(ctp.rpe_promedio_target, 6)

    def test_feedback_de_free_ride_no_crea_type_profile(self):
        """Una salida libre sin PlannedRide vinculado no tiene tipo_sesion al
        que atribuir el feedback — se ignora a propósito, no debe fallar."""
        ride = RideSession.objects.create(user=self.user, started_at=NOW)
        res = self.client.post(
            f'/api/rides/{ride.id}/feedback/', {'rpe_real': 7}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(CyclistTypeProfile.objects.filter(user=self.user).exists())


class CyclistProfileTests(TestCase):
    def test_perfil_sin_potenciometro_es_el_caso_esperado(self):
        user = make_user('sin_potenciometro@test.com')
        perfil = CyclistProfile.objects.create(
            user=user, fthr_bpm=165, fc_max=190, fc_reposo=50,
            fc_max_es_estimada=False, fuente_baseline='test_20min', confianza='media',
        )
        self.assertIsNone(perfil.ftp_w)
        self.assertEqual(perfil.fthr_bpm, 165)
        self.assertEqual(perfil.confianza, 'media')

    def test_one_to_one_por_usuario(self):
        user = make_user('unico@test.com')
        CyclistProfile.objects.create(user=user)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CyclistProfile.objects.create(user=user)

    def test_default_cold_start(self):
        user = make_user('coldstart@test.com')
        perfil = CyclistProfile.objects.create(user=user)
        self.assertEqual(perfil.fuente_baseline, 'cold_start')
        self.assertEqual(perfil.confianza, 'baja')
        self.assertEqual(perfil.zonas, {})


class RidePlanTests(TestCase):
    def setUp(self):
        self.user = make_user('plan@test.com')

    def test_solo_un_plan_activo_por_usuario(self):
        RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY)

    def test_dos_planes_inactivos_no_chocan(self):
        RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY,
                                is_active=False)
        RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY,
                                is_active=False)
        self.assertEqual(RidePlan.objects.filter(user=self.user).count(), 2)

    def test_plan_de_ciclismo_y_de_running_conviven(self):
        # is_active de RidePlan es independiente del de RunningPlan/TrainingCycle
        # — mismo patrón que ya usa running con fuerza.
        from runs.models import RunningPlan
        RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY)
        RunningPlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY)
        self.assertTrue(RidePlan.objects.filter(user=self.user, is_active=True).exists())
        self.assertTrue(RunningPlan.objects.filter(user=self.user, is_active=True).exists())

    def test_meta_competition_vinculada(self):
        comp = Competition.objects.create(user=self.user, nombre='Gran Fondo Andes',
                                          fecha=MONDAY + timedelta(days=60))
        plan = RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY,
                                       meta_competition=comp, meta_tipo='gran_fondo')
        self.assertEqual(plan.meta_competition.nombre, 'Gran Fondo Andes')

    def test_horas_objetivo_semana_no_km(self):
        plan = RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY,
                                       horas_objetivo_semana=6.5)
        self.assertEqual(plan.horas_objetivo_semana, 6.5)


class PlannedRideTests(TestCase):
    def setUp(self):
        self.user = make_user('planned@test.com')
        self.plan = RidePlan.objects.create(user=self.user, started_at=MONDAY, week_start=MONDAY)

    def test_un_planned_ride_por_dia_por_plan(self):
        PlannedRide.objects.create(user=self.user, plan=self.plan, fecha=MONDAY,
                                   tipo_sesion='easy')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                PlannedRide.objects.create(user=self.user, plan=self.plan, fecha=MONDAY,
                                           tipo_sesion='tempo')

    def test_sin_campo_distancia_objetivo(self):
        # Ciclismo se prescribe en tiempo — a propósito no existe
        # distancia_objetivo_km (a diferencia de PlannedRunSession).
        self.assertFalse(hasattr(PlannedRide, 'distancia_objetivo_km'))

    def test_estado_default_planificada(self):
        pr = PlannedRide.objects.create(user=self.user, plan=self.plan, fecha=MONDAY,
                                        tipo_sesion='sweet_spot', es_calidad=True,
                                        zona_principal='SS')
        self.assertEqual(pr.estado, 'planificada')
        self.assertEqual(pr.zona_principal, 'SS')

    def test_se_vincula_a_ride_session_al_ejecutarse(self):
        session = RideSession.objects.create(user=self.user, started_at=tz.now())
        pr = PlannedRide.objects.create(user=self.user, plan=self.plan, fecha=MONDAY,
                                        tipo_sesion='threshold', ride_session=session)
        self.assertEqual(pr.ride_session_id, session.id)

    def test_borrar_ride_session_no_borra_el_planned_ride(self):
        session = RideSession.objects.create(user=self.user, started_at=tz.now())
        pr = PlannedRide.objects.create(user=self.user, plan=self.plan, fecha=MONDAY,
                                        tipo_sesion='threshold', ride_session=session)
        session.delete()
        pr.refresh_from_db()
        self.assertIsNone(pr.ride_session_id)
