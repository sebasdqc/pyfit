from django.test import SimpleTestCase

from . import science as sc


class TenPercentRuleTests(SimpleTestCase):
    def test_tope_10_por_ciento(self):
        self.assertEqual(sc.apply_ten_percent_rule(40, 50), 44.0)

    def test_propuesto_menor_pasa_sin_recorte(self):
        self.assertEqual(sc.apply_ten_percent_rule(30, 25), 25.0)

    def test_sin_previo_pasa_directo(self):
        self.assertEqual(sc.apply_ten_percent_rule(0, 30), 30.0)
        self.assertEqual(sc.apply_ten_percent_rule(None, 30), 30.0)


class PolarizedDistributionTests(SimpleTestCase):
    def test_80_20(self):
        d = sc.polarized_distribution(50)
        self.assertEqual(d['easy_km'], 40.0)
        self.assertEqual(d['quality_km'], 10.0)


class VolumeTargetTests(SimpleTestCase):
    def test_fase_de_carga_aplica_factor_y_cap_10_por_ciento(self):
        # build = ×1.10, pero el prev acota a ×1.10 sobre 40 → 44.0 en ambos casos
        v = sc.volume_target(base_volume=50, fase='build', prev_realized=40)
        self.assertEqual(v, 44.0)

    def test_taper_reduce_directo_sin_cap(self):
        v = sc.volume_target(base_volume=50, fase='taper', prev_realized=40)
        self.assertEqual(v, round(40 * sc.PHASE_VOLUME_FACTOR['taper'], 1))

    def test_taper_sin_prev_usa_base(self):
        v = sc.volume_target(base_volume=50, fase='taper', prev_realized=None)
        self.assertEqual(v, round(50 * sc.PHASE_VOLUME_FACTOR['taper'], 1))

    def test_fase_desconocida_no_aplica_factor(self):
        v = sc.volume_target(base_volume=30, fase='inventada', prev_realized=None)
        self.assertEqual(v, 30.0)


class PickQualityDaysTests(SimpleTestCase):
    def test_separa_del_ancla(self):
        chosen = sc.pick_quality_days([1, 3, 5], anchor_day=5, n=1)
        self.assertEqual(chosen, {1})

    def test_dos_dias_no_adyacentes(self):
        chosen = sc.pick_quality_days([0, 2, 3, 5, 6], anchor_day=6, n=2)
        ds = sorted(chosen)
        self.assertEqual(len(ds), 2)
        self.assertGreater(ds[1] - ds[0], 1)

    def test_dias_pegados_coloca_menos_en_vez_de_forzar_adyacencia(self):
        chosen = sc.pick_quality_days([0, 1, 2], anchor_day=2, n=2, min_gap=2)
        ds = sorted(chosen)
        for a, b in zip(ds, ds[1:]):
            self.assertGreater(b - a, 1)
        self.assertLessEqual(len(ds), 1)

    def test_anchor_se_excluye_del_pool(self):
        chosen = sc.pick_quality_days([0, 1], anchor_day=1, n=5)
        self.assertNotIn(1, chosen)
