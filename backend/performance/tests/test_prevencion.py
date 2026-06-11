"""Tests unitarios — Familia 5 (PREVENCIÓN / RTP): Nordic, LSI e hidratación.

Funciones puras → SimpleTestCase (sin base de datos).
"""

from django.test import SimpleTestCase

from performance.calculators import REGISTRY, CalculatorError, get_calculator


class RegistryTests(SimpleTestCase):
    def test_familia_prevencion_registrada(self):
        for slug in ('nordic-asimetria', 'lsi', 'hidratacion'):
            self.assertIn(slug, REGISTRY, f'{slug} no está registrado')
            self.assertEqual(REGISTRY[slug].familia, 'prevencion')


class NordicTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('nordic-asimetria'))

    def test_asimetria_alerta(self):
        # |320−380|/380×100 = 15.79 % → supera el 10 %
        out = self.calc().run({'fuerza_izquierda_n': 320, 'fuerza_derecha_n': 380})
        self.assertAlmostEqual(out['asimetria_pct'], 15.79, places=2)
        self.assertTrue(out['asimetria_alerta'])
        self.assertEqual(out['pierna_debil'], 'izquierda')

    def test_simetrico(self):
        out = self.calc().run({'fuerza_izquierda_n': 350, 'fuerza_derecha_n': 350})
        self.assertEqual(out['asimetria_pct'], 0.0)
        self.assertFalse(out['asimetria_alerta'])
        self.assertEqual(out['pierna_debil'], 'simétrica')


class LSITests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('lsi'))

    def test_apto_rtp(self):
        # 180/200×100 = 90 % → ≥ 90 → apto
        out = self.calc().run({'lado_lesionado': 180, 'lado_sano': 200})
        self.assertEqual(out['lsi_pct'], 90.0)
        self.assertTrue(out['apto_rtp'])
        self.assertEqual(out['deficit_pct'], 10.0)

    def test_no_apto(self):
        out = self.calc().run({'lado_lesionado': 150, 'lado_sano': 200})
        self.assertEqual(out['lsi_pct'], 75.0)
        self.assertFalse(out['apto_rtp'])

    def test_sano_cero(self):
        with self.assertRaises(CalculatorError):
            self.calc().run({'lado_lesionado': 150, 'lado_sano': 0})


class HidratacionTests(SimpleTestCase):
    calc = staticmethod(lambda: get_calculator('hidratacion'))

    def test_deshidratacion_con_ingesta(self):
        # (75−73.5)+0.5 = 2.0 kg → 2.0/75×100 = 2.67 % → > 2 % alerta
        out = self.calc().run({'peso_pre_kg': 75, 'peso_post_kg': 73.5, 'liquido_ingerido_l': 0.5})
        self.assertAlmostEqual(out['deshidratacion_pct'], 2.67, places=2)
        self.assertTrue(out['deshidratacion_alerta'])

    def test_sin_alerta(self):
        out = self.calc().run({'peso_pre_kg': 75, 'peso_post_kg': 74.5})
        self.assertAlmostEqual(out['deshidratacion_pct'], 0.67, places=2)
        self.assertFalse(out['deshidratacion_alerta'])
