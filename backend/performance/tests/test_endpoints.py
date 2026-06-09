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
    TacticalPlay, CalendarEvent, InjuryReport, PsychAssessment,
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

    def test_cuenta_activa_segun_password(self):
        # El atleta base tiene contraseña usable → cuenta activa.
        res = self.client.get(f'/api/performance/centers/{self.center.id}/athletes/')
        self.assertEqual(res.status_code, 200)
        base = next(a for a in res.json() if a['id'] == self.link_id())
        self.assertTrue(base['cuenta_activa'])

        # Atleta dado de alta sin contraseña usable (cuenta de consumo por reclamar)
        # → invitación pendiente.
        pend = User.objects.create_user(
            username='pend@x.com', email='pend@x.com', role='athlete', password=None,
        )
        CenterAthlete.objects.create(center=self.center, athlete=pend, registrado_por=self.director)
        res = self.client.get(f'/api/performance/centers/{self.center.id}/athletes/')
        fila = next(a for a in res.json() if a['athlete'] == pend.id)
        self.assertFalse(fila['cuenta_activa'])


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


class MePatchTests(_Base):
    """PATCH /me/ — el propio usuario actualiza su nombre visible y se refleja en
    el payload (saludo "Hola, X", avatares) y en Profile."""

    URL = '/api/performance/me/'

    def test_actualiza_nombre(self):
        res = self.client.patch(self.URL, {'nombre': 'Sebastián Cordero'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['nombre'], 'Sebastián Cordero')
        self.director.refresh_from_db()
        self.assertEqual(self.director.first_name, 'Sebastián Cordero')
        self.assertEqual(self.director.last_name, '')
        from users.models import Profile
        self.assertEqual(Profile.objects.get(user=self.director).nombre, 'Sebastián Cordero')

    def test_recorta_espacios(self):
        res = self.client.patch(self.URL, {'nombre': '  Ana  '}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['nombre'], 'Ana')

    def test_rechaza_nombre_vacio(self):
        res = self.client.patch(self.URL, {'nombre': '   '}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('nombre', res.json())

    def test_requiere_acceso_panel(self):
        self.client.force_authenticate(self.athlete)
        res = self.client.patch(self.URL, {'nombre': 'Hacker'}, format='json')
        self.assertEqual(res.status_code, 403)


class CalendarEndpointTests(_Base):
    """Calendario del centro: crear/listar/editar/borrar eventos, filtro por
    rango (solapamiento) y validación de fechas."""

    def url(self):
        return f'/api/performance/centers/{self.center.id}/calendario/'

    def detail(self, event_id):
        return f'/api/performance/centers/{self.center.id}/calendario/{event_id}/'

    def test_crea_partido(self):
        res = self.client.post(self.url(), {
            'tipo': 'partido', 'titulo': 'vs Rival FC', 'fecha_inicio': '2026-08-10',
            'rival': 'Rival FC', 'localia': 'local', 'hora_inicio': '18:00', 'todo_el_dia': False,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        ev = CalendarEvent.objects.get()
        self.assertEqual(ev.tipo, 'partido')
        self.assertEqual(ev.rival, 'Rival FC')
        self.assertEqual(ev.registrado_por, self.director)
        self.assertEqual(ev.center, self.center)

    def test_crea_temporada_con_rango(self):
        res = self.client.post(self.url(), {
            'tipo': 'temporada', 'titulo': 'Temporada 2026/27',
            'fecha_inicio': '2026-07-01', 'fecha_fin': '2027-05-30',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertIn('registrado_por_nombre', res.json())

    def test_rechaza_fin_antes_de_inicio(self):
        res = self.client.post(self.url(), {
            'tipo': 'torneo', 'titulo': 'Copa', 'fecha_inicio': '2026-08-10', 'fecha_fin': '2026-08-01',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('fecha_fin', res.json())

    def test_filtra_por_rango_solapamiento(self):
        CalendarEvent.objects.create(center=self.center, tipo='partido', titulo='Julio', fecha_inicio='2026-07-15')
        CalendarEvent.objects.create(center=self.center, tipo='partido', titulo='Septiembre', fecha_inicio='2026-09-15')
        # Temporada larga que solapa agosto aunque empiece en julio.
        CalendarEvent.objects.create(
            center=self.center, tipo='temporada', titulo='Temporada',
            fecha_inicio='2026-07-01', fecha_fin='2027-05-30',
        )
        res = self.client.get(self.url() + '?desde=2026-08-01&hasta=2026-08-31')
        self.assertEqual(res.status_code, 200)
        titulos = {e['titulo'] for e in res.json()}
        self.assertEqual(titulos, {'Temporada'})  # solo la que solapa agosto

    def test_edita_y_borra(self):
        ev = CalendarEvent.objects.create(center=self.center, tipo='otro', titulo='X', fecha_inicio='2026-08-10')
        res = self.client.patch(self.detail(ev.id), {'titulo': 'Reunión técnica'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        ev.refresh_from_db()
        self.assertEqual(ev.titulo, 'Reunión técnica')
        res = self.client.delete(self.detail(ev.id))
        self.assertEqual(res.status_code, 204)
        self.assertFalse(CalendarEvent.objects.filter(pk=ev.id).exists())

    def test_requiere_acceso_panel(self):
        self.client.force_authenticate(self.athlete)
        res = self.client.get(self.url())
        self.assertEqual(res.status_code, 403)

    def test_fuera_de_scope_404(self):
        otro = SportsCenter.objects.create(nombre='Otro', slug='otro-cal')
        ev = CalendarEvent.objects.create(center=otro, tipo='otro', titulo='Ajeno', fecha_inicio='2026-08-10')
        res = self.client.get(f'/api/performance/centers/{otro.id}/calendario/{ev.id}/')
        self.assertEqual(res.status_code, 404)


class ModuleGatingTests(_Base):
    """Gating fino server-side: cada miembro de staff solo accede a los módulos de
    su pertenencia, no solo en el sidebar (antes podía entrar por URL a cualquiera).

    Caso sensible: el módulo PSICOLÓGICO (datos de salud) queda restringido a
    psicólogo + director, nunca al resto del staff.
    """

    def setUp(self):
        super().setUp()
        # Fisio: su rol siembra modulos=['lesiones']. Cuenta sin rol B2B global;
        # el acceso al panel se lo da la membresía activa.
        self.fisio = User.objects.create_user(
            username='fisio@x.com', email='fisio@x.com', password='x', role='athlete',
        )
        CenterMembership.objects.create(
            center=self.center, user=self.fisio, rol=CenterMembership.ROL_FISIO,
        )
        # Psicólogo: su rol siembra modulos=['psicologico'].
        self.psico = User.objects.create_user(
            username='psico@x.com', email='psico@x.com', password='x', role='athlete',
        )
        CenterMembership.objects.create(
            center=self.center, user=self.psico, rol=CenterMembership.ROL_PSICOLOGO,
        )

    def mod_url(self, modulo):
        return f'/api/performance/centers/{self.center.id}/{modulo}/'

    # ── El fisio solo ve su módulo ───────────────────────────────────────────
    def test_fisio_accede_a_lesiones(self):
        self.client.force_authenticate(self.fisio)
        res = self.client.get(self.mod_url('lesiones'))
        self.assertEqual(res.status_code, 200)

    def test_fisio_no_accede_a_psicologico(self):
        # El agujero principal: datos de salud mental visibles a cualquier staff.
        self.client.force_authenticate(self.fisio)
        res = self.client.get(self.mod_url('psicologico'))
        self.assertEqual(res.status_code, 403)

    def test_fisio_no_accede_a_wellness(self):
        self.client.force_authenticate(self.fisio)
        res = self.client.get(self.mod_url('psicologico') + 'wellness/')
        self.assertEqual(res.status_code, 403)

    def test_fisio_no_accede_a_rendimiento_test_ni_planificacion(self):
        self.client.force_authenticate(self.fisio)
        for modulo in ('rendimiento', 'test', 'planificacion'):
            res = self.client.get(self.mod_url(modulo))
            self.assertEqual(res.status_code, 403, f'{modulo} debería estar vetado al fisio')

    # ── El psicólogo solo ve psicológico ─────────────────────────────────────
    def test_psicologo_accede_a_psicologico(self):
        self.client.force_authenticate(self.psico)
        res = self.client.get(self.mod_url('psicologico'))
        self.assertEqual(res.status_code, 200)

    def test_psicologo_no_accede_a_lesiones(self):
        self.client.force_authenticate(self.psico)
        res = self.client.get(self.mod_url('lesiones'))
        self.assertEqual(res.status_code, 403)

    # ── El director ve todos los módulos ─────────────────────────────────────
    def test_director_ve_todos_los_modulos(self):
        # self.client ya está autenticado como director en _Base.
        for modulo in ('rendimiento', 'lesiones', 'test', 'planificacion', 'psicologico'):
            res = self.client.get(self.mod_url(modulo))
            self.assertEqual(res.status_code, 200, f'el director debería ver {modulo}')
        res = self.client.get(self.mod_url('psicologico') + 'wellness/')
        self.assertEqual(res.status_code, 200)

    # ── El admin de producto ve todo en cualquier centro ─────────────────────
    def test_admin_ve_todo_sin_membresia(self):
        admin = User.objects.create_user(
            username='admin@x.com', email='admin@x.com', password='x', is_staff=True,
        )
        self.client.force_authenticate(admin)
        for modulo in ('rendimiento', 'lesiones', 'test', 'planificacion', 'psicologico'):
            res = self.client.get(self.mod_url(modulo))
            self.assertEqual(res.status_code, 200, f'el admin debería ver {modulo}')

    # ── El gating del módulo no se salta el scope de centro ───────────────────
    def test_fuera_de_scope_sigue_404(self):
        # Aunque el módulo esté permitido por rol, un centro ajeno responde 404.
        otro = SportsCenter.objects.create(nombre='Otro', slug='otro-gating')
        self.client.force_authenticate(self.fisio)
        res = self.client.get(f'/api/performance/centers/{otro.id}/lesiones/')
        self.assertEqual(res.status_code, 404)

    # ── Simulador y Calendario NO están gateados (herramientas del cuerpo técnico)
    def test_simulador_y_calendario_abiertos_a_cualquier_staff(self):
        self.client.force_authenticate(self.fisio)
        self.assertEqual(self.client.get(f'/api/performance/centers/{self.center.id}/simulador/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/performance/centers/{self.center.id}/calendario/').status_code, 200)


class InjuryEndpointTests(_Base):
    """Módulo LESIONES cableado a datos reales: alta del parte con ubicación en el
    mapa corporal, detalle, dar de alta (edición) y borrado."""

    def url(self):
        return f'/api/performance/centers/{self.center.id}/lesiones/'

    def detail(self, rec_id):
        return f'/api/performance/centers/{self.center.id}/lesiones/{rec_id}/'

    def test_crea_parte_con_mapa_corporal(self):
        res = self.client.post(self.url(), {
            'athlete': self.athlete.id, 'fecha': '2026-06-01',
            'zona': 'Isquiotibial izq.', 'tipo': 'muscular', 'severidad': 'grave',
            'estado': 'activa', 'mecanismo': 'Sprint',
            'vista': 'espalda', 'zona_x': 85, 'zona_y': 250,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        obj = InjuryReport.objects.get()
        self.assertEqual(obj.zona, 'Isquiotibial izq.')
        self.assertEqual(obj.vista, 'espalda')
        self.assertEqual(obj.zona_x, 85)
        self.assertEqual(obj.registrado_por, self.director)
        # dias_baja lo deriva el servidor (lesión activa → > 0).
        self.assertGreaterEqual(res.json()['dias_baja'], 1)

    def test_coordenada_fuera_de_rango_400(self):
        res = self.client.post(self.url(), {
            'athlete': self.athlete.id, 'fecha': '2026-06-01', 'zona': 'X',
            'vista': 'frente', 'zona_x': 999, 'zona_y': 10,  # x > 200
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_dar_de_alta_via_patch(self):
        inj = InjuryReport.objects.create(
            center=self.center, athlete=self.athlete, fecha=date(2026, 6, 1),
            zona='Tobillo', estado='activa',
        )
        res = self.client.patch(self.detail(inj.id), {'estado': 'alta'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        inj.refresh_from_db()
        self.assertEqual(inj.estado, 'alta')
        self.assertEqual(res.json()['dias_baja'], 0)  # con alta, 0

    def test_borra_parte(self):
        inj = InjuryReport.objects.create(
            center=self.center, athlete=self.athlete, fecha=date(2026, 6, 1), zona='Z',
        )
        res = self.client.delete(self.detail(inj.id))
        self.assertEqual(res.status_code, 204)
        self.assertFalse(InjuryReport.objects.filter(pk=inj.id).exists())

    def test_detalle_fuera_de_scope_404(self):
        otro = SportsCenter.objects.create(nombre='Otro', slug='otro-inj')
        inj = InjuryReport.objects.create(
            center=otro, athlete=self.athlete, fecha=date(2026, 6, 1), zona='Z',
        )
        res = self.client.get(f'/api/performance/centers/{otro.id}/lesiones/{inj.id}/')
        self.assertEqual(res.status_code, 404)


class ModuleRecordDeleteTests(_Base):
    """Borrado de registros de Test y Psicológico (no editables: el cálculo lo hace
    el servidor) y respeto del gating fino en los endpoints de detalle."""

    def test_borra_resultado_de_test(self):
        t = PhysicalTest.objects.create(
            center=self.center, athlete=self.athlete, fecha=date(2026, 6, 1),
            nombre='Cooper', resultado=2800,
        )
        url = f'/api/performance/centers/{self.center.id}/test/{t.id}/'
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(PhysicalTest.objects.filter(pk=t.id).exists())

    def test_test_no_editable_405(self):
        t = PhysicalTest.objects.create(
            center=self.center, athlete=self.athlete, fecha=date(2026, 6, 1),
            nombre='Cooper', resultado=2800,
        )
        url = f'/api/performance/centers/{self.center.id}/test/{t.id}/'
        res = self.client.patch(url, {'resultado': 9999}, format='json')
        self.assertEqual(res.status_code, 405)

    def test_borra_evaluacion_psicologica(self):
        p = PsychAssessment.objects.create(
            center=self.center, athlete=self.athlete, fecha=date(2026, 6, 1),
            tipo='otro', puntuacion=50,
        )
        url = f'/api/performance/centers/{self.center.id}/psicologico/{p.id}/'
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(PsychAssessment.objects.filter(pk=p.id).exists())

    def test_gating_aplica_en_detalle(self):
        # Un fisio (modulos=['lesiones']) no puede borrar una evaluación psicológica.
        fisio = User.objects.create_user(
            username='fis2@x.com', email='fis2@x.com', password='x', role='athlete',
        )
        CenterMembership.objects.create(center=self.center, user=fisio, rol=CenterMembership.ROL_FISIO)
        p = PsychAssessment.objects.create(
            center=self.center, athlete=self.athlete, fecha=date(2026, 6, 1), tipo='otro', puntuacion=50,
        )
        self.client.force_authenticate(fisio)
        url = f'/api/performance/centers/{self.center.id}/psicologico/{p.id}/'
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.assertTrue(PsychAssessment.objects.filter(pk=p.id).exists())


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
