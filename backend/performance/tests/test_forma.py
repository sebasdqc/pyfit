"""Tests unitarios — 'forma' (fitness-fatiga / TSB), calculadora nueva de la
Familia CARGA. Valores calculados a mano con la misma fórmula (dos EWMA de
distinta ventana sobre la serie diaria). Funciones puras → SimpleTestCase.
"""

from django.test import SimpleTestCase

from performance.calculators import CalculatorError, get_calculator


class FormaCalculatorTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('forma'))

    def test_menos_de_7_dias_error(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'cargas_diarias': [500, 600, 400, 700, 300]})

    def test_carga_constante_tsb_cero_zona_neutra(self):
        # Serie constante → cualquier EWMA converge exactamente al mismo valor
        # (se siembra con el primer punto y ya no se mueve): TSB = 0 exacto.
        out = self.calc().run({'cargas_diarias': [500] * 10})
        self.assertEqual(out['fitness_ua'], 500.0)
        self.assertEqual(out['fatiga_ua'], 500.0)
        self.assertEqual(out['tsb'], 0.0)
        self.assertEqual(out['zona'], 'Neutro / transición')

    def test_carga_alta_reciente_fatigado(self):
        # 5 días bajos + 5 altos: la EWMA corta (fatiga) reacciona más rápido
        # al pico reciente que la EWMA larga (fitness) → TSB muy negativo.
        # fatiga_ua = EWMA(λ=2/8) de [400]*5+[800]*5 → 705.08
        # fitness_ua = EWMA(λ=2/11, ventana=10=n) de la misma serie → 653.34
        # tsb = 653.34 − 705.08 = −51.74
        out = self.calc().run({'cargas_diarias': [400] * 5 + [800] * 5})
        self.assertAlmostEqual(out['fatiga_ua'], 705.08, places=2)
        self.assertAlmostEqual(out['fitness_ua'], 653.34, places=2)
        self.assertAlmostEqual(out['tsb'], -51.74, places=2)
        self.assertEqual(out['zona'], 'Fatigado')
        self.assertIn('nota', out)  # 10 < 42 días → ventana de fitness parcial

    def test_taper_fresco(self):
        # 30 días de carga alta sostenida + taper de 7 días bajos: la fatiga
        # aguda cae rápido pero el fitness crónico se mantiene alto → TSB > 5.
        out = self.calc().run({'cargas_diarias': [700] * 30 + [150] * 7})
        self.assertAlmostEqual(out['fatiga_ua'], 223.42, places=2)
        self.assertAlmostEqual(out['fitness_ua'], 526.70, places=2)
        self.assertAlmostEqual(out['tsb'], 303.28, places=2)
        self.assertEqual(out['zona'], 'Fresco')
        self.assertIn('nota', out)  # 37 < 42 días

    def test_ventana_fitness_completa_sin_nota(self):
        out = self.calc().run({'cargas_diarias': [500] * 42})
        self.assertNotIn('nota', out)
