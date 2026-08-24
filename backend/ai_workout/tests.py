from types import SimpleNamespace

from django.test import SimpleTestCase

from ai_workout import training_science as ts
from ai_workout.adaptive_engine import AdaptiveEngineService, _MIN_FOCUS_POOL
from ai_workout.views import (
    _format_exercise_pool_enriched, _eval_sueno, calcular_fatiga, _dedup_and_backfill_session,
)


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


def _engine_con_perfil(nivel='intermedio', nivel_experiencia=None, experiencia_deportiva=''):
    """Engine mínimo para probar _riesgo_alto_permitido sin BD (no consulta
    Exercise/UserInjury — solo lee atributos de self.perfil)."""
    return AdaptiveEngineService(
        SimpleNamespace(id=1),
        SimpleNamespace(foco_entrenamiento=[]),
        None,
        SimpleNamespace(nivel=nivel, nivel_experiencia=nivel_experiencia, experiencia_deportiva=experiencia_deportiva),
    )


class RiesgoAltoPermitidoTests(SimpleTestCase):
    """injury_risk_profile='alto' (derivados olímpicos, sentadilla overhead)
    restringido a nivel avanzado salvo historial de halterofilia/CrossFit."""

    def test_nivel_avanzado_permitido(self):
        self.assertTrue(_engine_con_perfil(nivel='avanzado')._riesgo_alto_permitido())

    def test_nivel_experiencia_alto_permitido_aunque_nivel_categorico_no(self):
        self.assertTrue(_engine_con_perfil(nivel='intermedio', nivel_experiencia=5)._riesgo_alto_permitido())

    def test_principiante_sin_historial_bloqueado(self):
        self.assertFalse(_engine_con_perfil(nivel='principiante')._riesgo_alto_permitido())

    def test_intermedio_con_crossfit_permitido(self):
        engine = _engine_con_perfil(nivel='intermedio', experiencia_deportiva='CrossFit, Running')
        self.assertTrue(engine._riesgo_alto_permitido())

    def test_intermedio_con_halterofilia_permitido(self):
        engine = _engine_con_perfil(nivel='intermedio', experiencia_deportiva='Natación, Halterofilia')
        self.assertTrue(engine._riesgo_alto_permitido())

    def test_intermedio_con_otro_deporte_no_permitido(self):
        engine = _engine_con_perfil(nivel='intermedio', experiencia_deportiva='Running, Natación')
        self.assertFalse(engine._riesgo_alto_permitido())


class ObjetivoPrincipalYHistorialOlimpicoTests(SimpleTestCase):
    """training_science.objetivo_principal / tiene_historial_olimpico — mapeos
    puros usados por el ranking del pool y el gate de riesgo alto."""

    def test_goal_directo_hipertrofia(self):
        self.assertEqual(ts.objetivo_principal('hipertrofia'), 'hipertrofia')

    def test_goal_fuerza_y_potencia_mapean_a_rendimiento(self):
        self.assertEqual(ts.objetivo_principal('fuerza'), 'rendimiento')
        self.assertEqual(ts.objetivo_principal('potencia'), 'rendimiento')

    def test_goal_salud_y_perdida_grasa_mapean_a_salud_general(self):
        self.assertEqual(ts.objetivo_principal('salud'), 'salud_general')
        self.assertEqual(ts.objetivo_principal('perdida_grasa'), 'salud_general')

    def test_goal_vacio_cae_a_fallback_de_objetivo_texto(self):
        self.assertEqual(ts.objetivo_principal('', 'sentirse_fuerte'), 'hipertrofia')

    def test_sin_goal_ni_objetivo_resoluble_devuelve_none(self):
        self.assertIsNone(ts.objetivo_principal('', ''))
        self.assertIsNone(ts.objetivo_principal('', 'texto libre no reconocido'))

    def test_historial_olimpico_por_crossfit_o_halterofilia(self):
        self.assertTrue(ts.tiene_historial_olimpico('CrossFit'))
        self.assertTrue(ts.tiene_historial_olimpico('Running, Halterofilia, Natación'))

    def test_sin_historial_olimpico(self):
        self.assertFalse(ts.tiene_historial_olimpico('Running, Natación'))
        self.assertFalse(ts.tiene_historial_olimpico(''))


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

    def test_pool_sin_evidence_score_ni_goal_tags_no_rompe(self):
        """Retrocompatibilidad: ejercicios sin clasificar (backfill pendiente,
        campos ausentes del dict) siguen apareciendo — nunca se excluyen."""
        pool = [self._entry('Press banca'), self._entry('Press inclinado')]
        out = _format_exercise_pool_enriched(
            pool, {'priorizados': [], 'evitar': [], 'razon_evitar': {}}, objetivo_principal='hipertrofia',
        )
        bullets = [l for l in out.splitlines() if l.strip().startswith('•')]
        self.assertEqual(len(bullets), 2)

    def test_goal_tags_prioriza_sin_excluir_por_evidence_score(self):
        """El objetivo del usuario (goal_primary) prioriza el orden; evidence_score
        es solo desempate — un ejercicio de score bajo o sin clasificar sigue
        entrando (spec sec.6: nunca usarlo como filtro excluyente)."""
        alto_score_sin_match = self._entry(
            'Press banca declinado', goal_tags=['rendimiento'], evidence_score=5,
        )
        bajo_score_con_match = self._entry(
            'Press con banda', goal_tags=['hipertrofia'], evidence_score=2,
        )
        sin_clasificar = self._entry('Press banca inclinado')  # sin goal_tags/evidence_score
        pool = [alto_score_sin_match, bajo_score_con_match, sin_clasificar]
        out = _format_exercise_pool_enriched(
            pool, {'priorizados': [], 'evitar': [], 'razon_evitar': {}}, objetivo_principal='hipertrofia',
        )
        bullets = [l for l in out.splitlines() if l.strip().startswith('•')]
        self.assertEqual(len(bullets), 3)  # ninguno se excluye
        # El que matchea el objetivo va primero, aunque su evidence_score sea menor.
        self.assertIn('Press con banda', bullets[0])


# ─── Hallazgo #1: red de seguridad de equipamiento (coherencia casa/gimnasio) ──

class InventedEquipmentHeuristicTests(SimpleTestCase):
    """Heurística por nombre para ejercicios que el LLM inventa fuera del catálogo."""

    def _flag(self, nombre, raw_cats):
        return AdaptiveEngineService._invented_requires_unavailable_equipment(nombre, raw_cats)

    def test_invented_barbell_dropped_in_bodyweight_session(self):
        # Caso exacto del usuario: sesión de casa/peso corporal con un ejercicio
        # de gimnasio inventado por el LLM.
        self.assertTrue(self._flag('Press de banca con barra', set()))

    def test_cable_machine_dropped_at_home(self):
        self.assertTrue(self._flag('Jalón en polea al pecho', set()))

    def test_dumbbell_ok_when_dumbbells_available(self):
        self.assertFalse(self._flag('Curl con mancuernas', {'mancuernas'}))

    def test_bodyweight_never_flagged(self):
        self.assertFalse(self._flag('Flexiones de pecho', set()))
        self.assertFalse(self._flag('Sentadilla búlgara', set()))   # 'barra' no es substring
        self.assertFalse(self._flag('Plancha abdominal', set()))

    def test_accent_insensitive_match(self):
        # 'Máquinas' disponible (normalizado 'maquinas') cubre polea/smith.
        self.assertFalse(self._flag('Sentadilla en máquina Smith', {'maquinas'}))
        self.assertTrue(self._flag('Sentadilla en máquina Smith', set()))


# ─── Hallazgo #2: evaluación de sueño respetando la escala del dato ────────────

class SuenoEvalTests(SimpleTestCase):
    def test_device_score_high_is_adequate_not_deprivation(self):
        # EL BUG: score 4/4 de dispositivo se leía como "4 horas" → siempre privación.
        label, directiva = _eval_sueno(4, es_score=True)
        self.assertEqual(label, '4/4')
        self.assertIn('adecuada', directiva)

    def test_device_score_low_is_deprivation(self):
        _, directiva = _eval_sueno(1, es_score=True)
        self.assertIn('privación', directiva)

    def test_device_score_two_is_suboptimal(self):
        _, directiva = _eval_sueno(2, es_score=True)
        self.assertIn('subóptimo', directiva)

    def test_manual_hours_good(self):
        label, directiva = _eval_sueno(8, es_score=False)
        self.assertEqual(label, '8h')
        self.assertIn('adecuada', directiva)

    def test_manual_hours_deprivation(self):
        _, directiva = _eval_sueno(5, es_score=False)
        self.assertIn('privación', directiva)

    def test_invalid_value_defaults_safely(self):
        label, directiva = _eval_sueno(None, es_score=False)
        self.assertEqual(label, '7h')
        self.assertIn('adecuada', directiva)


# ─── Hallazgo #3: fatiga solo sobre sesiones realmente ejecutadas ──────────────

class _FakeSession:
    def __init__(self, created_at, inicio_real=None, feedback=None):
        self.created_at = created_at
        self.inicio_real = inicio_real
        self._feedback = feedback


def _q_match(obj, q):
    res = []
    for child in q.children:
        if hasattr(child, 'children'):           # Q anidado
            res.append(_q_match(obj, child))
        else:                                    # tupla ('campo__isnull', bool)
            key, val = child
            field = key.replace('__isnull', '')
            attr = '_feedback' if field == 'feedback' else field
            is_null = getattr(obj, attr, None) is None
            res.append(is_null == val)
    if not res:
        return True
    return any(res) if q.connector == 'OR' else all(res)


class _FakeQS:
    """Queryset mínimo que interpreta los .filter() de calcular_fatiga sin BD."""
    def __init__(self, items):
        self._items = list(items)

    def filter(self, *args, **kwargs):
        items = list(self._items)
        if 'created_at__gte' in kwargs:
            thr = kwargs['created_at__gte']
            items = [i for i in items if i.created_at >= thr]
        for q in args:
            items = [i for i in items if _q_match(i, q)]
        return _FakeQS(items)

    def count(self):
        return len(self._items)


class FatigaExecutedOnlyTests(SimpleTestCase):
    def _times(self):
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        return now - timedelta(hours=1), now - timedelta(hours=80)

    def test_unexecuted_generations_do_not_count(self):
        recent, _ = self._times()
        qs = _FakeQS([_FakeSession(recent), _FakeSession(recent), _FakeSession(recent)])
        self.assertEqual(calcular_fatiga(qs), 'bajo')

    def test_executed_sessions_count(self):
        recent, _ = self._times()
        qs = _FakeQS([
            _FakeSession(recent, inicio_real=recent),
            _FakeSession(recent, feedback=object()),
            _FakeSession(recent, inicio_real=recent),
        ])
        self.assertEqual(calcular_fatiga(qs), 'alto')

    def test_old_executed_outside_window_excluded(self):
        recent, old = self._times()
        qs = _FakeQS([
            _FakeSession(old, inicio_real=old),       # fuera de 72h
            _FakeSession(recent, inicio_real=recent),  # 1 reciente
        ])
        self.assertEqual(calcular_fatiga(qs), 'bajo')


class DedupAndBackfillSessionTests(SimpleTestCase):
    """`_dedup_and_backfill_session` corre después de las redes de seguridad
    (contraindicaciones/equipo) y repara duplicados y fases vacías — GEN-6."""

    def _pool_entry(self, nombre, patron='empuje_horizontal', **kw):
        e = {
            'nombre': nombre, 'patron_movimiento': patron,
            'reps_objetivo': (8, 12), 'rpe_objetivo': 7, 'rir_objetivo': 3,
            'descanso_objetivo_s': 90,
        }
        e.update(kw)
        return e

    def test_quita_ejercicio_duplicado_en_la_misma_fase(self):
        sesion = {'fases': [
            {'nombre': 'Bloque principal', 'ejercicios': [
                {'nombre': 'Sentadilla'}, {'nombre': 'Sentadilla'},
            ]},
        ]}
        _dedup_and_backfill_session(sesion, [], {}, rpe_target=7, user_id=1)
        nombres = [ej['nombre'] for ej in sesion['fases'][0]['ejercicios']]
        self.assertEqual(nombres, ['Sentadilla'])

    def test_quita_duplicado_entre_fases_distintas(self):
        sesion = {'fases': [
            {'nombre': 'Bloque principal', 'ejercicios': [{'nombre': 'Press banca'}]},
            {'nombre': 'Bloque principal 2', 'ejercicios': [{'nombre': 'press banca'}]},  # distinto casing
        ]}
        _dedup_and_backfill_session(sesion, [], {}, rpe_target=7, user_id=1)
        total = sum(len(f['ejercicios']) for f in sesion['fases'])
        self.assertEqual(total, 1)

    def test_repone_fase_de_fuerza_vacia_con_candidato_de_fuerza_no_usado(self):
        sesion = {'fases': [
            {'nombre': 'Bloque principal', 'ejercicios': [{'nombre': 'Sentadilla'}]},
            {'nombre': 'Bloque principal 2', 'ejercicios': []},  # vacía por red de seguridad
        ]}
        pool = [
            self._pool_entry('Sentadilla', patron='sentadilla'),  # ya usado, no debe repetirse
            self._pool_entry('Press banca', patron='empuje_horizontal'),
        ]
        _dedup_and_backfill_session(sesion, pool, {}, rpe_target=7, user_id=1)
        repuesta = sesion['fases'][1]['ejercicios']
        self.assertEqual(len(repuesta), 1)
        self.assertEqual(repuesta[0]['nombre'], 'Press banca')

    def test_repone_calentamiento_vacio_con_movilidad_no_con_fuerza(self):
        """Bug encontrado en la re-auditoría: reponer una fase de calentamiento
        vacía NUNCA debe traer un ejercicio de fuerza si hay uno de
        movilidad/cardio disponible en el banco."""
        sesion = {'fases': [
            {'nombre': 'Calentamiento', 'ejercicios': []},
            {'nombre': 'Bloque principal', 'ejercicios': [{'nombre': 'Sentadilla'}]},
        ]}
        pool = [
            self._pool_entry('Press banca', patron='empuje_horizontal'),
            self._pool_entry('Movilidad de cadera', patron='movilidad'),
        ]
        _dedup_and_backfill_session(sesion, pool, {}, rpe_target=7, user_id=1)
        repuesto = sesion['fases'][0]['ejercicios']
        self.assertEqual(len(repuesto), 1)
        self.assertEqual(repuesto[0]['nombre'], 'Movilidad de cadera')

    def test_repone_vuelta_a_la_calma_con_cardio_usando_pool_legacy(self):
        """Con el pool legacy (agrupado por patrón, sin prescripción) también
        debe respetar el tipo de fase, no solo con el pool enriquecido."""
        sesion = {'fases': [
            {'nombre': 'Vuelta a la calma', 'ejercicios': []},
        ]}
        pool_legacy = {'sentadilla': ['Sentadilla'], 'cardio': ['Trote suave']}
        _dedup_and_backfill_session(sesion, None, pool_legacy, rpe_target=7, user_id=1)
        repuesto = sesion['fases'][0]['ejercicios']
        self.assertEqual(len(repuesto), 1)
        self.assertEqual(repuesto[0]['nombre'], 'Trote suave')

    def test_cae_a_fuerza_si_no_hay_movilidad_disponible_para_calentamiento(self):
        """Sin candidato del tipo correcto, es mejor un ejercicio de fuerza que
        dejar el calentamiento completamente vacío."""
        sesion = {'fases': [
            {'nombre': 'Calentamiento', 'ejercicios': []},
        ]}
        pool = [self._pool_entry('Press banca', patron='empuje_horizontal')]
        _dedup_and_backfill_session(sesion, pool, {}, rpe_target=7, user_id=1)
        repuesto = sesion['fases'][0]['ejercicios']
        self.assertEqual(len(repuesto), 1)
        self.assertEqual(repuesto[0]['nombre'], 'Press banca')

    def test_elimina_fase_vacia_sin_candidatos_y_descuenta_duracion(self):
        sesion = {
            'duracion_total': 60,
            'fases': [
                {'nombre': 'Calentamiento', 'duracion_minutos': 10, 'ejercicios': []},
                {'nombre': 'Bloque principal', 'ejercicios': [{'nombre': 'Sentadilla'}]},
            ],
        }
        _dedup_and_backfill_session(sesion, [], {}, rpe_target=7, user_id=1)
        self.assertEqual(len(sesion['fases']), 1)
        self.assertEqual(sesion['fases'][0]['nombre'], 'Bloque principal')
        self.assertEqual(sesion['duracion_total'], 50)

    def test_duracion_total_no_numerica_no_rompe(self):
        sesion = {
            'duracion_total': 'sesenta',
            'fases': [{'nombre': 'Calentamiento', 'duracion_minutos': 10, 'ejercicios': []}],
        }
        _dedup_and_backfill_session(sesion, [], {}, rpe_target=7, user_id=1)
        self.assertEqual(sesion['fases'], [])
        self.assertEqual(sesion['duracion_total'], 'sesenta')

    def test_no_crashea_con_sesion_no_dict(self):
        _dedup_and_backfill_session(None, [], {}, rpe_target=7, user_id=1)  # no debe lanzar
