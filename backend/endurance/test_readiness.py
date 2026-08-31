from types import SimpleNamespace

from django.test import SimpleTestCase

from . import readiness as rd

PAIN_KEYWORDS = ('rodilla', 'tobillo', 'gemelo')
RPE_BY_ZONE = {'Z1': 3, 'Z2': 4, 'Z3': 6, 'Z4': 8, 'Z5': 9}


class DetectarDolorTests(SimpleTestCase):
    def test_encuentra_keyword_normalizando_acentos(self):
        self.assertEqual(rd.detectar_dolor('Me duele el TOBILLO', PAIN_KEYWORDS), 'tobillo')

    def test_sin_texto_devuelve_none(self):
        self.assertIsNone(rd.detectar_dolor('', PAIN_KEYWORDS))
        self.assertIsNone(rd.detectar_dolor(None, PAIN_KEYWORDS))

    def test_texto_sin_coincidencia_devuelve_none(self):
        self.assertIsNone(rd.detectar_dolor('todo perfecto hoy', PAIN_KEYWORDS))


class EsCheckinDeDescansoTests(SimpleTestCase):
    def test_detecta_descanso_en_foco(self):
        self.assertTrue(rd.es_checkin_de_descanso(['descanso']))

    def test_lista_vacia_o_none(self):
        self.assertFalse(rd.es_checkin_de_descanso([]))
        self.assertFalse(rd.es_checkin_de_descanso(None))


class ComputeReadinessTests(SimpleTestCase):
    def test_sin_carga_ni_checkin(self):
        r = rd.compute_readiness(carga=None, checkin=None, pain_keywords=PAIN_KEYWORDS)
        self.assertFalse(r['suficiente'])
        self.assertEqual(r['zona_acwr'], 'Acumulando datos')
        self.assertFalse(r['has_checkin'])
        self.assertEqual(r['score'], 70)

    def test_checkin_malo_baja_score(self):
        checkin = SimpleNamespace(estado_animo=1, calidad_sueno=5.0, hrv=40,
                                  dolor_hoy='', foco_entrenamiento=[])
        r = rd.compute_readiness(carga=None, checkin=checkin, pain_keywords=PAIN_KEYWORDS)
        self.assertEqual(r['score'], 25)        # 70 −20(ánimo) −15(sueño<6) −10(hrv<45)
        self.assertTrue(r['hrv_low'])
        self.assertTrue(r['sueno_bad'])

    def test_detecta_dolor_de_carga(self):
        checkin = SimpleNamespace(estado_animo=3, calidad_sueno=8.0, hrv=None,
                                  dolor_hoy='Me molesta la rodilla derecha',
                                  foco_entrenamiento=[])
        r = rd.compute_readiness(carga=None, checkin=checkin, pain_keywords=PAIN_KEYWORDS)
        self.assertEqual(r['dolor'], 'rodilla')

    def test_rest_checkin(self):
        checkin = SimpleNamespace(estado_animo=3, calidad_sueno=8.0, hrv=None,
                                  dolor_hoy='', foco_entrenamiento=['descanso'])
        r = rd.compute_readiness(carga=None, checkin=checkin, pain_keywords=PAIN_KEYWORDS)
        self.assertTrue(r['rest_checkin'])

    def test_monotonia_alta_baja_score_y_marca_flag(self):
        """Bug corregido: monotonia_alerta ya venía calculado en athlete_carga()
        (Foster) pero se descartaba antes de llegar a compute_readiness."""
        carga = {'suficiente': True, 'zona': 'Óptimo', 'riesgo_alerta': False,
                 'acwr_ewma': 1.0, 'monotonia_alerta': True}
        r = rd.compute_readiness(carga=carga, checkin=None, pain_keywords=PAIN_KEYWORDS)
        self.assertTrue(r['monotonia_alta'])
        self.assertIn('monotonia_alta', r['flags'])
        self.assertEqual(r['score'], 65)   # 70 − 5

    def test_sin_monotonia_alerta_no_marca_flag(self):
        carga = {'suficiente': True, 'zona': 'Óptimo', 'riesgo_alerta': False,
                 'acwr_ewma': 1.0, 'monotonia_alerta': False}
        r = rd.compute_readiness(carga=carga, checkin=None, pain_keywords=PAIN_KEYWORDS)
        self.assertFalse(r['monotonia_alta'])
        self.assertNotIn('monotonia_alta', r['flags'])

    def test_acwr_riesgo_alto_baja_score_y_marca_flag(self):
        carga = {'suficiente': True, 'zona': 'Riesgo alto', 'riesgo_alerta': True, 'acwr_ewma': 1.6}
        r = rd.compute_readiness(carga=carga, checkin=None, pain_keywords=PAIN_KEYWORDS)
        self.assertTrue(r['riesgo_alto'])
        self.assertIn('acwr_alto', r['flags'])
        self.assertEqual(r['score'], 50)   # 70 − 20

    def test_sueno_manual_de_pocas_horas_penaliza_por_default(self):
        """Bug corregido: sin sueno_es_score explícito (default False, el caso
        real de running/ciclismo hoy — ningún llamador conecta datos de
        dispositivo acá), un check-in manual de 3-4 horas es MALA noche real y
        debe penalizar, nunca leerse como si fuera un sleep score de
        dispositivo (que antes premiaba por error con +5)."""
        checkin = SimpleNamespace(estado_animo=3, calidad_sueno=4.0, hrv=None,
                                  dolor_hoy='', foco_entrenamiento=[])
        r = rd.compute_readiness(carga=None, checkin=checkin, pain_keywords=PAIN_KEYWORDS)
        self.assertEqual(r['score'], 55)   # 70 + 0(ánimo neutro) − 15(sueño<6 horas)
        self.assertTrue(r['sueno_bad'])

    def test_sueno_score_de_dispositivo_con_flag_explicito(self):
        """Con sueno_es_score=True (el llamador confirma que YA reemplazó el
        valor por un sleep score 1-4 de un dispositivo conectado), el mismo
        número 4 se interpreta correctamente como score bueno, no como horas."""
        checkin = SimpleNamespace(estado_animo=3, calidad_sueno=4.0, hrv=None,
                                  dolor_hoy='', foco_entrenamiento=[])
        r = rd.compute_readiness(
            carga=None, checkin=checkin, pain_keywords=PAIN_KEYWORDS, sueno_es_score=True,
        )
        self.assertEqual(r['score'], 75)   # 70 + 0(ánimo neutro) + 5(score 4/4 bueno)
        self.assertFalse(r['sueno_bad'])


class AdaptTodayTests(SimpleTestCase):
    def _signals(self, **over):
        s = {'score': 75, 'suficiente': False, 'zona_acwr': 'Acumulando datos',
             'acwr_ewma': None, 'riesgo_alto': False, 'infracarga': False,
             'monotonia_alta': False,
             'has_checkin': True, 'animo': 4, 'sueno_bad': False, 'hrv_low': False,
             'dolor': None, 'rest_checkin': False, 'flags': []}
        s.update(over)
        return s

    def test_dolor_degrada_calidad_a_easy(self):
        out = rd.adapt_today(tipo_sesion='vo2', es_calidad=True, zona_principal='Z5',
                             rpe_by_zone=RPE_BY_ZONE, signals=self._signals(dolor='rodilla'))
        self.assertEqual(out['tipo_sesion'], 'easy')
        self.assertEqual(out['ajuste_aplicado'], 'dolor_a_easy')
        self.assertEqual(out['rpe_cap'], 5)

    def test_dolor_en_no_calidad_va_a_descanso(self):
        out = rd.adapt_today(tipo_sesion='easy', es_calidad=False, zona_principal='Z2',
                             rpe_by_zone=RPE_BY_ZONE, signals=self._signals(dolor='tobillo'))
        self.assertEqual(out['tipo_sesion'], 'rest')
        self.assertEqual(out['ajuste_aplicado'], 'dolor_a_descanso')

    def test_checkin_descanso_gana_sobre_todo_lo_demas(self):
        out = rd.adapt_today(tipo_sesion='tempo', es_calidad=True, zona_principal='Z4',
                             rpe_by_zone=RPE_BY_ZONE,
                             signals=self._signals(rest_checkin=True, score=10))
        self.assertEqual(out['tipo_sesion'], 'rest')
        self.assertEqual(out['ajuste_aplicado'], 'checkin_descanso')

    def test_acwr_alto_degrada_calidad(self):
        out = rd.adapt_today(tipo_sesion='tempo', es_calidad=True, zona_principal='Z4',
                             rpe_by_zone=RPE_BY_ZONE,
                             signals=self._signals(suficiente=True, riesgo_alto=True))
        self.assertEqual(out['tipo_sesion'], 'easy')
        self.assertEqual(out['ajuste_aplicado'], 'acwr_alto_degradado')
        self.assertLess(out['factor'], 1.0)

    def test_acwr_alto_en_no_calidad_solo_recorta_volumen(self):
        out = rd.adapt_today(tipo_sesion='easy', es_calidad=False, zona_principal='Z2',
                             rpe_by_zone=RPE_BY_ZONE,
                             signals=self._signals(suficiente=True, riesgo_alto=True))
        self.assertEqual(out['tipo_sesion'], 'easy')          # NO cambia el tipo
        self.assertEqual(out['ajuste_aplicado'], 'acwr_alto_recorta')
        self.assertEqual(out['factor'], 0.8)

    def test_sin_checkin_neutro_no_intensifica_ni_degrada(self):
        out = rd.adapt_today(tipo_sesion='vo2', es_calidad=True, zona_principal='Z5',
                             rpe_by_zone=RPE_BY_ZONE, signals=self._signals(has_checkin=False))
        self.assertEqual(out['ajuste_aplicado'], 'sin_checkin_neutro')
        self.assertEqual(out['tipo_sesion'], 'vo2')

    def test_readiness_baja_suaviza_calidad(self):
        out = rd.adapt_today(tipo_sesion='vo2', es_calidad=True, zona_principal='Z5',
                             rpe_by_zone=RPE_BY_ZONE, signals=self._signals(score=30))
        self.assertEqual(out['tipo_sesion'], 'easy')
        self.assertEqual(out['ajuste_aplicado'], 'readiness_baja_suaviza')

    def test_animo_bajo_capea_rpe_por_zona(self):
        out = rd.adapt_today(tipo_sesion='vo2', es_calidad=True, zona_principal='Z5',
                             rpe_by_zone=RPE_BY_ZONE, signals=self._signals(animo=1))
        self.assertEqual(out['ajuste_aplicado'], 'animo_bajo_suaviza')
        self.assertEqual(out['rpe_cap'], 8)   # max(4, RPE_BY_ZONE['Z5'](9) - 1)

    def test_monotonia_alta_suaviza_calidad_sin_cancelarla(self):
        out = rd.adapt_today(tipo_sesion='vo2', es_calidad=True, zona_principal='Z5',
                             rpe_by_zone=RPE_BY_ZONE, signals=self._signals(monotonia_alta=True))
        self.assertEqual(out['ajuste_aplicado'], 'monotonia_alta_varia')
        self.assertEqual(out['tipo_sesion'], 'vo2')   # NO cancela, solo suaviza (factor+rpe_cap)
        self.assertEqual(out['factor'], 0.85)
        self.assertEqual(out['rpe_cap'], 8)

    def test_monotonia_alta_sin_calidad_no_dispara_la_regla(self):
        out = rd.adapt_today(tipo_sesion='easy', es_calidad=False, zona_principal='Z2',
                             rpe_by_zone=RPE_BY_ZONE, signals=self._signals(monotonia_alta=True))
        self.assertEqual(out['ajuste_aplicado'], 'confirmada')

    def test_infracarga_permite_progresion(self):
        out = rd.adapt_today(tipo_sesion='easy', es_calidad=False, zona_principal='Z2',
                             rpe_by_zone=RPE_BY_ZONE,
                             signals=self._signals(suficiente=True, infracarga=True, score=80))
        self.assertEqual(out['ajuste_aplicado'], 'infracarga_ok')
        self.assertGreater(out['factor'], 1.0)
        # Bug corregido: aplica +5% de volumen real → debe persistirse como
        # 'ajustada', no quedar en 'planificada' (inconsistente con el resto
        # de reglas que sí modifican factor).
        self.assertEqual(out['estado'], 'ajustada')

    def test_todo_verde_confirma(self):
        out = rd.adapt_today(tipo_sesion='tempo', es_calidad=True, zona_principal='Z4',
                             rpe_by_zone=RPE_BY_ZONE, signals=self._signals())
        self.assertEqual(out['ajuste_aplicado'], 'confirmada')
        self.assertEqual(out['estado'], 'planificada')
        self.assertEqual(out['factor'], 1.0)
