from datetime import datetime, timezone, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import RunSession, RunPoint
from .serializers import haversine_distance

User = get_user_model()


def make_user(email='runner@test.com'):
    return User.objects.create_user(username=email, email=email, password='test1234')


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def iso(dt):
    return dt.isoformat().replace('+00:00', 'Z')


NOW = datetime(2024, 6, 1, 10, 0, 0, tzinfo=timezone.utc)


class HaversineTests(TestCase):
    def test_same_point_is_zero(self):
        self.assertAlmostEqual(haversine_distance(0, 0, 0, 0), 0)

    def test_known_distance(self):
        # Madrid → Barcelona ≈ 505 km
        d = haversine_distance(40.4168, -3.7038, 41.3851, 2.1734)
        self.assertGreater(d, 500_000)
        self.assertLess(d, 510_000)

    def test_short_distance(self):
        # ~111 m north
        d = haversine_distance(0.0, 0.0, 0.001, 0.0)
        self.assertAlmostEqual(d, 111.2, delta=1)


class RunSessionAPITests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = auth_client(self.user)

    def test_create_session(self):
        res = self.client.post('/api/runs/', {
            'started_at': iso(NOW),
            'session_type': 'free',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['session_type'], 'free')
        session = RunSession.objects.get(user=self.user)
        self.assertEqual(session.status, 'active')

    def test_list_returns_only_own_sessions(self):
        other = make_user('other@test.com')
        RunSession.objects.create(user=other, started_at=NOW, status='active')
        RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        res = self.client.get('/api/runs/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_unauthenticated_returns_401(self):
        res = APIClient().get('/api/runs/')
        self.assertEqual(res.status_code, 401)

    def test_complete_session_calculates_metrics(self):
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        # Add GPS points ~100 m apart, accuracy <= 20 m
        t = NOW
        points = []
        for i in range(5):
            points.append(RunPoint(
                session=session,
                lat=40.4168 + i * 0.0009,   # ~100 m steps north
                lng=-3.7038,
                altitude_m=600.0,
                accuracy_m=10.0,
                timestamp=t + timedelta(seconds=i * 60),
                speed_m_s=1.6,
            ))
        RunPoint.objects.bulk_create(points)

        ended = NOW + timedelta(minutes=4)
        res = self.client.patch(f'/api/runs/{session.pk}/', {
            'status': 'completed',
            'ended_at': iso(ended),
        }, format='json')
        self.assertEqual(res.status_code, 200)
        session.refresh_from_db()
        self.assertEqual(session.status, 'completed')
        self.assertGreater(session.total_distance_m, 0)
        self.assertGreater(session.avg_pace_s_per_km, 0)

    def test_complete_without_ended_at_returns_400(self):
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        res = self.client.patch(f'/api/runs/{session.pk}/', {
            'status': 'completed',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_get_detail_returns_points(self):
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        RunPoint.objects.create(
            session=session, lat=40.0, lng=-3.0,
            accuracy_m=5.0, timestamp=NOW, speed_m_s=2.0,
        )
        res = self.client.get(f'/api/runs/{session.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['points']), 1)

    def test_cannot_access_other_users_session(self):
        other = make_user('other2@test.com')
        session = RunSession.objects.create(user=other, started_at=NOW, status='active')
        res = self.client.get(f'/api/runs/{session.pk}/')
        self.assertEqual(res.status_code, 404)


class RunPointsAPITests(TestCase):
    def setUp(self):
        self.user = make_user('points@test.com')
        self.client = auth_client(self.user)
        self.session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')

    def test_add_points_saves_batch(self):
        payload = {'points': [
            {'lat': 40.4168, 'lng': -3.7038, 'altitude_m': 600, 'accuracy_m': 10,
             'timestamp': iso(NOW), 'speed_m_s': 2.5},
            {'lat': 40.4170, 'lng': -3.7040, 'altitude_m': 601, 'accuracy_m': 8,
             'timestamp': iso(NOW + timedelta(seconds=2)), 'speed_m_s': 2.4},
        ]}
        res = self.client.post(f'/api/runs/{self.session.pk}/points/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['saved'], 2)
        self.assertEqual(RunPoint.objects.filter(session=self.session).count(), 2)

    def test_add_points_to_completed_session_returns_400(self):
        self.session.status = 'completed'
        self.session.save()
        payload = {'points': [
            {'lat': 40.4168, 'lng': -3.7038, 'altitude_m': 600, 'accuracy_m': 10,
             'timestamp': iso(NOW), 'speed_m_s': 2.5},
        ]}
        res = self.client.post(f'/api/runs/{self.session.pk}/points/', payload, format='json')
        self.assertEqual(res.status_code, 400)

    def test_add_points_invalid_data_returns_400(self):
        payload = {'points': [{'lat': 'bad', 'lng': -3.7038, 'accuracy_m': 10, 'timestamp': iso(NOW)}]}
        res = self.client.post(f'/api/runs/{self.session.pk}/points/', payload, format='json')
        self.assertEqual(res.status_code, 400)

    def test_cannot_add_points_to_other_users_session(self):
        other = make_user('other3@test.com')
        other_session = RunSession.objects.create(user=other, started_at=NOW, status='active')
        payload = {'points': [
            {'lat': 40.4168, 'lng': -3.7038, 'altitude_m': 600, 'accuracy_m': 10,
             'timestamp': iso(NOW), 'speed_m_s': 2.5},
        ]}
        res = self.client.post(f'/api/runs/{other_session.pk}/points/', payload, format='json')
        self.assertEqual(res.status_code, 404)
