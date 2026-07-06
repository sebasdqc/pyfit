"""Tests unitarios — Familia 4 (CARGA INTERNA): sRPE, monotonía/strain y ACWR.

Valores conocidos, calculados a mano, para que la fórmula sea auditable. Funciones
puras → SimpleTestCase (sin base de datos).
"""

from django.test import SimpleTestCase

from performance.calculators import REGISTRY, CalculatorError, get_calculator


class RegistryTests(SimpleTestCase):
    def test_familia_carga_registrada(self):
        for slug in ('srpe', 'carga-semanal', 'acwr', 'trimp-edwards', 'forma'):
            self.assertIn(slug, REGISTRY, f'{slug} no está registrado')
            self.assertEqual(REGISTRY[slug].familia, 'carga')


class TRIMPEdwardsTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('trimp-edwards'))

    def test_trimp_y_perfil(self):
        # 10×1 + 20×2 + 30×3 + 20×4 + 10×5 = 270 UA ; total 90 min
        out = self.calc().run({'z1_min': 10, 'z2_min': 20, 'z3_min': 30, 'z4_min': 20, 'z5_min': 10})
        self.assertEqual(out['trimp_ua'], 270.0)
        self.assertEqual(out['tiempo_total_min'], 90.0)
        # >90 % FCmáx = 10/90 = 11.11 % ; >80 % = 30/90 = 33.33 %
        self.assertAlmostEqual(out['pct_sobre_90_fcmax'], 11.11, places=2)
        self.assertAlmostEqual(out['pct_sobre_80_fcmax'], 33.33, places=2)

    def test_requiere_alguna_zona(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({})


class SRPETests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('srpe'))

    def test_carga(self):
        # 7 × 90 = 630 UA
        self.assertEqual(self.calc().run({'rpe': 7, 'duracion_min': 90})['carga_ua'], 630.0)

    def test_rpe_fuera_de_rango(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'rpe': 11, 'duracion_min': 90})


class CargaSemanalTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('carga-semanal'))

    def test_monotonia_y_strain(self):
        # [500,600,400,700,300,650,0] → suma 3150, media 450, SD pobl. 225.2
        # monotonía = 450/225.2 = 1.998 ; strain = 3150×1.998
        out = self.calc().run({'cargas_diarias': [500, 600, 400, 700, 300, 650, 0]})
        self.assertEqual(out['carga_semanal_ua'], 3150.0)
        self.assertEqual(out['carga_media_diaria_ua'], 450.0)
        self.assertAlmostEqual(out['monotonia'], 2.0, places=1)
        self.assertFalse(out['monotonia_alerta'])  # 2.0 no es > 2.0

    def test_monotonia_alerta(self):
        # Cargas casi iguales → SD pequeña → monotonía alta (> 2.0).
        out = self.calc().run({'cargas_diarias': [500, 510, 505, 495, 500, 505, 500]})
        self.assertTrue(out['monotonia'] > 2.0)
        self.assertTrue(out['monotonia_alerta'])

    def test_sd_cero_monotonia_indefinida(self):
        out = self.calc().run({'cargas_diarias': [500, 500, 500, 500]})
        self.assertIsNone(out['monotonia'])
        self.assertIsNone(out['strain_ua'])
        self.assertFalse(out['monotonia_alerta'])


class ACWRTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('acwr'))

    def test_ratio_y_zona_optima(self):
        cargas = [500, 600, 400, 700, 300, 650, 500, 550, 600, 500, 400, 700, 650, 500]
        out = self.calc().run({'cargas_diarias': cargas})
        # Aguda (últimos 7) = (550+600+500+400+700+650+500)/7 = 557.14
        self.assertAlmostEqual(out['carga_aguda_ua'], 557.14, places=2)
        self.assertEqual(out['zona'], 'Óptima (sweet spot)')
        self.assertFalse(out['riesgo_alerta'])

    def test_zona_peligro(self):
        # 28 días bajos + un pico fuerte la última semana → ACWR alto.
        cargas = [200] * 21 + [900, 950, 1000, 900, 950, 1000, 900]
        out = self.calc().run({'cargas_diarias': cargas})
        self.assertGreater(out['acwr_ewma'], 1.5)
        self.assertTrue(out['riesgo_alerta'])
        self.assertIn(out['zona'], ('Zona de peligro', 'Riesgo alto'))

    def test_menos_de_7_dias_error(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'cargas_diarias': [500, 600, 400]})

    def test_ventana_parcial_anota(self):
        out = self.calc().run({'cargas_diarias': [500, 600, 400, 700, 300, 650, 500]})
        self.assertIn('nota', out)  # < 28 días → ventana crónica parcial
