"""Tests de POST /api/academy/admin-bootstrap/ — creación/promoción manual de
una cuenta admin de producto sin necesitar acceso a shell en producción.
Mismo secreto compartido que streak_sweep (ver test_streak.py)."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

User = get_user_model()


class AdminBootstrapEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @override_settings(CRON_SECRET='')
    def test_sin_secreto_configurado_503(self):
        res = self.client.post('/api/academy/admin-bootstrap/', {'email': 'nuevo@x.com'})
        self.assertEqual(res.status_code, 503)

    @override_settings(CRON_SECRET='s3cr3t')
    def test_secreto_incorrecto_403(self):
        res = self.client.post(
            '/api/academy/admin-bootstrap/', {'email': 'nuevo@x.com'}, HTTP_X_CRON_SECRET='malo',
        )
        self.assertEqual(res.status_code, 403)

    @override_settings(CRON_SECRET='s3cr3t')
    def test_sin_email_400(self):
        res = self.client.post('/api/academy/admin-bootstrap/', {}, HTTP_X_CRON_SECRET='s3cr3t')
        self.assertEqual(res.status_code, 400)

    @override_settings(CRON_SECRET='s3cr3t')
    def test_crea_cuenta_nueva_como_admin(self):
        res = self.client.post(
            '/api/academy/admin-bootstrap/', {'email': 'nuevo-admin@x.com'}, HTTP_X_CRON_SECRET='s3cr3t',
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['created'])
        self.assertEqual(res.data['role'], User.ROLE_ADMIN)
        password = res.data['password']
        self.assertTrue(password)

        user = User.objects.get(email='nuevo-admin@x.com')
        self.assertEqual(user.role, User.ROLE_ADMIN)
        self.assertTrue(user.check_password(password))

    @override_settings(CRON_SECRET='s3cr3t')
    def test_promueve_cuenta_existente_sin_tocar_password(self):
        user = User.objects.create_user(username='ya@x.com', email='ya@x.com', password='original')

        res = self.client.post(
            '/api/academy/admin-bootstrap/', {'email': 'ya@x.com'}, HTTP_X_CRON_SECRET='s3cr3t',
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['created'])
        self.assertNotIn('password', res.data)

        user.refresh_from_db()
        self.assertEqual(user.role, User.ROLE_ADMIN)
        self.assertTrue(user.check_password('original'))

    @override_settings(CRON_SECRET='s3cr3t')
    def test_email_no_distingue_mayusculas(self):
        User.objects.create_user(username='Mayus@X.com', email='Mayus@X.com', password='original')

        res = self.client.post(
            '/api/academy/admin-bootstrap/', {'email': 'mayus@x.com'}, HTTP_X_CRON_SECRET='s3cr3t',
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['created'])
