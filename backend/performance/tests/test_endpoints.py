"""Tests de los endpoints del módulo TEST (FASE 4): catálogo, cálculo en vivo,
registro con cálculo en servidor y el comando seed_tests.

Usan BD (TestCase) y el APIClient de DRF con force_authenticate (saltamos el JWT;
lo que importa aquí es el permiso de panel y la lógica de la vista).
"""

from datetime import date
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import (
    SportsCenter, CenterMembership, CenterAthlete, PhysicalTest, TestDefinition,
    TacticalPlay,
)

User = get_user_model()


class _Base(TestCase):
    def setUp(self):
        self.director = User.objects.create_user(
            username='dir@x.com', email='dir@x.com', password='x', role='director_tecnico',
        )
        self.athlete = User.objects.create_user(
            username='atl@x.com', email='atl@x.com', password='x', role='athlete',
        )
        self.center = SportsCenter.objects.create(nombre='CD Test', slug='cd-test')
        CenterMembership.objects.create(
            center=self.center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        CenterAthlete.objects.create(
            center=self.center, athlete=self.athlete, registrado_por=self.director,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.director)


class CatalogEndpointTests(_Base):
    def test_lista_completa(self):
        res = self.client.get('/api/performance/tests/catalog/')
        self.assertEqual(res.status_code, 200)
        slugs = {c['slug'] for c in res.json()}
        self.assertEqual(len(slugs), 9)
        self.assertIn('yoyo-ir1', slugs)
        self.assertIn('tsap', slugs)
        # Cada item trae el esquema de inputs para que el frontend pinte el form.
        self.assertTrue(all('input_schema' in c for c in res.json()))

    def test_filtra_por_familia(self):
        res = self.client.get('/api/performance/tests/catalog/?familia=tactico')
        self.assertEqual(res.status_code, 200)
        self.assertEqual({c['slug'] for c in res.json()}, {'tsap', 'gpai'})

    def test_requiere_acceso_panel(self):
        self.client.force_authenticate(self.athlete)  # atleta: sin acceso al panel
        res = self.client.get('/api/performance/tests/catalog/')
        self.assertEqual(res.status_code, 403)


class ComputeEndpointTests(_Base):
    def test_calcula_sin_persistir(self):
        res = self.client.post('/api/performance/tests/compute/', {
            'test_slug': 'yoyo-ir1', 'inputs': {'shuttles': 22},
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['resultados']['distancia_m'], 880.0)
        self.assertEqual(PhysicalTest.objects.count(), 0)  # NO guarda

    def test_inputs_invalidos_400(self):
        res = self.client.post('/api/performance/tests/compute/', {
            'test_slug': 'sprint-lineal', 'inputs': {'distancia_m': 30, 'tiempo_s': 0},
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('errors', res.json())

    def test_slug_desconocido_400(self):
        res = self.client.post('/api/performance/tests/compute/', {
            'test_slug': 'no-existe', 'inputs': {},
        }, format='json')
        self.assertEqual(res.status_code, 400)


class ModuleTestRegistroTests(_Base):
    URL = '/api/performance/centers/{}/test/'

    def url(self):
        return self.URL.format(self.center.id)

    def test_via_calculadora_persiste_inputs_y_resultados(self):
        res = self.client.post(self.url(), {
            'test_slug': 'test-505',
            'athlete': self.athlete.id,
            'fecha': '2026-06-05',
            'inputs': {'tiempo_dominante': 2.40, 'tiempo_no_dominante': 2.80},
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body['test_slug'], 'test-505')
        self.assertEqual(body['categoria'], 'fisico')
        self.assertTrue(body['resultados']['asimetria_alerta'])
        self.assertIsNone(body['resultado'])

        obj = PhysicalTest.objects.get()
        self.assertEqual(obj.inputs['tiempo_no_dominante'], 2.80)
        self.assertEqual(obj.resultados['asimetria_alerta'], True)
        self.assertEqual(obj.nombre, 'Test 505 (cambio de dirección)')

    def test_servidor_ignora_resultados_del_cliente(self):
        # El cliente intenta inyectar resultados falsos: el servidor los recalcula.
        res = self.client.post(self.url(), {
            'test_slug': 'yoyo-ir1',
            'athlete': self.athlete.id,
            'fecha': '2026-06-05',
            'inputs': {'shuttles': 22},
            'resultados': {'distancia_m': 99999},  # debe ser ignorado
            'resultado': 12345,                      # debe ser ignorado
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        obj = PhysicalTest.objects.get()
        self.assertEqual(obj.resultados['distancia_m'], 880.0)
        self.assertIsNone(obj.resultado)

    def test_via_calculadora_inputs_invalidos_400(self):
        res = self.client.post(self.url(), {
            'test_slug': 'rsa',
            'athlete': self.athlete.id,
            'fecha': '2026-06-05',
            'inputs': {'tiempos': [7.0]},  # se requieren ≥ 2
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('errors', res.json())
        self.assertEqual(PhysicalTest.objects.count(), 0)

    def test_via_manual_un_valor(self):
        res = self.client.post(self.url(), {
            'athlete': self.athlete.id,
            'fecha': '2026-06-05',
            'nombre': 'Cooper 12 min',
            'resultado': '2800',
            'unidad': 'm',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        obj = PhysicalTest.objects.get()
        self.assertEqual(obj.test_slug, '')
        self.assertEqual(str(obj.resultado), '2800.00')
        self.assertEqual(obj.resultados, {})

    def test_get_lista_del_centro(self):
        PhysicalTest.objects.create(
            center=self.center, athlete=self.athlete, fecha=date(2026, 6, 5),
            nombre='X', resultado=10,
        )
        res = self.client.get(self.url())
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)


class AthleteEndpointTests(_Base):
    """Lista, detalle, edición (incluida la foto) y baja de atletas del centro."""

    def link_id(self):
        return CenterAthlete.objects.get(center=self.center, athlete=self.athlete).id

    def detail_url(self):
        return f'/api/performance/centers/{self.center.id}/athletes/{self.link_id()}/'

    FOTO = 'data:image/jpeg;base64,' + 'A' * 200

    def test_lista_incluye_foto(self):
        res = self.client.get(f'/api/performance/centers/{self.center.id}/athletes/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('foto', res.json()[0])

    def test_director_actualiza_foto(self):
        res = self.client.patch(self.detail_url(), {'foto': self.FOTO}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        link = CenterAthlete.objects.get(pk=self.link_id())
        self.assertEqual(link.foto, self.FOTO)

    def test_director_quita_foto(self):
        link = CenterAthlete.objects.get(pk=self.link_id())
        link.foto = self.FOTO
        link.save()
        res = self.client.patch(self.detail_url(), {'foto': ''}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(CenterAthlete.objects.get(pk=self.link_id()).foto, '')

    def test_foto_no_data_url_400(self):
        res = self.client.patch(self.detail_url(), {'foto': 'http://x/y.jpg'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('foto', res.json())

    def test_foto_demasiado_grande_400(self):
        grande = 'data:image/jpeg;base64,' + 'A' * (700 * 1024 + 10)
        res = self.client.patch(self.detail_url(), {'foto': grande}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('foto', res.json())

    def test_get_requiere_acceso_panel(self):
        self.client.force_authenticate(self.athlete)  # atleta: sin acceso al panel
        res = self.client.get(self.detail_url())
        self.assertEqual(res.status_code, 403)

    def test_fuera_de_scope_404(self):
        otro = SportsCenter.objects.create(nombre='Otro', slug='otro')
        link = CenterAthlete.objects.create(center=otro, athlete=self.athlete)
        res = self.client.get(
            f'/api/performance/centers/{otro.id}/athletes/{link.id}/'
        )
        self.assertEqual(res.status_code, 404)

    def test_director_da_de_baja(self):
        url = self.detail_url()
        res = self.client.delete(url)
        self.assertEqual(res.status_code, 204)
        self.assertFalse(CenterAthlete.objects.filter(center=self.center, athlete=self.athlete).exists())


class SimuladorEndpointTests(_Base):
    """Pizarra táctica: crear/listar/editar/borrar jugadas y validación de que
    las coordenadas sean normalizadas (0..1), nunca píxeles."""

    def url(self):
        return f'/api/performance/centers/{self.center.id}/simulador/'

    def detail(self, play_id):
        return f'/api/performance/centers/{self.center.id}/simulador/{play_id}/'

    ESCENA = {
        'version': 1,
        'frames': [{
            'fichas': [
                {'id': 'a', 'tipo': 'jugador', 'ref': 1, 'etiqueta': '10', 'x': 0.5, 'y': 0.6},
                {'id': 'b', 'tipo': 'rival', 'etiqueta': '1', 'x': 0.4, 'y': 0.3},
                {'id': 'c', 'tipo': 'balon', 'x': 0.5, 'y': 0.55},
            ],
            'trazos': [
                {'id': 't1', 'tipo': 'pase', 'puntos': [{'x': 0.5, 'y': 0.6}, {'x': 0.7, 'y': 0.5}]},
            ],
        }],
    }

    def test_crea_jugada(self):
        res = self.client.post(self.url(), {'nombre': 'Salida de balón', 'escena': self.ESCENA}, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        play = TacticalPlay.objects.get()
        self.assertEqual(play.nombre, 'Salida de balón')
        self.assertEqual(play.registrado_por, self.director)
        self.assertEqual(len(play.escena['frames'][0]['fichas']), 3)

    def test_lista_jugadas(self):
        TacticalPlay.objects.create(center=self.center, nombre='J1', escena=self.ESCENA)
        res = self.client.get(self.url())
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        self.assertIn('registrado_por_nombre', res.json()[0])

    def test_actualiza_escena(self):
        play = TacticalPlay.objects.create(center=self.center, nombre='J1', escena={})
        res = self.client.patch(self.detail(play.id), {'escena': self.ESCENA}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        play.refresh_from_db()
        self.assertEqual(len(play.escena['frames'][0]['trazos']), 1)

    def test_rechaza_coordenadas_en_pixeles(self):
        mala = {'version': 1, 'frames': [{'fichas': [
            {'id': 'a', 'tipo': 'jugador', 'x': 540, 'y': 320},  # píxeles, no 0..1
        ], 'trazos': []}]}
        res = self.client.post(self.url(), {'nombre': 'Mala', 'escena': mala}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('escena', res.json())

    def test_rechaza_tipo_de_trazo_invalido(self):
        mala = {'version': 1, 'frames': [{'fichas': [], 'trazos': [
            {'id': 't', 'tipo': 'teletransporte', 'puntos': [{'x': 0.1, 'y': 0.1}, {'x': 0.2, 'y': 0.2}]},
        ]}]}
        res = self.client.post(self.url(), {'nombre': 'Mala', 'escena': mala}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_trazo_necesita_dos_puntos(self):
        mala = {'version': 1, 'frames': [{'fichas': [], 'trazos': [
            {'id': 't', 'tipo': 'pase', 'puntos': [{'x': 0.1, 'y': 0.1}]},
        ]}]}
        res = self.client.post(self.url(), {'nombre': 'Mala', 'escena': mala}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_borra_jugada(self):
        play = TacticalPlay.objects.create(center=self.center, nombre='J1', escena=self.ESCENA)
        res = self.client.delete(self.detail(play.id))
        self.assertEqual(res.status_code, 204)
        self.assertFalse(TacticalPlay.objects.filter(pk=play.id).exists())

    def test_requiere_acceso_panel(self):
        self.client.force_authenticate(self.athlete)
        res = self.client.get(self.url())
        self.assertEqual(res.status_code, 403)

    def test_fuera_de_scope_404(self):
        otro = SportsCenter.objects.create(nombre='Otro', slug='otro-sim')
        play = TacticalPlay.objects.create(center=otro, nombre='Ajena', escena=self.ESCENA)
        res = self.client.get(f'/api/performance/centers/{otro.id}/simulador/{play.id}/')
        self.assertEqual(res.status_code, 404)


class SeedTestsCommandTests(TestCase):
    def test_siembra_catalogo(self):
        out = StringIO()
        call_command('seed_tests', stdout=out)
        self.assertEqual(TestDefinition.objects.count(), 9)
        self.assertTrue(TestDefinition.objects.filter(slug='lspt', familia='tecnico').exists())
        self.assertIn('9 creados', out.getvalue())

    def test_idempotente(self):
        call_command('seed_tests', stdout=StringIO())
        out = StringIO()
        call_command('seed_tests', stdout=out)
        self.assertEqual(TestDefinition.objects.count(), 9)  # no duplica
        self.assertIn('0 creados', out.getvalue())

    def test_desactiva_huerfano(self):
        # Una definición cuyo slug ya no existe en el REGISTRY se desactiva.
        TestDefinition.objects.create(
            slug='test-viejo', familia='fisico', nombre='Viejo', activo=True,
        )
        call_command('seed_tests', stdout=StringIO())
        self.assertFalse(TestDefinition.objects.get(slug='test-viejo').activo)


class AltaPorEmailTests(_Base):
    """Alta de staff y atletas por email (vincula o crea la cuenta)."""

    def staff_url(self):
        return f'/api/performance/centers/{self.center.id}/staff/'

    def athletes_url(self):
        return f'/api/performance/centers/{self.center.id}/athletes/'

    # ── Staff ────────────────────────────────────────────────────────────────
    def test_alta_staff_crea_cuenta_con_acceso(self):
        res = self.client.post(self.staff_url(), {
            'email': 'fisio@x.com', 'nombre': 'Ana Fisio',
            'rol': CenterMembership.ROL_FISIO, 'password': 'temporal123',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        nuevo = User.objects.get(email='fisio@x.com')
        # La membresía activa le da acceso al panel aunque su rol global sea atleta.
        self.assertTrue(nuevo.performance_acceso)
        m = CenterMembership.objects.get(center=self.center, user=nuevo)
        self.assertEqual(m.rol, CenterMembership.ROL_FISIO)
        # Los módulos se siembran del rol (fisio → lesiones).
        self.assertEqual(res.json()['modulos'], ['lesiones'])
        self.assertEqual(res.json()['nombre'], 'Ana Fisio')

    def test_alta_staff_email_existente_vincula_sin_duplicar(self):
        existente = User.objects.create_user(
            username='prep@x.com', email='prep@x.com', password='x',
        )
        res = self.client.post(self.staff_url(), {
            'email': 'prep@x.com', 'nombre': 'X',
            'rol': CenterMembership.ROL_PREPARADOR, 'password': 'temporal123',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(User.objects.filter(email='prep@x.com').count(), 1)
        self.assertTrue(CenterMembership.objects.filter(center=self.center, user=existente).exists())

    def test_alta_staff_password_corta_400(self):
        res = self.client.post(self.staff_url(), {
            'email': 'corta@x.com', 'nombre': 'Y',
            'rol': CenterMembership.ROL_ANALISTA, 'password': 'corta',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.filter(email='corta@x.com').exists())

    # ── Atletas ──────────────────────────────────────────────────────────────
    def test_alta_atleta_crea_cuenta_sin_password(self):
        res = self.client.post(self.athletes_url(), {
            'email': 'jugador@x.com', 'nombre': 'Leo Atleta', 'dorsal': '10',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        nuevo = User.objects.get(email='jugador@x.com')
        # Cuenta de consumo: sin contraseña usable y sin acceso al panel.
        self.assertFalse(nuevo.has_usable_password())
        self.assertFalse(nuevo.performance_acceso)
        link = CenterAthlete.objects.get(center=self.center, athlete=nuevo)
        self.assertEqual(link.dorsal, '10')
        self.assertEqual(link.registrado_por, self.director)
        self.assertEqual(res.json()['nombre'], 'Leo Atleta')

    def test_alta_email_invalido_400(self):
        res = self.client.post(self.athletes_url(), {'email': 'no-es-email', 'nombre': 'Z'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_alta_atleta_requiere_director(self):
        # Un atleta autenticado no puede registrar atletas.
        self.client.force_authenticate(self.athlete)
        res = self.client.post(self.athletes_url(), {'email': 'otro@x.com', 'nombre': 'W'}, format='json')
        self.assertEqual(res.status_code, 403)
