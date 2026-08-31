"""Tests F0 — módulo de ciencia puro de running (sin Django/BD)."""
from django.test import SimpleTestCase

from ai_running import training_science_running as ts


# ─── Zonas de ritmo y FC ──────────────────────────────────────────────────────

class ZonesTests(SimpleTestCase):
    def test_pace_zones_ordenadas_y_rapido_menor_que_lento(self):
        z = ts.pace_zones(300)
        for lo, hi in z.values():
            self.assertLess(lo, hi)                       # rápido < lento (s/km)
        # Z5 es la más rápida (menos s/km), Z1 la más lenta.
        self.assertLess(z['Z5'][0], z['Z2'][0])
        self.assertLess(z['Z2'][0], z['Z1'][0])
        # Z4 ≈ umbral.
        self.assertAlmostEqual(z['Z4'][0], round(300 * 0.99), delta=1)

    def test_hr_zones_karvonen(self):
        z = ts.hr_zones(190, 50)                          # reserva 140
        self.assertEqual(z['Z1'][0], round(50 + 0.50 * 140))   # 120
        self.assertEqual(z['Z5'][1], 190)                      # tope = FCmáx
        self.assertLess(z['Z1'][0], z['Z5'][0])

    def test_fc_max_tanaka(self):
        self.assertEqual(ts.fc_max_tanaka(30), round(208 - 0.7 * 30))  # 187
        self.assertGreater(ts.fc_max_tanaka(20), ts.fc_max_tanaka(50))

    def test_derive_zones_parcial(self):
        # Solo umbral → pace presente, hr ausente.
        z = ts.derive_zones(threshold_pace_s_km=300)
        self.assertIsNotNone(z['pace'])
        self.assertIsNone(z['hr'])
        # Ambos, FCmáx estimada → marca el método.
        z2 = ts.derive_zones(threshold_pace_s_km=300, fc_max=190, fc_reposo=50,
                             fc_max_es_estimada=True)
        self.assertIsNotNone(z2['hr'])
        self.assertTrue(z2['metodo_hr'].endswith('_fcmax_estimada'))
        # Sin nada → todo None.
        z3 = ts.derive_zones()
        self.assertIsNone(z3['pace'])
        self.assertIsNone(z3['hr'])


# ─── Riegel y estimación de umbral ────────────────────────────────────────────

class BaselineTests(SimpleTestCase):
    def test_riegel_identidad_y_monotonia(self):
        self.assertAlmostEqual(ts.riegel(1200, 5, 5), 1200, delta=0.01)
        self.assertGreater(ts.riegel(1200, 5, 10), 1200)   # más distancia → más tiempo

    def test_declarado_alta_confianza(self):
        r = ts.estimate_threshold_pace(declared=(2400, 10))   # 10k en 40 min
        self.assertEqual(r['fuente'], 'declarado')
        self.assertEqual(r['confianza'], 'alta')
        self.assertTrue(200 <= r['threshold_pace_s_km'] <= 300)
        self.assertIsNotNone(r['vo2_estimado'])

    def test_historial_media_confianza(self):
        runs = [{'best_pace_s_km': 240, 'distance_km': 5} for _ in range(3)]
        r = ts.estimate_threshold_pace(runs=runs)
        self.assertEqual(r['fuente'], 'historial')
        self.assertEqual(r['confianza'], 'media')
        self.assertEqual(r['n'], 3)
        # Umbral más lento que el mejor km (Riegel desde 1 km es conservador).
        self.assertGreater(r['threshold_pace_s_km'], 240)

    def test_historial_pocos_runs_baja_confianza(self):
        r = ts.estimate_threshold_pace(runs=[{'best_pace_s_km': 250, 'distance_km': 4}])
        self.assertEqual(r['confianza'], 'baja')
        self.assertEqual(r['n'], 1)

    def test_runs_demasiado_cortos_no_cuentan(self):
        r = ts.estimate_threshold_pace(runs=[{'best_pace_s_km': 200, 'distance_km': 1.0}])
        self.assertEqual(r['fuente'], 'cold_start')
        self.assertIsNone(r['threshold_pace_s_km'])

    def test_cold_start_sin_datos(self):
        r = ts.estimate_threshold_pace()
        self.assertEqual(r['fuente'], 'cold_start')
        self.assertIsNone(r['threshold_pace_s_km'])
        self.assertIsNone(r['vo2_estimado'])

    def test_declarado_gana_sobre_historial(self):
        r = ts.estimate_threshold_pace(declared=(2400, 10),
                                       runs=[{'best_pace_s_km': 240, 'distance_km': 5}])
        self.assertEqual(r['fuente'], 'declarado')

    def test_weekly_volume_baseline(self):
        runs = [{'distance_km': 10} for _ in range(4)]      # 40 km en 28d
        self.assertEqual(ts.weekly_volume_baseline(runs), 10.0)
        self.assertIsNone(ts.weekly_volume_baseline([]))

    def test_guard_division_por_cero(self):
        # Riegel y _threshold_from_effort no deben crashear con entradas degeneradas.
        self.assertEqual(ts.riegel(1200, 0, 10), 0.0)
        self.assertIsNone(ts._threshold_from_effort(0, 5))
        self.assertIsNone(ts._threshold_from_effort(1200, 0))

    def test_confianza_historial_gradua_a_alta_con_suficiente_volumen_estable(self):
        """Bug corregido: antes el techo por historial (sin tiempo declarado)
        era SIEMPRE 'media', sin importar cuántas corridas consistentes se
        acumularan. Ahora gradúa a 'alta' con ≥8 corridas y baja dispersión."""
        runs_estables = [{'best_pace_s_km': 300 + (i % 2), 'distance_km': 5} for i in range(8)]
        r = ts.estimate_threshold_pace(runs=runs_estables)
        self.assertEqual(r['confianza'], 'alta')
        self.assertEqual(r['n'], 8)

    def test_confianza_historial_no_gradua_a_alta_con_pocas_corridas(self):
        runs_pocas = [{'best_pace_s_km': 300, 'distance_km': 5} for _ in range(5)]
        r = ts.estimate_threshold_pace(runs=runs_pocas)
        self.assertEqual(r['confianza'], 'media')

    def test_confianza_historial_no_gradua_a_alta_con_dispersion_alta(self):
        """Muchas corridas pero muy dispares entre sí (ruido, no fitness
        estable) → se queda en 'media', no 'alta'."""
        runs_dispersas = [
            {'best_pace_s_km': p, 'distance_km': 5}
            for p in [260, 340, 270, 330, 250, 350, 280, 320]
        ]
        r = ts.estimate_threshold_pace(runs=runs_dispersas)
        self.assertEqual(r['confianza'], 'media')

    def test_pace_bias_from_profile_positivo_cuando_se_sintio_mas_duro(self):
        pct = ts.pace_bias_from_profile(rpe_promedio_real=9.0, rpe_promedio_target=7.0)
        self.assertAlmostEqual(pct, 0.04, places=4)   # (9-7) × 0.02

    def test_pace_bias_from_profile_negativo_cuando_se_sintio_mas_facil(self):
        pct = ts.pace_bias_from_profile(rpe_promedio_real=5.0, rpe_promedio_target=7.0)
        self.assertAlmostEqual(pct, -0.04, places=4)

    def test_pace_bias_from_profile_capado_a_5_por_ciento(self):
        pct = ts.pace_bias_from_profile(rpe_promedio_real=10.0, rpe_promedio_target=3.0)
        self.assertEqual(pct, ts.PACE_BIAS_CAP_PCT)

    def test_pace_bias_from_profile_sin_historial_devuelve_cero(self):
        self.assertEqual(ts.pace_bias_from_profile(None, None), 0.0)

    def test_apply_pace_bias_ajusta_todas_las_zonas(self):
        zonas = {'pace': {'Z2': (330, 360), 'Z5': (250, 270)}, 'hr': {'Z2': (130, 145)}}
        ajustadas = ts.apply_pace_bias(zonas, 0.10)
        self.assertEqual(ajustadas['pace']['Z2'], (363, 396))   # +10%, más lento
        self.assertEqual(ajustadas['pace']['Z5'], (275, 297))
        self.assertEqual(ajustadas['hr'], zonas['hr'])          # FC no se toca
        # No muta el original.
        self.assertEqual(zonas['pace']['Z2'], (330, 360))

    def test_apply_pace_bias_sin_pct_devuelve_zonas_intactas(self):
        zonas = {'pace': {'Z2': (330, 360)}}
        self.assertIs(ts.apply_pace_bias(zonas, 0.0), zonas)

    def test_apply_pace_bias_sin_zonas_de_pace_no_crashea(self):
        self.assertEqual(ts.apply_pace_bias({'pace': None}, 0.05), {'pace': None})
        self.assertEqual(ts.apply_pace_bias({}, 0.05), {})


# ─── Volumen, regla del 10% y polarización ────────────────────────────────────

class VolumeTests(SimpleTestCase):
    def test_regla_diez_por_ciento(self):
        self.assertEqual(ts.apply_ten_percent_rule(40, 50), 44.0)   # tope +10%
        self.assertEqual(ts.apply_ten_percent_rule(30, 25), 25.0)   # propuesto menor pasa
        self.assertEqual(ts.apply_ten_percent_rule(0, 30), 30.0)    # sin previo
        self.assertEqual(ts.apply_ten_percent_rule(None, 30), 30.0)

    def test_polarizacion_80_20(self):
        d = ts.polarized_distribution(50)
        self.assertEqual(d['easy_km'], 40.0)
        self.assertEqual(d['quality_km'], 10.0)

    def test_weekly_volume_target_base_y_taper(self):
        base = ts.weekly_volume_target(meta_tipo='10k', nivel='intermedio',
                                       fase='base', prev_km=None)
        self.assertEqual(base, 35.0)                                # 35 × 1.0 × 1.0
        taper = ts.weekly_volume_target(meta_tipo='10k', nivel='intermedio',
                                        fase='taper', prev_km=40)
        self.assertEqual(taper, round(40 * ts.PHASE_VOLUME_FACTOR['taper'], 1))
        self.assertLess(taper, 40)


# ─── Prescripción de sesión ───────────────────────────────────────────────────

def _zonas_completas():
    return ts.derive_zones(threshold_pace_s_km=300, fc_max=190, fc_reposo=50,
                           fc_max_es_estimada=False)


class PrescribeTests(SimpleTestCase):
    PERIODIZ = {'fase': 'base', 'km_objetivo_semana': 35}

    def test_easy_continua_con_zonas(self):
        out = ts.prescribe_run_session(tipo_sesion='easy', zonas=_zonas_completas(),
                                       nivel='intermedio', periodizacion=self.PERIODIZ)
        self.assertEqual(out['zona_principal'], 'Z2')
        self.assertEqual(len(out['segmentos']), 1)
        seg = out['segmentos'][0]
        self.assertIsNotNone(seg['pace_objetivo'])
        self.assertIsNotNone(seg['fc_objetivo'])
        self.assertIsNotNone(seg['rpe'])
        self.assertGreater(out['distancia_km'], 0)
        self.assertGreater(out['duracion_min'], 0)

    def test_vo2_intervalos_estructura(self):
        out = ts.prescribe_run_session(tipo_sesion='vo2', zonas=_zonas_completas(),
                                       nivel='intermedio', periodizacion=self.PERIODIZ)
        fases = [s['fase'] for s in out['segmentos']]
        self.assertEqual(fases, ['calentamiento', 'principal', 'enfriamiento'])
        principal = out['segmentos'][1]
        self.assertGreaterEqual(principal['repeticiones'], 4)
        self.assertEqual(out['zona_principal'], 'Z5')

    def test_tempo_bloque_continuo(self):
        out = ts.prescribe_run_session(tipo_sesion='tempo', zonas=_zonas_completas(),
                                       nivel='avanzado', periodizacion=self.PERIODIZ)
        self.assertEqual(len(out['segmentos']), 3)
        self.assertIn('min', out['segmentos'][1]['trabajo'])
        self.assertEqual(out['zona_principal'], 'Z4')

    def test_strides_base_mas_series_sin_calentamiento(self):
        out = ts.prescribe_run_session(tipo_sesion='strides', zonas=_zonas_completas(),
                                       nivel='intermedio', periodizacion=self.PERIODIZ)
        fases = [s['fase'] for s in out['segmentos']]
        self.assertEqual(fases, ['principal', 'principal'])     # base easy + strides

    def test_rest_vacio(self):
        out = ts.prescribe_run_session(tipo_sesion='rest', zonas=_zonas_completas(),
                                       nivel='intermedio', periodizacion=self.PERIODIZ)
        self.assertEqual(out['segmentos'], [])
        self.assertEqual(out['duracion_min'], 0)

    def test_sin_zonas_solo_rpe(self):
        zonas = {'pace': None, 'hr': None}
        out = ts.prescribe_run_session(tipo_sesion='tempo', zonas=zonas,
                                       nivel='intermedio', periodizacion=self.PERIODIZ)
        for seg in out['segmentos']:
            self.assertIsNone(seg['pace_objetivo'])
            self.assertIsNone(seg['fc_objetivo'])
            self.assertIsNotNone(seg['rpe'])
        self.assertGreater(out['duracion_min'], 0)             # estimado por nominal

    def test_solo_pace_sin_fc(self):
        zonas = ts.derive_zones(threshold_pace_s_km=300)       # sin FC
        out = ts.prescribe_run_session(tipo_sesion='easy', zonas=zonas,
                                       nivel='intermedio', periodizacion=self.PERIODIZ)
        seg = out['segmentos'][0]
        self.assertIsNotNone(seg['pace_objetivo'])
        self.assertIsNone(seg['fc_objetivo'])

    def test_rpe_cap_de_readiness(self):
        out = ts.prescribe_run_session(tipo_sesion='vo2', zonas=_zonas_completas(),
                                       nivel='intermedio', periodizacion=self.PERIODIZ,
                                       readiness={'rpe_cap': 5})
        self.assertLessEqual(out['rpe_target'], 5)
        for seg in out['segmentos']:
            self.assertLessEqual(seg['rpe'], 5)

    def test_km_factor_reduce_repeticiones_de_intervalos(self):
        """Bug corregido: el km_factor de readiness (ej. ánimo bajo → 0.85)
        antes no afectaba en nada a las sesiones de intervalos — reps salía
        siempre del template sin importar el factor. Ahora sí reduce reps,
        nunca por debajo del mínimo del template."""
        base = ts.prescribe_run_session(
            tipo_sesion='vo2', zonas=_zonas_completas(), nivel='avanzado',
            periodizacion={'fase': 'build', 'km_objetivo_semana': 35},
        )
        suavizada = ts.prescribe_run_session(
            tipo_sesion='vo2', zonas=_zonas_completas(), nivel='avanzado',
            periodizacion={'fase': 'build', 'km_objetivo_semana': 35},
            readiness={'km_factor': 0.85},
        )
        reps_base = base['segmentos'][1]['repeticiones']
        reps_suave = suavizada['segmentos'][1]['repeticiones']
        self.assertEqual(reps_base, 6)          # avanzado en build → tope del template (4,6)
        self.assertEqual(reps_suave, 5)          # round(6 × 0.85) = 5
        self.assertGreaterEqual(reps_suave, 4)   # nunca por debajo del mínimo del template

    def test_km_factor_reduce_duracion_de_tempo(self):
        base = ts.prescribe_run_session(
            tipo_sesion='tempo', zonas=_zonas_completas(), nivel='avanzado',
            periodizacion=self.PERIODIZ,
        )
        suavizada = ts.prescribe_run_session(
            tipo_sesion='tempo', zonas=_zonas_completas(), nivel='avanzado',
            periodizacion=self.PERIODIZ, readiness={'km_factor': 0.85},
        )
        self.assertEqual(base['segmentos'][1]['trabajo']['min'], 30)
        self.assertLess(suavizada['segmentos'][1]['trabajo']['min'], 30)

    def test_hills_cuenta_la_recuperacion_en_la_duracion(self):
        """Bug corregido: INTERVAL_TEMPLATES['hills']['rec'] no traía 'min'/'seg'
        → _seg_min_km computaba rec_min=0 y la duración salía subestimada
        (~solo el trabajo, sin el tiempo de bajar trotando entre repeticiones)."""
        out = ts.prescribe_run_session(tipo_sesion='hills', zonas=_zonas_completas(),
                                       nivel='avanzado', periodizacion=self.PERIODIZ)
        principal = out['segmentos'][1]
        reps = principal['repeticiones']
        self.assertGreater(reps, 1)
        work_min = reps * (45 / 60.0)
        # Con recuperación contabilizada, la duración total debe superar
        # claramente el tiempo de solo trabajo (antes eran ~iguales, ya que
        # rec_min=0 hacía que el bloque principal fuera solo work_min).
        self.assertGreater(out['duracion_min'], work_min + ts.WARMUP_MIN + ts.COOLDOWN_MIN)

    def test_tipo_desconocido_lanza(self):
        with self.assertRaises(ValueError):
            ts.prescribe_run_session(tipo_sesion='maraton_invertido', zonas={},
                                     nivel='intermedio')

    def test_long_run_acotado(self):
        out = ts.prescribe_run_session(tipo_sesion='long', zonas=_zonas_completas(),
                                       nivel='intermedio',
                                       periodizacion={'fase': 'base', 'km_objetivo_semana': 40})
        # El long no supera ~35% del volumen semanal.
        self.assertLessEqual(out['segmentos'][0]['trabajo']['distancia_km'],
                             round(40 * ts.LONG_RUN_MAX_PCT, 1) + 0.1)
