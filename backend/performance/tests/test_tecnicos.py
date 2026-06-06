"""Tests unitarios — Familia 2 (TÉCNICOS), con valores conocidos.

Verifican que cada fórmula da el resultado correcto. Auditables: si una norma
cambia, el test debe cambiar a propósito. Calculadoras = funciones puras →
SimpleTestCase (sin base de datos).
"""

from django.test import SimpleTestCase

from performance.calculators import REGISTRY, CalculatorError, get_calculator


class RegistryTecnicosTests(SimpleTestCase):
    def test_familia2_registrada(self):
        for slug in ('lspt', 'conduccion-slalom'):
            self.assertIn(slug, REGISTRY, f'{slug} no está registrado')

    def test_familia_es_tecnico(self):
        for slug in ('lspt', 'conduccion-slalom'):
            self.assertEqual(get_calculator(slug).familia, 'tecnico')


class LSPTTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('lspt'))

    def test_penalizaciones_y_bonus(self):
        # ejecución 40 + (2×3 imprecisos) + (1×5 objetivo) + (1×5 manejo)
        #   = 40 + 16 penal − (2×1 bonus) = 54.0
        out = self.calc().run({
            'tiempo_ejecucion_s': 40,
            'pase_impreciso': 2,
            'objetivo_equivocado': 1,
            'manejo_balon': 1,
            'dianas_banda': 2,
        })
        self.assertEqual(out['penalizacion_total_s'], 16.0)
        self.assertEqual(out['bonus_total_s'], 2.0)
        self.assertEqual(out['tiempo_rendimiento_s'], 54.0)
        self.assertEqual(out['desglose_penalizaciones']['pase_impreciso'], 6.0)
        self.assertEqual(out['desglose_penalizaciones']['objetivo_equivocado'], 5.0)
        self.assertEqual(out['desglose_penalizaciones']['manejo_balon'], 5.0)
        # Las claves no usadas quedan en 0.
        self.assertEqual(out['desglose_penalizaciones']['balon_fuera_area'], 0.0)
        self.assertEqual(out['desglose_penalizaciones']['no_parar_zona'], 0.0)

    def test_sin_errores_ni_bonus(self):
        out = self.calc().run({'tiempo_ejecucion_s': 45})
        self.assertEqual(out['penalizacion_total_s'], 0.0)
        self.assertEqual(out['bonus_total_s'], 0.0)
        self.assertEqual(out['tiempo_rendimiento_s'], 45.0)

    def test_falta_tiempo_ejecucion(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'pase_impreciso': 1})

    def test_contador_negativo(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'tiempo_ejecucion_s': 40, 'pase_impreciso': -1})


class ConduccionSlalomTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('conduccion-slalom'))

    def test_penalizacion_por_conos(self):
        # 10 s + 2 conos × 2 s = 14 s
        out = self.calc().run({'tiempo_s': 10, 'conos_derribados': 2})
        self.assertEqual(out['penalizacion_s'], 4.0)
        self.assertEqual(out['tiempo_total_s'], 14.0)
        self.assertNotIn('velocidad_ms', out)

    def test_velocidad_con_distancia(self):
        # total 14 s, 28 m → 2.0 m/s = 7.2 km/h
        out = self.calc().run({'tiempo_s': 10, 'conos_derribados': 2, 'distancia_m': 28})
        self.assertEqual(out['tiempo_total_s'], 14.0)
        self.assertAlmostEqual(out['velocidad_ms'], 2.0, places=2)
        self.assertAlmostEqual(out['velocidad_kmh'], 7.2, places=2)

    def test_sin_conos(self):
        out = self.calc().run({'tiempo_s': 12.5})
        self.assertEqual(out['conos_derribados'], 0)
        self.assertEqual(out['penalizacion_s'], 0.0)
        self.assertEqual(out['tiempo_total_s'], 12.5)

    def test_falta_tiempo(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'conos_derribados': 3})
