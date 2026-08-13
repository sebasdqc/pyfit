"""Tests de la edición del centro desde Ajustes (PATCH /centers/<id>/).

Existe sobre todo para que `SportsCenter.tipo` sea corregible desde el panel:
hasta que se agregó, un centro mal clasificado en el onboarding solo podía
arreglarse desde el admin de Django. Como `tipo` decide la navegación de TODO
el staff del centro, la edición es de director/admin.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import (
    SportsCenter, CenterMembership,
    SEGMENTO_EQUIPOS, SEGMENTO_INSTITUCIONES,
)

User = get_user_model()


class CenterAjustesTests(TestCase):
    def setUp(self):
        self.director = User.objects.create_user(
            username='dir@x.com', email='dir@x.com', password='x', role='director_tecnico',
        )
        self.center = SportsCenter.objects.create(
            nombre='CD Test', slug='cd-test', tipo=SEGMENTO_EQUIPOS,
        )
        CenterMembership.objects.create(
            center=self.center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.director)
        self.url = f'/api/performance/centers/{self.center.id}/'

    # ── El caso que motivó el endpoint ────────────────────────────────────────

    def test_director_puede_corregir_el_tipo(self):
        res = self.client.patch(self.url, {'tipo': SEGMENTO_INSTITUCIONES}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['tipo'], SEGMENTO_INSTITUCIONES)
        self.center.refresh_from_db()
        self.assertEqual(self.center.tipo, SEGMENTO_INSTITUCIONES)

    def test_el_tipo_corregido_llega_a_me(self):
        # Es lo que hace que la barra lateral se reordene sin recargar sesión.
        self.client.patch(self.url, {'tipo': SEGMENTO_INSTITUCIONES}, format='json')
        res = self.client.get('/api/performance/me/')
        self.assertEqual(res.data['centros'][0]['center_tipo'], SEGMENTO_INSTITUCIONES)

    def test_tipo_invalido_rechazado(self):
        res = self.client.patch(self.url, {'tipo': 'gimnasios'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.center.refresh_from_db()
        self.assertEqual(self.center.tipo, SEGMENTO_EQUIPOS)

    # ── Resto de los campos editables ─────────────────────────────────────────

    def test_edita_datos_del_centro(self):
        res = self.client.patch(
            self.url,
            {'nombre': 'CD Renombrado', 'ciudad': 'Montevideo', 'disciplina': 'Futsal'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['nombre'], 'CD Renombrado')
        self.assertEqual(res.data['ciudad'], 'Montevideo')
        self.assertEqual(res.data['disciplina'], 'Futsal')

    def test_patch_parcial_no_pisa_lo_demas(self):
        self.client.patch(self.url, {'ciudad': 'Lima'}, format='json')
        res = self.client.patch(self.url, {'disciplina': 'Rugby'}, format='json')
        self.assertEqual(res.data['ciudad'], 'Lima')
        self.assertEqual(res.data['nombre'], 'CD Test')

    def test_el_slug_no_es_editable(self):
        # Se ignora en silencio: es el identificador estable del centro.
        res = self.client.patch(
            self.url, {'slug': 'otro-slug', 'ciudad': 'Quito'}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['slug'], 'cd-test')
        self.assertEqual(res.data['ciudad'], 'Quito')

    def test_patch_sin_campos_editables_es_400(self):
        res = self.client.patch(self.url, {'slug': 'solo-slug'}, format='json')
        self.assertEqual(res.status_code, 400)

    # ── Permisos ──────────────────────────────────────────────────────────────

    def test_staff_no_director_no_puede_editar(self):
        fisio = User.objects.create_user(
            username='fisio@x.com', email='fisio@x.com', password='x', role='athlete',
        )
        CenterMembership.objects.create(
            center=self.center, user=fisio, rol=CenterMembership.ROL_FISIO,
            modulos=['lesiones'],
        )
        cliente = APIClient()
        cliente.force_authenticate(user=fisio)
        res = cliente.patch(self.url, {'tipo': SEGMENTO_INSTITUCIONES}, format='json')
        self.assertEqual(res.status_code, 403)
        self.center.refresh_from_db()
        self.assertEqual(self.center.tipo, SEGMENTO_EQUIPOS)

    def test_director_ajeno_al_centro_no_lo_ve(self):
        # Fuera de su scope: 404, no 403 — no se filtra que el centro exista.
        ajeno = User.objects.create_user(
            username='ajeno@x.com', email='ajeno@x.com', password='x', role='director_tecnico',
        )
        otro_centro = SportsCenter.objects.create(nombre='Otro', slug='otro')
        CenterMembership.objects.create(
            center=otro_centro, user=ajeno, rol=CenterMembership.ROL_DIRECTOR,
        )
        cliente = APIClient()
        cliente.force_authenticate(user=ajeno)
        res = cliente.patch(self.url, {'tipo': SEGMENTO_INSTITUCIONES}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_get_sigue_funcionando(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['nombre'], 'CD Test')
