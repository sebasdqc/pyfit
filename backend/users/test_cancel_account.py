from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from users.models import Profile

User = get_user_model()


class CancelAccountTests(APITestCase):
    def test_register_then_delete_account_removes_user_and_profile(self):
        # Registro crea User + Profile (igual que el flujo real de la app).
        res = self.client.post('/api/auth/register/', {
            'email': 'cancel-me@example.com', 'password': 'StrongPass123',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        access = res.data['access']
        self.assertTrue(User.objects.filter(email='cancel-me@example.com').exists())
        self.assertEqual(Profile.objects.filter(user__email='cancel-me@example.com').count(), 1)

        # Cancelar registro = DELETE autenticado de la cuenta.
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        res = self.client.delete('/api/auth/account/')
        self.assertEqual(res.status_code, 204)

        # User y Profile (vía cascada) ya no existen.
        self.assertFalse(User.objects.filter(email='cancel-me@example.com').exists())
        self.assertEqual(Profile.objects.filter(user__email='cancel-me@example.com').count(), 0)

    def test_delete_account_requires_auth(self):
        res = self.client.delete('/api/auth/account/')
        self.assertEqual(res.status_code, 401)
