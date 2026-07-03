"""Aislamiento entre tenants de Zyfit Academy (hallazgo de auditoría de
seguridad: `X-Tenant-Slug` lo controla el cliente sin ningún vínculo real
usuario↔tenant en la base de datos).

Fix retrocompatible: `User.academy_tenant` (nullable) se estampa SOLO al
registrarse según el tenant resuelto por `TenantMiddleware` en ese momento, y
`academy.permissions.tenant_mismatch` (usado por `IsAcademyUser` y
`academy_login`) rechaza un choque real entre dos tenants concretos. Cuentas
sin `academy_tenant` (todas las anteriores a este campo, o registradas sin
header) NO quedan restringidas — verificado explícitamente abajo.
"""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from academy.models import Tenant

User = get_user_model()


def _tenant(slug, nombre=None, activo=True):
    return Tenant.objects.create(
        nombre=nombre or slug, slug=slug, dominio=f'{slug}.zyfit.app', activo=activo,
    )


class RegistroEstampaTenantTests(TestCase):
    """`register`/`academy_login` están limitados por throttle (register
    5/hora, login 10/min) sobre el cache en memoria del proceso — compartido
    por TODA la corrida de `manage.py test`, no solo por este módulo. Sin
    limpiarlo, estos tests consumen presupuesto real y pueden hacer fallar con
    429 a otros tests (p. ej. `users.test_google_login`) que corren después
    en el mismo proceso."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def test_estampa_tenant_cuando_hay_header(self):
        _tenant('conmebol')
        res = self.client.post(
            '/api/auth/register/', {'email': 'nuevo@x.com', 'password': 'contrasena123'},
            format='json', HTTP_X_TENANT_SLUG='conmebol',
        )
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='nuevo@x.com')
        self.assertEqual(user.academy_tenant.slug, 'conmebol')

    def test_sin_header_no_estampa_tenant(self):
        res = self.client.post(
            '/api/auth/register/', {'email': 'nuevo2@x.com', 'password': 'contrasena123'}, format='json',
        )
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='nuevo2@x.com')
        self.assertIsNone(user.academy_tenant)

    def test_header_de_tenant_inactivo_no_estampa_nada(self):
        _tenant('viejo', activo=False)
        res = self.client.post(
            '/api/auth/register/', {'email': 'nuevo3@x.com', 'password': 'contrasena123'},
            format='json', HTTP_X_TENANT_SLUG='viejo',
        )
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='nuevo3@x.com')
        self.assertIsNone(user.academy_tenant)


class LoginTenantMismatchTests(TestCase):
    def setUp(self):
        cache.clear()  # academy_login también está limitado por throttle (ver arriba)
        self.client = APIClient()
        self.tenant_a = _tenant('conmebol')
        self.tenant_b = _tenant('zyfit-academy')
        self.user_a = User.objects.create_user(
            username='alu-a@x.com', email='alu-a@x.com', password='x', academy_tenant=self.tenant_a,
        )
        self.user_sin_tenant = User.objects.create_user(
            username='alu-legacy@x.com', email='alu-legacy@x.com', password='x',
        )

    def tearDown(self):
        cache.clear()

    def test_rechaza_login_de_cuenta_de_otro_tenant(self):
        res = self.client.post(
            '/api/academy/auth/login/', {'email': 'alu-a@x.com', 'password': 'x'},
            format='json', HTTP_X_TENANT_SLUG='zyfit-academy',
        )
        self.assertEqual(res.status_code, 403)

    def test_permite_login_del_mismo_tenant(self):
        res = self.client.post(
            '/api/academy/auth/login/', {'email': 'alu-a@x.com', 'password': 'x'},
            format='json', HTTP_X_TENANT_SLUG='conmebol',
        )
        self.assertEqual(res.status_code, 200)

    def test_permite_login_sin_header_de_tenant(self):
        """Sin X-Tenant-Slug (p. ej. dominio raíz) no hay choque: request.tenant
        es None, y un None de cualquier lado nunca se considera mismatch."""
        res = self.client.post(
            '/api/academy/auth/login/', {'email': 'alu-a@x.com', 'password': 'x'}, format='json',
        )
        self.assertEqual(res.status_code, 200)

    def test_cuenta_sin_tenant_puede_loguearse_en_cualquier_tenant(self):
        """Retrocompatibilidad: cuentas registradas antes de este campo (o sin
        header al registrarse) NO quedan restringidas a ningún tenant."""
        for slug in ('conmebol', 'zyfit-academy'):
            res = self.client.post(
                '/api/academy/auth/login/', {'email': 'alu-legacy@x.com', 'password': 'x'},
                format='json', HTTP_X_TENANT_SLUG=slug,
            )
            self.assertEqual(res.status_code, 200, slug)


class IsAcademyUserTenantMismatchTests(TestCase):
    """`IsAcademyUser` es el único permiso que ya usan TODAS las vistas de
    Academy — probarlo contra un endpoint cualquiera (`/schools/`) cubre el
    resto por construcción."""

    def setUp(self):
        self.client = APIClient()
        self.tenant_a = _tenant('conmebol')
        self.tenant_b = _tenant('zyfit-academy')
        self.user_a = User.objects.create_user(
            username='alu-a@x.com', email='alu-a@x.com', password='x', academy_tenant=self.tenant_a,
        )
        self.user_sin_tenant = User.objects.create_user(
            username='alu-legacy@x.com', email='alu-legacy@x.com', password='x',
        )
        self.client.force_authenticate(self.user_a)

    def test_bloquea_acceso_con_header_de_otro_tenant(self):
        res = self.client.get('/api/academy/schools/', HTTP_X_TENANT_SLUG='zyfit-academy')
        self.assertEqual(res.status_code, 403)

    def test_permite_acceso_con_header_del_propio_tenant(self):
        res = self.client.get('/api/academy/schools/', HTTP_X_TENANT_SLUG='conmebol')
        self.assertEqual(res.status_code, 200)

    def test_permite_acceso_sin_header_de_tenant(self):
        res = self.client.get('/api/academy/schools/')
        self.assertEqual(res.status_code, 200)

    def test_cuenta_sin_tenant_no_se_ve_afectada(self):
        self.client.force_authenticate(self.user_sin_tenant)
        res = self.client.get('/api/academy/schools/', HTTP_X_TENANT_SLUG='conmebol')
        self.assertEqual(res.status_code, 200)
