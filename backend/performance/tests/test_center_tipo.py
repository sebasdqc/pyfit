"""Tests del tipo de centro — la base de la diferenciación por público.

`SportsCenter.tipo` es lo que MANDA sobre cómo se comporta el panel, a
diferencia de `PerformanceOnboarding.segmento`, que es atribución (quién llegó).
Lo que se verifica acá es exactamente esa separación:

  1. los centros que ya existían siguen comportándose como siempre (`equipos`),
  2. crear un centro hereda el segmento del onboarding de quien lo crea,
  3. el tipo viaja en /me/ para que la barra lateral lo tenga en el primer render,
  4. dos personas con onboarding distinto ven el MISMO tipo en el mismo centro
     — que es justo lo que el segmento por usuario no podía garantizar.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import (
    SportsCenter, CenterMembership, PerformanceOnboarding,
    SEGMENTO_EQUIPOS, SEGMENTO_INSTITUCIONES, SEGMENTO_ATLETAS,
)

User = get_user_model()


class CenterTipoTests(TestCase):
    def setUp(self):
        self.director = User.objects.create_user(
            username='dir@x.com', email='dir@x.com', password='x', role='director_tecnico',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.director)

    # ── Compatibilidad con lo que ya existe ───────────────────────────────────

    def test_centro_existente_es_equipos_por_defecto(self):
        # El default es lo que hace que la migración no cambie nada para nadie:
        # 'equipos' ES el panel que todos los centros vienen usando.
        center = SportsCenter.objects.create(nombre='CD Test', slug='cd-test')
        self.assertEqual(center.tipo, SEGMENTO_EQUIPOS)

    # ── Siembra desde el onboarding ───────────────────────────────────────────

    def test_crear_centro_hereda_el_segmento_del_onboarding(self):
        PerformanceOnboarding.objects.create(
            user=self.director, segmento=SEGMENTO_INSTITUCIONES,
        )
        res = self.client.post(
            '/api/performance/centers/',
            {'nombre': 'Colegio San Juan', 'slug': 'colegio-san-juan'},
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['tipo'], SEGMENTO_INSTITUCIONES)

    def test_crear_centro_sin_onboarding_cae_a_equipos(self):
        res = self.client.post(
            '/api/performance/centers/',
            {'nombre': 'CD Sin Onboarding', 'slug': 'cd-sin-onboarding'},
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['tipo'], SEGMENTO_EQUIPOS)

    def test_tipo_explicito_gana_sobre_el_onboarding(self):
        # El cliente puede mandarlo; la siembra es solo el valor por defecto.
        PerformanceOnboarding.objects.create(
            user=self.director, segmento=SEGMENTO_ATLETAS,
        )
        res = self.client.post(
            '/api/performance/centers/',
            {'nombre': 'CD Explícito', 'slug': 'cd-explicito', 'tipo': SEGMENTO_INSTITUCIONES},
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['tipo'], SEGMENTO_INSTITUCIONES)

    def test_tipo_invalido_rechazado(self):
        res = self.client.post(
            '/api/performance/centers/',
            {'nombre': 'CD Malo', 'slug': 'cd-malo', 'tipo': 'gimnasios'},
            format='json',
        )
        self.assertEqual(res.status_code, 400)

    # ── El tipo llega al frontend ─────────────────────────────────────────────

    def test_me_expone_el_tipo_de_cada_centro(self):
        center = SportsCenter.objects.create(
            nombre='Colegio', slug='colegio', tipo=SEGMENTO_INSTITUCIONES,
        )
        CenterMembership.objects.create(
            center=center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        res = self.client.get('/api/performance/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['centros']), 1)
        self.assertEqual(res.data['centros'][0]['center_tipo'], SEGMENTO_INSTITUCIONES)

    def test_detalle_de_centro_expone_el_tipo(self):
        center = SportsCenter.objects.create(
            nombre='Club', slug='club', tipo=SEGMENTO_EQUIPOS,
        )
        CenterMembership.objects.create(
            center=center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        res = self.client.get(f'/api/performance/centers/{center.id}/')
        self.assertEqual(res.data['tipo'], SEGMENTO_EQUIPOS)

    # ── El punto de todo el cambio ────────────────────────────────────────────

    def test_el_tipo_lo_manda_el_centro_no_el_onboarding_de_cada_persona(self):
        """Dos personas del mismo centro con onboarding distinto ven el MISMO
        panel. Es exactamente lo que el segmento por usuario no podía dar."""
        center = SportsCenter.objects.create(
            nombre='Colegio', slug='colegio', tipo=SEGMENTO_INSTITUCIONES,
        )
        PerformanceOnboarding.objects.create(
            user=self.director, segmento=SEGMENTO_INSTITUCIONES,
        )
        CenterMembership.objects.create(
            center=center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )

        # Un fisio del mismo centro que contestó "equipos" en SU onboarding.
        fisio = User.objects.create_user(
            username='fisio@x.com', email='fisio@x.com', password='x', role='athlete',
        )
        PerformanceOnboarding.objects.create(user=fisio, segmento=SEGMENTO_EQUIPOS)
        CenterMembership.objects.create(
            center=center, user=fisio, rol=CenterMembership.ROL_FISIO,
            modulos=['lesiones'],
        )

        cliente_fisio = APIClient()
        cliente_fisio.force_authenticate(user=fisio)
        res = cliente_fisio.get('/api/performance/me/')
        self.assertEqual(res.data['centros'][0]['center_tipo'], SEGMENTO_INSTITUCIONES)

    def test_una_persona_en_dos_centros_ve_el_tipo_de_cada_uno(self):
        """El fisio que trabaja para un club Y para un colegio: cada centro
        conserva su propio tipo, y el panel se adapta al centro activo."""
        club = SportsCenter.objects.create(nombre='Club', slug='club', tipo=SEGMENTO_EQUIPOS)
        colegio = SportsCenter.objects.create(
            nombre='Colegio', slug='colegio', tipo=SEGMENTO_INSTITUCIONES,
        )
        for c in (club, colegio):
            CenterMembership.objects.create(
                center=c, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
            )
        res = self.client.get('/api/performance/me/')
        tipos = {c['center_nombre']: c['center_tipo'] for c in res.data['centros']}
        self.assertEqual(tipos['Club'], SEGMENTO_EQUIPOS)
        self.assertEqual(tipos['Colegio'], SEGMENTO_INSTITUCIONES)
