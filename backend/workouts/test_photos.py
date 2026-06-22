"""Tests de fotos de sesión (gym + running): subida base64, detalle, authz, tope, borrado."""
import tempfile
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from workouts.models import Session, SessionPhoto
from runs.models import RunSession

User = get_user_model()

# PNG 1×1 transparente (válido) como dataURI.
PNG = ('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
       'AAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class SessionPhotoTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='ph1', email='ph1@t.com', password='x')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.session = Session.objects.create(
            user=self.user, fecha=date.today(), duracion_planificada=45, rpe_target=7.0)

    def test_subir_foto_gym(self):
        res = self.client.post(f'/api/sessions/{self.session.id}/photos/', {'image': PNG}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIn('url', res.data)
        self.assertEqual(SessionPhoto.objects.filter(session=self.session).count(), 1)

    def test_detalle_incluye_fotos(self):
        self.client.post(f'/api/sessions/{self.session.id}/photos/', {'image': PNG}, format='json')
        res = self.client.get(f'/api/sessions/{self.session.id}/')
        self.assertEqual(len(res.data['photos']), 1)
        self.assertIn('url', res.data['photos'][0])

    def test_subir_foto_running_y_detalle(self):
        run = RunSession.objects.create(user=self.user, started_at=timezone.now())
        res = self.client.post(f'/api/runs/{run.id}/photos/', {'image': PNG}, format='json')
        self.assertEqual(res.status_code, 201)
        detail = self.client.get(f'/api/runs/{run.id}/')
        self.assertEqual(len(detail.data['photos']), 1)

    def test_no_puede_subir_a_sesion_ajena(self):
        otro = User.objects.create_user(username='ph2', email='ph2@t.com', password='x')
        s2 = Session.objects.create(user=otro, fecha=date.today(), duracion_planificada=45, rpe_target=7.0)
        res = self.client.post(f'/api/sessions/{s2.id}/photos/', {'image': PNG}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_formato_invalido_400(self):
        res = self.client.post(f'/api/sessions/{self.session.id}/photos/', {'image': 'no-es-datauri'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_tope_de_fotos(self):
        for i in range(6):
            SessionPhoto.objects.create(user=self.user, session=self.session,
                                        image=f'session_photos/x{i}.png')
        res = self.client.post(f'/api/sessions/{self.session.id}/photos/', {'image': PNG}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_borrar_solo_el_dueno(self):
        r = self.client.post(f'/api/sessions/{self.session.id}/photos/', {'image': PNG}, format='json')
        pid = r.data['id']
        otro = User.objects.create_user(username='ph3', email='ph3@t.com', password='x')
        c2 = APIClient()
        c2.force_authenticate(otro)
        self.assertEqual(c2.delete(f'/api/session-photos/{pid}/').status_code, 404)   # ajeno no
        self.assertEqual(self.client.delete(f'/api/session-photos/{pid}/').status_code, 204)  # dueño sí
        self.assertFalse(SessionPhoto.objects.filter(id=pid).exists())
