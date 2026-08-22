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

    def test_cap_configurable_para_deportes_sin_impacto(self):
        # 15% en vez de 10% — el caso de ciclismo (sin carga de impacto óseo).
        self.assertEqual(sc.apply_ten_percent_rule(40, 60, cap=1.15), 46.0)


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

    def test_cap_configurable_se_propaga(self):
        v = sc.volume_target(base_volume=50, fase='build', prev_realized=40, cap=1.15)
        self.assertEqual(v, 46.0)   # 40 × 1.15, no 44 (10% default)


class PickRepsTests(SimpleTestCase):
    def test_principiante_toma_el_minimo(self):
        self.assertEqual(sc.pick_reps((4, 8), 'principiante'), 4)

    def test_avanzado_toma_el_maximo(self):
        self.assertEqual(sc.pick_reps((4, 8), 'avanzado'), 8)

    def test_fase_de_carga_toma_el_maximo_aunque_sea_intermedio(self):
        self.assertEqual(sc.pick_reps((4, 8), 'intermedio', fase='build'), 8)
        self.assertEqual(sc.pick_reps((4, 8), 'intermedio', fase='peak'), 8)

    def test_intermedio_sin_fase_de_carga_toma_el_punto_medio(self):
        self.assertEqual(sc.pick_reps((4, 8), 'intermedio', fase='base'), 6)


class KarvonenZonesTests(SimpleTestCase):
    def test_reserva_cardiaca_por_tabla_de_2_zonas(self):
        # FCmáx 190, FCreposo 50 → reserva 140. Z1 50-60% → 50+70=120 / 50+84=134
        zonas = sc.karvonen_zones(190, 50, {'Z1': (0.50, 0.60)})
        self.assertEqual(zonas['Z1'], (120, 134))

    def test_tabla_distinta_por_deporte_no_se_mezcla(self):
        # Misma FC, tablas de running (5 zonas) y ciclismo (7) dan resultados
        # propios — la función no asume ninguna tabla fija.
        running_z1 = sc.karvonen_zones(190, 50, {'Z1': (0.50, 0.60)})
        ciclismo_z1 = sc.karvonen_zones(190, 50, {'Z1': (0.0, 0.68)})
        self.assertNotEqual(running_z1['Z1'], ciclismo_z1['Z1'])


class FcMaxTanakaTests(SimpleTestCase):
    def test_formula_208_menos_07_por_edad(self):
        self.assertEqual(sc.fc_max_tanaka(30), round(208 - 0.7 * 30))
        self.assertEqual(sc.fc_max_tanaka(50), round(208 - 0.7 * 50))


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
