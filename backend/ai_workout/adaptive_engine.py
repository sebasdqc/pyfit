"""
PyFit Adaptive Engine — Pasos 3–6 del pipeline de generación de sesiones.

Paso 3: Filtrado del catálogo usando tablas normalizadas.
Paso 4: Prioridad de patrones de movimiento basada en historial reciente.
Paso 5: Enriquecimiento con datos de progresión RPE-based.
Paso 6: Resolución de parámetros de periodización desde TrainingCycle activo.
"""
import logging
from datetime import date, timedelta

from workouts.models import Exercise, EquipmentItem, ContraindicationCategory, UserExerciseProfile, TrainingCycle

logger = logging.getLogger(__name__)

# Module-level cache: True once we confirm satellite tables have data.
# Avoids repeated COUNT(*) on every request when tables are empty.
_satellite_equipment_populated: bool | None = None
_satellite_contraindication_populated: bool | None = None


def _check_satellite_tables() -> tuple[bool, bool]:
    """
    Returns (has_equipment_data, has_contraindication_data).
    Only caches True — if tables are still empty, rechecks on every request
    so that seeding takes effect without needing a server restart.
    """
    global _satellite_equipment_populated, _satellite_contraindication_populated
    if _satellite_equipment_populated is not True:
        if EquipmentItem.objects.exists():
            _satellite_equipment_populated = True
    if _satellite_contraindication_populated is not True:
        if ContraindicationCategory.objects.exists():
            _satellite_contraindication_populated = True
    return (
        _satellite_equipment_populated is True,
        _satellite_contraindication_populated is True,
    )

# Maps UserInjury.zona (lowercase) → ContraindicationCategory.body_zone (as seeded)
ZONA_A_BODY_ZONE: dict[str, str] = {
    'lumbar':    'Columna',
    'rodilla':   'Rodilla',
    'hombro':    'Hombro',
    'cuello':    'Columna',
    'cadera':    'Cadera',
    'tobillo':   'Tobillo',
    'muñeca':    'Muñeca',
    'codo':      'Hombro',
    'thoracica': 'Columna',
}

# Maps nivel del perfil → techo de technical_level permitido
NIVEL_MAP: dict[str, int] = {'principiante': 2, 'intermedio': 3, 'avanzado': 5}

CORE_PATTERNS = frozenset({'core_antiextension', 'core_antirrotacion', 'core_antiflexion'})
EMPUJE_PATTERNS = frozenset({'empuje_horizontal', 'empuje_vertical'})
JALON_PATTERNS  = frozenset({'jalon_horizontal',  'jalon_vertical'})

# Maps tokens del campo foco_entrenamiento → lista de patron_movimiento a elevar
FOCO_A_PATRONES: dict[str, list[str]] = {
    'piernas':     ['sentadilla', 'bisagra'],
    'espalda':     ['jalon_horizontal', 'jalon_vertical'],
    'pecho':       ['empuje_horizontal'],
    'hombros':     ['empuje_vertical'],
    'core':        ['core_antiextension', 'core_antirrotacion', 'core_antiflexion'],
    'brazos':      ['aislamiento'],
    # Tokens de grupoMuscular que envía el check-in (d5b_grupo). Sin estos, la
    # selección de grupo del usuario no elevaba ningún patrón en el motor.
    'empujes':      ['empuje_horizontal', 'empuje_vertical'],
    'tracciones':   ['jalon_horizontal', 'jalon_vertical'],
    'piernas_quad': ['sentadilla'],
    'piernas_glut': ['bisagra'],
    'completo':    [],
    'movilidad':   [],
    'resistencia': [],
    'fuerza':      [],
    'hipertrofia': [],
}

DOLOR_KEYWORDS: dict[str, str] = {
    'rodilla': 'rodilla',
    'lumbar':  'lumbar',
    'espalda': 'lumbar',
    'hombro':  'hombro',
    'cuello':  'cuello',
    'cadera':  'cadera',
    'tobillo': 'tobillo',
    'muñeca':  'muñeca',
    'codo':    'codo',
}

# Equipo que nunca es restricción (peso corporal)
EQUIPO_LIBRE = {'ninguno (peso corporal)', 'ninguno'}

# Mapeo de categorías de location.implementos (opciones de UI) → nombres específicos de
# EquipmentItem.name (lowercase). Necesario porque la UI almacena categorías ('Barras')
# pero las tablas normalizadas usan nombres específicos ('Barra olímpica').
# Las bancas se incluyen bajo 'barras' y 'máquinas' porque no tienen opción propia en la UI
# pero están disponibles en cualquier gimnasio que tenga esas categorías.
IMPLEMENTOS_EXPANSION: dict[str, set[str]] = {
    'barras': {
        'barra olímpica', 'barra ez', 'barra fija (dominadas)',
        'barra de dominadas (puerta)', 'disco olímpico',
        'banco ajustable', 'banco plano',
    },
    'mancuernas': {'mancuernas'},
    'kettlebells': {'kettlebell'},
    'máquinas': {
        'polea alta', 'polea baja', 'polea ajustable',
        'máquina smith', 'máquina de cable cruzado', 'prensa de piernas',
        'máquina de remo sentado', 'máquina de pecho', 'máquina de hombros',
        'máquina de extensión de piernas', 'máquina de curl de piernas',
        'máquina de aducción/abducción', 'máquina de glúteos (hip thrust)',
        'banco ajustable', 'banco plano',
    },
    'trx': {'trx / suspensión'},
    'bandas elásticas': {'banda de resistencia'},
    'cajón pliométrico': {'caja pliométrica'},
    'anillas': {'trx / suspensión'},
}


# ─── Paso 6 — Periodización ───────────────────────────────────────────────────
#
# Tabla central: parámetros de carga por (goal, block_type).
# Estructura: reps, RPE, RIR, volumen (etiqueta), descanso en segundos,
#             hard_rules (lista de tokens que el motor aplica en el prompt),
#             soft_rules (sugerencias para el LLM).
#
PERIODIZATION_PARAMS: dict[str, dict[str, dict]] = {
    'hipertrofia': {
        'acumulacion_hiper': {
            'reps': '8–15', 'rpe_min': 7, 'rpe_max': 8, 'rir_min': 2, 'rir_max': 3,
            'volumen': 'MAV', 'rest_min_s': 90, 'rest_max_s': 120,
            'enfasis': 'Rango elongado, variedad de estímulo',
            'hard_rules': [],
            'soft_rules': ['elongated_range_priority'],
        },
        'intensificacion_hiper': {
            'reps': '6–10', 'rpe_min': 8, 'rpe_max': 9, 'rir_min': 1, 'rir_max': 2,
            'volumen': 'MAV', 'rest_min_s': 120, 'rest_max_s': 150,
            'enfasis': 'Carga progresiva, menor variedad de ejercicios',
            'hard_rules': [],
            'soft_rules': ['min_6_reps'],
        },
        'deload': {
            'reps': '10–15', 'rpe_min': 5, 'rpe_max': 6, 'rir_min': 4, 'rir_max': 5,
            'volumen': 'MEV', 'rest_min_s': 90, 'rest_max_s': 120,
            'enfasis': 'Solo baja el volumen — la carga NO baja',
            'hard_rules': ['no_load_reduction'],
            'soft_rules': [],
        },
    },
    'fuerza': {
        'acumulacion_fuerza': {
            'reps': '5–8', 'rpe_min': 7, 'rpe_max': 8, 'rir_min': 2, 'rir_max': 3,
            'volumen': 'MAV', 'rest_min_s': 150, 'rest_max_s': 180,
            'enfasis': 'Técnica sólida, base de volumen con carga moderada',
            'hard_rules': [],
            'soft_rules': [],
        },
        'intensificacion_fuerza': {
            'reps': '3–6', 'rpe_min': 8, 'rpe_max': 9, 'rir_min': 1, 'rir_max': 2,
            'volumen': 'MAV−20%', 'rest_min_s': 180, 'rest_max_s': 240,
            'enfasis': 'Reducir volumen, elevar intensidad con carga específica',
            'hard_rules': [],
            'soft_rules': [],
        },
        'realizacion_fuerza': {
            'reps': '1–4', 'rpe_min': 8, 'rpe_max': 10, 'rir_min': 1, 'rir_max': 2,
            'volumen': 'MAV−30%', 'rest_min_s': 240, 'rest_max_s': 300,
            'enfasis': 'Máxima expresión de fuerza, pico de rendimiento',
            'hard_rules': ['high_systemic_fatigue_max_50pct_volume', 'min_rir_1_error_risk_4'],
            'soft_rules': ['only_main_patterns_no_isolation'],
        },
        'deload': {
            'reps': '5–8', 'rpe_min': 5, 'rpe_max': 6, 'rir_min': 4, 'rir_max': 5,
            'volumen': 'MEV', 'rest_min_s': 150, 'rest_max_s': 180,
            'enfasis': 'Misma carga, menos series — mantener los patrones principales',
            'hard_rules': ['no_load_reduction'],
            'soft_rules': [],
        },
    },
    'potencia': {
        'fuerza_base': {
            'reps': '4–6', 'rpe_min': 7, 'rpe_max': 8, 'rir_min': 2, 'rir_max': 3,
            'volumen': 'MAV', 'rest_min_s': 180, 'rest_max_s': 240,
            'enfasis': 'Construir base de fuerza que alimente la potencia explosiva',
            'hard_rules': [],
            'soft_rules': ['isolation_optional_at_end'],
        },
        'potencia_especifica': {
            'reps': '3–5 a velocidad máxima', 'rpe_min': 6, 'rpe_max': 7,
            'rir_min': 3, 'rir_max': 4,
            'volumen': 'MAV−20%', 'rest_min_s': 180, 'rest_max_s': 300,
            'enfasis': 'Velocidad de ejecución como estímulo principal',
            'hard_rules': ['tempo_concentric_X', 'rest_min_180s'],
            'soft_rules': [],
        },
        'pico_potencia': {
            'reps': '1–3 a velocidad máxima', 'rpe_min': 6, 'rpe_max': 7,
            'rir_min': 4, 'rir_max': 5,
            'volumen': 'MEV', 'rest_min_s': 240, 'rest_max_s': 300,
            'enfasis': 'Transferencia máxima — el atleta debe estar completamente fresco',
            'hard_rules': ['tempo_concentric_X', 'rest_min_180s'],
            'soft_rules': [],
        },
        'deload': {
            'reps': '5–6 a velocidad sub-máxima', 'rpe_min': 4, 'rpe_max': 5,
            'rir_min': 5, 'rir_max': 99,
            'volumen': 'MEV−20%', 'rest_min_s': 90, 'rest_max_s': 120,
            'enfasis': 'Solo al final del bloque 1 — velocidad reducida intencional',
            'hard_rules': ['no_load_reduction'],
            'soft_rules': [],
        },
    },
    'salud': {
        'salud_general': {
            'reps': '10–15', 'rpe_min': 5, 'rpe_max': 7, 'rir_min': 3, 'rir_max': 5,
            'volumen': 'MEV a MAV', 'rest_min_s': 60, 'rest_max_s': 90,
            'enfasis': 'Variedad, adherencia y disfrute — sesión que deje sintiéndose bien',
            'hard_rules': ['beginner_error_risk_max_3'],
            'soft_rules': ['rotate_exercises', 'rpe_cap_7', 'include_mobility_exercise'],
        },
        'deload': {
            'reps': '12–15', 'rpe_min': 4, 'rpe_max': 5, 'rir_min': 5, 'rir_max': 99,
            'volumen': 'MEV−30%', 'rest_min_s': 60, 'rest_max_s': 90,
            'enfasis': 'Muy ligero — movilidad y activación, mínima fatiga sistémica',
            'hard_rules': ['no_load_reduction'],
            'soft_rules': [],
        },
    },
    'perdida_grasa': {
        'densidad_alta': {
            'reps': '10–15', 'rpe_min': 7, 'rpe_max': 8, 'rir_min': 2, 'rir_max': 3,
            'volumen': 'MAV', 'rest_min_s': 45, 'rest_max_s': 75,
            'enfasis': 'Alta densidad de trabajo con descansos cortos — mayor gasto calórico',
            'hard_rules': [],
            'soft_rules': ['compound_first', 'short_rest_for_density'],
        },
        'preservacion_muscular': {
            'reps': '6–10', 'rpe_min': 7, 'rpe_max': 8, 'rir_min': 2, 'rir_max': 3,
            'volumen': 'MAV−20%', 'rest_min_s': 90, 'rest_max_s': 120,
            'enfasis': 'Mantener el estímulo de fuerza para preservar masa muscular en déficit',
            'hard_rules': ['no_load_reduction_compound'],
            'soft_rules': ['compound_first'],
        },
        'deload': {
            'reps': '10–12', 'rpe_min': 5, 'rpe_max': 6, 'rir_min': 4, 'rir_max': 5,
            'volumen': 'MEV', 'rest_min_s': 90, 'rest_max_s': 120,
            'enfasis': 'Recuperación sin pérdida de masa — mantener compuestos, reducir volumen',
            'hard_rules': ['no_load_reduction_compound'],
            'soft_rules': [],
        },
    },
}

# Maps hard_rule tokens to human-readable constraint text for the prompt
HARD_RULE_TEXT: dict[str, str] = {
    'no_load_reduction':
        'DELOAD: La carga NO baja. Solo baja el volumen (series). '
        'Prescribe el mismo peso que la semana anterior.',
    'no_load_reduction_compound':
        'DELOAD: La carga de ejercicios compuestos NO baja. '
        'Mantener la carga de sentadilla, peso muerto, press y jalón.',
    'high_systemic_fatigue_max_50pct_volume':
        'REALIZACIÓN FUERZA: Los ejercicios con fatiga sistémica alta (systemic_fatigue ≥ 4) '
        'NO pueden superar el 50% del volumen total de la sesión.',
    'min_rir_1_error_risk_4':
        'REALIZACIÓN FUERZA: Ejercicios con riesgo de error ≥ 4 deben prescribirse con RIR mínimo 1 '
        '(nunca al fallo absoluto).',
    'tempo_concentric_X':
        'POTENCIA: El tempo concéntrico es SIEMPRE X (máxima velocidad posible). '
        'NO prescribir tempo lento en ningún ejercicio de potencia.',
    'rest_min_180s':
        'POTENCIA: El descanso entre series NUNCA puede ser inferior a 180 segundos. '
        'La potencia requiere recuperación completa — trabajar fatigado entrena resistencia, no potencia.',
    'beginner_error_risk_max_3':
        'SALUD + PRINCIPIANTE: Los ejercicios con riesgo de error ≥ 4 (peso muerto pesado, '
        'sentadilla con barra, press militar máximo) están PROHIBIDOS para nivel principiante.',
}

# Which block_types are valid per goal (used for validation)
GOAL_BLOCK_COMPAT: dict[str, frozenset] = {
    'hipertrofia':   frozenset({'acumulacion_hiper', 'intensificacion_hiper', 'deload', 'transicion'}),
    'fuerza':        frozenset({'acumulacion_fuerza', 'intensificacion_fuerza', 'realizacion_fuerza', 'deload', 'transicion'}),
    'potencia':      frozenset({'fuerza_base', 'potencia_especifica', 'pico_potencia', 'deload', 'transicion'}),
    'salud':         frozenset({'salud_general', 'deload', 'transicion'}),
    'perdida_grasa': frozenset({'densidad_alta', 'preservacion_muscular', 'deload', 'transicion'}),
}


class AdaptiveEngineService:
    """
    Encapsula los pasos determinísticos del motor adaptativo.
    Debe instanciarse una vez por request de generación.
    """

    def __init__(self, user, checkin, location, perfil):
        self.user = user
        self.checkin = checkin
        self.location = location
        self.perfil = perfil
        self._injury_zones: set[str] | None = None   # zona values (lowercase)
        self._body_zones: set[str] | None = None      # body_zone values (title-case)

    # ─── helpers internos ─────────────────────────────────────────────────────

    def _get_injury_zones(self) -> set[str]:
        """Devuelve zonas de lesión del usuario incluyendo dolor reportado hoy."""
        if self._injury_zones is None:
            zones: set[str] = set(
                self.user.injuries.filter(activa=True).values_list('zona', flat=True)
            )
            if self.checkin.dolor_hoy:
                lower = self.checkin.dolor_hoy.lower()
                for kw, zona in DOLOR_KEYWORDS.items():
                    if kw in lower:
                        zones.add(zona)
            self._injury_zones = zones
        return self._injury_zones

    def _get_body_zones(self) -> set[str]:
        """Convierte injury_zones al formato body_zone de ContraindicationCategory."""
        if self._body_zones is None:
            self._body_zones = {
                ZONA_A_BODY_ZONE[z]
                for z in self._get_injury_zones()
                if z in ZONA_A_BODY_ZONE
            }
        return self._body_zones

    # ─── Paso 3 ───────────────────────────────────────────────────────────────

    def get_exercise_pool(self) -> list[dict]:
        """
        Filtra el catálogo de ejercicios usando tablas normalizadas cuando están
        disponibles, o los JSONFields legacy como fallback cuando no lo están.
        Aplica los 7 filtros en orden: contraindicaciones, equipamiento,
        nivel técnico, estado físico, espacio, activo.
        Devuelve lista de dicts enriquecidos.
        """
        has_equipment_data, has_contraindication_data = _check_satellite_tables()
        if not has_equipment_data and not has_contraindication_data:
            logger.info(
                'adaptive_engine satellite tables empty for user=%s — using JSONField fallback',
                self.user.id,
            )
            return self._get_exercise_pool_jsonfield()

        body_zones = self._get_body_zones()
        implementos_raw = self.location.implementos or []
        # Expand category names (UI labels) to specific EquipmentItem names (lowercase).
        # 'Barras' → {'barra olímpica', ...}, 'Máquinas' → {'polea alta', ...}, etc.
        implementos_disponibles: set[str] = set()
        for _impl in implementos_raw:
            _key = _impl.lower().strip()
            _expanded = IMPLEMENTOS_EXPANSION.get(_key)
            if _expanded:
                implementos_disponibles.update(_expanded)
            else:
                implementos_disponibles.add(_key)

        # nivel_experiencia (1–5) acota el techo técnico; si es null se deriva
        # del nivel categórico (compatibilidad con usuarios previos al cambio).
        nivel_usuario = self.perfil.nivel_experiencia or NIVEL_MAP.get(self.perfil.nivel, 3)
        estado_fisico: int = self.checkin.estado_fisico or self.checkin.estado_animo
        espacio_restringido = self.location.tipo in ('casa', 'exterior')

        candidates = (
            Exercise.objects
            .filter(activo=True)
            .prefetch_related(
                'contraindication_links__contraindication',
                'equipment_links__equipment',
                'muscles__muscle',
            )
        )

        pool: list[dict] = []

        for ex in candidates:
            # ── Filtro 1 & 2: Contraindicaciones ─────────────────────────────
            requires_warning = False
            warning_text: str | None = None
            skip = False

            if has_contraindication_data:
                for ec in ex.contraindication_links.all():
                    cc = ec.contraindication
                    if cc.body_zone in body_zones:
                        if cc.severity == 'grave':
                            skip = True
                            break
                        if not requires_warning:
                            requires_warning = True
                            warning_text = (
                                ec.notes
                                or f'Precaución: puede afectar la zona {cc.body_zone}'
                            )
            else:
                # JSONField fallback for contraindications
                injury_zones = self._get_injury_zones()
                contra_set = set(ex.contraindicaciones or [])
                if contra_set & injury_zones:
                    skip = True
            if skip:
                continue

            # ── Filtro 3: Equipamiento ───────────────────────────────────────
            if has_equipment_data:
                required_equip = [
                    ee.equipment.name.lower().strip()
                    for ee in ex.equipment_links.all()
                    if ee.is_required and ee.equipment.name.lower().strip() not in EQUIPO_LIBRE
                ]
                if required_equip:
                    if not implementos_disponibles:
                        continue
                    if not all(eq in implementos_disponibles for eq in required_equip):
                        continue
            else:
                # JSONField fallback for equipment
                eq_set = set(ex.equipamiento or [])
                if eq_set and not eq_set.issubset(implementos_disponibles):
                    continue

            # ── Filtro 4: Nivel técnico ──────────────────────────────────────
            if (
                ex.technical_level is not None
                and ex.technical_level > nivel_usuario + 1
            ):
                continue

            # ── Filtro 5: Estado físico ──────────────────────────────────────
            if ex.systemic_fatigue is not None:
                if estado_fisico <= 2 and ex.systemic_fatigue > 3:
                    continue
                if estado_fisico == 3 and ex.systemic_fatigue == 5:
                    continue

            # ── Filtro 6: Espacio ────────────────────────────────────────────
            if espacio_restringido and ex.space_required == 'amplio':
                continue

            # ── Construir dict enriquecido ────────────────────────────────────
            muscles_by_role: dict[str, list[str]] = {}
            if has_equipment_data:  # muscle data comes from same seed batch
                for em in ex.muscles.all():
                    muscles_by_role.setdefault(em.role, []).append(em.muscle.name)
            else:
                # Use JSONFields as muscle fallback
                muscles_by_role['primario']   = list(ex.musculos_primarios or [])
                muscles_by_role['secundario'] = list(ex.musculos_secundarios or [])

            set_dur  = ex.set_duration_seconds  or 45
            rest_def = ex.rest_seconds_default  or 90

            pool.append({
                'id':                   ex.id,
                'nombre':               ex.nombre,
                'patron_movimiento':    ex.patron_movimiento,
                'es_compuesto':         ex.es_compuesto,
                'bilateral':            ex.bilateral,
                'dificultad':           ex.dificultad,
                'technical_level':      ex.technical_level,
                'systemic_fatigue':     ex.systemic_fatigue,
                'set_duration_seconds': set_dur,
                'rest_seconds_default': rest_def,
                'total_set_seconds':    set_dur + rest_def,
                'musculos_primarios':   muscles_by_role.get('primario', []),
                'musculos_secundarios': muscles_by_role.get('secundario', []),
                'coaching_cues':        list(ex.coaching_cues or []),
                'description':          ex.description or '',
                'requires_warning':     requires_warning,
                'warning_text':         warning_text,
                'primera_vez':          True,
                'progresion':           None,
                'rpe_referencia':       None,
                'veces_realizado':      0,
            })

        logger.debug('adaptive_engine paso3 user=%s pool=%d', self.user.id, len(pool))
        return pool

    def _get_exercise_pool_jsonfield(self) -> list[dict]:
        """
        Fallback pool builder using JSONField data (legacy approach).
        Used when satellite tables have not been seeded yet.
        Both location.implementos and ex.equipamiento use the same category names
        (e.g. 'Barras', 'Máquinas') — compare directly without normalizing case.
        """
        injury_zones = self._get_injury_zones()
        implementos_disponibles = set(self.location.implementos or [])
        # nivel_experiencia (1–5) acota el techo técnico; si es null se deriva
        # del nivel categórico (compatibilidad con usuarios previos al cambio).
        nivel_usuario = self.perfil.nivel_experiencia or NIVEL_MAP.get(self.perfil.nivel, 3)
        estado_fisico: int = self.checkin.estado_fisico or self.checkin.estado_animo
        espacio_restringido = self.location.tipo in ('casa', 'exterior')

        pool: list[dict] = []
        for ex in Exercise.objects.filter(activo=True):
            # Equipment: JSONField (names in Spanish, same format as location.implementos)
            eq_set = set(ex.equipamiento or [])
            if eq_set and not eq_set.issubset(implementos_disponibles):
                continue

            # Contraindications: JSONField (zone names lowercase)
            contra_set = set(ex.contraindicaciones or [])
            if contra_set & injury_zones:
                continue

            # Level
            if ex.technical_level is not None and ex.technical_level > nivel_usuario + 1:
                continue

            # Fatigue
            if ex.systemic_fatigue is not None:
                if estado_fisico <= 2 and ex.systemic_fatigue > 3:
                    continue
                if estado_fisico == 3 and ex.systemic_fatigue == 5:
                    continue

            # Space
            if espacio_restringido and ex.space_required == 'amplio':
                continue

            set_dur  = ex.set_duration_seconds  or 45
            rest_def = ex.rest_seconds_default  or 90

            pool.append({
                'id':                   ex.id,
                'nombre':               ex.nombre,
                'patron_movimiento':    ex.patron_movimiento,
                'es_compuesto':         ex.es_compuesto,
                'bilateral':            ex.bilateral,
                'dificultad':           ex.dificultad,
                'technical_level':      ex.technical_level,
                'systemic_fatigue':     ex.systemic_fatigue,
                'set_duration_seconds': set_dur,
                'rest_seconds_default': rest_def,
                'total_set_seconds':    set_dur + rest_def,
                'musculos_primarios':   list(ex.musculos_primarios or []),
                'musculos_secundarios': list(ex.musculos_secundarios or []),
                'coaching_cues':        list(ex.coaching_cues or []),
                'description':          ex.description or '',
                'requires_warning':     False,
                'warning_text':         None,
                'primera_vez':          True,
                'progresion':           None,
                'rpe_referencia':       None,
                'veces_realizado':      0,
            })

        logger.debug('adaptive_engine paso3 jsonfield_fallback user=%s pool=%d', self.user.id, len(pool))
        return pool

    # ─── Paso 4 ───────────────────────────────────────────────────────────────

    def get_pattern_priorities(self) -> dict:
        """
        Analiza el historial reciente para determinar prioridad de patrones.
        Devuelve {priorizados: [...], evitar: [...], razon_evitar: {...}}.
        """
        hoy = date.today()
        inicio_semana = hoy - timedelta(days=hoy.weekday())

        # Última fecha ejecutada por patrón (desde UserExerciseProfile)
        pattern_last: dict[str, date] = {}
        for row in (
            UserExerciseProfile.objects
            .filter(user=self.user, ultima_vez__isnull=False)
            .values('patron_movimiento', 'ultima_vez')
        ):
            pat = row['patron_movimiento']
            ul  = row['ultima_vez']
            if pat not in pattern_last or ul > pattern_last[pat]:
                pattern_last[pat] = ul

        # Patrones elevados por el foco declarado por el usuario
        foco = self.checkin.foco_entrenamiento or []
        focos_elevados: set[str] = set()
        for f in foco:
            focos_elevados.update(FOCO_A_PATRONES.get(str(f).lower(), []))

        all_patterns = [p[0] for p in Exercise.PATRON_CHOICES]
        priorizados: list[tuple[str, int, bool]] = []  # (patron, score, is_foco)
        evitar: list[str] = []
        razon_evitar: dict[str, str] = {}

        for patron in all_patterns:
            last_date = pattern_last.get(patron)
            dias = None if last_date is None else (hoy - last_date).days
            min_rest = 1 if patron in CORE_PATTERNS else 2

            if dias is None or dias >= 3:
                priorizados.append((patron, 0, patron in focos_elevados))
            elif dias >= min_rest:
                priorizados.append((patron, 1, patron in focos_elevados))
            else:
                evitar.append(patron)
                razon_evitar[patron] = (
                    f'ejecutado hace {dias} día{"" if dias == 1 else "s"}'
                )

        # Ordenar: foco-elevados primero, luego por score ascendente
        priorizados.sort(key=lambda x: (not x[2], x[1]))

        # Balance empuje/jalón en la semana actual
        empuje_week = (
            UserExerciseProfile.objects
            .filter(
                user=self.user,
                patron_movimiento__in=EMPUJE_PATTERNS,
                ultima_vez__gte=inicio_semana,
            )
            .count()
        )
        jalon_week = (
            UserExerciseProfile.objects
            .filter(
                user=self.user,
                patron_movimiento__in=JALON_PATTERNS,
                ultima_vez__gte=inicio_semana,
            )
            .count()
        )
        if empuje_week > 0 and empuje_week / max(jalon_week, 1) > 1.4:
            # Empuje domina la semana → elevar jalón
            priorizados.sort(key=lambda x: (
                x[0] not in JALON_PATTERNS,
                not x[2],
                x[1],
            ))

        return {
            'priorizados': [p[0] for p in priorizados],
            'evitar':       evitar,
            'razon_evitar': razon_evitar,
        }

    # ─── Paso 6 ───────────────────────────────────────────────────────────────

    def get_periodization_params(self) -> dict:
        """
        Lee el TrainingCycle activo del usuario y devuelve los parámetros
        de periodización para la sesión actual.

        Si no existe ciclo activo, devuelve un dict con 'active': False y
        parámetros generales derivados del objetivo libre del perfil.

        Return shape:
          {
            'active': bool,
            'goal': str | None,
            'block_type': str | None,
            'week_number': int,
            'is_deload': bool,
            'params': dict | None,       # el dict de PERIODIZATION_PARAMS
            'hard_rule_texts': list[str],
            'prompt_block': str,         # texto listo para insertar en el prompt
          }
        """
        try:
            cycle = TrainingCycle.objects.get(user=self.user, is_active=True)
        except TrainingCycle.DoesNotExist:
            return self._periodization_no_cycle()

        goal       = cycle.goal
        block_type = 'deload' if cycle.is_deload else cycle.block_type

        # Use deload params when it's a deload week, otherwise use the block params
        goal_params = PERIODIZATION_PARAMS.get(goal, {})
        params      = goal_params.get(block_type) or goal_params.get('deload')
        if not params:
            logger.warning(
                'periodization no params for goal=%s block_type=%s user=%s',
                goal, block_type, self.user.id,
            )
            return self._periodization_no_cycle()

        hard_rule_texts = [
            HARD_RULE_TEXT[r] for r in params.get('hard_rules', []) if r in HARD_RULE_TEXT
        ]

        prompt_block = self._build_periodization_prompt(
            goal=goal,
            block_type=block_type,
            week_number=cycle.week_number,
            is_deload=cycle.is_deload,
            next_is_deload=cycle.next_session_is_deload,
            params=params,
            hard_rule_texts=hard_rule_texts,
        )

        logger.debug(
            'periodization paso6 user=%s goal=%s block=%s week=%d deload=%s',
            self.user.id, goal, block_type, cycle.week_number, cycle.is_deload,
        )

        return {
            'active':           True,
            'goal':             goal,
            'block_type':       block_type,
            'week_number':      cycle.week_number,
            'is_deload':        cycle.is_deload,
            'next_is_deload':   cycle.next_session_is_deload,
            'params':           params,
            'hard_rule_texts':  hard_rule_texts,
            'prompt_block':     prompt_block,
        }

    def _periodization_no_cycle(self) -> dict:
        """Devuelve contexto neutro cuando no existe TrainingCycle activo."""
        return {
            'active':          False,
            'goal':            None,
            'block_type':      None,
            'week_number':     0,
            'is_deload':       False,
            'next_is_deload':  False,
            'params':          None,
            'hard_rule_texts': [],
            'prompt_block': (
                'PERIODIZACIÓN: Sin ciclo activo. Aplica principios generales de progresión lineal. '
                'Usa RPE calculado por el sistema como referencia de intensidad.'
            ),
        }

    @staticmethod
    def _build_periodization_prompt(
        goal: str,
        block_type: str,
        week_number: int,
        is_deload: bool,
        next_is_deload: bool,
        params: dict,
        hard_rule_texts: list[str],
    ) -> str:
        rir_max_display = params['rir_max'] if params['rir_max'] < 10 else '5+'
        deload_flag = ' [SEMANA DE DELOAD]' if is_deload else ''
        next_flag   = '\n⚠️ PRÓXIMA SEMANA: semana de deload programada.' if next_is_deload else ''

        hard_block = ''
        if hard_rule_texts:
            rules_fmt  = '\n'.join(f'  ⛔ {r}' for r in hard_rule_texts)
            hard_block = f'\nREGLAS DURAS DE ESTE BLOQUE (no negociables):\n{rules_fmt}'

        return (
            f'PERIODIZACIÓN ACTIVA:{deload_flag}\n'
            f'  Objetivo del ciclo : {goal}\n'
            f'  Bloque actual      : {block_type} (semana {week_number} del ciclo)\n'
            f'  Énfasis            : {params["enfasis"]}\n'
            f'  Repeticiones       : {params["reps"]} RM\n'
            f'  RPE objetivo       : {params["rpe_min"]}–{params["rpe_max"]}/10\n'
            f'  RIR objetivo       : {params["rir_min"]}–{rir_max_display} reps en reserva\n'
            f'  Volumen            : {params["volumen"]}\n'
            f'  Descanso entre series: {params["rest_min_s"]}–{params["rest_max_s"]} segundos\n'
            f'{hard_block}{next_flag}'
        )

    # ─── Paso 5 ───────────────────────────────────────────────────────────────

    def enrich_with_load(self, pool: list[dict], deload_session: bool = False) -> tuple[list[dict], dict]:
        """
        Enriquece el pool con datos de progresión RPE-based desde UserExerciseProfile.
        Devuelve (enriched_pool, session_meta).
        """
        hoy = date.today()
        nombres = [ex['nombre'] for ex in pool]

        profiles_map = {
            uep.exercise_nombre: uep
            for uep in UserExerciseProfile.objects.filter(
                user=self.user, exercise_nombre__in=nombres,
            )
        }

        tiempo_efectivo_s = max(0, (self.checkin.duracion_disponible - 15) * 60)

        enriched: list[dict] = []
        for ex in pool:
            uep = profiles_map.get(ex['nombre'])
            primera_vez = uep is None or uep.veces_realizado == 0
            progresion: str | None = None
            rpe_referencia: float | None = None
            veces_realizado = 0

            if not primera_vez and uep is not None:
                veces_realizado = uep.veces_realizado
                rpe_ref = float(uep.rpe_promedio_real) if uep.rpe_promedio_real else None
                rpe_referencia = rpe_ref

                if uep.ultima_vez and (hoy - uep.ultima_vez).days > 7:
                    progresion = 'consolidar'
                elif rpe_ref is not None:
                    if rpe_ref < 7.0:
                        progresion = 'incrementar'
                    elif rpe_ref <= 8.5:
                        progresion = 'mantener'
                    else:
                        progresion = 'reducir'
                else:
                    progresion = 'mantener'

            enriched.append({
                **ex,
                'primera_vez':     primera_vez,
                'progresion':      progresion,
                'rpe_referencia':  rpe_referencia,
                'veces_realizado': veces_realizado,
            })

        # Estimar sets disponibles
        avg_total_sec = (
            sum(ex['total_set_seconds'] for ex in enriched) / len(enriched)
            if enriched else 135
        )
        max_sets = int(tiempo_efectivo_s / avg_total_sec) if avg_total_sec > 0 else 20
        max_sets = max(8, min(30, max_sets))
        if deload_session:
            max_sets = int(max_sets * 0.65)

        session_meta = {
            'deload_session':  deload_session,
            'max_sets_sesion': max_sets,
        }

        logger.debug(
            'adaptive_engine paso5 user=%s pool=%d max_sets=%d deload=%s',
            self.user.id, len(enriched), max_sets, deload_session,
        )
        return enriched, session_meta
