"""Tests del límite diario de generación de sesiones (máx. 5/día)."""
from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from users.models import Profile
from workouts.models import DailyGenerationCount

User = get_user_model()


class DailyGenerationCountModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='dlm', email='dlm@t.com', password='x')

    def test_reached_limit_y_record(self):
        hoy = date.today()
        self.assertFalse(DailyGenerationCount.reached_limit(self.user, hoy))
        for _ in range(5):
            DailyGenerationCount.record(self.user, hoy)
        self.assertTrue(DailyGenerationCount.reached_limit(self.user, hoy))
        self.assertEqual(DailyGenerationCount.objects.get(user=self.user, fecha=hoy).count, 5)

    def test_limite_por_dia_independiente(self):
        from datetime import timedelta
        hoy = date.today()
        for _ in range(5):
            DailyGenerationCount.record(self.user, hoy)
        # Otro día NO está limitado (resetea por calendario).
        self.assertFalse(DailyGenerationCount.reached_limit(self.user, hoy + timedelta(days=1)))


class GenerateDailyLimitEndpointTests(TestCase):
    def setUp(self):
        cache.clear()   # evita arrastrar el throttle entre tests
        self.user = User.objects.create_user(username='dl1', email='dl1@t.com', password='x')
        Profile.objects.get_or_create(user=self.user, defaults={'nombre': 'Test'})
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_bloquea_la_sexta_generacion(self):
        # Con el contador ya en 5, la siguiente generación se rechaza con 429 + code.
        DailyGenerationCount.objects.create(user=self.user, fecha=date.today(), count=5)
        res = self.client.post('/api/sessions/generate/', {}, format='json')
        self.assertEqual(res.status_code, 429)
        self.assertEqual(res.data.get('code'), 'daily_limit')
        self.assertIn('límite diario', res.data.get('error', '').lower())
