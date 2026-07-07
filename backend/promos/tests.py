"""Tests de códigos de descuento y solicitudes de suscripción a Zyfit Pro y
Zyfit Academy Pro (`producto`). Mismo estilo que academy/tests/test_library.py:
BD real (TestCase) + APIClient con force_authenticate."""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.messages.middleware import MessageMiddleware
from django.contrib.sessions.middleware import SessionMiddleware
from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient, APITestCase

from academy.models import AcademySubscription
from promos.admin import SolicitudSuscripcionAdmin
from promos.models import (
    PRODUCTO_ACADEMY_PRO, PRODUCTO_ZYFIT_PRO, CodigoPromocional, Influencer, SolicitudSuscripcion,
)
from promos.payments import CodigoInvalidoError, calcular_precio
from users.models import Profile

User = get_user_model()


def make_user(email='atleta@example.com'):
    user = User.objects.create_user(email=email, username=email, password='testpass123')
    Profile.objects.get_or_create(user=user, defaults={'nombre': 'Atleta'})
    return user


def make_codigo(**kwargs):
    influencer = kwargs.pop('influencer', None) or Influencer.objects.create(nombre='María Fitness')
    defaults = dict(
        codigo='MARIA20', influencer=influencer, tipo_descuento=CodigoPromocional.TIPO_PORCENTAJE,
        valor_descuento=Decimal('20'), comision_monto=Decimal('5.00'), activo=True,
    )
    defaults.update(kwargs)
    return CodigoPromocional.objects.create(**defaults)


def make_admin_request():
    """Fake request apto para llamar acciones de ModelAdmin fuera del admin
    site real (necesitan `request._messages` para `messages.success`)."""
    request = RequestFactory().post('/')
    SessionMiddleware(lambda r: None).process_request(request)
    request.session.save()
    MessageMiddleware(lambda r: None).process_request(request)
    return request


class CalcularPrecioTests(TestCase):
    def test_sin_codigo_devuelve_precio_de_lista(self):
        precio_lista, descuento, precio_final = calcular_precio(PRODUCTO_ZYFIT_PRO, 'mensual', None)
        self.assertEqual(precio_lista, Decimal('9.99'))
        self.assertEqual(descuento, Decimal('0'))
        self.assertEqual(precio_final, Decimal('9.99'))

    def test_descuento_porcentaje(self):
        codigo = make_codigo(tipo_descuento=CodigoPromocional.TIPO_PORCENTAJE, valor_descuento=Decimal('20'))
        precio_lista, descuento, precio_final = calcular_precio(PRODUCTO_ZYFIT_PRO, 'mensual', codigo)
        self.assertEqual(precio_lista, Decimal('9.99'))
        self.assertEqual(descuento, Decimal('2.00'))
        self.assertEqual(precio_final, Decimal('7.99'))

    def test_descuento_fijo(self):
        codigo = make_codigo(codigo='MARIA5', tipo_descuento=CodigoPromocional.TIPO_FIJO, valor_descuento=Decimal('3.00'))
        precio_lista, descuento, precio_final = calcular_precio(PRODUCTO_ZYFIT_PRO, 'mensual', codigo)
        self.assertEqual(descuento, Decimal('3.00'))
        self.assertEqual(precio_final, Decimal('6.99'))

    def test_descuento_no_puede_superar_el_precio(self):
        codigo = make_codigo(codigo='GRATIS', tipo_descuento=CodigoPromocional.TIPO_FIJO, valor_descuento=Decimal('999'))
        _, descuento, precio_final = calcular_precio(PRODUCTO_ZYFIT_PRO, 'mensual', codigo)
        self.assertEqual(precio_final, Decimal('0'))

    def test_codigo_inactivo_lanza_error(self):
        codigo = make_codigo(activo=False)
        with self.assertRaises(CodigoInvalidoError):
            calcular_precio(PRODUCTO_ZYFIT_PRO, 'mensual', codigo)

    def test_codigo_vencido_lanza_error(self):
        codigo = make_codigo(valido_hasta=date.today() - timedelta(days=1))
        with self.assertRaises(CodigoInvalidoError):
            calcular_precio(PRODUCTO_ZYFIT_PRO, 'mensual', codigo)

    def test_codigo_con_cupo_agotado_lanza_error(self):
        user = make_user()
        codigo = make_codigo(usos_maximos=1)
        SolicitudSuscripcion.objects.create(
            user=user, plan_tipo='mensual', codigo_promocional=codigo,
            precio_lista=Decimal('9.99'), descuento_aplicado=Decimal('2.00'), precio_final=Decimal('7.99'),
        )
        with self.assertRaises(CodigoInvalidoError):
            calcular_precio(PRODUCTO_ZYFIT_PRO, 'mensual', codigo)

    def test_codigo_de_otro_producto_lanza_error(self):
        codigo = make_codigo(producto=PRODUCTO_ZYFIT_PRO)
        with self.assertRaises(CodigoInvalidoError):
            calcular_precio(PRODUCTO_ACADEMY_PRO, 'mensual', codigo)


class CalcularPrecioAcademyProTests(TestCase):
    def test_sin_codigo_devuelve_precio_de_lista(self):
        precio_lista, descuento, precio_final = calcular_precio(PRODUCTO_ACADEMY_PRO, 'anual', None)
        self.assertEqual(precio_lista, Decimal('79.99'))
        self.assertEqual(descuento, Decimal('0'))
        self.assertEqual(precio_final, Decimal('79.99'))

    def test_no_ofrece_plan_semestral(self):
        with self.assertRaises(KeyError):
            calcular_precio(PRODUCTO_ACADEMY_PRO, 'semestral', None)

    def test_codigo_del_producto_correcto_aplica_descuento(self):
        codigo = make_codigo(
            producto=PRODUCTO_ACADEMY_PRO, tipo_descuento=CodigoPromocional.TIPO_PORCENTAJE,
            valor_descuento=Decimal('20'),
        )
        precio_lista, descuento, precio_final = calcular_precio(PRODUCTO_ACADEMY_PRO, 'mensual', codigo)
        self.assertEqual(precio_lista, Decimal('9.99'))
        self.assertEqual(descuento, Decimal('2.00'))
        self.assertEqual(precio_final, Decimal('7.99'))


class ValidarCodigoEndpointTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_codigo_valido(self):
        make_codigo()
        res = self.client.post('/api/promos/validar/', {'codigo': 'maria20', 'plan_tipo': 'mensual'})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['valido'])
        self.assertEqual(Decimal(res.data['precio_final']), Decimal('7.99'))

    def test_codigo_inexistente(self):
        res = self.client.post('/api/promos/validar/', {'codigo': 'NOEXISTE', 'plan_tipo': 'mensual'})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['valido'])

    def test_plan_invalido(self):
        res = self.client.post('/api/promos/validar/', {'plan_tipo': 'quincenal'})
        self.assertEqual(res.status_code, 400)

    def test_producto_default_es_zyfit_pro(self):
        """Sin `producto` en el body (cliente mobile actual), se comporta
        exactamente como antes de generalizar el endpoint."""
        res = self.client.post('/api/promos/validar/', {'plan_tipo': 'anual'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(res.data['precio_final']), Decimal('79.99'))

    def test_codigo_academy_pro_valida_con_producto_correcto(self):
        make_codigo(producto=PRODUCTO_ACADEMY_PRO, valor_descuento=Decimal('20'))
        res = self.client.post(
            '/api/promos/validar/', {'producto': PRODUCTO_ACADEMY_PRO, 'codigo': 'MARIA20', 'plan_tipo': 'mensual'},
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['valido'])
        self.assertEqual(Decimal(res.data['precio_final']), Decimal('7.99'))

    def test_codigo_de_zyfit_pro_no_aplica_a_academy_pro(self):
        make_codigo(producto=PRODUCTO_ZYFIT_PRO)
        res = self.client.post(
            '/api/promos/validar/', {'producto': PRODUCTO_ACADEMY_PRO, 'codigo': 'MARIA20', 'plan_tipo': 'mensual'},
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['valido'])

    def test_plan_semestral_invalido_para_academy_pro(self):
        res = self.client.post(
            '/api/promos/validar/', {'producto': PRODUCTO_ACADEMY_PRO, 'plan_tipo': 'semestral'},
        )
        self.assertEqual(res.status_code, 400)


class CrearSolicitudEndpointTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_crea_solicitud_sin_codigo(self):
        res = self.client.post('/api/promos/solicitudes/', {'plan_tipo': 'anual'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Decimal(res.data['precio_final']), Decimal('79.99'))
        self.assertEqual(SolicitudSuscripcion.objects.count(), 1)

    def test_crea_solicitud_con_codigo_registra_comision(self):
        make_codigo()
        res = self.client.post('/api/promos/solicitudes/', {'plan_tipo': 'mensual', 'codigo': 'MARIA20'})
        self.assertEqual(res.status_code, 201)
        solicitud = SolicitudSuscripcion.objects.get()
        self.assertEqual(solicitud.comision_influencer, Decimal('5.00'))

    def test_es_idempotente_ante_solicitud_pendiente(self):
        r1 = self.client.post('/api/promos/solicitudes/', {'plan_tipo': 'mensual'})
        r2 = self.client.post('/api/promos/solicitudes/', {'plan_tipo': 'anual'})
        self.assertEqual(r1.data['id'], r2.data['id'])
        self.assertEqual(SolicitudSuscripcion.objects.count(), 1)

    def test_codigo_invalido_rechaza_la_creacion(self):
        res = self.client.post('/api/promos/solicitudes/', {'plan_tipo': 'mensual', 'codigo': 'NOEXISTE'})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(SolicitudSuscripcion.objects.count(), 0)

    def test_mi_solicitud_devuelve_la_mas_reciente(self):
        self.client.post('/api/promos/solicitudes/', {'plan_tipo': 'mensual'})
        res = self.client.get('/api/promos/solicitudes/mias/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['plan_tipo'], 'mensual')

    def test_mi_solicitud_null_si_no_hay_ninguna(self):
        res = self.client.get('/api/promos/solicitudes/mias/')
        self.assertIsNone(res.data)

    def test_crea_solicitud_academy_pro(self):
        res = self.client.post(
            '/api/promos/solicitudes/', {'producto': PRODUCTO_ACADEMY_PRO, 'plan_tipo': 'anual'},
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['producto'], PRODUCTO_ACADEMY_PRO)
        self.assertEqual(Decimal(res.data['precio_final']), Decimal('79.99'))

    def test_solicitud_pendiente_de_un_producto_no_bloquea_al_otro(self):
        r_pro = self.client.post('/api/promos/solicitudes/', {'plan_tipo': 'mensual'})
        r_academy = self.client.post(
            '/api/promos/solicitudes/', {'producto': PRODUCTO_ACADEMY_PRO, 'plan_tipo': 'mensual'},
        )
        self.assertNotEqual(r_pro.data['id'], r_academy.data['id'])
        self.assertEqual(SolicitudSuscripcion.objects.count(), 2)

    def test_mi_solicitud_esta_aislada_por_producto(self):
        self.client.post('/api/promos/solicitudes/', {'plan_tipo': 'mensual'})
        self.client.post('/api/promos/solicitudes/', {'producto': PRODUCTO_ACADEMY_PRO, 'plan_tipo': 'anual'})

        res_pro = self.client.get('/api/promos/solicitudes/mias/')
        self.assertEqual(res_pro.data['producto'], PRODUCTO_ZYFIT_PRO)
        self.assertEqual(res_pro.data['plan_tipo'], 'mensual')

        res_academy = self.client.get('/api/promos/solicitudes/mias/', {'producto': PRODUCTO_ACADEMY_PRO})
        self.assertEqual(res_academy.data['producto'], PRODUCTO_ACADEMY_PRO)
        self.assertEqual(res_academy.data['plan_tipo'], 'anual')


class ConfirmarSolicitudAdminActionTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.codigo = make_codigo()
        self.solicitud = SolicitudSuscripcion.objects.create(
            user=self.user, plan_tipo='anual', codigo_promocional=self.codigo,
            precio_lista=Decimal('79.99'), descuento_aplicado=Decimal('16.00'), precio_final=Decimal('63.99'),
            comision_influencer=Decimal('5.00'),
        )
        self.admin = SolicitudSuscripcionAdmin(SolicitudSuscripcion, None)
        self.request = make_admin_request()

    def test_confirmar_activa_pro_con_el_plan_correcto(self):
        self.admin.confirmar_y_activar(self.request, SolicitudSuscripcion.objects.filter(pk=self.solicitud.pk))

        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.estado, SolicitudSuscripcion.ESTADO_CONFIRMADA)
        self.assertIsNotNone(self.solicitud.confirmada_at)

        profile = self.user.profile
        profile.refresh_from_db()
        self.assertEqual(profile.plan, 'pro')
        self.assertEqual(profile.plan_tipo, 'anual')
        self.assertEqual(profile.plan_renovacion, date.today() + timedelta(days=365))

    def test_confirmar_no_reactiva_una_solicitud_ya_confirmada(self):
        self.solicitud.estado = SolicitudSuscripcion.ESTADO_CONFIRMADA
        self.solicitud.save(update_fields=['estado'])

        # Simula un segundo click accidental: no debería volver a tocar Profile.
        self.user.profile.plan = 'starter'
        self.user.profile.save(update_fields=['plan'])

        self.admin.confirmar_y_activar(self.request, SolicitudSuscripcion.objects.filter(pk=self.solicitud.pk))
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.plan, 'starter')

    def test_rechazar_no_activa_pro(self):
        self.admin.rechazar(self.request, SolicitudSuscripcion.objects.filter(pk=self.solicitud.pk))
        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.estado, SolicitudSuscripcion.ESTADO_RECHAZADA)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.plan, 'starter')


class ConfirmarSolicitudAcademyProAdminActionTests(TestCase):
    """La misma acción de admin, pero para una solicitud de Academy Pro —
    debe activar `AcademySubscription`, no `Profile`."""

    def setUp(self):
        self.user = make_user()
        self.codigo = make_codigo(producto=PRODUCTO_ACADEMY_PRO)
        self.solicitud = SolicitudSuscripcion.objects.create(
            user=self.user, producto=PRODUCTO_ACADEMY_PRO, plan_tipo='anual', codigo_promocional=self.codigo,
            precio_lista=Decimal('79.99'), descuento_aplicado=Decimal('16.00'), precio_final=Decimal('63.99'),
            comision_influencer=Decimal('5.00'),
        )
        self.admin = SolicitudSuscripcionAdmin(SolicitudSuscripcion, None)
        self.request = make_admin_request()

    def test_confirmar_activa_academy_subscription_con_el_plan_correcto(self):
        self.admin.confirmar_y_activar(self.request, SolicitudSuscripcion.objects.filter(pk=self.solicitud.pk))

        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.estado, SolicitudSuscripcion.ESTADO_CONFIRMADA)

        self.user.refresh_from_db()
        sub = self.user.academy_subscription
        self.assertEqual(sub.estado, AcademySubscription.ESTADO_ACTIVA)
        self.assertEqual(sub.plan_tipo, 'anual')
        self.assertEqual(sub.fecha_renovacion, date.today() + timedelta(days=365))

        # No debe haber tocado Zyfit Pro.
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.plan, 'starter')
