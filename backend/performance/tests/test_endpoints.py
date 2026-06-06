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
