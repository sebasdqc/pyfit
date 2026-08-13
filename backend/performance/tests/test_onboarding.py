"""Tests del wizard de bienvenida del panel (primer inicio de sesión).

Cubren las tres reglas que sostienen el flujo del frontend:
  1. el flag `onboarding_completo` viaja en /me/ y en el login (de ahí sale el
     redirect a /bienvenida, sin una petición extra),
  2. el guardado es progresivo (un PATCH por paso, sin perder lo anterior),
  3. `completado` lo decide el servidor: no se puede cerrar el wizard salteando
     pasos ni escribiendo el campo directamente.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import PerformanceOnboarding

User = get_user_model()

RESPUESTAS_COMPLETAS = {
    'segmento': 'equipos',
    'pais': 'AR',
    'cargo': 'preparador_fisico',
    'disciplina': 'futbol',
    'tamano_plantel': '16_30',
    'canal': 'recomendacion',
}


class OnboardingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='dir@x.com', email='dir@x.com', password='secreto123',
            role='director_tecnico',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    # ── Estado inicial ────────────────────────────────────────────────────────

    def test_get_crea_la_fila_vacia_la_primera_vez(self):
        self.assertFalse(PerformanceOnboarding.objects.filter(user=self.user).exists())
        res = self.client.get('/api/performance/onboarding/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['completado'])
        self.assertEqual(res.data['pais'], '')
        self.assertEqual(res.data['necesidades'], [])
        self.assertTrue(PerformanceOnboarding.objects.filter(user=self.user).exists())

    def test_me_expone_el_flag_en_falso_sin_onboarding(self):
        res = self.client.get('/api/performance/me/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('onboarding_completo', res.data)
        self.assertFalse(res.data['onboarding_completo'])

    def test_login_expone_el_flag(self):
        # El login es el momento exacto en que el frontend decide el destino,
        # así que el payload tiene que traer el flag igual que /me/.
        # `performance_acceso` es una propiedad derivada del rol (sin setter):
        # director_tecnico ya lo tiene.
        self.assertTrue(self.user.performance_acceso)
        anon = APIClient()
        res = anon.post(
            '/api/performance/auth/login/',
            {'email': 'dir@x.com', 'password': 'secreto123'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['user']['onboarding_completo'])

    # ── Guardado progresivo ───────────────────────────────────────────────────

    def test_patch_parcial_no_pisa_los_pasos_anteriores(self):
        self.client.patch('/api/performance/onboarding/', {'pais': 'CL'}, format='json')
        res = self.client.patch(
            '/api/performance/onboarding/', {'cargo': 'analista'}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['pais'], 'CL')
        self.assertEqual(res.data['cargo'], 'analista')

    def test_pais_se_normaliza_a_mayusculas(self):
        res = self.client.patch('/api/performance/onboarding/', {'pais': 'uy'}, format='json')
        self.assertEqual(res.data['pais'], 'UY')

    def test_pais_invalido_rechazado(self):
        for malo in ['ARG', 'A', '12']:
            res = self.client.patch('/api/performance/onboarding/', {'pais': malo}, format='json')
            self.assertEqual(res.status_code, 400, f'aceptó país inválido: {malo}')

    def test_necesidades_desconocidas_rechazadas(self):
        res = self.client.patch(
            '/api/performance/onboarding/',
            {'necesidades': ['rendimiento', 'teletransportacion']},
            format='json',
        )
        self.assertEqual(res.status_code, 400)

    def test_necesidades_se_deduplican_y_ordenan(self):
        res = self.client.patch(
            '/api/performance/onboarding/',
            {'necesidades': ['reportes', 'rendimiento', 'reportes']},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        # Orden canónico del catálogo (rendimiento va antes que reportes).
        self.assertEqual(res.data['necesidades'], ['rendimiento', 'reportes'])

    def test_texto_libre_con_caracteres_peligrosos_rechazado(self):
        res = self.client.patch(
            '/api/performance/onboarding/',
            {'cargo': 'otro', 'cargo_otro': '<script>alert(1)</script>'},
            format='json',
        )
        self.assertEqual(res.status_code, 400)

    # ── Segmento de público ───────────────────────────────────────────────────

    def test_acepta_los_tres_segmentos_de_la_landing(self):
        # Mismos IDs que /para-quien/:segment en la landing pública.
        for seg in ['equipos', 'instituciones', 'atletas']:
            res = self.client.patch(
                '/api/performance/onboarding/', {'segmento': seg}, format='json',
            )
            self.assertEqual(res.status_code, 200, f'rechazó el segmento {seg}')
            self.assertEqual(res.data['segmento'], seg)

    def test_segmento_desconocido_rechazado(self):
        res = self.client.patch(
            '/api/performance/onboarding/', {'segmento': 'gimnasios'}, format='json',
        )
        self.assertEqual(res.status_code, 400)

    def test_cargos_propios_de_cada_segmento(self):
        # Cargos que solo tienen sentido fuera de un club: institución educativa
        # y atleta individual. Si el catálogo los pierde, el wizard se rompe.
        for cargo in ['profesor_ef', 'director_institucion', 'entrenador_personal']:
            res = self.client.patch(
                '/api/performance/onboarding/', {'cargo': cargo}, format='json',
            )
            self.assertEqual(res.status_code, 200, f'rechazó el cargo {cargo}')

    def test_no_se_puede_completar_sin_segmento(self):
        sin_segmento = {k: v for k, v in RESPUESTAS_COMPLETAS.items() if k != 'segmento'}
        self.client.patch('/api/performance/onboarding/', sin_segmento, format='json')
        res = self.client.patch(
            '/api/performance/onboarding/', {'completado': True}, format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['faltantes'], ['segmento'])

    # ── Cierre del wizard ─────────────────────────────────────────────────────

    def test_no_se_puede_completar_con_pasos_faltantes(self):
        self.client.patch('/api/performance/onboarding/', {'pais': 'AR'}, format='json')
        res = self.client.patch(
            '/api/performance/onboarding/', {'completado': True}, format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('segmento', res.data['faltantes'])
        self.assertIn('cargo', res.data['faltantes'])
        self.assertFalse(PerformanceOnboarding.objects.get(user=self.user).completado)

    def test_completado_no_es_escribible_por_el_cliente(self):
        # Sin los pasos obligatorios, mandar el flag no debe marcar nada: es la
        # vista la que decide, no el payload.
        res = self.client.patch(
            '/api/performance/onboarding/', {'completado': True}, format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(PerformanceOnboarding.objects.get(user=self.user).completado)

    def test_completar_con_todo_contestado(self):
        self.client.patch('/api/performance/onboarding/', RESPUESTAS_COMPLETAS, format='json')
        res = self.client.patch(
            '/api/performance/onboarding/', {'completado': True}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['completado'])
        self.assertIsNotNone(res.data['completado_at'])

    def test_completar_en_un_solo_patch(self):
        # Es lo que hace el wizard en el último paso: manda las respuestas y el
        # cierre juntos. El serializer guarda primero, la vista valida después.
        res = self.client.patch(
            '/api/performance/onboarding/',
            {**RESPUESTAS_COMPLETAS, 'completado': True},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['completado'])
        self.assertEqual(res.data['canal'], 'recomendacion')

    def test_completar_sin_necesidades_es_valido(self):
        # No marcar ninguna necesidad es una respuesta legítima; no debe trabar.
        self.client.patch('/api/performance/onboarding/', RESPUESTAS_COMPLETAS, format='json')
        res = self.client.patch(
            '/api/performance/onboarding/', {'completado': True}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['necesidades'], [])

    def test_completar_es_idempotente_y_no_repisa_la_fecha(self):
        self.client.patch('/api/performance/onboarding/', RESPUESTAS_COMPLETAS, format='json')
        primera = self.client.patch(
            '/api/performance/onboarding/', {'completado': True}, format='json',
        ).data['completado_at']
        segunda = self.client.patch(
            '/api/performance/onboarding/', {'completado': True}, format='json',
        ).data['completado_at']
        self.assertEqual(primera, segunda)

    def test_me_refleja_el_flag_tras_completar(self):
        self.client.patch('/api/performance/onboarding/', RESPUESTAS_COMPLETAS, format='json')
        self.client.patch('/api/performance/onboarding/', {'completado': True}, format='json')
        res = self.client.get('/api/performance/me/')
        self.assertTrue(res.data['onboarding_completo'])

    # ── Aislamiento entre cuentas ─────────────────────────────────────────────

    def test_el_onboarding_es_por_usuario(self):
        self.client.patch('/api/performance/onboarding/', RESPUESTAS_COMPLETAS, format='json')
        self.client.patch('/api/performance/onboarding/', {'completado': True}, format='json')

        otro = User.objects.create_user(
            username='otro@x.com', email='otro@x.com', password='x', role='director_tecnico',
        )
        cliente_otro = APIClient()
        cliente_otro.force_authenticate(user=otro)
        res = cliente_otro.get('/api/performance/onboarding/')
        self.assertFalse(res.data['completado'])
        self.assertEqual(res.data['pais'], '')

    def test_anonimo_rechazado(self):
        anon = APIClient()
        self.assertIn(anon.get('/api/performance/onboarding/').status_code, (401, 403))
