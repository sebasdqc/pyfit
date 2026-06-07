from types import SimpleNamespace

from django.test import SimpleTestCase

from ai_workout import training_science as ts
from ai_workout.adaptive_engine import AdaptiveEngineService, _MIN_FOCUS_POOL
from ai_workout.views import _format_exercise_pool_enriched


def _ex(nombre, patron, primarios, secundarios=None):
    return {
        'nombre': nombre,
        'patron_movimiento': patron,
        'musculos_primarios': primarios,
        'musculos_secundarios': secundarios or [],
    }


def _engine(foco):
    """Engine mínimo para probar _apply_focus_filter sin BD."""
    return AdaptiveEngineService(
        SimpleNamespace(id=1),
        SimpleNamespace(foco_entrenamiento=foco),
        None,
        None,
    )


# Los 42 MuscleGroup.name reales de producción (anatomical_group | name).
PROD_MUSCLES_42 = [
    'Braquial', 'Braquiorradial', 'Bíceps braquial', 'Extensores del antebrazo',
    'Flexores del antebrazo', 'Tríceps braquial',
    'Cuadrado lumbar', 'Oblicuo externo', 'Oblicuo interno', 'Psoas ilíaco',
    'Recto abdominal', 'Transverso abdominal',
    'Dorsal ancho', 'Erector espinal', 'Infraespinoso', 'Multífidos',
    'Redondo mayor', 'Redondo menor', 'Romboides', 'Supraespinoso',
    'Trapecio inferior', 'Trapecio medio', 'Trapecio superior',
    'Deltoides anterior', 'Deltoides lateral', 'Deltoides posterior', 'Subescapular',
    'Pectoral mayor (porción clavicular)', 'Pectoral mayor (porción esternal)',
    'Pectoral menor', 'Serrato anterior',
    'Abductores', 'Aductores', 'Cuádriceps', 'Glúteo mayor', 'Glúteo medio',
    'Glúteo menor', 'Isquiotibiales', 'Pantorrilla (gastrocnemio)', 'Sóleo',
    'Tensor de la fascia lata', 'Tibial anterior',
]


class TaxonomyTests(SimpleTestCase):
    def test_42_prod_muscles_all_map(self):
        """Los 42 músculos reales de prod deben mapear a un grupo válido."""
        self.assertEqual(len(PROD_MUSCLES_42), 42)
        validos = set(ts.VOLUME_GROUPS) | {ts.STABILIZER_GROUP}
        for m in PROD_MUSCLES_42:
            vg = ts.volume_group_for_muscle(m)
            self.assertIn(vg, validos, f'{m!r} → {vg!r} no es un grupo válido')

    def test_exactly_13_volume_groups(self):
        self.assertEqual(len(ts.VOLUME_GROUPS), 13)

    def test_every_budgeted_group_has_landmarks_and_anatomical(self):
        for vg in ts.VOLUME_GROUPS:
            self.assertIsNotNone(ts.weekly_landmarks(vg), f'{vg} sin landmarks')
            self.assertIsNotNone(ts.anatomical_group(vg), f'{vg} sin grupo anatómico')

    def test_manguito_has_no_budget(self):
        self.assertIsNone(ts.weekly_landmarks(ts.STABILIZER_GROUP))

    def test_anatomical_groups_are_the_six(self):
        seis = {'Pierna', 'Pecho', 'Espalda', 'Hombro', 'Brazo', 'Core'}
        for vg in ts.VOLUME_GROUPS:
            self.assertIn(ts.anatomical_group(vg), seis)

    def test_legacy_lowercase_vocab_maps(self):
        # Vocabulario del JSONField local (minúsculas) no debe quedar ciego.
        self.assertEqual(ts.volume_group_for_muscle('glúteos'), 'gluteos')
        self.assertEqual(ts.volume_group_for_muscle('cuádriceps'), 'cuadriceps')
        self.assertEqual(ts.volume_group_for_muscle('pectoral'), 'pecho')


class LandmarkTests(SimpleTestCase):
    def test_nivel_scaling_monotonic(self):
        prin = ts.weekly_landmarks('pecho', 'principiante')['mrv']
        inte = ts.weekly_landmarks('pecho', 'intermedio')['mrv']
        avan = ts.weekly_landmarks('pecho', 'avanzado')['mrv']
        self.assertLess(prin, inte)
        self.assertLess(inte, avan)

    def test_mev_le_mav_le_mrv(self):
        for vg in ts.VOLUME_GROUPS:
            lm = ts.weekly_landmarks(vg, 'intermedio')
            self.assertLessEqual(lm['mev'], lm['mav'])
            self.assertLessEqual(lm['mav'], lm['mrv'])


class RepRangeTests(SimpleTestCase):
    def test_compound_freeweight_is_6_10(self):
        self.assertEqual(ts.rep_range_default(True, True, 'sentadilla'), (6, 10))

    def test_other_quadrants(self):
        self.assertEqual(ts.rep_range_default(True, False, 'sentadilla'), (8, 12))
        self.assertEqual(ts.rep_range_default(False, True, 'aislamiento'), (10, 12))
        self.assertEqual(ts.rep_range_default(False, False, 'aislamiento'), (12, 15))

    def test_core_and_non_strength(self):
        self.assertEqual(ts.rep_range_default(True, False, 'core_antiextension'), ts.CORE_REP_RANGE)
        self.assertIsNone(ts.rep_range_default(True, False, 'movilidad'))


class RpeCapTests(SimpleTestCase):
    def test_barbell_squat_is_capped(self):
        self.assertEqual(ts.rpe_safety_cap(True, True, 'sentadilla'), 8)

    def test_beginner_capped_lower(self):
        self.assertEqual(ts.rpe_safety_cap(True, True, 'empuje_vertical', nivel='principiante'), 7)

    def test_high_error_risk_capped_even_on_machine(self):
        self.assertEqual(ts.rpe_safety_cap(True, False, 'aislamiento', error_risk=5), 8)

    def test_low_risk_isolation_not_capped(self):
        self.assertIsNone(ts.rpe_safety_cap(False, False, 'aislamiento'))


class RestAndEquipmentTests(SimpleTestCase):
    def test_compound_rests_more_than_isolation(self):
        self.assertGreater(ts.rest_seconds(True), ts.rest_seconds(False))

    def test_fatigue_adds_rest(self):
        base = ts.rest_seconds(True)
        self.assertEqual(ts.rest_seconds(True, fatiga='alto'), base + ts.REST_FATIGUE_BONUS_S)
        self.assertEqual(ts.rest_seconds(True, estado_animo=2), base + ts.REST_FATIGUE_BONUS_S)

    def test_free_weight_detection(self):
        self.assertTrue(ts.is_free_weight(equipment_categories=['Libre']))
        self.assertTrue(ts.is_free_weight(equipamiento_names=['Barra olímpica']))
        self.assertTrue(ts.is_free_weight(nombre='Sentadilla con barra'))
        self.assertFalse(ts.is_free_weight(equipment_categories=['Máquina'], nombre='Prensa'))


class FocoMappingTests(SimpleTestCase):
    def test_body_part_tokens(self):
        self.assertEqual(ts.volume_groups_for_foco(['pecho']), {'pecho'})
        self.assertEqual(
            ts.volume_groups_for_foco(['piernas']),
            {'cuadriceps', 'isquiotibiales', 'gluteos', 'pantorrilla'},
        )

    def test_movement_tokens(self):
        self.assertEqual(ts.volume_groups_for_foco(['empujes']), {'pecho', 'deltoides', 'triceps'})

    def test_modality_and_empty_mean_no_filter(self):
        self.assertIsNone(ts.volume_groups_for_foco([]))
        self.assertIsNone(ts.volume_groups_for_foco(None))
        self.assertIsNone(ts.volume_groups_for_foco(['completo']))
        self.assertIsNone(ts.volume_groups_for_foco(['fuerza']))

    def test_combined_tokens_union(self):
        self.assertEqual(ts.volume_groups_for_foco(['pecho', 'hombros']), {'pecho', 'deltoides'})


class FocusFilterTests(SimpleTestCase):
    def test_no_foco_returns_pool_unchanged(self):
        pool = [_ex('Press banca', 'empuje_horizontal', ['Pectoral mayor (porción esternal)'])]
        self.assertEqual(_engine([])._apply_focus_filter(pool), pool)

    def test_hard_filter_excludes_other_groups(self):
        pool = [
            _ex('Press banca', 'empuje_horizontal', ['Pectoral mayor (porción esternal)']),
            _ex('Curl bíceps', 'aislamiento', ['Bíceps braquial']),
            _ex('Sentadilla', 'sentadilla', ['Cuádriceps']),
        ]
        nombres = {e['nombre'] for e in _engine(['pecho'])._apply_focus_filter(pool)}
        self.assertIn('Press banca', nombres)
        self.assertNotIn('Curl bíceps', nombres)
        self.assertNotIn('Sentadilla', nombres)

    def test_mobility_always_kept(self):
        pool = [_ex('Movilidad de cadera', 'movilidad', ['Psoas ilíaco'])]
        out = _engine(['pecho'])._apply_focus_filter(pool)
        self.assertEqual(len(out), 1)

    def test_relax_to_secondary_when_too_few(self):
        pool = [_ex('Press banca', 'empuje_horizontal', ['Pectoral mayor (porción esternal)'])]
        for i in range(5):
            pool.append(_ex(
                f'Fondos {i}', 'empuje_horizontal',
                ['Tríceps braquial'], ['Pectoral mayor (porción esternal)'],
            ))
        out = _engine(['pecho'])._apply_focus_filter(pool)
        # 1 primario + relax de secundarios; entra más de 1 pero sin pasar el mínimo.
        self.assertGreater(len(out), 1)
        self.assertLessEqual(len(out), _MIN_FOCUS_POOL)


class WeeklyVolumeTests(SimpleTestCase):
    def test_aggregate_primary_full_secondary_half(self):
        rows = [
            {'nombre': 'Sentadilla', 'series': 4},   # cuádriceps primario, glúteos sec
            {'nombre': 'Prensa', 'series': 3},       # cuádriceps primario
        ]
        vg_map = {
            'Sentadilla': ({'cuadriceps'}, {'gluteos'}),
            'Prensa':     ({'cuadriceps'}, set()),
        }
        done = ts.aggregate_done_sets(rows, vg_map)
        self.assertEqual(done['cuadriceps'], 7)        # 4 + 3 primario
        self.assertEqual(done['gluteos'], 2.0)         # 4 × 0.5 secundario

    def test_aggregate_ignores_stabilizer(self):
        rows = [{'nombre': 'Face pull', 'series': 4}]
        vg_map = {'Face pull': ({ts.STABILIZER_GROUP}, {'deltoides'})}
        done = ts.aggregate_done_sets(rows, vg_map)
        self.assertNotIn(ts.STABILIZER_GROUP, done)
        self.assertEqual(done['deltoides'], 2.0)

    def test_weekly_budget_remaining_and_cap(self):
        b = ts.weekly_budget({'pecho': 10}, 'intermedio')['pecho']
        self.assertEqual(b['hechas'], 10)
        self.assertEqual(b['mrv'], 22)
        self.assertEqual(b['restante'], 12)

    def test_weekly_budget_clamps_at_zero_when_over_mrv(self):
        b = ts.weekly_budget({'pecho': 30}, 'intermedio')['pecho']
        self.assertEqual(b['restante'], 0)

    def test_weekly_budget_scales_with_nivel(self):
        prin = ts.weekly_budget({'pecho': 0}, 'principiante')['pecho']['mrv']
        avan = ts.weekly_budget({'pecho': 0}, 'avanzado')['pecho']['mrv']
        self.assertLess(prin, avan)


class ParseRepRangeTests(SimpleTestCase):
    def test_basic_ranges(self):
        self.assertEqual(ts.parse_rep_range('6–10'), (6, 10))
        self.assertEqual(ts.parse_rep_range('3-6'), (3, 6))
        self.assertEqual(ts.parse_rep_range('1–3 a velocidad máxima'), (1, 3))
        self.assertEqual(ts.parse_rep_range('8'), (8, 8))
        self.assertIsNone(ts.parse_rep_range('sin números'))


class PrescribeTests(SimpleTestCase):
    def test_no_cycle_uses_default_quadrant(self):
        p = ts.prescribe_exercise(
            es_compuesto=True, peso_libre=True, patron='sentadilla',
            error_risk=None, nivel='intermedio', rpe_target=7,
        )
        self.assertEqual(p['reps'], (6, 10))

    def test_safety_cap_applies_on_barbell_squat(self):
        # rpe_target 9, pero sentadilla con barra → tope 8.
        p = ts.prescribe_exercise(
            es_compuesto=True, peso_libre=True, patron='sentadilla',
            error_risk=None, nivel='intermedio', rpe_target=9,
        )
        self.assertEqual(p['rpe'], 8)
        self.assertEqual(p['rir'], 2)

    def test_beginner_safety_cap_is_lower(self):
        p = ts.prescribe_exercise(
            es_compuesto=True, peso_libre=True, patron='empuje_vertical',
            error_risk=None, nivel='principiante', rpe_target=9,
        )
        self.assertEqual(p['rpe'], 7)

    def test_rpe_bias_reduces_target(self):
        # El atleta percibe +1 de esfuerzo → se prescribe 1 punto menos.
        p = ts.prescribe_exercise(
            es_compuesto=False, peso_libre=False, patron='aislamiento',
            error_risk=None, nivel='intermedio', rpe_target=8, rpe_bias=1.0,
        )
        self.assertEqual(p['rpe'], 7)

    def test_cycle_active_overrides_reps_on_compound(self):
        periodizacion = {'active': True, 'params': {'reps': '3–6', 'rest_max_s': 180}}
        p = ts.prescribe_exercise(
            es_compuesto=True, peso_libre=True, patron='sentadilla',
            error_risk=None, nivel='intermedio', rpe_target=8,
            periodizacion=periodizacion,
        )
        self.assertEqual(p['reps'], (3, 6))
        self.assertEqual(p['descanso_s'], 180)

    def test_cycle_does_not_override_isolation_reps(self):
        periodizacion = {'active': True, 'params': {'reps': '3–6', 'rest_max_s': 180}}
        p = ts.prescribe_exercise(
            es_compuesto=False, peso_libre=False, patron='aislamiento',
            error_risk=None, nivel='intermedio', rpe_target=8,
            periodizacion=periodizacion,
        )
        self.assertEqual(p['reps'], (12, 15))   # aislamiento mantiene su rango

    def test_rest_modulated_by_fatigue(self):
        base = ts.prescribe_exercise(
            es_compuesto=True, peso_libre=True, patron='sentadilla',
            error_risk=None, nivel='intermedio', rpe_target=7,
        )['descanso_s']
        fat = ts.prescribe_exercise(
            es_compuesto=True, peso_libre=True, patron='sentadilla',
            error_risk=None, nivel='intermedio', rpe_target=7, fatiga='alto',
        )['descanso_s']
        self.assertEqual(fat, base + ts.REST_FATIGUE_BONUS_S)


class FormatPoolCompactTests(SimpleTestCase):
    def _entry(self, nombre, **kw):
        e = {
            'nombre': nombre, 'patron_movimiento': 'empuje_horizontal',
            'es_compuesto': True, 'musculos_primarios': ['Pectoral mayor (porción esternal)'],
            'musculos_secundarios': [], 'technical_level': 3, 'systemic_fatigue': 3,
            'total_set_seconds': 180, 'primera_vez': False, 'progresion': 'mantener',
            'rpe_referencia': 7.0, 'veces_realizado': 5, 'carga_previa': None,
            'coaching_cues': ['un cue muy largo de técnica'], 'description': 'descripción larga',
            'requires_warning': False, 'warning_text': None,
            'reps_objetivo': (6, 10), 'descanso_objetivo_s': 180, 'rpe_objetivo': 8, 'rir_objetivo': 2,
        }
        e.update(kw)
        return e

    def test_one_line_per_exercise_without_cues_or_description(self):
        pool = [self._entry('Press banca'), self._entry('Press inclinado')]
        out = _format_exercise_pool_enriched(pool, {'priorizados': [], 'evitar': [], 'razon_evitar': {}})
        bullets = [l for l in out.splitlines() if l.strip().startswith('•')]
        self.assertEqual(len(bullets), 2)            # exactamente 1 línea por ejercicio
        self.assertNotIn('Músculos:', out)           # metadatos de filtrado fuera
        self.assertNotIn('Cue:', out)                # cues fuera
        self.assertNotIn('descripción larga', out)   # descripción fuera
        self.assertIn('@RPE8', out)                  # prescripción presente
        self.assertIn('RIR2', out)
