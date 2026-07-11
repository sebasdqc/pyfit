from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase

from users.models import EmailVerificationCode

User = get_user_model()


class EmailVerificationTests(APITestCase):
    def setUp(self):
        # verify_email/resend_verification comparten backstop de cache con el
        # resto de tests de auth (ver test_apple_login.py/test_google_login.py).
        cache.clear()

    def _register(self, email='nueva@example.com'):
        res = self.client.post('/api/auth/register/', {
            'email': email, 'password': 'StrongPass123',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        return res.data['access']

    def test_register_creates_unverified_user_and_sends_code(self):
        access = self._register()
        user = User.objects.get(email='nueva@example.com')
        self.assertFalse(user.email_verificado)
        self.assertEqual(EmailVerificationCode.objects.filter(user=user).count(), 1)
        self.assertTrue(access)

    def test_verify_email_with_correct_code(self):
        self._register()
        user = User.objects.get(email='nueva@example.com')
        code = EmailVerificationCode.objects.get(user=user).code

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self._token_for(user)}')
        res = self.client.post('/api/auth/verify-email/', {'code': code}, format='json')
        self.assertEqual(res.status_code, 200)

        user.refresh_from_db()
        self.assertTrue(user.email_verificado)
        # El código de un solo uso se consume.
        self.assertEqual(EmailVerificationCode.objects.filter(user=user).count(), 0)

    def test_verify_email_with_wrong_code_is_400(self):
        self._register()
        user = User.objects.get(email='nueva@example.com')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self._token_for(user)}')
        res = self.client.post('/api/auth/verify-email/', {'code': '000000'}, format='json')
        self.assertEqual(res.status_code, 400)
        user.refresh_from_db()
        self.assertFalse(user.email_verificado)

    def test_verify_email_requires_auth(self):
        res = self.client.post('/api/auth/verify-email/', {'code': '123456'}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_already_verified_short_circuits(self):
        self._register()
        user = User.objects.get(email='nueva@example.com')
        user.email_verificado = True
        user.save(update_fields=['email_verificado'])
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self._token_for(user)}')
        res = self.client.post('/api/auth/verify-email/', {'code': '000000'}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_resend_verification_generates_new_code(self):
        self._register()
        user = User.objects.get(email='nueva@example.com')
        old_code = EmailVerificationCode.objects.get(user=user).code
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self._token_for(user)}')
        res = self.client.post('/api/auth/resend-verification/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        # generate_for() borra el código anterior y crea uno nuevo — sigue habiendo
        # exactamente uno, no necesariamente distinto (dígitos aleatorios pueden
        # repetirse), así que solo verificamos que la fila sobrevive el ciclo.
        self.assertEqual(EmailVerificationCode.objects.filter(user=user).count(), 1)

    def _token_for(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        return str(RefreshToken.for_user(user).access_token)


class SocialLoginMarksVerifiedTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_apple_login_marks_email_verified(self):
        from unittest.mock import patch
        with patch('users.views._verify_apple_identity_token') as mock_verify:
            mock_verify.return_value = {
                'aud': 'app.pyfit.mobile', 'iss': 'https://appleid.apple.com',
                'email': 'apple-user@example.com', 'email_verified': True, 'sub': 'x',
            }
            with self.settings(APPLE_SIGNIN_BUNDLE_ID='app.pyfit.mobile'):
                res = self.client.post('/api/auth/apple/', {'identity_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='apple-user@example.com')
        self.assertTrue(user.email_verificado)

    def test_google_login_marks_email_verified(self):
        from unittest.mock import patch
        idinfo = {
            'aud': 'web-123.apps.googleusercontent.com', 'iss': 'https://accounts.google.com',
            'email': 'google-user@example.com', 'email_verified': True, 'name': 'Ana', 'sub': '1',
        }
        with patch('google.oauth2.id_token.verify_oauth2_token', return_value=idinfo):
            with self.settings(GOOGLE_OAUTH_CLIENT_IDS=['web-123.apps.googleusercontent.com']):
                res = self.client.post('/api/auth/google/', {'id_token': 'fake'}, format='json')
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='google-user@example.com')
        self.assertTrue(user.email_verificado)
