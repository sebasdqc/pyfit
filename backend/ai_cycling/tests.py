"""Tests F0 — módulo de ciencia puro de ciclismo (sin Django/BD).
Espejo de ai_running/tests.py — misma cobertura, adaptada al ancla FC+RPE
(potencia opcional) y a que el volumen se mide en horas, no en km."""
from django.test import SimpleTestCase

from ai_cycling import training_science_cycling as ts


# ─── Zonas de potencia y FC ────────────────────────────────────────────────────

class ZonesTests(SimpleTestCase):
    def test_power_zones_ordenadas_y_crecientes(self):
        z = ts.power_zones(250)
        for lo, hi in z.values():
            self.assertLessEqual(lo, hi)
        # A más zona, más watts: Z1 < Z2 < SS < Z4 < Z5 < Z6 < Z7.
        self.assertLess(z['Z1'][1], z['Z2'][1])
        self.assertLess(z['SS'][0], z['Z4'][0])
        self.assertLess(z['Z5'][0], z['Z6'][0])
        # Z4 ≈ FTP (95-105% del FTP declarado).
        self.assertAlmostEqual(z['Z4'][0], round(250 * 0.95), delta=1)
        self.assertAlmostEqual(z['Z4'][1], round(250 * 1.05), delta=1)

    def test_sweet_spot_entre_tempo_y_umbral(self):
        z = ts.power_zones(250)
        self.assertGreaterEqual(z['SS'][0], z['Z3'][1] - 1)   # arranca donde termina Z3
        self.assertLessEqual(z['SS'][1], z['Z4'][0] + 1)      # termina donde empieza Z4

    def test_hr_zones_from_fthr_ancla_primaria(self):
        z = ts.hr_zones_from_fthr(165)
        for lo, hi in z.values():
            self.assertLessEqual(lo, hi)
        self.assertLess(z['Z1'][1], z['Z4'][0])

    def test_hr_zones_karvonen_fallback(self):
        z = ts.hr_zones_karvonen(190, 50)          # reserva 140
        self.assertEqual(z['Z1'][0], round(50 + 0.00 * 140))
        self.assertLess(z['Z1'][1], z['Z6'][0])

    def test_derive_zones_ancla_fc_siempre_que_haya_dato(self):
        # Sin FTHR ni FTP, pero con FCmáx/reposo → cae a Karvonen (fallback),
        # NUNCA se queda sin FC — es el ancla primaria del producto.
        z = ts.derive_zones(fc_max=190, fc_reposo=50)
        self.assertIsNotNone(z['hr'])
        self.assertTrue(z['metodo_hr'].startswith('karvonen'))
        self.assertIsNone(z['power'])

    def test_derive_zones_fthr_medido_gana_sobre_karvonen(self):
        z = ts.derive_zones(fthr_bpm=165, fc_max=190, fc_reposo=50)
        self.assertEqual(z['metodo_hr'], 'pct_fthr')

    def test_derive_zones_power_solo_si_hay_ftp(self):
        z = ts.derive_zones(fthr_bpm=165, ftp_w=250)
        self.assertIsNotNone(z['power'])
        self.assertEqual(z['metodo_power'], 'pct_ftp')

    def test_derive_zones_cold_start_total(self):
        z = ts.derive_zones()
        self.assertIsNone(z['hr'])
        self.assertIsNone(z['power'])

    def test_fc_max_tanaka_reexportado_de_endurance(self):
        # Misma fórmula que running — no debe reimplementarse acá.
        self.assertEqual(ts.fc_max_tanaka(30), round(208 - 0.7 * 30))


# ─── Estimación de FTP / FTHR ──────────────────────────────────────────────────

class EstimateThresholdTests(SimpleTestCase):
    def test_test_de_20min_con_potencia_confianza_alta(self):
        r = ts.estimate_threshold(declared_test={'avg_power_w': 260, 'avg_hr_20min': 165})
        self.assertEqual(r['fuente'], 'test_20min')
        self.assertEqual(r['confianza'], 'alta')
        self.assertEqual(r['ftp_w'], round(260 * 0.95))
        self.assertEqual(r['fthr_bpm'], 165)

    def test_test_solo_con_fc_confianza_media(self):
        r = ts.estimate_threshold(declared_test={'avg_hr_20min': 162})
        self.assertEqual(r['confianza'], 'media')
        self.assertIsNone(r['ftp_w'])
        self.assertEqual(r['fthr_bpm'], 162)

    def test_cold_start_sin_test(self):
        r = ts.estimate_threshold()
        self.assertEqual(r['fuente'], 'cold_start')
        self.assertIsNone(r['ftp_w'])
        self.assertIsNone(r['fthr_bpm'])
        self.assertEqual(r['confianza'], 'baja')

    def test_test_vacio_es_cold_start(self):
        r = ts.estimate_threshold(declared_test={})
        self.assertEqual(r['fuente'], 'cold_start')

    def test_declared_test_gana_sobre_historial(self):
        rides = [{'duration_min': 60, 'rpe_real': 8, 'normalized_power_w': 250,
                  'avg_heart_rate': 160}] * 8
        r = ts.estimate_threshold(declared_test={'avg_power_w': 260, 'avg_hr_20min': 165}, rides=rides)
        self.assertEqual(r['fuente'], 'test_20min')

    def test_historial_gradua_a_alta_con_suficientes_salidas_estables(self):
        """Bug corregido: antes no había ningún nivel 'historial' — el techo
        sin test declarado era siempre cold_start/baja."""
        rides = [
            {'duration_min': 60, 'rpe_real': 8, 'normalized_power_w': 250 + (i % 2),
             'avg_heart_rate': 165}
            for i in range(8)
        ]
        r = ts.estimate_threshold(rides=rides)
        self.assertEqual(r['fuente'], 'historial')
        self.assertEqual(r['confianza'], 'alta')
        self.assertEqual(r['ftp_w'], round(251 * 0.95))   # max(250,251) × 0.95
        self.assertEqual(r['n'], 8)

    def test_historial_con_pocas_salidas_confianza_baja(self):
        rides = [{'duration_min': 60, 'rpe_real': 8, 'avg_power_w': 250, 'avg_heart_rate': 160}]
        r = ts.estimate_threshold(rides=rides)
        self.assertEqual(r['fuente'], 'historial')
        self.assertEqual(r['confianza'], 'baja')

    def test_salida_corta_no_califica_para_historial(self):
        """Menos de MIN_RIDE_MIN_FOR_BASELINE (40 min) no es un proxy creíble
        de un test de 20 min sostenido."""
        rides = [{'duration_min': 15, 'rpe_real': 9, 'avg_power_w': 300, 'avg_heart_rate': 170}]
        r = ts.estimate_threshold(rides=rides)
        self.assertEqual(r['fuente'], 'cold_start')

    def test_salida_facil_no_califica_para_historial(self):
        """RPE bajo (rodaje fácil) no calibra un umbral aunque dure mucho."""
        rides = [{'duration_min': 90, 'rpe_real': 3, 'avg_power_w': 150, 'avg_heart_rate': 130}]
        r = ts.estimate_threshold(rides=rides)
        self.assertEqual(r['fuente'], 'cold_start')

    def test_historial_sin_potenciometro_usa_fc(self):
        rides = [{'duration_min': 45, 'rpe_real': 7, 'avg_heart_rate': 158}]
        r = ts.estimate_threshold(rides=rides)
        self.assertEqual(r['fuente'], 'historial')
        self.assertIsNone(r['ftp_w'])
        self.assertEqual(r['fthr_bpm'], 158)


class PowerBiasTests(SimpleTestCase):
    def test_positivo_cuando_se_sintio_mas_duro(self):
        pct = ts.power_bias_from_profile(rpe_promedio_real=9.0, rpe_promedio_target=7.0)
        self.assertAlmostEqual(pct, 0.04, places=4)

    def test_negativo_cuando_se_sintio_mas_facil(self):
        pct = ts.power_bias_from_profile(rpe_promedio_real=5.0, rpe_promedio_target=7.0)
        self.assertAlmostEqual(pct, -0.04, places=4)

    def test_capado_a_5_por_ciento(self):
        pct = ts.power_bias_from_profile(rpe_promedio_real=10.0, rpe_promedio_target=3.0)
        self.assertEqual(pct, ts.POWER_BIAS_CAP_PCT)

    def test_sin_historial_devuelve_cero(self):
        self.assertEqual(ts.power_bias_from_profile(None, None), 0.0)

    def test_apply_power_bias_ajusta_power_y_hr_hacia_abajo_si_se_sintio_duro(self):
        zonas = {'power': {'Z4': (238, 263)}, 'hr': {'Z4': (162, 170)}}
        # pct positivo = se sintió más duro → objetivo MENOR (a diferencia del
        # ritmo de running, donde "más lento" es un número MAYOR).
        ajustadas = ts.apply_power_bias(zonas, 0.10)
        self.assertEqual(ajustadas['power']['Z4'], (round(238 * 0.9), round(263 * 0.9)))
        self.assertEqual(ajustadas['hr']['Z4'], (round(162 * 0.9), round(170 * 0.9)))
        self.assertEqual(zonas['power']['Z4'], (238, 263))   # no muta el original

    def test_apply_power_bias_sin_power_no_crashea(self):
        zonas = {'power': None, 'hr': {'Z2': (120, 140)}}
        ajustadas = ts.apply_power_bias(zonas, 0.05)
        self.assertIsNone(ajustadas['power'])
        self.assertIsNotNone(ajustadas['hr'])


# ─── Volumen semanal en horas y cap de progresión propio ──────────────────────

class VolumeTests(SimpleTestCase):
    def test_weekly_volume_target_base(self):
        base = ts.weekly_volume_target(meta_tipo='gran_fondo', nivel='intermedio',
                                       fase='base', prev_hours=None)
        self.assertEqual(base, 6.0)   # 6.0 × 1.0 (intermedio) × 1.0 (base)

    def test_cap_de_progresion_es_mayor_que_el_de_running(self):
        # Mismo prev, misma fase build: ciclismo permite más que +10%.
        propuesto = ts.weekly_volume_target(meta_tipo='gran_fondo', nivel='intermedio',
                                            fase='build', prev_hours=5.0)
        tope_running = round(5.0 * 1.10, 1)
        tope_ciclismo = round(5.0 * ts.CYCLING_PROGRESSION_CAP, 1)
        self.assertGreater(tope_ciclismo, tope_running)
        self.assertLessEqual(propuesto, tope_ciclismo)

    def test_taper_reduce_directo(self):
        taper = ts.weekly_volume_target(meta_tipo='gran_fondo', nivel='intermedio',
                                        fase='taper', prev_hours=8.0)
        self.assertEqual(taper, round(8.0 * ts.PHASE_VOLUME_FACTOR['taper'], 1))
        self.assertLess(taper, 8.0)

    def test_polarizacion_reexportada_de_endurance(self):
        d = ts.polarized_distribution(10)
        self.assertEqual(d['easy_km'], 8.0)
        self.assertEqual(d['quality_km'], 2.0)


# ─── Catálogo: contrato con endurance.readiness ────────────────────────────────

class CatalogContractTests(SimpleTestCase):
    def test_easy_y_rest_existen(self):
        # endurance.readiness.adapt_today usa 'easy'/'rest' como vocabulario
        # universal de degradación — cualquier motor de deporte DEBE tenerlos.
        self.assertIn('easy', ts.SESSION_TYPES)
        self.assertIn('rest', ts.SESSION_TYPES)
        self.assertFalse(ts.SESSION_TYPES['easy']['es_calidad'])

    def test_sweet_spot_es_calidad(self):
        self.assertTrue(ts.SESSION_TYPES['sweet_spot']['es_calidad'])

    def test_sprints_no_es_calidad_por_bajo_volumen(self):
        # Mismo criterio que 'strides' en running: máxima intensidad pero muy
        # poco tiempo bajo tensión → no cuenta para el espaciado de calidad.
        self.assertFalse(ts.SESSION_TYPES['sprints']['es_calidad'])


# ─── Prescripción de sesión ────────────────────────────────────────────────────

def _zonas_completas():
    return ts.derive_zones(fthr_bpm=165, ftp_w=250, fc_max=190, fc_reposo=50,
                           fc_max_es_estimada=False)


class PrescribeTests(SimpleTestCase):
    PERIODIZ = {'fase': 'base', 'horas_objetivo_semana': 6.0}

    def test_easy_continua_con_zonas(self):
        out = ts.prescribe_ride_session(tipo_sesion='easy', zonas=_zonas_completas(),
                                        nivel='intermedio', periodizacion=self.PERIODIZ)
        self.assertEqual(out['zona_principal'], 'Z2')
        self.assertEqual(len(out['segmentos']), 1)
        seg = out['segmentos'][0]
        self.assertIsNotNone(seg['fc_objetivo'])
        self.assertIsNotNone(seg['potencia_objetivo'])
        self.assertIsNotNone(seg['rpe'])
        self.assertGreater(out['duracion_min'], 0)
        # Sin distancia — ciclismo se prescribe en tiempo, no en km.
        self.assertNotIn('distancia_km', out)

    def test_vo2max_intervalos_estructura(self):
        out = ts.prescribe_ride_session(tipo_sesion='vo2max', zonas=_zonas_completas(),
                                        nivel='intermedio', periodizacion=self.PERIODIZ)
        fases = [s['fase'] for s in out['segmentos']]
        self.assertEqual(fases, ['calentamiento', 'principal', 'enfriamiento'])
        principal = out['segmentos'][1]
        self.assertGreaterEqual(principal['repeticiones'], 5)
        self.assertEqual(out['zona_principal'], 'Z5')

    def test_sweet_spot_bloque_continuo(self):
        out = ts.prescribe_ride_session(tipo_sesion='sweet_spot', zonas=_zonas_completas(),
                                        nivel='avanzado', periodizacion=self.PERIODIZ)
        self.assertEqual(len(out['segmentos']), 3)
        self.assertIn('min', out['segmentos'][1]['trabajo'])
        self.assertEqual(out['segmentos'][1]['trabajo']['min'],
                         ts.SWEET_SPOT_MIN_BY_NIVEL['avanzado'])
        self.assertEqual(out['zona_principal'], 'SS')

    def test_rest_vacio(self):
        out = ts.prescribe_ride_session(tipo_sesion='rest', zonas=_zonas_completas(),
                                        nivel='intermedio', periodizacion=self.PERIODIZ)
        self.assertEqual(out['segmentos'], [])
        self.assertEqual(out['duracion_min'], 0)

    def test_horas_factor_reduce_repeticiones_de_intervalos(self):
        """Bug corregido: horas_factor (readiness — ej. ánimo bajo/monotonía)
        antes no afectaba en nada a las sesiones de intervalos — solo escalaba
        horas_sem, que esa rama no lee. Mismo fix que running."""
        base = ts.prescribe_ride_session(
            tipo_sesion='vo2max', zonas=_zonas_completas(), nivel='avanzado',
            periodizacion={'fase': 'build', 'horas_objetivo_semana': 6.0},
        )
        suavizada = ts.prescribe_ride_session(
            tipo_sesion='vo2max', zonas=_zonas_completas(), nivel='avanzado',
            periodizacion={'fase': 'build', 'horas_objetivo_semana': 6.0},
            readiness={'horas_factor': 0.85},
        )
        reps_base = base['segmentos'][1]['repeticiones']
        reps_suave = suavizada['segmentos'][1]['repeticiones']
        self.assertEqual(reps_base, 8)          # avanzado en build → tope del template (5,8)
        self.assertEqual(reps_suave, 7)          # round(8 × 0.85) = 7
        self.assertGreaterEqual(reps_suave, 5)   # nunca por debajo del mínimo del template

    def test_horas_factor_reduce_duracion_de_sweet_spot(self):
        base = ts.prescribe_ride_session(
            tipo_sesion='sweet_spot', zonas=_zonas_completas(), nivel='avanzado',
            periodizacion=self.PERIODIZ,
        )
        suavizada = ts.prescribe_ride_session(
            tipo_sesion='sweet_spot', zonas=_zonas_completas(), nivel='avanzado',
            periodizacion=self.PERIODIZ, readiness={'horas_factor': 0.85},
        )
        self.assertEqual(base['segmentos'][1]['trabajo']['min'], 45)
        self.assertLess(suavizada['segmentos'][1]['trabajo']['min'], 45)

    def test_sin_zonas_solo_rpe(self):
        zonas = {'hr': None, 'power': None}
        out = ts.prescribe_ride_session(tipo_sesion='threshold', zonas=zonas,
                                        nivel='intermedio', periodizacion=self.PERIODIZ)
        for seg in out['segmentos']:
            self.assertIsNone(seg['fc_objetivo'])
            self.assertIsNone(seg['potencia_objetivo'])
            self.assertIsNotNone(seg['rpe'])
        self.assertGreater(out['duracion_min'], 0)

    def test_solo_fc_sin_potencia_caso_comun_sin_potenciometro(self):
        # El caso típico per la decisión de producto: FC+RPE sin potenciómetro.
        zonas = ts.derive_zones(fthr_bpm=165)
        out = ts.prescribe_ride_session(tipo_sesion='easy', zonas=zonas,
                                        nivel='intermedio', periodizacion=self.PERIODIZ)
        seg = out['segmentos'][0]
        self.assertIsNotNone(seg['fc_objetivo'])
        self.assertIsNone(seg['potencia_objetivo'])

    def test_rpe_cap_de_readiness(self):
        out = ts.prescribe_ride_session(tipo_sesion='vo2max', zonas=_zonas_completas(),
                                        nivel='intermedio', periodizacion=self.PERIODIZ,
                                        readiness={'rpe_cap': 5})
        self.assertLessEqual(out['rpe_target'], 5)
        for seg in out['segmentos']:
            self.assertLessEqual(seg['rpe'], 5)

    def test_tipo_desconocido_lanza(self):
        with self.assertRaises(ValueError):
            ts.prescribe_ride_session(tipo_sesion='no_existe', zonas={}, nivel='intermedio')

    def test_calentamiento_mas_largo_que_running(self):
        out = ts.prescribe_ride_session(tipo_sesion='threshold', zonas=_zonas_completas(),
                                        nivel='intermedio', periodizacion=self.PERIODIZ)
        self.assertEqual(out['segmentos'][0]['trabajo']['min'], ts.WARMUP_MIN)
        self.assertEqual(ts.WARMUP_MIN, 15)

    def test_principiante_toma_el_minimo_de_repeticiones(self):
        out = ts.prescribe_ride_session(tipo_sesion='threshold', zonas=_zonas_completas(),
                                        nivel='principiante', periodizacion=self.PERIODIZ)
        principal = out['segmentos'][1]
        self.assertEqual(principal['repeticiones'], ts.INTERVAL_TEMPLATES['threshold']['reps'][0])
