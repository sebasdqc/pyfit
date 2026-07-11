from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from users.models import Profile

User = get_user_model()

BUNDLE_ID = 'app.pyfit.mobile'


def _claims(email='nuevo@example.com', verified=True, aud=BUNDLE_ID):
    return {
        'aud': aud,
        'iss': 'https://appleid.apple.com',
        'email': email,
        'email_verified': verified,
        'sub': 'apple-sub-123',
    }


@override_settings(APPLE_SIGNIN_BUNDLE_ID=BUNDLE_ID)
class AppleLoginTests(APITestCase):
    URL = '/api/auth/apple/'

    def setUp(self):
        # LoginRateThrottle (10/min) es compartido con /api/auth/google/ y keyed
        # por IP — sin limpiar el cache, correr la suite completa de users
        # acumula el conteo de otros test files y estos tests fallan con 429.
        cache.clear()

    def test_missing_token_is_400(self):
        res = self.client.post(self.URL, {}, format='json')
        self.assertEqual(res.status_code, 400)

    @patch('users.views._verify_apple_identity_token')
    def test_creates_user_and_profile_on_first_login(self, mock_verify):
        mock_verify.return_value = _claims()
        res = self.client.post(
            self.URL, {'identity_token': 'fake', 'full_name': 'Ana Pérez'}, format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['user']['email'], 'nuevo@example.com')
        self.assertFalse(res.data['user']['onboarding_completo'])

        user = User.objects.get(email='nuevo@example.com')
        self.assertFalse(user.has_usable_password())   # cuenta solo-Apple
        self.assertEqual(user.role, User.ROLE_ATHLETE)
        prof = Profile.objects.get(user=user)
        self.assertEqual(prof.nombre, 'Ana Pérez')

    @patch('users.views._verify_apple_identity_token')
    def test_first_login_without_full_name_falls_back_to_email_prefix(self, mock_verify):
        mock_verify.return_value = _claims(email='sinfullname@example.com')
        res = self.client.post(self.URL, {'identity_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 201)
        prof = Profile.objects.get(user__email='sinfullname@example.com')
        self.assertEqual(prof.nombre, 'sinfullname')

    @patch('users.views._verify_apple_identity_token')
    def test_second_login_does_not_duplicate(self, mock_verify):
        mock_verify.return_value = _claims()
        self.client.post(self.URL, {'identity_token': 'fake', 'full_name': 'Ana'}, format='json')
        # Apple no reenvía full_name en logins posteriores.
        res = self.client.post(self.URL, {'identity_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 200)   # existente → 200, no 201
        self.assertEqual(User.objects.filter(email='nuevo@example.com').count(), 1)
        self.assertEqual(Profile.objects.filter(user__email='nuevo@example.com').count(), 1)

    @patch('users.views._verify_apple_identity_token')
    def test_wrong_audience_is_401(self, mock_verify):
        mock_verify.side_effect = Exception('invalid audience')
        res = self.client.post(self.URL, {'identity_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 401)
        self.assertFalse(User.objects.exists())

    @patch('users.views._verify_apple_identity_token')
    def test_unverified_email_is_400(self, mock_verify):
        mock_verify.return_value = _claims(verified=False)
        res = self.client.post(self.URL, {'identity_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.exists())

    @patch('users.views._verify_apple_identity_token')
    def test_email_verified_as_string_true_is_accepted(self, mock_verify):
        # Algunos identity_token de Apple traen email_verified como string "true".
        mock_verify.return_value = _claims(verified='true')
        res = self.client.post(self.URL, {'identity_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 201)

    @patch('users.views._verify_apple_identity_token')
    def test_invalid_token_is_401(self, mock_verify):
        mock_verify.side_effect = ValueError('bad token')
        res = self.client.post(self.URL, {'identity_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 401)
        self.assertFalse(User.objects.exists())

    @patch('users.views._verify_apple_identity_token')
    def test_existing_email_account_links_to_apple(self, mock_verify):
        # Una cuenta creada por email puede entrar luego con Apple (mismo email).
        existing = User.objects.create_user(
            username='ya@example.com', email='ya@example.com', password='StrongPass123',
        )
        Profile.objects.create(user=existing, nombre='Existente')
        mock_verify.return_value = _claims(email='ya@example.com')
        res = self.client.post(self.URL, {'identity_token': 'fake', 'full_name': 'Existente A'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(User.objects.filter(email='ya@example.com').count(), 1)
        # No se duplica el Profile ni se pisa el nombre existente.
        self.assertEqual(Profile.objects.get(user=existing).nombre, 'Existente')
