from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import Profile
from workouts.models import Session, SessionExercise

User = get_user_model()


class SessionCargaPreviaTests(APITestCase):
    """Antes de esto, el motor calculaba la carga previa (peso×reps) solo para
    el prompt de la IA (ai_workout/adaptive_engine.py) — el usuario nunca la
    veía durante la ejecución. Este endpoint la expone."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='atleta@example.com', email='atleta@example.com', password='StrongPass123',
        )
        Profile.objects.create(user=self.user, nombre='Atleta')
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _session(self, dias_atras=0):
        return Session.objects.create(
            user=self.user, fecha=date.today() - timedelta(days=dias_atras),
            duracion_planificada=60, rpe_target=7,
        )

    def test_returns_last_logged_weight_from_a_previous_session(self):
        previa = self._session(dias_atras=3)
        SessionExercise.objects.create(
            session=previa, orden=1, nombre='Sentadilla', series=4, repeticiones='8', descanso_segundos=90,
            series_log=[{'peso': 80, 'reps': 8}, {'peso': 85, 'reps': 6}],
        )
        actual = self._session(dias_atras=0)
        SessionExercise.objects.create(session=actual, orden=1, nombre='Sentadilla', series=4, repeticiones='8', descanso_segundos=90)

        res = self.client.get(f'/api/sessions/{actual.id}/carga-previa/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {'Sentadilla': {'peso': 85, 'reps': 6}})

    def test_ignores_the_current_session_own_log(self):
        actual = self._session(dias_atras=0)
        SessionExercise.objects.create(
            session=actual, orden=1, nombre='Press banca', series=3, repeticiones='10', descanso_segundos=90,
            series_log=[{'peso': 60, 'reps': 10}],
        )
        res = self.client.get(f'/api/sessions/{actual.id}/carga-previa/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {})

    def test_exercise_never_done_before_is_omitted(self):
        actual = self._session()
        SessionExercise.objects.create(session=actual, orden=1, nombre='Ejercicio nuevo', series=3, repeticiones='10', descanso_segundos=90)
        res = self.client.get(f'/api/sessions/{actual.id}/carga-previa/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {})

    def test_session_not_owned_by_user_is_404(self):
        other = User.objects.create_user(username='otro@example.com', email='otro@example.com', password='StrongPass123')
        Profile.objects.create(user=other, nombre='Otro')
        ajena = Session.objects.create(user=other, fecha=date.today(), duracion_planificada=60, rpe_target=7)
        res = self.client.get(f'/api/sessions/{ajena.id}/carga-previa/')
        self.assertEqual(res.status_code, 404)

    def test_requires_auth(self):
        self.client.credentials()
        actual = self._session()
        res = self.client.get(f'/api/sessions/{actual.id}/carga-previa/')
        self.assertEqual(res.status_code, 401)
