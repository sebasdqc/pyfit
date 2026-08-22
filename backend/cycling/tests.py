"""Tests de modelos de cycling/ — Fase 3 del plan running+ciclismo.
Sin vistas/serializers todavía (eso no es parte de esta fase): cubre
constraints, unicidad y comportamiento de campos de los 4 modelos."""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone as tz

from workouts.models import Competition

from .models import CyclistProfile, PlannedRide, RidePlan, RideSession

User = get_user_model()
NOW = tz.now()
MONDAY = date(2026, 6, 22)


def make_user(username='cyclist@test.com'):
    return User.objects.create_user(username=username, password='x')


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
