"""Tests unitarios — Familia 1 (FÍSICOS), con valores conocidos.

Verifican que cada fórmula da el resultado correcto. Auditables: si una norma
cambia, el test debe cambiar a propósito. Calculadoras = funciones puras →
SimpleTestCase (sin base de datos).
"""

from django.test import SimpleTestCase

from performance.calculators import REGISTRY, CalculatorError, get_calculator


class RegistryTests(SimpleTestCase):
    def test_familia1_registrada(self):
        for slug in ('yoyo-ir1', 'sprint-lineal', 'test-505', 'rsa', 'cmj'):
            self.assertIn(slug, REGISTRY, f'{slug} no está registrado')


class YoYoIR1Tests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('yoyo-ir1'))

    def test_distancia_y_vo2max(self):
        # 22 shuttles × 40 m = 880 m → VO2máx = 880×0.0084 + 36.4 = 43.792
        out = self.calc().run({'shuttles': 22})
        self.assertEqual(out['distancia_m'], 880.0)
        self.assertAlmostEqual(out['vo2max_ml_min_kg'], 43.79, places=2)

    def test_cero_shuttles(self):
        out = self.calc().run({'shuttles': 0})
        self.assertEqual(out['distancia_m'], 0.0)
        self.assertAlmostEqual(out['vo2max_ml_min_kg'], 36.4, places=2)

    def test_nivel_opcional(self):
        out = self.calc().run({'shuttles': 40, 'nivel': 18.5})
        self.assertEqual(out['distancia_m'], 1600.0)
        self.assertEqual(out['nivel'], 18.5)

    def test_falta_shuttles(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({})

    def test_shuttles_negativo(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'shuttles': -3})


class SprintLinealTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('sprint-lineal'))

    def test_velocidad(self):
        out = self.calc().run({'distancia_m': 30, 'tiempo_s': 4})
        self.assertAlmostEqual(out['velocidad_ms'], 7.5, places=2)
        self.assertAlmostEqual(out['velocidad_kmh'], 27.0, places=2)

    def test_tiempo_cero(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'distancia_m': 30, 'tiempo_s': 0})

    def test_falta_distancia(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'tiempo_s': 4})


class Test505Tests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('test-505'))

    def test_sin_alerta(self):
        # |2.40 − 2.60| / 2.60 × 100 = 7.69 %
        out = self.calc().run({'tiempo_dominante': 2.40, 'tiempo_no_dominante': 2.60})
        self.assertAlmostEqual(out['tiempo_medio_s'], 2.50, places=2)
        self.assertAlmostEqual(out['asimetria_pct'], 7.69, places=2)
        self.assertFalse(out['asimetria_alerta'])

    def test_con_alerta(self):
        # |2.40 − 2.80| / 2.80 × 100 = 14.29 % → supera el 10 %
        out = self.calc().run({'tiempo_dominante': 2.40, 'tiempo_no_dominante': 2.80})
        self.assertAlmostEqual(out['asimetria_pct'], 14.29, places=2)
        self.assertTrue(out['asimetria_alerta'])


class RSATests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('rsa'))

    def test_decremento(self):
        # mejor 7.0, media 7.3 → decremento = (7.3/7.0 − 1)×100 = 4.29 %
        out = self.calc().run({'tiempos': [7.0, 7.2, 7.4, 7.6]})
        self.assertEqual(out['n_sprints'], 4)
        self.assertAlmostEqual(out['mejor_tiempo_s'], 7.0, places=2)
        self.assertAlmostEqual(out['tiempo_medio_s'], 7.3, places=2)
        self.assertAlmostEqual(out['tiempo_total_s'], 29.2, places=2)
        self.assertAlmostEqual(out['indice_decremento_pct'], 4.29, places=2)

    def test_un_solo_sprint(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'tiempos': [7.0]})

    def test_lista_vacia(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'tiempos': []})


class CMJTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('cmj'))

    def test_desde_tiempo_de_vuelo_sin_masa(self):
        # h = 9.81×0.5²/8 = 0.3065625 m → 30.66 cm
        out = self.calc().run({'tiempo_vuelo_s': 0.5})
        self.assertAlmostEqual(out['altura_cm'], 30.66, places=2)
        self.assertEqual(out['origen_altura'], 'tiempo_vuelo')
        self.assertIsNone(out['potencia_w'])

    def test_altura_directa_con_potencia_sayers(self):
        # Potencia = 60.7×40 + 45.3×75 − 2055 = 3770.5 W
        out = self.calc().run({'altura_cm': 40, 'masa_kg': 75})
        self.assertEqual(out['altura_cm'], 40.0)
        self.assertEqual(out['origen_altura'], 'directo')
        self.assertAlmostEqual(out['potencia_w'], 3770.5, places=2)

    def test_sin_altura_ni_tiempo(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'masa_kg': 75})
