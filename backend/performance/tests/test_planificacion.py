"""Tests de la periodización del módulo PLANIFICACIÓN (macro → meso → micro):
crear macrociclo, fases y semanas, leer el árbol, editar, borrar (cascada) y el
scoping por centro. Usan BD (TestCase) + APIClient con force_authenticate.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from performance.models import (
    SportsCenter, CenterMembership, TrainingPlan, Mesocycle, Microcycle,
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

    def crear_plan(self):
        res = self.client.post(
            f'/api/performance/centers/{self.center.id}/planificacion/',
            {'nombre': 'Temporada 26/27', 'objetivo': 'Ascenso', 'fecha_inicio': '2026-07-01'},
            format='json',
        )
        assert res.status_code == 201, res.content
        return res.json()['id']


class PeriodizacionTests(_Base):
    def test_crear_macro_meso_micro_y_arbol(self):
        plan_id = self.crear_plan()
        base = f'/api/performance/centers/{self.center.id}/planificacion/{plan_id}'

        # Fase (mesociclo)
        rm = self.client.post(f'{base}/mesociclos/', {
            'orden': 1, 'nombre': 'Pretemporada', 'tipo': 'prep_general',
            'enfasis': 'Base aeróbica', 'carga_objetivo': 'alta', 'duracion_semanas': 4,
        }, format='json')
        self.assertEqual(rm.status_code, 201, rm.content)
        meso_id = rm.json()['id']

        # Semanas (microciclos)
        for orden, carga, tipo in [(1, 60, 'ajuste'), (2, 85, 'carga'), (3, 100, 'choque'), (4, 50, 'recuperacion')]:
            rmi = self.client.post(f'{base}/mesociclos/{meso_id}/microciclos/', {
                'orden': orden, 'tipo': tipo, 'carga_relativa': carga,
                'volumen': 'alto', 'intensidad': 'medio',
            }, format='json')
            self.assertEqual(rmi.status_code, 201, rmi.content)

        # Árbol completo
        tree = self.client.get(f'{base}/').json()
        self.assertEqual(tree['total_mesociclos'], 1)
        self.assertEqual(tree['total_microciclos'], 4)
        self.assertEqual(len(tree['mesociclos']), 1)
        micros = tree['mesociclos'][0]['microciclos']
        self.assertEqual(len(micros), 4)
        # Ordenados por `orden`; el pico de carga es la semana de choque (100%).
        self.assertEqual([m['orden'] for m in micros], [1, 2, 3, 4])
        self.assertEqual(max(m['carga_relativa'] for m in micros), 100)

    def test_editar_microciclo(self):
        plan_id = self.crear_plan()
        base = f'/api/performance/centers/{self.center.id}/planificacion/{plan_id}'
        meso_id = self.client.post(f'{base}/mesociclos/', {'nombre': 'F1', 'tipo': 'competitivo'}, format='json').json()['id']
        micro_id = self.client.post(f'{base}/mesociclos/{meso_id}/microciclos/', {'tipo': 'carga', 'carga_relativa': 70}, format='json').json()['id']

        res = self.client.patch(f'{base}/mesociclos/{meso_id}/microciclos/{micro_id}/', {'carga_relativa': 95}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(Microcycle.objects.get(id=micro_id).carga_relativa, 95)

    def test_borrar_mesociclo_cascada(self):
        plan_id = self.crear_plan()
        base = f'/api/performance/centers/{self.center.id}/planificacion/{plan_id}'
        meso_id = self.client.post(f'{base}/mesociclos/', {'nombre': 'F1', 'tipo': 'competitivo'}, format='json').json()['id']
        self.client.post(f'{base}/mesociclos/{meso_id}/microciclos/', {'tipo': 'carga', 'carga_relativa': 70}, format='json')
        self.assertEqual(Microcycle.objects.count(), 1)

        res = self.client.delete(f'{base}/mesociclos/{meso_id}/')
        self.assertEqual(res.status_code, 204)
        self.assertEqual(Mesocycle.objects.count(), 0)
        self.assertEqual(Microcycle.objects.count(), 0)  # cascada

    def test_borrar_macro(self):
        plan_id = self.crear_plan()
        res = self.client.delete(f'/api/performance/centers/{self.center.id}/planificacion/{plan_id}/')
        self.assertEqual(res.status_code, 204)
        self.assertEqual(TrainingPlan.objects.count(), 0)

    def test_scope_plan_de_otro_centro_404(self):
        # Un plan que NO pertenece al centro de la ruta → 404 (no se filtra existencia).
        otro = SportsCenter.objects.create(nombre='Otro', slug='otro')
        plan_ajeno = TrainingPlan.objects.create(center=otro, nombre='Ajeno', fecha_inicio='2026-07-01')
        res = self.client.get(f'/api/performance/centers/{self.center.id}/planificacion/{plan_ajeno.id}/')
        self.assertEqual(res.status_code, 404)

    def test_plan_con_grupo(self):
        res = self.client.post(
            f'/api/performance/centers/{self.center.id}/planificacion/',
            {'nombre': 'Plan Sub-18', 'grupo': 'Sub-18', 'fecha_inicio': '2026-07-01'},
            format='json',
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['grupo'], 'Sub-18')
        self.assertEqual(TrainingPlan.objects.get(id=res.json()['id']).grupo, 'Sub-18')

    def test_microciclo_con_fecha(self):
        plan_id = self.crear_plan()
        base = f'/api/performance/centers/{self.center.id}/planificacion/{plan_id}'
        meso_id = self.client.post(f'{base}/mesociclos/', {'nombre': 'F1', 'tipo': 'competitivo'}, format='json').json()['id']
        res = self.client.post(f'{base}/mesociclos/{meso_id}/microciclos/', {
            'tipo': 'carga', 'carga_relativa': 70, 'fecha_inicio': '2026-07-06',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['fecha_inicio'], '2026-07-06')
        self.assertEqual(str(Microcycle.objects.get(id=res.json()['id']).fecha_inicio), '2026-07-06')

    def test_reordenar_mesociclos_por_orden(self):
        # Reordenar = intercambiar el `orden` de dos fases vía PATCH (el árbol las
        # devuelve ordenadas por `orden`).
        plan_id = self.crear_plan()
        base = f'/api/performance/centers/{self.center.id}/planificacion/{plan_id}'
        a = self.client.post(f'{base}/mesociclos/', {'orden': 1, 'nombre': 'A', 'tipo': 'prep_general'}, format='json').json()
        b = self.client.post(f'{base}/mesociclos/', {'orden': 2, 'nombre': 'B', 'tipo': 'competitivo'}, format='json').json()

        self.client.patch(f'{base}/mesociclos/{a["id"]}/', {'orden': 2}, format='json')
        self.client.patch(f'{base}/mesociclos/{b["id"]}/', {'orden': 1}, format='json')

        tree = self.client.get(f'{base}/').json()
        self.assertEqual([m['nombre'] for m in tree['mesociclos']], ['B', 'A'])

    def test_lista_macros_con_conteos(self):
        plan_id = self.crear_plan()
        base = f'/api/performance/centers/{self.center.id}/planificacion/{plan_id}'
        meso_id = self.client.post(f'{base}/mesociclos/', {'nombre': 'F1', 'tipo': 'competitivo'}, format='json').json()['id']
        self.client.post(f'{base}/mesociclos/{meso_id}/microciclos/', {'tipo': 'carga', 'carga_relativa': 70}, format='json')

        lista = self.client.get(f'/api/performance/centers/{self.center.id}/planificacion/').json()
        self.assertEqual(len(lista), 1)
        self.assertEqual(lista[0]['total_mesociclos'], 1)
        self.assertEqual(lista[0]['total_microciclos'], 1)
