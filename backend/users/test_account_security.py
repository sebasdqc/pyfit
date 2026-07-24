from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import EmailChangeCode

User = get_user_model()


def _token_for(user):
    return str(RefreshToken.for_user(user).access_token)


class ChangePasswordTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='cambio@example.com', email='cambio@example.com', password='OldPass123',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {_token_for(self.user)}')

    def test_change_password_with_correct_current_password(self):
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'OldPass123', 'new_password': 'BrandNewPass456',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('BrandNewPass456'))

    def test_change_password_with_wrong_current_password_is_400(self):
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'WrongPass', 'new_password': 'BrandNewPass456',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('OldPass123'))

    def test_change_password_rejects_weak_new_password(self):
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'OldPass123', 'new_password': '1234',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('OldPass123'))

    def test_change_password_requires_auth(self):
        self.client.credentials()
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'OldPass123', 'new_password': 'BrandNewPass456',
        }, format='json')
        self.assertEqual(res.status_code, 401)


class ChangeEmailTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='vieja@example.com', email='vieja@example.com', password='MyPass123',
        )
        self.other = User.objects.create_user(
            username='otra@example.com', email='otra@example.com', password='Whatever123',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {_token_for(self.user)}')

    def test_change_email_sends_code_and_does_not_apply_yet(self):
        res = self.client.post('/api/auth/change-email/', {
            'new_email': 'nueva@example.com', 'password': 'MyPass123',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(EmailChangeCode.objects.filter(user=self.user, new_email='nueva@example.com').count(), 1)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'vieja@example.com')  # aún no cambió

    def test_change_email_with_wrong_password_is_400(self):
        res = self.client.post('/api/auth/change-email/', {
            'new_email': 'nueva@example.com', 'password': 'WrongPass',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(EmailChangeCode.objects.filter(user=self.user).count(), 0)

    def test_change_email_rejects_email_already_in_use(self):
        res = self.client.post('/api/auth/change-email/', {
            'new_email': 'otra@example.com', 'password': 'MyPass123',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_change_email_rejects_invalid_email(self):
        res = self.client.post('/api/auth/change-email/', {
            'new_email': 'no-es-un-email', 'password': 'MyPass123',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_change_email_requires_auth(self):
        self.client.credentials()
        res = self.client.post('/api/auth/change-email/', {
            'new_email': 'nueva@example.com', 'password': 'MyPass123',
        }, format='json')
        self.assertEqual(res.status_code, 401)

    def test_confirm_email_change_with_correct_code_applies_change(self):
        self.client.post('/api/auth/change-email/', {
            'new_email': 'nueva@example.com', 'password': 'MyPass123',
        }, format='json')
        code = EmailChangeCode.objects.get(user=self.user).code

        res = self.client.post('/api/auth/confirm-email-change/', {'code': code}, format='json')
        self.assertEqual(res.status_code, 200)

        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'nueva@example.com')
        self.assertEqual(self.user.username, 'nueva@example.com')
        self.assertTrue(self.user.email_verificado)
        self.assertEqual(EmailChangeCode.objects.filter(user=self.user).count(), 0)

    def test_confirm_email_change_with_wrong_code_is_400(self):
        self.client.post('/api/auth/change-email/', {
            'new_email': 'nueva@example.com', 'password': 'MyPass123',
        }, format='json')
        res = self.client.post('/api/auth/confirm-email-change/', {'code': '000000'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'vieja@example.com')

    def test_confirm_email_change_blocks_race_with_new_signup(self):
        # Alguien pide el cambio a un email libre; entre el paso 1 y 2 ese email
        # queda tomado por otra cuenta (registro nuevo). El código no debe
        # poder aplicar el cambio sobre un email que ya no está libre.
        self.client.post('/api/auth/change-email/', {
            'new_email': 'nueva@example.com', 'password': 'MyPass123',
        }, format='json')
        code = EmailChangeCode.objects.get(user=self.user).code
        User.objects.create_user(username='nueva@example.com', email='nueva@example.com', password='Whatever123')

        res = self.client.post('/api/auth/confirm-email-change/', {'code': code}, format='json')
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'vieja@example.com')

    def test_confirm_email_change_requires_auth(self):
        self.client.credentials()
        res = self.client.post('/api/auth/confirm-email-change/', {'code': '123456'}, format='json')
        self.assertEqual(res.status_code, 401)
