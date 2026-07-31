"""Tests de fotos de sesión (gym + running): subida base64, detalle, authz, tope, borrado."""
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from workouts.models import Session, SessionPhoto
from runs.models import RunSession

User = get_user_model()

# PNG 1×1 RGBA transparente, dataURI. **Válido de verdad**: firma, IHDR/IDAT/IEND
# y CRCs correctos.
#
# El fixture anterior decía "válido" pero tenía el CRC del IDAT mal y el IEND
# truncado. Pasaba igual porque `photo_service` solo valida con Pillow si Pillow
# está instalado (`except ImportError: pass`) y en el entorno local no lo está —
# es decir, estos tests venían pasando por el motivo equivocado y NO cubrían el
# camino de producción, donde Pillow sí está y rechazaba esta imagen. Se
# descubrió al montar el CI, que instala Pillow y puso los 4 tests en rojo.
PNG = ('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
       'AAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=')


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
                                        image_data=PNG)
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
