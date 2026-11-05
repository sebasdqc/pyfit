"""Cobros de Academy Pro y métricas de gestión (SOLO admin).

Cubre lo que importa cuando hay dinero y datos de otras personas de por medio:
permisos, aislamiento entre organizaciones, que un pago extienda (y no reinicie)
el período, que anular recalcule el acceso, que la suscripción venza de verdad
y que los números del panel coincidan con los datos."""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from academy.models import (
    AcademyActivityDay, AcademyPayment, AcademySubscription, Course, Enrollment, Tenant,
)
from promos.models import PRODUCTO_ACADEMY_PRO, SolicitudSuscripcion

User = get_user_model()

PAGOS = '/api/academy/admin/pagos/'


def _tenant(slug):
    return Tenant.objects.create(nombre=slug, slug=slug, dominio=f'{slug}.zyfit.app')


def _user(email, **kw):
    # Sin contraseña: los tests autentican con force_authenticate, y hashear una
    # (PBKDF2) cuesta ~2 s por usuario, lo que volvía eterna esta suite.
    return User.objects.create_user(username=email, email=email, **kw)


class _Base(TestCase):
    def setUp(self):
        self.admin = _user('admin@x.com', role=User.ROLE_ADMIN)
        self.instructor = _user('ins@x.com', academy_instructor=True)
        self.student = _user('alu@x.com')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def pagar(self, user=None, **extra):
        body = {
            'user_id': (user or self.student).id, 'plan_tipo': 'mensual', 'monto': '25.00',
            'metodo': 'transferencia', 'referencia': '', **extra,
        }
        return self.client.post(PAGOS, body, format='json')


class PermisosTests(_Base):
    URLS = [
        ('get', '/api/academy/admin/metricas/'),
        ('get', '/api/academy/admin/suscripciones/'),
        ('get', PAGOS),
        ('post', PAGOS),
    ]

    def test_estudiante_e_instructor_no_entran(self):
        for who in (self.student, self.instructor):
            self.client.force_authenticate(who)
            for method, url in self.URLS:
                self.assertEqual(getattr(self.client, method)(url).status_code, 403, f'{who.email} {url}')

    def test_anonimo_no_entra(self):
        self.client.force_authenticate(None)
        for method, url in self.URLS:
            self.assertIn(getattr(self.client, method)(url).status_code, (401, 403))

    def test_academy_admin_si_entra(self):
        self.client.force_authenticate(_user('aa@x.com', academy_admin=True))
        self.assertEqual(self.client.get('/api/academy/admin/metricas/').status_code, 200)


class RegistrarPagoTests(_Base):
    def test_primer_pago_activa_y_cubre_un_mes(self):
        res = self.pagar()
        self.assertEqual(res.status_code, 201, res.content)
        sub = AcademySubscription.objects.get(user=self.student)
        self.assertEqual(sub.estado, 'activa')
        self.assertEqual(sub.fecha_renovacion, date.today() + timedelta(days=30))
        self.assertTrue(sub.da_acceso_pro())
        pago = AcademyPayment.objects.get()
        self.assertEqual(str(pago.monto), '25.00')
        self.assertEqual(pago.registrado_por, self.admin)
        self.assertEqual(pago.usuario_email, 'alu@x.com')

    def test_segundo_pago_extiende_no_reinicia(self):
        self.pagar(referencia='a')
        self.pagar(referencia='b')
        sub = AcademySubscription.objects.get(user=self.student)
        self.assertEqual(sub.fecha_renovacion, date.today() + timedelta(days=60))

    def test_pago_con_suscripcion_vencida_cuenta_desde_hoy(self):
        AcademySubscription.objects.create(
            user=self.student, estado='activa', fecha_renovacion=date.today() - timedelta(days=40),
        )
        self.pagar()
        sub = AcademySubscription.objects.get(user=self.student)
        self.assertEqual(sub.fecha_renovacion, date.today() + timedelta(days=30))

    def test_referencia_repetida_se_rechaza(self):
        self.assertEqual(self.pagar(referencia='ABC123').status_code, 201)
        res = self.pagar(referencia='ABC123')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(AcademyPayment.objects.count(), 1)

    def test_entradas_invalidas(self):
        casos = [
            {'monto': '0'}, {'monto': '-5'}, {'monto': 'abc'}, {'monto': '99999'},
            {'plan_tipo': 'semestral'}, {'metodo': 'bitcoin'},
            {'fecha_pago': (date.today() + timedelta(days=2)).isoformat()},
            {'fecha_pago': 'ayer'},
        ]
        for extra in casos:
            self.assertEqual(self.pagar(**extra).status_code, 400, extra)
        self.assertEqual(AcademyPayment.objects.count(), 0)
        self.assertFalse(AcademySubscription.objects.exists())

    def test_usuario_inexistente(self):
        res = self.client.post(PAGOS, {'user_id': 99999, 'plan_tipo': 'mensual', 'monto': '25',
                                       'metodo': 'efectivo'}, format='json')
        self.assertEqual(res.status_code, 400)


class AislamientoTests(_Base):
    def test_admin_de_un_tenant_no_cobra_ni_ve_otro(self):
        a, b = _tenant('org-a'), _tenant('org-b')
        admin_a = _user('admin-a@x.com', academy_admin=True, academy_tenant=a)
        alumno_b = _user('alu-b@x.com', academy_tenant=b)
        self.client.force_authenticate(admin_a)

        self.assertEqual(self.pagar(user=alumno_b).status_code, 400)

        # El admin de B registra un pago; el de A no lo ve ni lo puede anular.
        admin_b = _user('admin-b@x.com', academy_admin=True, academy_tenant=b)
        self.client.force_authenticate(admin_b)
        pago_id = self.pagar(user=alumno_b).json()['pago']['id']

        self.client.force_authenticate(admin_a)
        self.assertEqual(self.client.get(PAGOS).json(), [])
        self.assertEqual(self.client.post(f'{PAGOS}{pago_id}/anular/').status_code, 404)
        self.assertEqual(self.client.get('/api/academy/admin/suscripciones/').json()['suscripciones'], [])
        finanzas = self.client.get('/api/academy/admin/metricas/').json()['finanzas']
        self.assertEqual(finanzas['ingresos_historico'], 0)


class AnularYCancelarTests(_Base):
    def test_anular_el_unico_pago_corta_el_acceso(self):
        pago_id = self.pagar().json()['pago']['id']
        res = self.client.post(f'{PAGOS}{pago_id}/anular/', {'motivo': 'duplicado'}, format='json')
        self.assertEqual(res.status_code, 200)
        sub = AcademySubscription.objects.get(user=self.student)
        self.assertFalse(sub.da_acceso_pro())
        self.assertEqual(AcademyPayment.objects.get().estado, 'anulado')
        self.assertEqual(AcademyPayment.objects.get().anulado_por, self.admin)

    def test_anular_el_ultimo_vuelve_al_periodo_anterior(self):
        self.pagar(referencia='a')
        segundo = self.pagar(referencia='b').json()['pago']['id']
        self.client.post(f'{PAGOS}{segundo}/anular/')
        sub = AcademySubscription.objects.get(user=self.student)
        self.assertEqual(sub.fecha_renovacion, date.today() + timedelta(days=30))
        self.assertTrue(sub.da_acceso_pro())

    def test_no_se_anula_dos_veces(self):
        pago_id = self.pagar().json()['pago']['id']
        self.client.post(f'{PAGOS}{pago_id}/anular/')
        self.assertEqual(self.client.post(f'{PAGOS}{pago_id}/anular/').status_code, 400)

    def test_anulado_permite_reintentar_con_la_misma_referencia(self):
        pago_id = self.pagar(referencia='X1').json()['pago']['id']
        self.client.post(f'{PAGOS}{pago_id}/anular/')
        self.assertEqual(self.pagar(referencia='X1').status_code, 201)

    def test_cancelar_conserva_acceso_hasta_fin_de_periodo(self):
        self.pagar()
        res = self.client.post(f'/api/academy/admin/suscripciones/{self.student.id}/cancelar/')
        self.assertEqual(res.status_code, 200)
        sub = AcademySubscription.objects.get(user=self.student)
        self.assertEqual(sub.estado, 'cancelada')
        self.assertTrue(sub.da_acceso_pro())

    def test_cancelar_sin_suscripcion_activa_400(self):
        res = self.client.post(f'/api/academy/admin/suscripciones/{self.student.id}/cancelar/')
        self.assertEqual(res.status_code, 400)


class ExpiracionTests(TestCase):
    def test_activa_vencida_pierde_acceso_tras_la_cortesia(self):
        u = _user('u@x.com')
        sub = AcademySubscription.objects.create(user=u, estado='activa')
        hoy = date.today()
        for dias, esperado in ((0, True), (-3, True), (-4, False), (10, True)):
            sub.fecha_renovacion = hoy + timedelta(days=dias)
            self.assertEqual(sub.da_acceso_pro(), esperado, dias)

    def test_activa_sin_fecha_no_expira(self):
        sub = AcademySubscription(user=_user('v@x.com'), estado='activa', fecha_renovacion=None)
        self.assertTrue(sub.da_acceso_pro())


class SolicitudesTests(_Base):
    def _solicitud(self):
        return SolicitudSuscripcion.objects.create(
            user=self.student, producto=PRODUCTO_ACADEMY_PRO, plan_tipo='mensual',
            precio_lista=25, precio_final=25,
        )

    def test_pagar_una_solicitud_la_confirma(self):
        s = self._solicitud()
        res = self.pagar(solicitud_id=s.id)
        self.assertEqual(res.status_code, 201, res.content)
        s.refresh_from_db()
        self.assertEqual(s.estado, 'confirmada')
        self.assertEqual(AcademyPayment.objects.get().solicitud_id, s.id)

    def test_solicitud_ajena_o_procesada_revierte_todo(self):
        s = self._solicitud()
        s.estado = 'rechazada'
        s.save()
        self.assertEqual(self.pagar(solicitud_id=s.id).status_code, 400)
        # Atómico: no queda ni pago ni suscripción a medias.
        self.assertEqual(AcademyPayment.objects.count(), 0)
        self.assertFalse(AcademySubscription.objects.exists())

    def test_listado_y_rechazo(self):
        s = self._solicitud()
        lista = self.client.get('/api/academy/admin/suscripciones/').json()['solicitudes']
        self.assertEqual([x['id'] for x in lista], [s.id])
        self.assertEqual(self.client.post(f'/api/academy/admin/solicitudes/{s.id}/rechazar/').status_code, 200)
        s.refresh_from_db()
        self.assertEqual(s.estado, 'rechazada')
        self.assertEqual(self.client.post(f'/api/academy/admin/solicitudes/{s.id}/rechazar/').status_code, 404)


class ListadoSuscripcionesTests(_Base):
    def test_estados_efectivos(self):
        self.pagar()  # vigente (30 días)
        por_vencer = _user('pv@x.com')
        AcademySubscription.objects.create(
            user=por_vencer, estado='activa', fecha_renovacion=date.today() + timedelta(days=3),
        )
        vencida = _user('v@x.com')
        AcademySubscription.objects.create(
            user=vencida, estado='activa', fecha_renovacion=date.today() - timedelta(days=30),
        )
        data = self.client.get('/api/academy/admin/suscripciones/').json()
        self.assertEqual(data['conteo'], {'vigente': 1, 'por_vencer': 1, 'vencida': 1})
        solo = self.client.get('/api/academy/admin/suscripciones/?estado=vencida').json()['suscripciones']
        self.assertEqual([f['email'] for f in solo], ['v@x.com'])
        fila = [f for f in data['suscripciones'] if f['email'] == 'alu@x.com'][0]
        self.assertEqual(fila['total_pagado'], 25.0)
        self.assertEqual(fila['pagos'], 1)


class MetricasTests(_Base):
    def setUp(self):
        super().setUp()
        self.metricas = lambda dias=30: self.client.get(f'/api/academy/admin/metricas/?dias={dias}').json()

    def _curso(self, slug='c1', publicado=True):
        return Course.objects.create(
            instructor=self.instructor, titulo=slug, slug=slug, descripcion='d', publicado=publicado,
        )

    def test_periodo_invalido(self):
        for dias in ('5', 'x', '365'):
            self.assertEqual(self.client.get(f'/api/academy/admin/metricas/?dias={dias}').status_code, 400)

    def test_vacio_no_rompe_ni_divide_por_cero(self):
        data = self.metricas()
        self.assertEqual(data['resumen']['estudiantes'], 0)
        self.assertEqual(data['finanzas']['mrr'], 0)
        self.assertIsNone(data['finanzas']['churn_aprox'])
        self.assertEqual(len(data['retencion']['cohortes']), 8)
        self.assertEqual(len(data['finanzas']['serie_mensual']), 6)

    def test_resumen_y_engagement(self):
        c1, c2 = self._curso('c1'), self._curso('c2')
        alu2 = _user('alu2@x.com')
        e1 = Enrollment.objects.create(student=self.student, course=c1, estado='completada', progreso=100)
        Enrollment.objects.create(student=self.student, course=c2, progreso=40)
        Enrollment.objects.create(student=alu2, course=c1, progreso=20)
        AcademyActivityDay.objects.create(user=self.student, fecha=timezone.localdate())
        AcademyActivityDay.objects.create(user=alu2, fecha=timezone.localdate() - timedelta(days=20))

        d = self.metricas()
        self.assertEqual(d['resumen']['estudiantes'], 2)
        self.assertEqual(d['resumen']['matriculas'], 3)
        self.assertEqual(d['resumen']['completadas'], 1)
        self.assertEqual(d['resumen']['tasa_finalizacion'], 33)
        self.assertEqual(d['estudiantes']['activos_hoy'], 1)
        self.assertEqual(d['estudiantes']['activos_7d'], 1)
        self.assertEqual(d['estudiantes']['activos_30d'], 2)
        # alu2 tiene matrícula activa y no estudia hace más de 14 días.
        self.assertEqual(d['estudiantes']['en_riesgo'], 1)
        fila = {f['titulo']: f for f in d['cursos']['filas']}['c1']
        self.assertEqual((fila['matriculas'], fila['completadas'], fila['tasa_finalizacion']), (2, 1, 50))
        self.assertEqual(e1.course_id, fila['id'])

    def test_curso_de_otro_tenant_no_cuenta(self):
        otro = _tenant('otra-org')
        Course.objects.create(instructor=self.instructor, titulo='x', slug='x', descripcion='d',
                              publicado=True, tenant=otro)
        Enrollment.objects.create(student=self.student, course=Course.objects.get(slug='x'))
        self.assertEqual(self.metricas()['resumen']['estudiantes'], 0)

    def test_retencion_por_cohorte(self):
        c = self._curso()
        # 4 estudiantes se matriculan esta semana; 1 estudió hoy.
        activos = []
        for i in range(4):
            u = _user(f'co{i}@x.com')
            Enrollment.objects.create(student=u, course=c)
            activos.append(u)
        AcademyActivityDay.objects.create(user=activos[0], fecha=timezone.localdate())
        cohortes = self.metricas()['retencion']['cohortes']
        actual = cohortes[-1]
        self.assertEqual(actual['tamano'], 4)
        self.assertEqual(actual['retencion'], [25])  # semana 0: 1 de 4

    def test_finanzas(self):
        mensual, anual, sin_pago = _user('m@x.com'), _user('a@x.com'), _user('s@x.com')
        self.pagar(user=mensual, plan_tipo='mensual', monto='25')
        self.pagar(user=anual, plan_tipo='anual', monto='150')
        AcademySubscription.objects.create(  # otorgada a mano: sin pago en el libro
            user=sin_pago, estado='activa', fecha_renovacion=date.today() + timedelta(days=20),
        )
        f = self.metricas()['finanzas']
        self.assertEqual(f['ingresos_periodo'], 175.0)
        self.assertEqual(f['ingresos_historico'], 175.0)
        # MRR = 25/1 + 150/12; la suscripción sin pago NO suma ingresos inventados.
        self.assertEqual(f['mrr'], 37.5)
        self.assertEqual(f['arr'], 450.0)
        self.assertEqual(f['suscriptores_activos'], 3)
        self.assertEqual(f['suscriptores_sin_pago_registrado'], 1)
        self.assertEqual(f['altas_periodo'], 2)
        self.assertEqual(f['pagos_periodo'], 2)
        self.assertEqual({m['metodo'] for m in f['por_metodo']}, {'transferencia'})
        self.assertEqual(f['serie_mensual'][-1]['ingresos'], 175.0)

    def test_pago_anulado_no_cuenta(self):
        pago_id = self.pagar().json()['pago']['id']
        self.client.post(f'{PAGOS}{pago_id}/anular/')
        f = self.metricas()['finanzas']
        self.assertEqual(f['ingresos_historico'], 0)
        self.assertEqual(f['suscriptores_activos'], 0)
        self.assertEqual(f['mrr'], 0)

    def test_bajas_y_churn(self):
        # Tres suscriptores que pagaron ANTES del período (hace 40 días)...
        antes = (date.today() - timedelta(days=40)).isoformat()
        for i in range(3):
            self.pagar(user=_user(f'c{i}@x.com'), referencia=f'r{i}', fecha_pago=antes)
        # ...y uno cancela dentro del período.
        baja = User.objects.get(email='c0@x.com')
        self.client.post(f'/api/academy/admin/suscripciones/{baja.id}/cancelar/')
        f = self.metricas()['finanzas']
        self.assertEqual(f['altas_periodo'], 0)
        self.assertEqual(f['bajas_periodo'], 1)
        # El cancelado con acceso pagado se reporta aparte: no es "activo" ni suma al MRR.
        self.assertEqual(f['suscriptores_activos'], 2)
        self.assertEqual(f['cancelados_con_acceso'], 1)
        self.assertEqual(f['churn_aprox'], 33)  # 1 baja / 3 suscriptores al inicio

    def test_churn_sin_base_no_se_inventa(self):
        # Todos los suscriptores nacen dentro del período: no había base al inicio.
        for i in range(2):
            self.pagar(user=_user(f'n{i}@x.com'), referencia=f'n{i}')
        baja = User.objects.get(email='n0@x.com')
        self.client.post(f'/api/academy/admin/suscripciones/{baja.id}/cancelar/')
        f = self.metricas()['finanzas']
        self.assertEqual(f['bajas_periodo'], 1)
        self.assertIsNone(f['churn_aprox'])
