"""Tests de la Biblioteca de recursos (academy.library_service + endpoints
GET/POST /library/*). Mismo estilo que test_badges.py: BD real (TestCase) +
APIClient con force_authenticate."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from academy.library_models import LibraryFavorite, LibraryResource
from academy.models import AcademySubscription, Course, School

User = get_user_model()


class _Base(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='alu@x.com', email='alu@x.com', password='x',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def _resource(self, **kwargs):
        defaults = dict(
            titulo='Guía de sentadilla', tipo='guia',
            url='https://example.com/guia.pdf', es_gratuito=True, activo=True,
        )
        defaults.update(kwargs)
        return LibraryResource.objects.create(**defaults)


class CatalogoEndpointTests(_Base):
    def test_lista_solo_recursos_activos(self):
        self._resource(titulo='Activo')
        self._resource(titulo='Inactivo', activo=False)

        res = self.client.get('/api/academy/library/')

        self.assertEqual(res.status_code, 200)
        titulos = [r['titulo'] for r in res.data]
        self.assertIn('Activo', titulos)
        self.assertNotIn('Inactivo', titulos)

    def test_filtro_por_tipo(self):
        self._resource(titulo='Doc', tipo='documento')
        self._resource(titulo='Vid', tipo='video')

        res = self.client.get('/api/academy/library/', {'tipo': 'video'})

        self.assertEqual(res.status_code, 200)
        self.assertEqual([r['titulo'] for r in res.data], ['Vid'])

    def test_filtro_por_escuela_y_curso(self):
        school = School.objects.create(nombre='Escuela 1', slug='escuela-1')
        otra_escuela = School.objects.create(nombre='Escuela 2', slug='escuela-2')
        course = Course.objects.create(school=school, titulo='Curso 1', slug='curso-1')
        self._resource(titulo='De la escuela', school=school)
        self._resource(titulo='Del curso', school=school, course=course)
        self._resource(titulo='De otra escuela', school=otra_escuela)

        res_escuela = self.client.get('/api/academy/library/', {'school': school.id})
        self.assertEqual(
            {r['titulo'] for r in res_escuela.data}, {'De la escuela', 'Del curso'},
        )

        res_curso = self.client.get('/api/academy/library/', {'course': course.id})
        self.assertEqual([r['titulo'] for r in res_curso.data], ['Del curso'])

    def test_busqueda_por_texto(self):
        self._resource(titulo='Periodización de fuerza', descripcion='')
        self._resource(titulo='Nutrición pre-competencia', descripcion='')

        res = self.client.get('/api/academy/library/', {'q': 'fuerza'})

        self.assertEqual([r['titulo'] for r in res.data], ['Periodización de fuerza'])

    def test_filtro_destacados(self):
        self._resource(titulo='Normal', destacado=False)
        self._resource(titulo='Destacado', destacado=True)

        res = self.client.get('/api/academy/library/', {'destacados': '1'})

        self.assertEqual([r['titulo'] for r in res.data], ['Destacado'])

    def test_no_autenticado_403(self):
        self.client.force_authenticate(None)
        res = self.client.get('/api/academy/library/')
        self.assertIn(res.status_code, (401, 403))


class FreemiumGatingTests(_Base):
    def test_recurso_gratuito_no_esta_bloqueado_y_expone_url(self):
        r = self._resource(es_gratuito=True, url='https://example.com/libre.pdf')

        res = self.client.get('/api/academy/library/')

        item = res.data[0]
        self.assertFalse(item['bloqueado'])
        self.assertEqual(item['url'], 'https://example.com/libre.pdf')
        self.assertEqual(r.id, item['id'])

    def test_recurso_de_pago_llega_bloqueado_sin_url_para_tier_starter(self):
        self._resource(es_gratuito=False, url='https://example.com/pro.pdf')

        res = self.client.get('/api/academy/library/')

        item = res.data[0]
        self.assertTrue(item['bloqueado'])
        self.assertEqual(item['url'], '')

    def test_recurso_de_pago_desbloqueado_con_academy_pro_activo(self):
        AcademySubscription.objects.create(user=self.student, estado=AcademySubscription.ESTADO_ACTIVA)
        self._resource(es_gratuito=False, url='https://example.com/pro.pdf')

        res = self.client.get('/api/academy/library/')

        item = res.data[0]
        self.assertFalse(item['bloqueado'])
        self.assertEqual(item['url'], 'https://example.com/pro.pdf')

    def test_abrir_recurso_de_pago_sin_pro_devuelve_403(self):
        r = self._resource(es_gratuito=False, url='https://example.com/pro.pdf')

        res = self.client.post(f'/api/academy/library/{r.id}/abrir/')

        self.assertEqual(res.status_code, 403)

    def test_abrir_recurso_gratuito_suma_una_vista_y_devuelve_la_url(self):
        r = self._resource(es_gratuito=True, url='https://example.com/libre.pdf')

        res = self.client.post(f'/api/academy/library/{r.id}/abrir/')

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['url'], 'https://example.com/libre.pdf')
        r.refresh_from_db()
        self.assertEqual(r.vistas, 1)


class FavoritosTests(_Base):
    def test_alternar_favorito_marca_y_desmarca(self):
        r = self._resource()

        res1 = self.client.post(f'/api/academy/library/{r.id}/favorito/')
        self.assertEqual(res1.status_code, 200)
        self.assertTrue(res1.data['favorito'])
        self.assertTrue(LibraryFavorite.objects.filter(user=self.student, resource=r).exists())

        res2 = self.client.post(f'/api/academy/library/{r.id}/favorito/')
        self.assertFalse(res2.data['favorito'])
        self.assertFalse(LibraryFavorite.objects.filter(user=self.student, resource=r).exists())

    def test_catalogo_marca_favorito_true_para_el_usuario(self):
        r = self._resource()
        LibraryFavorite.objects.create(user=self.student, resource=r)

        res = self.client.get('/api/academy/library/')

        self.assertTrue(res.data[0]['favorito'])

    def test_favorito_es_por_usuario_no_global(self):
        r = self._resource()
        LibraryFavorite.objects.create(user=self.student, resource=r)
        otro = User.objects.create_user(username='otro@x.com', email='otro@x.com', password='x')
        self.client.force_authenticate(otro)

        res = self.client.get('/api/academy/library/')

        self.assertFalse(res.data[0]['favorito'])

    def test_filtro_favoritos_1_solo_devuelve_los_marcados(self):
        marcado = self._resource(titulo='Marcado')
        self._resource(titulo='Sin marcar')
        LibraryFavorite.objects.create(user=self.student, resource=marcado)

        res = self.client.get('/api/academy/library/', {'favoritos': '1'})

        self.assertEqual([r['titulo'] for r in res.data], ['Marcado'])
