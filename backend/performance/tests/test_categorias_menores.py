"""Tests de la Fase 3A — categorías e institución educativa + datos de menores.

La mitad importante es la segunda: la capa de protección de menores decide si
se puede registrar la lesión o la evaluación psicológica de un chico. Un fallo
silencioso ahí no se ve en la interfaz, se ve en un incidente.

Reglas que se fijan acá:
  · Sin `proteccion_menores` en el centro, nada cambia (los centros que ya
    existían siguen operando igual — es la razón de que el flag exista).
  · Con protección: mayor de edad pasa; menor sin consentimiento se bloquea;
    menor con consentimiento pasa SOLO para las categorías autorizadas.
  · Sin fecha de nacimiento se trata como MENOR. Un dato faltante no puede
    volverse permiso para registrar la salud de un chico.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import (
    SportsCenter, CenterMembership, CenterAthlete, Categoria, ConsentimientoTutor,
    SEGMENTO_INSTITUCIONES,
    DATO_SALUD, DATO_PSICOLOGICO, DATO_ANTROPOMETRICO,
)
from users.models import Profile

User = get_user_model()


def _nacido_hace(anios: int) -> date:
    hoy = date.today()
    # 30 días de margen para no quedar justo en el cumpleaños.
    return hoy.replace(year=hoy.year - anios) - timedelta(days=30)


class _Base(TestCase):
    def setUp(self):
        self.director = User.objects.create_user(
            username='dir@x.com', email='dir@x.com', password='x', role='director_tecnico',
        )
        self.center = SportsCenter.objects.create(
            nombre='Colegio San Juan', slug='colegio-san-juan',
            tipo=SEGMENTO_INSTITUCIONES, proteccion_menores=True,
        )
        CenterMembership.objects.create(
            center=self.center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.director)

    def _alta_atleta(self, email, anios=None):
        """Crea un atleta del centro; `anios` fija su edad (None = sin fecha)."""
        user = User.objects.create_user(username=email, email=email, password='x', role='athlete')
        Profile.objects.create(
            user=user, nombre=email.split('@')[0],
            fecha_nacimiento=_nacido_hace(anios) if anios is not None else None,
        )
        return CenterAthlete.objects.create(
            center=self.center, athlete=user, registrado_por=self.director,
        )


class CategoriaTests(_Base):
    def test_crear_y_listar_categorias(self):
        res = self.client.post(
            f'/api/performance/centers/{self.center.id}/categorias/',
            {'nombre': 'Sub-14', 'temporada': '2026', 'orden': 2},
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['nombre'], 'Sub-14')
        self.assertEqual(res.data['total_atletas'], 0)

        listado = self.client.get(f'/api/performance/centers/{self.center.id}/categorias/')
        self.assertEqual(len(listado.data), 1)

    def test_la_misma_categoria_puede_existir_en_dos_temporadas(self):
        """Es lo que habilita la lectura longitudinal: Sub-14 2026 y Sub-14 2027
        son filas distintas y comparables."""
        url = f'/api/performance/centers/{self.center.id}/categorias/'
        self.assertEqual(self.client.post(url, {'nombre': 'Sub-14', 'temporada': '2026'}, format='json').status_code, 201)
        self.assertEqual(self.client.post(url, {'nombre': 'Sub-14', 'temporada': '2027'}, format='json').status_code, 201)

    def test_no_se_duplica_dentro_de_la_misma_temporada(self):
        url = f'/api/performance/centers/{self.center.id}/categorias/'
        self.client.post(url, {'nombre': 'Sub-14', 'temporada': '2026'}, format='json')
        res = self.client.post(url, {'nombre': 'Sub-14', 'temporada': '2026'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_borrar_categoria_no_borra_a_sus_atletas(self):
        cat = Categoria.objects.create(center=self.center, nombre='Sub-16')
        atleta = self._alta_atleta('a1@x.com', anios=15)
        atleta.categoria = cat
        atleta.save()

        res = self.client.delete(
            f'/api/performance/centers/{self.center.id}/categorias/{cat.id}/'
        )
        self.assertEqual(res.status_code, 204)
        atleta.refresh_from_db()
        self.assertIsNone(atleta.categoria)
        self.assertTrue(CenterAthlete.objects.filter(pk=atleta.pk).exists())

    def test_staff_no_director_no_crea_categorias(self):
        fisio = User.objects.create_user(
            username='f@x.com', email='f@x.com', password='x', role='athlete',
        )
        CenterMembership.objects.create(
            center=self.center, user=fisio, rol=CenterMembership.ROL_FISIO, modulos=['lesiones'],
        )
        cliente = APIClient()
        cliente.force_authenticate(user=fisio)
        res = cliente.post(
            f'/api/performance/centers/{self.center.id}/categorias/',
            {'nombre': 'Sub-18'}, format='json',
        )
        self.assertEqual(res.status_code, 403)

    def test_categorias_de_otro_centro_no_se_ven(self):
        otro = SportsCenter.objects.create(nombre='Otro', slug='otro')
        Categoria.objects.create(center=otro, nombre='Sub-14')
        res = self.client.get(f'/api/performance/centers/{self.center.id}/categorias/')
        self.assertEqual(len(res.data), 0)


class CentroEducativoNuevoTests(TestCase):
    """Un centro educativo nuevo nace protegido; los que ya existían, no."""

    def setUp(self):
        self.director = User.objects.create_user(
            username='d@x.com', email='d@x.com', password='x', role='director_tecnico',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.director)

    def test_centro_educativo_nuevo_nace_con_proteccion(self):
        res = self.client.post(
            '/api/performance/centers/',
            {'nombre': 'Colegio Nuevo', 'slug': 'colegio-nuevo', 'tipo': SEGMENTO_INSTITUCIONES},
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['proteccion_menores'])

    def test_centro_de_equipos_no_la_activa_sola(self):
        res = self.client.post(
            '/api/performance/centers/',
            {'nombre': 'Club Nuevo', 'slug': 'club-nuevo', 'tipo': 'equipos'},
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.data['proteccion_menores'])

    def test_se_puede_activar_desde_ajustes(self):
        club = SportsCenter.objects.create(nombre='Club', slug='club')
        CenterMembership.objects.create(
            center=club, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        res = self.client.patch(
            f'/api/performance/centers/{club.id}/',
            {'proteccion_menores': True}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['proteccion_menores'])


class ProteccionMenoresTests(_Base):
    def _post_lesion(self, ca):
        return self.client.post(
            f'/api/performance/centers/{self.center.id}/lesiones/',
            {'athlete': ca.athlete_id, 'fecha': str(date.today()), 'zona': 'Isquiotibial'},
            format='json',
        )

    def _post_wellness(self, ca):
        return self.client.post(
            f'/api/performance/centers/{self.center.id}/psicologico/wellness/',
            {
                'athlete': ca.athlete_id, 'fecha': str(date.today()),
                'sueno': 4, 'fatiga': 3, 'estres': 2, 'dolor_muscular': 2, 'animo': 4,
            },
            format='json',
        )

    # ── El caso que no debe romperse ──────────────────────────────────────────

    def test_sin_proteccion_activa_todo_sigue_igual(self):
        """Los centros que ya existían tienen el flag en False: nada cambia para
        ellos, ni siquiera con un menor sin fecha de nacimiento."""
        self.center.proteccion_menores = False
        self.center.save()
        ca = self._alta_atleta('sinfecha@x.com', anios=None)
        self.assertEqual(self._post_lesion(ca).status_code, 201)

    # ── Con protección activa ─────────────────────────────────────────────────

    def test_mayor_de_edad_no_necesita_consentimiento(self):
        ca = self._alta_atleta('mayor@x.com', anios=25)
        self.assertEqual(self._post_lesion(ca).status_code, 201)

    def test_menor_sin_consentimiento_bloqueado(self):
        ca = self._alta_atleta('menor@x.com', anios=14)
        res = self._post_lesion(ca)
        self.assertEqual(res.status_code, 403)
        self.assertIn('consentimiento', str(res.data).lower())

    def test_sin_fecha_de_nacimiento_se_trata_como_menor(self):
        """Un dato faltante NO puede volverse permiso. El mensaje además dice
        cómo resolverlo."""
        ca = self._alta_atleta('sinfecha@x.com', anios=None)
        res = self._post_lesion(ca)
        self.assertEqual(res.status_code, 403)
        self.assertIn('fecha de nacimiento', str(res.data).lower())

    def test_menor_con_consentimiento_puede_registrar(self):
        ca = self._alta_atleta('menor@x.com', anios=14)
        ConsentimientoTutor.objects.create(
            athlete=ca, tutor_nombre='Ana Pérez', tutor_relacion='madre',
            alcance=[DATO_SALUD, DATO_PSICOLOGICO], otorgado_en=date.today(),
        )
        self.assertEqual(self._post_lesion(ca).status_code, 201)
        self.assertEqual(self._post_wellness(ca).status_code, 201)

    def test_el_alcance_del_consentimiento_se_respeta_por_categoria(self):
        """Autorizar salud no autoriza psicométricos: son categorías distintas."""
        ca = self._alta_atleta('menor@x.com', anios=14)
        ConsentimientoTutor.objects.create(
            athlete=ca, tutor_nombre='Ana Pérez', alcance=[DATO_SALUD],
            otorgado_en=date.today(),
        )
        self.assertEqual(self._post_lesion(ca).status_code, 201)
        self.assertEqual(self._post_wellness(ca).status_code, 403)

    def test_consentimiento_revocado_vuelve_a_bloquear(self):
        ca = self._alta_atleta('menor@x.com', anios=14)
        c = ConsentimientoTutor.objects.create(
            athlete=ca, tutor_nombre='Ana Pérez', alcance=[DATO_SALUD],
            otorgado_en=date.today() - timedelta(days=30),
        )
        self.assertEqual(self._post_lesion(ca).status_code, 201)
        c.revocado_en = date.today()
        c.save()
        self.assertEqual(self._post_lesion(ca).status_code, 403)

    # ── Endpoints de consentimiento ───────────────────────────────────────────

    def test_registrar_consentimiento_por_api(self):
        ca = self._alta_atleta('menor@x.com', anios=13)
        res = self.client.post(
            f'/api/performance/centers/{self.center.id}/athletes/{ca.id}/consentimientos/',
            {
                'tutor_nombre': 'Ana Pérez', 'tutor_relacion': 'madre',
                'alcance': [DATO_SALUD, DATO_ANTROPOMETRICO],
                'otorgado_en': str(date.today()), 'documento_ref': 'Expediente 2026-114',
            },
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['vigente'])
        self.assertEqual(res.data['alcance'], [DATO_SALUD, DATO_ANTROPOMETRICO])

    def test_consentimiento_sin_alcance_rechazado(self):
        """Un consentimiento que no autoriza nada aparenta cobertura sin darla."""
        ca = self._alta_atleta('menor@x.com', anios=13)
        res = self.client.post(
            f'/api/performance/centers/{self.center.id}/athletes/{ca.id}/consentimientos/',
            {'tutor_nombre': 'Ana', 'alcance': [], 'otorgado_en': str(date.today())},
            format='json',
        )
        self.assertEqual(res.status_code, 400)

    def test_alcance_desconocido_rechazado(self):
        ca = self._alta_atleta('menor@x.com', anios=13)
        res = self.client.post(
            f'/api/performance/centers/{self.center.id}/athletes/{ca.id}/consentimientos/',
            {'tutor_nombre': 'Ana', 'alcance': ['todo'], 'otorgado_en': str(date.today())},
            format='json',
        )
        self.assertEqual(res.status_code, 400)

    def test_revocar_por_api_no_borra_la_fila(self):
        ca = self._alta_atleta('menor@x.com', anios=13)
        c = ConsentimientoTutor.objects.create(
            athlete=ca, tutor_nombre='Ana', alcance=[DATO_SALUD], otorgado_en=date.today(),
        )
        res = self.client.patch(
            f'/api/performance/centers/{self.center.id}/athletes/{ca.id}/consentimientos/{c.id}/',
            {'revocado_en': str(date.today())}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['vigente'])
        self.assertTrue(ConsentimientoTutor.objects.filter(pk=c.pk).exists())

    def test_staff_no_director_no_registra_consentimientos(self):
        ca = self._alta_atleta('menor@x.com', anios=13)
        fisio = User.objects.create_user(
            username='f@x.com', email='f@x.com', password='x', role='athlete',
        )
        CenterMembership.objects.create(
            center=self.center, user=fisio, rol=CenterMembership.ROL_FISIO, modulos=['lesiones'],
        )
        cliente = APIClient()
        cliente.force_authenticate(user=fisio)
        res = cliente.post(
            f'/api/performance/centers/{self.center.id}/athletes/{ca.id}/consentimientos/',
            {'tutor_nombre': 'Ana', 'alcance': [DATO_SALUD], 'otorgado_en': str(date.today())},
            format='json',
        )
        self.assertEqual(res.status_code, 403)

    # ── Estado de protección (lo que explica el bloqueo en la interfaz) ───────

    def test_endpoint_de_proteccion_explica_el_estado(self):
        ca = self._alta_atleta('menor@x.com', anios=14)
        res = self.client.get(
            f'/api/performance/centers/{self.center.id}/athletes/{ca.id}/proteccion/'
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['proteccion_activa'])
        self.assertTrue(res.data['es_menor'])
        self.assertEqual(res.data['edad'], 14)
        self.assertIsNone(res.data['consentimiento'])
        self.assertFalse(res.data['permisos'][DATO_SALUD]['permitido'])
        # El motivo va al usuario: tiene que decir qué falta, no solo que no puede.
        self.assertTrue(res.data['permisos'][DATO_SALUD]['motivo'])

    def test_estado_del_plantel_completo(self):
        """La pregunta real de una institución: a cuántos les falta."""
        self._alta_atleta('mayor@x.com', anios=25)          # sin pendiente
        self._alta_atleta('menor1@x.com', anios=14)         # pendiente
        ca = self._alta_atleta('menor2@x.com', anios=15)
        ConsentimientoTutor.objects.create(
            athlete=ca, tutor_nombre='Ana',
            alcance=[DATO_SALUD, DATO_PSICOLOGICO, DATO_ANTROPOMETRICO],
            otorgado_en=date.today(),
        )                                                    # sin pendiente
        res = self.client.get(f'/api/performance/centers/{self.center.id}/proteccion/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['total'], 3)
        self.assertEqual(res.data['pendientes'], 1)
        self.assertTrue(all('nombre' in a for a in res.data['atletas']))

    def test_endpoint_de_proteccion_con_consentimiento_parcial(self):
        ca = self._alta_atleta('menor@x.com', anios=14)
        ConsentimientoTutor.objects.create(
            athlete=ca, tutor_nombre='Ana', alcance=[DATO_SALUD], otorgado_en=date.today(),
        )
        res = self.client.get(
            f'/api/performance/centers/{self.center.id}/athletes/{ca.id}/proteccion/'
        )
        self.assertTrue(res.data['permisos'][DATO_SALUD]['permitido'])
        self.assertFalse(res.data['permisos'][DATO_PSICOLOGICO]['permitido'])
