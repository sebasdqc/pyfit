"""Tests del CRUD de RideSession (/api/rides/) — espejo reducido de
runs/tests.py::RunSessionAPITests/RunFeedbackEndpointTests. Sin las pruebas
de cálculo de métricas desde GPS (no hay RidePoint todavía): en su lugar se
prueba que las métricas agregadas las persiste el CLIENTE al completar."""
from datetime import datetime, timezone, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import RideSession

User = get_user_model()
NOW = datetime(2026, 6, 1, 10, 0, 0, tzinfo=timezone.utc)


def make_user(email='cyclist@test.com'):
    return User.objects.create_user(username=email, email=email, password='test1234')


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def iso(dt):
    return dt.isoformat().replace('+00:00', 'Z')


class RideSessionCreateListTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = auth_client(self.user)

    def test_create_session(self):
        res = self.client.post('/api/rides/', {'started_at': iso(NOW)}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['session_type'], 'free')      # default
        session = RideSession.objects.get(pk=res.data['id'])
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.status, 'active')

    def test_list_returns_only_own_sessions(self):
        other = make_user('other@test.com')
        RideSession.objects.create(user=other, started_at=NOW)
        RideSession.objects.create(user=self.user, started_at=NOW)
        res = self.client.get('/api/rides/')
        self.assertEqual(res.status_code, 200)
        ids = [r['id'] for r in res.data['results']]
        self.assertEqual(len(ids), 1)
        self.assertEqual(RideSession.objects.get(pk=ids[0]).user, self.user)

    def test_list_is_paginated(self):
        for _ in range(3):
            RideSession.objects.create(user=self.user, started_at=NOW)
        res = self.client.get('/api/rides/')
        self.assertIn('results', res.data)
        self.assertIn('count', res.data)
        self.assertEqual(res.data['count'], 3)

    def test_unauthenticated_returns_401(self):
        res = APIClient().post('/api/rides/', {'started_at': iso(NOW)}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_list_filters_por_desde(self):
        RideSession.objects.create(user=self.user, started_at=NOW - timedelta(days=10))
        RideSession.objects.create(user=self.user, started_at=NOW)
        res = self.client.get(f'/api/rides/?desde={NOW.date().isoformat()}')
        self.assertEqual(res.data['count'], 1)


class RideSessionCompleteTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = auth_client(self.user)
        self.session = RideSession.objects.create(user=self.user, started_at=NOW)

    def test_complete_persiste_metricas_del_cliente(self):
        # Sin GPS: las métricas las manda el cliente (potenciómetro/pulsómetro
        # propios), no se derivan de una traza.
        res = self.client.patch(f'/api/rides/{self.session.pk}/', {
            'status': 'completed',
            'ended_at': iso(NOW + timedelta(hours=1, minutes=30)),
            'avg_power_w': 210,
            'normalized_power_w': 225,
            'avg_cadence_rpm': 88,
            'avg_heart_rate': 152,
            'total_distance_m': 42000,
            'elevation_gain_m': 380,
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, 'completed')
        self.assertEqual(self.session.avg_power_w, 210)
        self.assertEqual(self.session.avg_cadence_rpm, 88)
        self.assertEqual(self.session.total_distance_m, 42000)

    def test_complete_calcula_duracion_server_side(self):
        # total_duration_s NO se acepta del cliente — siempre se recalcula.
        res = self.client.patch(f'/api/rides/{self.session.pk}/', {
            'status': 'completed',
            'ended_at': iso(NOW + timedelta(hours=1)),
            'total_duration_s': 999999,   # el cliente intenta mandarlo — se ignora
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.total_duration_s, 3600)

    def test_complete_sin_potenciometro_metricas_quedan_none(self):
        # El caso más común: sin potenciómetro, solo FC y duración.
        res = self.client.patch(f'/api/rides/{self.session.pk}/', {
            'status': 'completed',
            'ended_at': iso(NOW + timedelta(minutes=45)),
            'avg_heart_rate': 148,
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.session.refresh_from_db()
        self.assertIsNone(self.session.avg_power_w)
        self.assertEqual(self.session.avg_heart_rate, 148)

    def test_complete_without_ended_at_returns_400(self):
        res = self.client.patch(f'/api/rides/{self.session.pk}/',
                                {'status': 'completed'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_complete_with_ended_before_started_returns_400(self):
        res = self.client.patch(f'/api/rides/{self.session.pk}/', {
            'status': 'completed', 'ended_at': iso(NOW - timedelta(hours=1)),
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_cannot_access_other_users_session(self):
        other = make_user('other2@test.com')
        other_client = auth_client(other)
        res = other_client.patch(f'/api/rides/{self.session.pk}/',
                                 {'status': 'completed', 'ended_at': iso(NOW + timedelta(hours=1))},
                                 format='json')
        self.assertEqual(res.status_code, 404)

    def test_get_detail(self):
        res = self.client.get(f'/api/rides/{self.session.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['id'], self.session.pk)
        self.assertIsNone(res.data['planned'])   # free ride, no vinculada


class RideFeedbackEndpointTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = auth_client(self.user)
        self.session = RideSession.objects.create(
            user=self.user, started_at=NOW, ended_at=NOW + timedelta(hours=1),
            status='completed')

    def test_post_feedback_saves_all_fields(self):
        res = self.client.post(f'/api/rides/{self.session.pk}/feedback/', {
            'rpe_real': 7, 'rating': 4, 'cumplimiento': 90,
            'molestias': ['rodilla'], 'feedback_notas': 'Buena sensación',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.rpe_real, 7)
        self.assertEqual(self.session.molestias, ['rodilla'])
        self.assertIsNotNone(self.session.feedback_at)

    def test_partial_feedback_is_allowed(self):
        res = self.client.post(f'/api/rides/{self.session.pk}/feedback/',
                               {'rpe_real': 6}, format='json')
        self.assertEqual(res.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.rpe_real, 6)

    def test_out_of_range_values_rejected(self):
        res = self.client.post(f'/api/rides/{self.session.pk}/feedback/',
                               {'rpe_real': 11}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_molestias_must_be_string_list(self):
        res = self.client.post(f'/api/rides/{self.session.pk}/feedback/',
                               {'molestias': 'no es lista'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_reenviar_sobreescribe_feedback_previo(self):
        self.client.post(f'/api/rides/{self.session.pk}/feedback/',
                         {'rpe_real': 5}, format='json')
        self.client.post(f'/api/rides/{self.session.pk}/feedback/',
                         {'rpe_real': 8}, format='json')
        self.session.refresh_from_db()
        self.assertEqual(self.session.rpe_real, 8)

    def test_other_user_cannot_submit_feedback(self):
        other = make_user('other3@test.com')
        other_client = auth_client(other)
        res = other_client.post(f'/api/rides/{self.session.pk}/feedback/',
                                {'rpe_real': 5}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_unauthenticated_rejected(self):
        res = APIClient().post(f'/api/rides/{self.session.pk}/feedback/',
                               {'rpe_real': 5}, format='json')
        self.assertEqual(res.status_code, 401)


class RideCompletePlannedIntegrationTests(TestCase):
    """Confirma que la vinculación con ai_cycling.complete_planned (Fase
    motor+endpoints) sigue funcionando con el CRUD real ahora disponible —
    antes ride_session_id era opcional porque no había forma de crear una
    RideSession real; ahora sí la hay."""
    def setUp(self):
        self.user = make_user()
        self.client = auth_client(self.user)

    def test_crear_completar_y_vincular_a_planned_ride(self):
        from cycling.models import RidePlan, PlannedRide
        plan = RidePlan.objects.create(user=self.user, started_at=NOW.date(), week_start=NOW.date())
        planned = PlannedRide.objects.create(
            user=self.user, plan=plan, fecha=NOW.date(), tipo_sesion='easy')

        create_res = self.client.post('/api/rides/', {'started_at': iso(NOW)}, format='json')
        ride_id = create_res.data['id']
        self.client.patch(f'/api/rides/{ride_id}/', {
            'status': 'completed', 'ended_at': iso(NOW + timedelta(hours=1)),
        }, format='json')

        complete_res = self.client.post(f'/api/cycling/sessions/{planned.pk}/complete/',
                                        {'ride_session_id': ride_id}, format='json')
        self.assertEqual(complete_res.status_code, 200)
        self.assertEqual(complete_res.data['estado'], 'completada')
