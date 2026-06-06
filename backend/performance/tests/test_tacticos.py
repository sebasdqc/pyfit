"""Tests unitarios — Familia 3 (TÁCTICOS), con valores conocidos.

Verifican que cada fórmula da el resultado correcto. Auditables: si una norma
cambia, el test debe cambiar a propósito. Calculadoras = funciones puras →
SimpleTestCase (sin base de datos).
"""

from django.test import SimpleTestCase

from performance.calculators import REGISTRY, CalculatorError, get_calculator


class RegistryTacticosTests(SimpleTestCase):
    def test_familia3_registrada(self):
        for slug in ('tsap', 'gpai'):
            self.assertIn(slug, REGISTRY, f'{slug} no está registrado')

    def test_familia_es_tactico(self):
        for slug in ('tsap', 'gpai'):
            self.assertEqual(get_calculator(slug).familia, 'tactico')


class TSAPTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('tsap'))

    def test_rendimiento(self):
        # VJ = 5 + 15 = 20 ; ofensivos = 8 + 2 = 10
        # IE = (5 + 10) / (10 + 10) = 0.75
        # Rendimiento = (20/2) + (0.75×10) = 10 + 7.5 = 17.5
        out = self.calc().run({
            'balones_conquistados': 5,
            'balones_recibidos': 15,
            'pases_ofensivos': 8,
            'jugadas_exitosas': 2,
            'balones_perdidos': 10,
        })
        self.assertEqual(out['volumen_juego'], 20)
        self.assertEqual(out['balones_ofensivos'], 10)
        self.assertAlmostEqual(out['indice_eficiencia'], 0.75, places=2)
        self.assertAlmostEqual(out['puntuacion_rendimiento'], 17.5, places=2)

    def test_sin_perdidos_ni_ofensivos(self):
        # VJ = 10 ; IE = (4 + 0) / (10 + 0) = 0.4 ; Rendimiento = 5 + 4 = 9.0
        out = self.calc().run({'balones_conquistados': 4, 'balones_recibidos': 6})
        self.assertEqual(out['volumen_juego'], 10)
        self.assertEqual(out['balones_ofensivos'], 0)
        self.assertAlmostEqual(out['indice_eficiencia'], 0.4, places=2)
        self.assertAlmostEqual(out['puntuacion_rendimiento'], 9.0, places=2)

    def test_falta_conquistados(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'balones_recibidos': 6})

    def test_conteo_negativo(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'balones_conquistados': -1, 'balones_recibidos': 6})


class GPAITests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('gpai'))

    def test_promedio_de_indices(self):
        # índices: 8/10=0.8, 6/10=0.6, 10/10=1.0 → GP = 2.4/3 = 0.8
        # GI = 10 + 10 + 10 = 30
        out = self.calc().run({'componentes': [
            {'nombre': 'toma_decision', 'apropiadas': 8, 'inapropiadas': 2},
            {'nombre': 'ejecucion', 'apropiadas': 6, 'inapropiadas': 4},
            {'nombre': 'apoyo', 'apropiadas': 10, 'inapropiadas': 0},
        ]})
        self.assertEqual(out['game_involvement'], 30)
        self.assertAlmostEqual(out['game_performance'], 0.8, places=2)
        self.assertEqual(out['n_componentes'], 3)
        self.assertAlmostEqual(out['componentes'][0]['indice'], 0.8, places=2)
        self.assertAlmostEqual(out['componentes'][2]['indice'], 1.0, places=2)

    def test_componente_sin_acciones_se_omite(self):
        # La fila 0/0 no se observó → se omite del promedio y del conteo.
        out = self.calc().run({'componentes': [
            {'nombre': 'toma_decision', 'apropiadas': 3, 'inapropiadas': 1},
            {'nombre': 'cobertura', 'apropiadas': 0, 'inapropiadas': 0},
        ]})
        self.assertEqual(out['n_componentes'], 1)
        self.assertEqual(out['game_involvement'], 4)
        self.assertAlmostEqual(out['game_performance'], 0.75, places=2)

    def test_lista_vacia(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'componentes': []})

    def test_todos_sin_acciones(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'componentes': [{'apropiadas': 0, 'inapropiadas': 0}]})

    def test_falta_componentes(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({})
