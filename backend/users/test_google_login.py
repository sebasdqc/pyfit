from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from users.models import Profile

User = get_user_model()

WEB_CLIENT_ID = 'web-123.apps.googleusercontent.com'


def _idinfo(email='nuevo@example.com', name='Ana Pérez', verified=True, aud=WEB_CLIENT_ID):
    return {
        'aud': aud,
        'iss': 'https://accounts.google.com',
        'email': email,
        'email_verified': verified,
        'name': name,
        'sub': '1234567890',
    }


@override_settings(GOOGLE_OAUTH_CLIENT_IDS=[WEB_CLIENT_ID])
class GoogleLoginTests(APITestCase):
    URL = '/api/auth/google/'

    def setUp(self):
        # LoginRateThrottle (10/min) es compartido con /api/auth/apple/ y keyed
        # por IP — sin limpiar el cache, correr la suite completa de users
        # acumula el conteo de otros test files y estos tests fallan con 429.
        cache.clear()

    def test_missing_token_is_400(self):
        res = self.client.post(self.URL, {}, format='json')
        self.assertEqual(res.status_code, 400)

    @override_settings(GOOGLE_OAUTH_CLIENT_IDS=[])
    def test_unconfigured_is_503(self):
        res = self.client.post(self.URL, {'id_token': 'x'}, format='json')
        self.assertEqual(res.status_code, 503)

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_creates_user_and_profile_on_first_login(self, mock_verify):
        mock_verify.return_value = _idinfo()
        res = self.client.post(self.URL, {'id_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['user']['email'], 'nuevo@example.com')
        self.assertFalse(res.data['user']['onboarding_completo'])

        user = User.objects.get(email='nuevo@example.com')
        self.assertFalse(user.has_usable_password())   # cuenta solo-Google
        self.assertEqual(user.role, User.ROLE_ATHLETE)
        prof = Profile.objects.get(user=user)
        self.assertEqual(prof.nombre, 'Ana Pérez')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_second_login_does_not_duplicate(self, mock_verify):
        mock_verify.return_value = _idinfo()
        self.client.post(self.URL, {'id_token': 'fake'}, format='json')
        res = self.client.post(self.URL, {'id_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 200)   # existente → 200, no 201
        self.assertEqual(User.objects.filter(email='nuevo@example.com').count(), 1)
        self.assertEqual(Profile.objects.filter(user__email='nuevo@example.com').count(), 1)

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_wrong_audience_is_401(self, mock_verify):
        mock_verify.return_value = _idinfo(aud='otro-cliente.apps.googleusercontent.com')
        res = self.client.post(self.URL, {'id_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 401)
        self.assertFalse(User.objects.exists())

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_unverified_email_is_400(self, mock_verify):
        mock_verify.return_value = _idinfo(verified=False)
        res = self.client.post(self.URL, {'id_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.exists())

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_invalid_token_is_401(self, mock_verify):
        mock_verify.side_effect = ValueError('bad token')
        res = self.client.post(self.URL, {'id_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 401)
        self.assertFalse(User.objects.exists())

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_existing_email_account_links_to_google(self, mock_verify):
        # Una cuenta creada por email puede entrar luego con Google (mismo email).
        existing = User.objects.create_user(
            username='ya@example.com', email='ya@example.com', password='StrongPass123',
        )
        Profile.objects.create(user=existing, nombre='Existente')
        mock_verify.return_value = _idinfo(email='ya@example.com', name='Existente G')
        res = self.client.post(self.URL, {'id_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(User.objects.filter(email='ya@example.com').count(), 1)
        # No se duplica el Profile ni se pisa el nombre existente.
        self.assertEqual(Profile.objects.get(user=existing).nombre, 'Existente')
