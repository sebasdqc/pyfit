"""Tests del panel de administración de usuarios de Zyfit Academy
(GET/POST /api/academy/admin/usuarios/) — SOLO accesible a IsAcademyAdmin.
Mismo estilo que test_badges.py/test_library.py: BD real (TestCase) +
APIClient con force_authenticate."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from academy.models import Tenant

User = get_user_model()


def _tenant(slug, nombre=None):
    return Tenant.objects.create(nombre=nombre or slug, slug=slug, dominio=f'{slug}.zyfit.app')


class _Base(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@x.com', email='admin@x.com', password='x', role=User.ROLE_ADMIN,
        )
        self.instructor = User.objects.create_user(
            username='ins@x.com', email='ins@x.com', password='x', academy_instructor=True,
        )
        self.student = User.objects.create_user(username='alu@x.com', email='alu@x.com', password='x')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)


class PermisosTests(_Base):
    def test_admin_puede_listar(self):
        res = self.client.get('/api/academy/admin/usuarios/')
        self.assertEqual(res.status_code, 200)

    def test_instructor_no_puede_listar_ni_crear(self):
        self.client.force_authenticate(self.instructor)
        self.assertEqual(self.client.get('/api/academy/admin/usuarios/').status_code, 403)
        res = self.client.post('/api/academy/admin/usuarios/', {
            'email': 'x@x.com', 'password': 'contrasena123', 'nombre': 'X', 'rol': 'estudiante',
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_estudiante_no_puede_listar_ni_crear(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get('/api/academy/admin/usuarios/').status_code, 403)

    def test_no_autenticado_403(self):
        self.client.force_authenticate(None)
        res = self.client.get('/api/academy/admin/usuarios/')
        self.assertIn(res.status_code, (401, 403))

    def test_staff_de_django_tambien_puede(self):
        staff = User.objects.create_user(username='staff@x.com', email='staff@x.com', password='x', is_staff=True)
        self.client.force_authenticate(staff)
        self.assertEqual(self.client.get('/api/academy/admin/usuarios/').status_code, 200)


class CreacionPorRolTests(_Base):
    def test_crea_estudiante(self):
        res = self.client.post('/api/academy/admin/usuarios/', {
            'email': 'nuevo@x.com', 'password': 'contrasena123', 'nombre': 'Nuevo', 'rol': 'estudiante',
        }, format='json')

        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['rol'], 'estudiante')
        user = User.objects.get(email='nuevo@x.com')
        self.assertFalse(user.is_admin)
        self.assertFalse(user.academy_instructor)
        self.assertEqual(user.profile.nombre, 'Nuevo')
        self.assertTrue(user.check_password('contrasena123'))

    def test_crea_profesor(self):
        res = self.client.post('/api/academy/admin/usuarios/', {
            'email': 'prof@x.com', 'password': 'contrasena123', 'nombre': 'Prof', 'rol': 'profesor',
        }, format='json')

        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['rol'], 'profesor')
        user = User.objects.get(email='prof@x.com')
        self.assertTrue(user.academy_instructor)
        self.assertFalse(user.is_admin)

    def test_crea_admin(self):
        res = self.client.post('/api/academy/admin/usuarios/', {
            'email': 'admin2@x.com', 'password': 'contrasena123', 'nombre': 'Admin 2', 'rol': 'admin',
        }, format='json')

        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['rol'], 'admin')
        user = User.objects.get(email='admin2@x.com')
        self.assertTrue(user.is_admin)
        self.assertEqual(user.role, User.ROLE_ADMIN)


class ValidacionTests(_Base):
    def test_rechaza_email_duplicado(self):
        res = self.client.post('/api/academy/admin/usuarios/', {
            'email': self.student.email, 'password': 'contrasena123', 'nombre': 'Dup', 'rol': 'estudiante',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)

    def test_rechaza_password_corta(self):
        res = self.client.post('/api/academy/admin/usuarios/', {
            'email': 'x@x.com', 'password': '123', 'nombre': 'X', 'rol': 'estudiante',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('password', res.data)

    def test_rechaza_rol_invalido(self):
        res = self.client.post('/api/academy/admin/usuarios/', {
            'email': 'x@x.com', 'password': 'contrasena123', 'nombre': 'X', 'rol': 'super-admin',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('rol', res.data)

    def test_rechaza_nombre_vacio(self):
        res = self.client.post('/api/academy/admin/usuarios/', {
            'email': 'x@x.com', 'password': 'contrasena123', 'nombre': '', 'rol': 'estudiante',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('nombre', res.data)
        self.assertFalse(User.objects.filter(email='x@x.com').exists())


class ListadoYFiltrosTests(_Base):
    def test_filtra_por_rol(self):
        res = self.client.get('/api/academy/admin/usuarios/', {'rol': 'profesor'})
        self.assertEqual(res.status_code, 200)
        emails = [u['email'] for u in res.data]
        self.assertIn(self.instructor.email, emails)
        self.assertNotIn(self.student.email, emails)
        self.assertNotIn(self.admin.email, emails)

    def test_busqueda_por_email(self):
        res = self.client.get('/api/academy/admin/usuarios/', {'q': 'alu@'})
        self.assertEqual([u['email'] for u in res.data], [self.student.email])


class AislamientoPorTenantTests(_Base):
    """Un admin de un tenant NO ve ni crea usuarios de otro tenant (mismo
    criterio de seguridad que test_tenant_isolation.py)."""

    def test_admin_de_un_tenant_no_ve_usuarios_de_otro(self):
        conmebol = _tenant('conmebol')
        otro = _tenant('otro')
        self.admin.academy_tenant = conmebol
        self.admin.save(update_fields=['academy_tenant'])
        self.student.academy_tenant = otro
        self.student.save(update_fields=['academy_tenant'])

        res = self.client.get('/api/academy/admin/usuarios/', HTTP_X_TENANT_SLUG='conmebol')

        self.assertEqual(res.status_code, 200)
        self.assertNotIn(self.student.email, [u['email'] for u in res.data])

    def test_admin_no_puede_operar_con_header_de_otro_tenant(self):
        conmebol = _tenant('conmebol')
        _tenant('otro')
        self.admin.academy_tenant = conmebol
        self.admin.save(update_fields=['academy_tenant'])

        res = self.client.get('/api/academy/admin/usuarios/', HTTP_X_TENANT_SLUG='otro')

        self.assertEqual(res.status_code, 403)

    def test_usuario_creado_hereda_el_tenant_resuelto_de_la_request(self):
        _tenant('conmebol')

        res = self.client.post(
            '/api/academy/admin/usuarios/',
            {'email': 'nuevo@x.com', 'password': 'contrasena123', 'nombre': 'Nuevo', 'rol': 'estudiante'},
            format='json', HTTP_X_TENANT_SLUG='conmebol',
        )

        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='nuevo@x.com')
        self.assertEqual(user.academy_tenant.slug, 'conmebol')
