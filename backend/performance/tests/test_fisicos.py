"""Tests unitarios — Familia 1 (FÍSICOS), con valores conocidos.

Verifican que cada fórmula da el resultado correcto. Auditables: si una norma
cambia, el test debe cambiar a propósito. Calculadoras = funciones puras →
SimpleTestCase (sin base de datos).
"""

from django.test import SimpleTestCase

from performance.calculators import REGISTRY, CalculatorError, get_calculator


class RegistryTests(SimpleTestCase):
    def test_familia1_registrada(self):
        for slug in (
            'yoyo-ir1', 'yoyo-ir2', 'ift-30-15', 'sprint-lineal', 'sprint-splits',
            'test-505', 'cod-deficit', 'rsa', 'rast', 'cmj', 'squat-jump', 'drop-jump', 'broad-jump',
        ):
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


class YoYoIR2Tests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('yoyo-ir2'))

    def test_distancia_y_vo2max(self):
        # 25 shuttles × 40 m = 1000 m → VO2máx = 1000×0.0136 + 45.3 = 58.9
        out = self.calc().run({'shuttles': 25})
        self.assertEqual(out['distancia_m'], 1000.0)
        self.assertAlmostEqual(out['vo2max_ml_min_kg'], 58.9, places=2)


class IFT3015Tests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('ift-30-15'))

    def test_vo2max_buchheit(self):
        # 28.3 −2.15·1 −0.741·22 −0.0357·75 +0.0586·22·19 +1.03·19 = 51.24
        out = self.calc().run({'vift': 19.0, 'sexo': 1, 'edad': 22, 'peso_kg': 75})
        self.assertAlmostEqual(out['vo2max_ml_min_kg'], 51.24, places=2)
        self.assertEqual(out['velocidad_hiit_kmh'], 19.0)

    def test_vift_sin_antropometria(self):
        out = self.calc().run({'vift': 18.0})
        self.assertIsNone(out['vo2max_ml_min_kg'])
        self.assertEqual(out['vift_kmh'], 18.0)

    def test_falta_vift(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'sexo': 1})


class RASTTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('rast'))

    def test_potencias_e_indice_fatiga(self):
        # P_pico = 75×35²/5³ = 735 W ; relativa = 735/75 = 9.8 W/kg
        out = self.calc().run({'masa_kg': 75, 'tiempos': [5.0, 5.1, 5.3, 5.5, 5.6, 5.8]})
        self.assertEqual(out['n_sprints'], 6)
        self.assertAlmostEqual(out['potencia_pico_w'], 735.0, places=2)
        self.assertAlmostEqual(out['potencia_pico_relativa_w_kg'], 9.8, places=2)
        self.assertGreater(out['indice_fatiga_w_s'], 0)

    def test_tiempo_cero(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'masa_kg': 75, 'tiempos': [5.0, 0]})


class SprintSplitsTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('sprint-splits'))

    def test_velocidades_por_tramo(self):
        out = self.calc().run({'t10': 1.8, 't20': 3.1, 't30': 4.2})
        self.assertAlmostEqual(out['velocidad_0_10_ms'], 5.56, places=2)
        # Volante 20–30 m: (30−20)/(4.2−3.1) = 9.09 m/s
        self.assertAlmostEqual(out['velocidad_volante_ms'], 9.09, places=2)
        self.assertEqual(out['distancia_medida_m'], 30)

    def test_solo_10m(self):
        out = self.calc().run({'t10': 1.7})
        self.assertAlmostEqual(out['velocidad_0_10_ms'], 5.88, places=2)
        self.assertEqual(out['distancia_medida_m'], 10)

    def test_parciales_no_crecientes(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'t10': 2.0, 't20': 1.9})


class CODDeficitTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('cod-deficit'))

    def test_deficit(self):
        out = self.calc().run({'tiempo_505': 2.4, 'tiempo_10m': 1.8})
        self.assertAlmostEqual(out['cod_deficit_s'], 0.6, places=2)
        self.assertAlmostEqual(out['cod_deficit_pct'], 33.33, places=2)

    def test_505_menor_que_10m(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'tiempo_505': 1.5, 'tiempo_10m': 1.8})


class SquatJumpTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('squat-jump'))

    def test_potencia_sayers(self):
        out = self.calc().run({'altura_cm': 40, 'masa_kg': 75})
        self.assertAlmostEqual(out['potencia_w'], 3770.5, places=2)


class DropJumpTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('drop-jump'))

    def test_rsi(self):
        # RSI = 0.40 m / 0.20 s = 2.0
        out = self.calc().run({'altura_cm': 40, 'tiempo_contacto_s': 0.2})
        self.assertAlmostEqual(out['rsi'], 2.0, places=2)

    def test_contacto_cero(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'altura_cm': 40, 'tiempo_contacto_s': 0})


class BroadJumpTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('broad-jump'))

    def test_distancia_y_ratio(self):
        out = self.calc().run({'distancia_cm': 240, 'talla_cm': 178})
        self.assertEqual(out['distancia_m'], 2.4)
        self.assertAlmostEqual(out['ratio_distancia_talla'], 1.35, places=2)
