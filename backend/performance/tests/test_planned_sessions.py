"""Tests de PlannedSession (sesiones/días dentro de un microciclo del módulo
PLANIFICACIÓN): CRUD, cálculo de fecha desde dia_semana, doble sesión por día,
cascada al borrar el microciclo, scoping y gating. Usa BD (TestCase).
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import (
    SportsCenter, CenterMembership, TrainingPlan, Mesocycle, Microcycle, PlannedSession,
)

User = get_user_model()


class _Base(TestCase):
    def setUp(self):
        self.director = User.objects.create_user(
            username='dir@x.com', email='dir@x.com', password='x', role='director_tecnico',
        )
        self.center = SportsCenter.objects.create(nombre='CD Test', slug='cd-test')
        CenterMembership.objects.create(
            center=self.center, user=self.director, rol=CenterMembership.ROL_DIRECTOR,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.director)
        self.plan = TrainingPlan.objects.create(
            center=self.center, nombre='Temporada', fecha_inicio='2026-07-01',
        )
        self.meso = Mesocycle.objects.create(plan=self.plan, nombre='F1', tipo='competitivo')

    def base(self, micro_id):
        return (
            f'/api/performance/centers/{self.center.id}/planificacion/{self.plan.id}'
            f'/mesociclos/{self.meso.id}/microciclos/{micro_id}'
        )

    def crear_micro(self, fecha_inicio=None, **kwargs):
        kwargs.setdefault('tipo', 'carga')
        return Microcycle.objects.create(mesociclo=self.meso, fecha_inicio=fecha_inicio, **kwargs)


class PlannedSessionCRUDTests(_Base):
    def test_crear_sesion_calcula_fecha(self):
        micro = self.crear_micro(fecha_inicio='2026-07-06')  # lunes
        res = self.client.post(f'{self.base(micro.id)}/sesiones/', {
            'dia_semana': 2, 'tipo': 'tecnico_tactico', 'duracion_min': 75, 'rpe_objetivo': 6,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['fecha'], '2026-07-08')  # lunes + 2 días = miércoles
        self.assertEqual(PlannedSession.objects.get(id=res.json()['id']).microciclo_id, micro.id)

    def test_crear_sesion_sin_fecha_inicio_fecha_null(self):
        micro = self.crear_micro(fecha_inicio=None)
        res = self.client.post(f'{self.base(micro.id)}/sesiones/', {'dia_semana': 0}, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertIsNone(res.json()['fecha'])

    def test_dia_semana_fuera_de_rango_400(self):
        micro = self.crear_micro(fecha_inicio='2026-07-06')
        res = self.client.post(f'{self.base(micro.id)}/sesiones/', {'dia_semana': 7}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(PlannedSession.objects.count(), 0)

    def test_doble_sesion_mismo_dia_distinto_orden(self):
        micro = self.crear_micro(fecha_inicio='2026-07-06')
        r1 = self.client.post(f'{self.base(micro.id)}/sesiones/', {
            'dia_semana': 0, 'orden': 0, 'tipo': 'fuerza',
        }, format='json')
        r2 = self.client.post(f'{self.base(micro.id)}/sesiones/', {
            'dia_semana': 0, 'orden': 1, 'tipo': 'recuperacion',
        }, format='json')
        self.assertEqual(r1.status_code, 201, r1.content)
        self.assertEqual(r2.status_code, 201, r2.content)
        self.assertEqual(PlannedSession.objects.filter(microciclo=micro, dia_semana=0).count(), 2)

    def test_editar_recalcula_fecha_si_cambia_dia(self):
        micro = self.crear_micro(fecha_inicio='2026-07-06')
        sid = self.client.post(f'{self.base(micro.id)}/sesiones/', {'dia_semana': 0}, format='json').json()['id']
        res = self.client.patch(f'{self.base(micro.id)}/sesiones/{sid}/', {'dia_semana': 3}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['fecha'], '2026-07-09')

    def test_editar_contenido_y_estado_manual(self):
        micro = self.crear_micro(fecha_inicio='2026-07-06')
        sid = self.client.post(f'{self.base(micro.id)}/sesiones/', {'dia_semana': 0}, format='json').json()['id']
        res = self.client.patch(f'{self.base(micro.id)}/sesiones/{sid}/', {
            'contenido': {'fases': [{'nombre': 'Principal', 'bloques': []}]},
            'estado': 'publicada',
        }, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['estado'], 'publicada')
        self.assertEqual(res.json()['contenido']['fases'][0]['nombre'], 'Principal')

    def test_origen_no_se_puede_forzar_por_patch(self):
        # `origen` es read-only: solo lo cambia el generador de IA, no un PATCH manual.
        micro = self.crear_micro(fecha_inicio='2026-07-06')
        sid = self.client.post(f'{self.base(micro.id)}/sesiones/', {'dia_semana': 0}, format='json').json()['id']
        res = self.client.patch(f'{self.base(micro.id)}/sesiones/{sid}/', {'origen': 'ia'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(PlannedSession.objects.get(id=sid).origen, 'manual')

    def test_borrar_sesion(self):
        micro = self.crear_micro(fecha_inicio='2026-07-06')
        sid = self.client.post(f'{self.base(micro.id)}/sesiones/', {'dia_semana': 0}, format='json').json()['id']
        res = self.client.delete(f'{self.base(micro.id)}/sesiones/{sid}/')
        self.assertEqual(res.status_code, 204)
        self.assertEqual(PlannedSession.objects.count(), 0)

    def test_cascada_al_borrar_microciclo(self):
        micro = self.crear_micro(fecha_inicio='2026-07-06')
        self.client.post(f'{self.base(micro.id)}/sesiones/', {'dia_semana': 0}, format='json')
        self.assertEqual(PlannedSession.objects.count(), 1)
        res = self.client.delete(
            f'/api/performance/centers/{self.center.id}/planificacion/{self.plan.id}'
            f'/mesociclos/{self.meso.id}/microciclos/{micro.id}/'
        )
        self.assertEqual(res.status_code, 204)
        self.assertEqual(PlannedSession.objects.count(), 0)

    def test_scope_microciclo_de_otro_plan_404(self):
        otro_center = SportsCenter.objects.create(nombre='Otro', slug='otro')
        otro_plan = TrainingPlan.objects.create(center=otro_center, nombre='Ajeno', fecha_inicio='2026-07-01')
        otro_meso = Mesocycle.objects.create(plan=otro_plan, nombre='F1', tipo='competitivo')
        otro_micro = Microcycle.objects.create(mesociclo=otro_meso, tipo='carga')
        res = self.client.get(
            f'/api/performance/centers/{self.center.id}/planificacion/{self.plan.id}'
            f'/mesociclos/{self.meso.id}/microciclos/{otro_micro.id}/sesiones/'
        )
        self.assertEqual(res.status_code, 404)


class PlannedSessionGatingTests(_Base):
    def test_fisio_sin_planificacion_403(self):
        # ROL_FISIO solo trae MODULE_LESIONES por defecto (ver DEFAULT_MODULES).
        fisio = User.objects.create_user(username='f@x.com', email='f@x.com', password='x', role='athlete')
        CenterMembership.objects.create(center=self.center, user=fisio, rol=CenterMembership.ROL_FISIO)
        self.client.force_authenticate(fisio)
        micro = self.crear_micro(fecha_inicio='2026-07-06')
        res = self.client.get(f'{self.base(micro.id)}/sesiones/')
        self.assertEqual(res.status_code, 403)
