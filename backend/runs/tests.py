from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import Profile
from checkins.models import DailyCheckin
from .models import RunSession, RunPoint
from .serializers import haversine_distance, downsample_points

User = get_user_model()


def brute_force_best_pace(points):
    """Referencia O(n²) del mejor pace en 1 km. Usa la misma distancia
    acumulada que producción para que la comparación `>= 1000` sea idéntica
    (sin discrepancias de coma flotante en el borde)."""
    n = len(points)
    cum = [0.0] * n
    for k in range(1, n):
        cum[k] = cum[k - 1] + haversine_distance(
            points[k - 1].lat, points[k - 1].lng, points[k].lat, points[k].lng
        )
    best = float('inf')
    for i in range(n):
        for j in range(i + 1, n):
            if cum[j] - cum[i] >= 1000:
                t = (points[j].timestamp - points[i].timestamp).total_seconds()
                if t < best:
                    best = t
                break
    return int(best) if best != float('inf') else 0


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


class DownsampleTests(TestCase):
    def test_returns_all_when_under_max(self):
        pts = list(range(50))
        self.assertEqual(downsample_points(pts, 500), pts)

    def test_caps_and_preserves_endpoints(self):
        pts = list(range(1000))
        out = downsample_points(pts, 100)
        self.assertEqual(len(out), 100)
        self.assertEqual(out[0], 0)
        self.assertEqual(out[-1], 999)


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
        # Respuesta paginada: { count, next, previous, results }
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(len(res.data['results']), 1)

    def test_list_is_paginated(self):
        for i in range(25):
            RunSession.objects.create(
                user=self.user, started_at=NOW + timedelta(minutes=i), status='active',
            )
        res = self.client.get('/api/runs/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 25)
        self.assertEqual(len(res.data['results']), 20)  # page_size
        self.assertIsNotNone(res.data['next'])

    def test_unauthenticated_returns_401(self):
        res = APIClient().get('/api/runs/')
        self.assertEqual(res.status_code, 401)

    def test_complete_session_calculates_metrics(self):
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        # GPS points ~16.7 m apart cada 5 s (~3.3 m/s), accuracy <= 20 m
        points = []
        for i in range(5):
            points.append(RunPoint(
                session=session,
                lat=40.4168 + i * 0.00015,
                lng=-3.7038,
                altitude_m=600.0,
                accuracy_m=10.0,
                timestamp=NOW + timedelta(seconds=i * 5),
                speed_m_s=3.3,
            ))
        RunPoint.objects.bulk_create(points)

        ended = NOW + timedelta(seconds=20)
        res = self.client.patch(f'/api/runs/{session.pk}/', {
            'status': 'completed',
            'ended_at': iso(ended),
        }, format='json')
        self.assertEqual(res.status_code, 200)
        session.refresh_from_db()
        self.assertEqual(session.status, 'completed')
        self.assertGreater(session.total_distance_m, 0)
        self.assertGreater(session.avg_pace_s_per_km, 0)

    def test_moving_duration_excludes_pauses(self):
        """La duración cuenta tiempo en movimiento, no el reloj de pared:
        un gap grande de GPS (pausa) no debe sumarse."""
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        # 5 puntos cada 3 s, una pausa de 120 s, y 5 puntos más cada 3 s.
        offsets = [0, 3, 6, 9, 12, 132, 135, 138, 141, 144]
        points = []
        for i, off in enumerate(offsets):
            points.append(RunPoint(
                session=session,
                lat=40.4168 + i * 0.0001,
                lng=-3.7038,
                altitude_m=600.0,
                accuracy_m=10.0,
                timestamp=NOW + timedelta(seconds=off),
                speed_m_s=3.0,
            ))
        RunPoint.objects.bulk_create(points)

        ended = NOW + timedelta(seconds=144)
        res = self.client.patch(f'/api/runs/{session.pk}/', {
            'status': 'completed',
            'ended_at': iso(ended),
        }, format='json')
        self.assertEqual(res.status_code, 200)
        session.refresh_from_db()
        # 8 deltas de 3 s en movimiento; el gap de 120 s (pausa) se descarta.
        self.assertEqual(session.total_duration_s, 24)
        self.assertLess(session.total_duration_s, 144)

    def test_best_pace_matches_bruteforce(self):
        """El mejor pace O(n) debe coincidir con el cálculo O(n²) de referencia."""
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        # ~2.4 km con un tramo rápido en medio (paso variable, 5 s entre puntos).
        steps = ([0.00045] * 10 + [0.0009] * 5 + [0.00045] * 10)  # ~50 m y ~100 m
        lat = 40.4168
        points = [RunPoint(
            session=session, lat=lat, lng=-3.7038, altitude_m=600.0,
            accuracy_m=10.0, timestamp=NOW, speed_m_s=3.0,
        )]
        for i, step in enumerate(steps):
            lat += step
            points.append(RunPoint(
                session=session, lat=lat, lng=-3.7038, altitude_m=600.0,
                accuracy_m=10.0, timestamp=NOW + timedelta(seconds=(i + 1) * 5),
                speed_m_s=3.0,
            ))
        RunPoint.objects.bulk_create(points)

        ended = NOW + timedelta(seconds=len(steps) * 5)
        self.client.patch(f'/api/runs/{session.pk}/', {
            'status': 'completed', 'ended_at': iso(ended),
        }, format='json')
        session.refresh_from_db()

        stored = list(session.points.order_by('timestamp'))
        self.assertEqual(session.best_pace_s_per_km, brute_force_best_pace(stored))
        self.assertGreater(session.best_pace_s_per_km, 0)

    def test_calories_uses_profile_weight(self):
        Profile.objects.create(user=self.user, nombre='Runner', peso=Decimal('80.0'))
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        points = [RunPoint(
            session=session, lat=40.4168 + i * 0.00015, lng=-3.7038,
            altitude_m=600.0, accuracy_m=10.0,
            timestamp=NOW + timedelta(seconds=i * 5), speed_m_s=3.3,
        ) for i in range(10)]
        RunPoint.objects.bulk_create(points)

        self.client.patch(f'/api/runs/{session.pk}/', {
            'status': 'completed', 'ended_at': iso(NOW + timedelta(seconds=45)),
        }, format='json')
        session.refresh_from_db()

        minutes = session.total_duration_s / 60
        speed = session.total_distance_m / minutes
        expected = round((0.2 * speed + 3.5) * 80.0 * minutes * 5 / 1000, 1)
        self.assertGreater(session.calories_burned, 0)
        self.assertAlmostEqual(session.calories_burned, expected, places=1)

    def test_elevation_gain_filters_gps_noise(self):
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        # Oscilación < 3 m (ruido) + una subida real de 10 m.
        altitudes = [100, 101, 100, 102, 100, 110]
        points = [RunPoint(
            session=session, lat=40.4168 + i * 0.0001, lng=-3.7038,
            altitude_m=float(alt), accuracy_m=10.0,
            timestamp=NOW + timedelta(seconds=i * 5), speed_m_s=3.0,
        ) for i, alt in enumerate(altitudes)]
        RunPoint.objects.bulk_create(points)

        self.client.patch(f'/api/runs/{session.pk}/', {
            'status': 'completed', 'ended_at': iso(NOW + timedelta(seconds=25)),
        }, format='json')
        session.refresh_from_db()
        # Solo cuenta la subida real (10 m); el método naïve daría 13 m.
        self.assertAlmostEqual(session.elevation_gain_m, 10.0, places=1)

    def test_detail_downsamples_points(self):
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        points = [RunPoint(
            session=session, lat=40.0 + i * 0.0001, lng=-3.0,
            accuracy_m=10.0, timestamp=NOW + timedelta(seconds=i), speed_m_s=2.0,
        ) for i in range(600)]
        RunPoint.objects.bulk_create(points)

        res = self.client.get(f'/api/runs/{session.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertLessEqual(len(res.data['points']), 500)
        self.assertGreater(len(res.data['points']), 0)

        full = self.client.get(f'/api/runs/{session.pk}/?full=1')
        self.assertEqual(len(full.data['points']), 600)

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
        self.session.ended_at = NOW + timedelta(minutes=10)
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


class RunSessionConstraintTests(TestCase):
    def setUp(self):
        self.user = make_user('constraints@test.com')

    def test_ended_before_started_is_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RunSession.objects.create(
                    user=self.user,
                    started_at=NOW,
                    ended_at=NOW - timedelta(hours=1),
                    status='active',
                )

    def test_completed_without_ended_at_is_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RunSession.objects.create(
                    user=self.user,
                    started_at=NOW,
                    status='completed',
                )

    def test_valid_completed_session_is_allowed(self):
        session = RunSession.objects.create(
            user=self.user,
            started_at=NOW,
            ended_at=NOW + timedelta(minutes=30),
            status='completed',
        )
        self.assertEqual(session.status, 'completed')

    def test_complete_with_ended_before_started_returns_400(self):
        client = auth_client(self.user)
        session = RunSession.objects.create(user=self.user, started_at=NOW, status='active')
        res = client.patch(f'/api/runs/{session.pk}/', {
            'status': 'completed',
            'ended_at': iso(NOW - timedelta(hours=1)),
        }, format='json')
        self.assertEqual(res.status_code, 400)


class RunFeedbackEndpointTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = auth_client(self.user)
        self.session = RunSession.objects.create(
            user=self.user, started_at=NOW, ended_at=NOW + timedelta(minutes=30),
            status='completed',
        )

    def test_post_feedback_saves_all_fields(self):
        res = self.client.post(f'/api/runs/{self.session.pk}/feedback/', {
            'rpe_real': 8, 'rating': 4, 'cumplimiento': 80,
            'molestias': ['Rodilla'], 'feedback_notas': 'buena sesión',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.rpe_real, 8)
        self.assertEqual(self.session.rating, 4)
        self.assertEqual(self.session.cumplimiento, 80)
        self.assertEqual(self.session.molestias, ['Rodilla'])
        self.assertEqual(self.session.feedback_notas, 'buena sesión')
        self.assertIsNotNone(self.session.feedback_at)
        # El detalle expone el feedback guardado.
        self.assertEqual(res.data['rpe_real'], 8)

    def test_partial_feedback_is_allowed(self):
        res = self.client.post(f'/api/runs/{self.session.pk}/feedback/', {'rating': 5}, format='json')
        self.assertEqual(res.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.rating, 5)

    def test_out_of_range_values_rejected(self):
        for payload in ({'rpe_real': 99}, {'rating': 9}, {'cumplimiento': 250}):
            res = self.client.post(f'/api/runs/{self.session.pk}/feedback/', payload, format='json')
            self.assertEqual(res.status_code, 400, payload)

    def test_molestias_must_be_string_list(self):
        res = self.client.post(f'/api/runs/{self.session.pk}/feedback/', {'molestias': [1, 2]}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_other_user_cannot_submit_feedback(self):
        other = make_user('intruder@test.com')
        res = auth_client(other).post(
            f'/api/runs/{self.session.pk}/feedback/', {'rating': 3}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_unauthenticated_rejected(self):
        res = APIClient().post(f'/api/runs/{self.session.pk}/feedback/', {'rating': 3}, format='json')
        self.assertIn(res.status_code, (401, 403))


class RunIsTrailTests(TestCase):
    """`is_trail` se hereda del check-in del día (foco 'trail') al crear la carrera."""
    def setUp(self):
        self.user = make_user('trail@test.com')
        self.client = auth_client(self.user)

    def _make_checkin(self, focos):
        return DailyCheckin.objects.create(
            user=self.user, fecha=date.today(), estado_animo=3,
            calidad_sueno=Decimal('7.0'), duracion_disponible=60,
            foco_entrenamiento=focos,
        )

    def _create_run(self):
        return self.client.post(
            '/api/runs/', {'started_at': iso(NOW), 'session_type': 'free'}, format='json')

    def test_hereda_trail_del_checkin(self):
        self._make_checkin(['descargar', 'trail'])
        res = self._create_run()
        self.assertEqual(res.status_code, 201)
        self.assertTrue(RunSession.objects.get(id=res.data['id']).is_trail)

    def test_running_normal_no_es_trail(self):
        self._make_checkin(['descargar', 'running'])
        res = self._create_run()
        self.assertFalse(RunSession.objects.get(id=res.data['id']).is_trail)

    def test_sin_checkin_no_es_trail(self):
        res = self._create_run()
        self.assertFalse(RunSession.objects.get(id=res.data['id']).is_trail)

    def test_detalle_expone_is_trail(self):
        self._make_checkin(['descargar', 'trail'])
        rid = self._create_run().data['id']
        detail = self.client.get(f'/api/runs/{rid}/')
        self.assertTrue(detail.data['is_trail'])
