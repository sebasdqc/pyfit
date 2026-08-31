"""
Capa de evidencia del motor adaptativo — Fase 0 (filtros duros / prescripción).

FUENTE ÚNICA DE VERDAD para las constantes derivadas de la literatura científica:
  · Taxonomía de volumen: 42 músculos → 13 grupos de volumen → 6 grupos anatómicos.
  · Landmarks de volumen semanal (MEV / MAV / MRV) por grupo × nivel.
  · Rangos de repeticiones por (compuesto/aislamiento × peso libre/máquina) — DEFAULT
    cuando NO hay ciclo activo. Con TrainingCycle activo manda PERIODIZATION_PARAMS.
  · Topes de RPE de SEGURIDAD por riesgo del ejercicio (se aplican SIEMPRE).
  · Descansos estándar por evidencia, modulables por el estado del check-in.

Constantes en código A PROPÓSITO: solo cambian cuando cambia la evidencia, no en
runtime. Patrón espejo de PERIODIZATION_PARAMS en adaptive_engine.py.

Módulo PURO: no importa Django ni modelos. Las funciones reciben primitivos
(nombres de músculo, booleanos, categorías de equipo) para que sean testeables sin
BD y reutilizables desde cualquier capa del motor.

Referencias:
  · Volumen (MEV/MAV/MRV): Israetel et al. (Renaissance Periodization) 2017–2021;
    Schoenfeld, Ogborn & Krieger 2017 (dosis-respuesta de volumen).
  · Repeticiones e hipertrofia: Schoenfeld et al. 2021; Baz-Valle et al. 2022.
  · RPE/RIR y proximidad al fallo: Zourdos et al. 2016; Helms et al. 2018;
    Grgic et al. 2022 (fallo vs no-fallo y riesgo).
  · Descansos: Grgic et al. 2018 (meta-análisis de descanso entre series); NSCA 2022.
"""
import unicodedata
from math import ceil

from users.onboarding_goals import resolve_goal_from_objetivo

# ─── Capa 1: taxonomía de grupos de volumen ───────────────────────────────────
#
# 13 grupos de volumen (con presupuesto) + 'manguito' (estabilizador, SIN
# presupuesto). Decisión de diseño: abductores/aductores/TFL se pliegan en
# 'gluteos' (musculatura de cadera) para mantener exactamente 13; se pueden
# separar más adelante sin tocar el resto del motor.

VOLUME_GROUPS = (
    'cuadriceps', 'isquiotibiales', 'gluteos', 'pantorrilla',
    'pecho', 'dorsal', 'espalda_alta', 'erectores_lumbar',
    'deltoides', 'biceps', 'triceps', 'antebrazo', 'core',
)

# Grupo sin presupuesto de volumen (se entrena de forma indirecta).
STABILIZER_GROUP = 'manguito'

# Mapa de los 42 MuscleGroup.name reales de producción → grupo de volumen.
# Las claves son EXACTAS a como están sembradas en prod (Title-Case, con tildes).
VOLUME_GROUP_BY_MUSCLE = {
    # ── Pierna (11) ──
    'Cuádriceps':                 'cuadriceps',
    'Isquiotibiales':             'isquiotibiales',
    'Glúteo mayor':               'gluteos',
    'Glúteo medio':               'gluteos',
    'Glúteo menor':               'gluteos',
    'Abductores':                 'gluteos',   # cadera abd → glúteos (fusión 13)
    'Aductores':                  'gluteos',   # cadera add → glúteos (fusión 13)
    'Tensor de la fascia lata':   'gluteos',
    'Pantorrilla (gastrocnemio)': 'pantorrilla',
    'Sóleo':                      'pantorrilla',
    'Tibial anterior':            'pantorrilla',
    # ── Pecho (4) ──
    'Pectoral mayor (porción clavicular)': 'pecho',
    'Pectoral mayor (porción esternal)':   'pecho',
    'Pectoral menor':                      'pecho',
    'Serrato anterior':                    'pecho',
    # ── Espalda (11) ──
    'Dorsal ancho':       'dorsal',
    'Redondo mayor':      'dorsal',
    'Romboides':          'espalda_alta',
    'Trapecio superior':  'espalda_alta',
    'Trapecio medio':     'espalda_alta',
    'Trapecio inferior':  'espalda_alta',
    'Erector espinal':    'erectores_lumbar',
    'Multífidos':         'erectores_lumbar',
    'Infraespinoso':      STABILIZER_GROUP,
    'Redondo menor':      STABILIZER_GROUP,
    'Supraespinoso':      STABILIZER_GROUP,
    # ── Hombro (4) ──
    'Deltoides anterior':  'deltoides',
    'Deltoides lateral':   'deltoides',
    'Deltoides posterior': 'deltoides',
    'Subescapular':        STABILIZER_GROUP,
    # ── Brazo (6) ──
    'Bíceps braquial':           'biceps',
    'Braquial':                  'biceps',
    'Braquiorradial':            'biceps',
    'Tríceps braquial':          'triceps',
    'Flexores del antebrazo':    'antebrazo',
    'Extensores del antebrazo':  'antebrazo',
    # ── Core (6) ──
    'Recto abdominal':      'core',
    'Transverso abdominal': 'core',
    'Oblicuo externo':      'core',
    'Oblicuo interno':      'core',
    'Psoas ilíaco':         'core',
    'Cuadrado lumbar':      'core',
}

# Capa 3: grupo de volumen → grupo anatómico (los 6 que ya existen en prod).
# El filtro DURO por "grupo muscular elegido" opera a este nivel (= lo que el
# usuario elige en el check-in: pecho, espalda, piernas, hombros, brazos, core).
ANATOMICAL_BY_VOLUME_GROUP = {
    'cuadriceps':       'Pierna',
    'isquiotibiales':   'Pierna',
    'gluteos':          'Pierna',
    'pantorrilla':      'Pierna',
    'pecho':            'Pecho',
    'dorsal':           'Espalda',
    'espalda_alta':     'Espalda',
    'erectores_lumbar': 'Espalda',
    'deltoides':        'Hombro',
    'biceps':           'Brazo',
    'triceps':          'Brazo',
    'antebrazo':        'Brazo',
    'core':             'Core',
    STABILIZER_GROUP:   'Hombro',   # estabilizador, sin presupuesto
}

# Mapeo del foco del check-in (grupo muscular elegido) → grupos de volumen
# permitidos por el FILTRO DURO. Cubre tokens por parte corporal y por patrón de
# movimiento (los d5b_grupo que envía el check-in). Los tokens de modalidad
# (completo/movilidad/fuerza/…) NO restringen (conjunto vacío → sin filtro).
FOCO_A_VOLUME_GROUPS = {
    # por parte corporal
    'pecho':        {'pecho'},
    'espalda':      {'dorsal', 'espalda_alta', 'erectores_lumbar'},
    'hombros':      {'deltoides'},
    'brazos':       {'biceps', 'triceps', 'antebrazo'},
    'core':         {'core'},
    'piernas':      {'cuadriceps', 'isquiotibiales', 'gluteos', 'pantorrilla'},
    'piernas_quad': {'cuadriceps', 'gluteos'},
    'piernas_glut': {'gluteos', 'isquiotibiales'},
    # por patrón de movimiento (empuje/tracción)
    'empujes':      {'pecho', 'deltoides', 'triceps'},
    'tracciones':   {'dorsal', 'espalda_alta', 'biceps', 'antebrazo'},
    # modalidad / objetivo → sin filtro de grupo
    'completo':     set(),
    'movilidad':    set(),
    'resistencia':  set(),
    'fuerza':       set(),
    'hipertrofia':  set(),
}

# Patrones que se mantienen SIEMPRE en el pool aunque el foco filtre el resto:
# necesarios para calentamiento y vuelta a la calma.
ALWAYS_KEEP_PATTERNS = frozenset({'movilidad', 'cardio'})

# Alias para el vocabulario LEGACY en minúsculas del JSONField (entorno local /
# fallback). Producción usa los nombres canónicos de arriba; esto evita que el
# fallback quede ciego. Claves ya normalizadas (sin tilde, minúscula).
_LOCAL_ALIASES = {
    'gluteos': 'gluteos', 'cuadriceps': 'cuadriceps', 'triceps': 'triceps',
    'biceps': 'biceps', 'isquiotibiales': 'isquiotibiales', 'dorsal': 'dorsal',
    'pectoral': 'pecho', 'pectoral superior': 'pecho', 'pectoral inferior': 'pecho',
    'core': 'core', 'recto abdominal': 'core', 'transverso abdominal': 'core',
    'oblicuos': 'core', 'flexores cadera': 'core',
    'romboides': 'espalda_alta', 'trapecios': 'espalda_alta',
    'deltoides': 'deltoides', 'deltoides anterior': 'deltoides',
    'deltoides lateral': 'deltoides', 'deltoides posterior': 'deltoides',
    'hombro': 'deltoides',
    'lumbar': 'erectores_lumbar', 'lumbar estabilizadores': 'erectores_lumbar',
    'columna': 'erectores_lumbar',
    'pantorrilla': 'pantorrilla', 'soleo': 'pantorrilla',
    'aductores': 'gluteos', 'abductores': 'gluteos', 'cadera': 'gluteos',
    'tfl': 'gluteos',
    'braquial': 'biceps', 'braquiorradial': 'antebrazo',
    'manguito rotador': STABILIZER_GROUP,
    'cuerpo completo': None,   # no asigna grupo de volumen
}


# ─── Capa 2: landmarks de volumen semanal (series/semana) ─────────────────────
#
# Tupla (MEV, MAV, MRV) base para nivel INTERMEDIO. Se escala por nivel con
# NIVEL_FACTOR. MAV = objetivo productivo; MRV = techo duro semanal.

LANDMARKS_BASE = {
    'cuadriceps':       (8, 16, 20),
    'isquiotibiales':   (6, 14, 18),
    'gluteos':          (6, 14, 18),
    'pantorrilla':      (8, 14, 18),
    'pecho':            (10, 16, 22),
    'dorsal':           (10, 18, 22),
    'espalda_alta':     (8, 14, 20),
    'erectores_lumbar': (6, 10, 14),
    'deltoides':        (8, 18, 24),
    'biceps':           (8, 16, 22),
    'triceps':          (8, 14, 20),
    'antebrazo':        (4, 10, 14),
    'core':             (0, 14, 22),
}

# Escalado por nivel sobre MEV/MAV/MRV (principiante crece con menos volumen;
# avanzado tolera más). Editable cuando cambie la evidencia.
NIVEL_FACTOR = {
    'principiante': 0.65,
    'intermedio':   1.0,
    'avanzado':     1.2,
}

# Etiquetas legibles por grupo de volumen (para el prompt / directivas).
VG_LABELS = {
    'cuadriceps':       'cuádriceps',
    'isquiotibiales':   'isquiotibiales',
    'gluteos':          'glúteos',
    'pantorrilla':      'pantorrilla',
    'pecho':            'pecho',
    'dorsal':           'dorsal/espalda',
    'espalda_alta':     'espalda alta',
    'erectores_lumbar': 'erectores/lumbar',
    'deltoides':        'deltoides',
    'biceps':           'bíceps',
    'triceps':          'tríceps',
    'antebrazo':        'antebrazo',
    'core':             'core',
}

# Ponderación de series por rol muscular al contar volumen semanal
# (convención de "fracción de serie", Schoenfeld): primario cuenta completo,
# secundario cuenta la mitad.
SECONDARY_SET_WEIGHT = 0.5


# ─── Rangos de repeticiones (DEFAULT sin ciclo activo) ────────────────────────
#
# Con TrainingCycle activo, mandan los rangos de PERIODIZATION_PARAMS (esto es el
# fallback para la mayoría de usuarios, que hoy no tienen ciclo).
# La discriminación compuesto/aislamiento usa el BOOLEANO es_compuesto, NO el
# patrón (hay mono-articulares clasificados en patrones de movimiento).

REP_RANGES_DEFAULT = {
    ('compuesto',   'libre'):   (6, 10),    # regla aprobada por el usuario
    ('compuesto',   'maquina'): (8, 12),
    ('aislamiento', 'libre'):   (10, 12),
    ('aislamiento', 'maquina'): (12, 15),
}

# Core y movilidad no encajan en el esquema de fuerza por cuadrante.
CORE_PATTERNS = frozenset({'core_antiextension', 'core_antirrotacion', 'core_antiflexion', 'core'})
CORE_REP_RANGE = (10, 20)
NON_STRENGTH_PATTERNS = frozenset({'movilidad', 'cardio', 'locomocion'})


# ─── Topes de RPE de SEGURIDAD (se aplican SIEMPRE, por encima de todo) ───────
#
# Ejercicios de alto riesgo de lesión (press y sentadilla/peso muerto con peso
# libre, o cualquier ejercicio con error_risk alto) no se llevan al fallo.

HIGH_RISK_PATTERNS = frozenset({
    'sentadilla', 'bisagra', 'empuje_horizontal', 'empuje_vertical', 'cargada',
})
ERROR_RISK_THRESHOLD = 4          # error_risk (1–5) ≥ este valor → alto riesgo
RPE_CAP_HIGH_RISK = 8             # RIR ≥ 2
RPE_CAP_HIGH_RISK_BEGINNER = 7    # principiante: RIR ≥ 3


# ─── Descansos estándar (segundos) ────────────────────────────────────────────
#
# Rango (mín, máx) por evidencia. El valor designado es el MÁX; el atleta fatigado
# recibe un extra. (Grgic 2018: ≥2 min en compuestos mejora fuerza/hipertrofia.)

REST_STANDARD = {
    'compuesto':   (120, 180),
    'aislamiento': (60, 90),
}
REST_FATIGUE_BONUS_S = 30   # se suma al máx designado si el atleta llega fatigado

# Equipo considerado "peso libre".
FREE_WEIGHT_CATEGORY = 'Libre'
# Heurística por nombre para el fallback JSON (sin tablas normalizadas).
FREE_WEIGHT_NAME_HINTS = (
    'barra', 'mancuerna', 'kettlebell', 'pesa rusa', 'disco', 'hexagonal', 'ez',
)


# ─── Helpers (puros) ──────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    """Normaliza para matching tolerante: minúscula, sin tildes, espacios colapsados."""
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', str(s))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return ' '.join(s.lower().split())


# Índice normalizado: nombre canónico/alias normalizado → grupo de volumen.
_NORM_INDEX = {}
for _name, _vg in VOLUME_GROUP_BY_MUSCLE.items():
    _NORM_INDEX[_norm(_name)] = _vg
for _name, _vg in _LOCAL_ALIASES.items():
    _NORM_INDEX.setdefault(_norm(_name), _vg)


def volume_group_for_muscle(muscle_name: str):
    """Devuelve el grupo de volumen de un músculo (canónico o legacy), o None."""
    n = _norm(muscle_name)
    if n in _NORM_INDEX:
        return _NORM_INDEX[n]
    # Coincidencia parcial como último recurso (ej. 'pectoral mayor xyz').
    for key, vg in _NORM_INDEX.items():
        if key and (key in n or n in key):
            return vg
    return None


def primary_volume_group(musculos_primarios) -> str | None:
    """Grupo de volumen principal de un ejercicio a partir de su lista de
    músculos primarios. Ignora estabilizadores (manguito) salvo que sea el único."""
    grupos = [volume_group_for_muscle(m) for m in (musculos_primarios or [])]
    grupos = [g for g in grupos if g]
    con_presupuesto = [g for g in grupos if g != STABILIZER_GROUP]
    if con_presupuesto:
        return con_presupuesto[0]
    return grupos[0] if grupos else None


def anatomical_group(volume_group: str) -> str | None:
    """Grupo anatómico (de los 6) para un grupo de volumen."""
    return ANATOMICAL_BY_VOLUME_GROUP.get(volume_group)


def volume_groups_for_foco(foco_list) -> set | None:
    """Grupos de volumen permitidos por el foco elegido en el check-in.
    Devuelve None = SIN filtro duro (foco vacío, desconocido, o solo tokens de
    modalidad como 'completo'/'fuerza'). Un set no vacío = filtrar a esos grupos."""
    if not foco_list:
        return None
    allowed: set = set()
    selective = False
    for f in foco_list:
        grupos = FOCO_A_VOLUME_GROUPS.get(_norm(f))
        if grupos:                 # token selectivo (parte corporal o patrón)
            allowed |= grupos
            selective = True
        # token de modalidad (set vacío) o desconocido → no restringe
    return allowed if selective else None


def weekly_landmarks(volume_group: str, nivel: str = 'intermedio') -> dict | None:
    """(MEV, MAV, MRV) escalados por nivel para un grupo de volumen.
    Devuelve None para grupos sin presupuesto (manguito) o desconocidos."""
    base = LANDMARKS_BASE.get(volume_group)
    if base is None:
        return None
    f = NIVEL_FACTOR.get(nivel, 1.0)
    mev, mav, mrv = base
    return {
        'mev': round(mev * f),
        'mav': round(mav * f),
        'mrv': round(mrv * f),
    }


def vg_label(volume_group: str) -> str:
    """Etiqueta legible de un grupo de volumen."""
    return VG_LABELS.get(volume_group, volume_group)


def aggregate_done_sets(rows, vg_by_nombre: dict) -> dict:
    """Suma series semanales por grupo de volumen.

    rows: iterable de dicts {'nombre', 'series'} (filas de SessionExercise).
    vg_by_nombre: {nombre_ejercicio: (set grupos primarios, set grupos secundarios)}.
    Primario cuenta 1.0 por serie; secundario, SECONDARY_SET_WEIGHT. Ignora el
    grupo estabilizador. Devuelve {grupo_volumen: series (float)}."""
    done: dict = {}
    for r in rows:
        prim, sec = vg_by_nombre.get(r.get('nombre'), (set(), set()))
        s = r.get('series') or 0
        for vg in prim:
            if vg and vg != STABILIZER_GROUP:
                done[vg] = done.get(vg, 0) + s
        for vg in sec:
            if vg and vg != STABILIZER_GROUP:
                done[vg] = done.get(vg, 0) + s * SECONDARY_SET_WEIGHT
    return done


def weekly_budget(
    done_by_group: dict,
    nivel: str = 'intermedio',
    dias_semana: int = 3,
    sesiones_transcurridas: int = 0,
) -> dict:
    """Presupuesto semanal por grupo a partir de las series ya hechas.

    Además del techo semanal duro (`restante` contra el MRV), calcula
    `sugerido_hoy`: el restante prorrateado entre las sesiones que faltan
    esta semana (`dias_semana - sesiones_transcurridas`, mínimo 1). Con baja
    frecuencia (ej. 1 día/semana) `sugerido_hoy` tiende al restante completo
    — es la única oportunidad del grupo esa semana; con alta frecuencia se
    reparte en porciones más chicas para no concentrar todo el volumen
    semanal en una sola sesión (ej. el lunes).

    Siempre incluye todos los grupos con landmarks conocidos, aunque
    `done_by_group` venga vacío (primera sesión de la semana → hechas=0,
    restante=MRV completo) — sin esto, la primera sesión de la semana
    quedaba sin ninguna directiva de volumen.

    Devuelve {grupo: {hechas, mav, mrv, restante, sugerido_hoy}}."""
    sesiones_restantes = max(1, dias_semana - sesiones_transcurridas)
    out: dict = {}
    for vg in set(LANDMARKS_BASE) | set(done_by_group):
        lm = weekly_landmarks(vg, nivel)
        if not lm:
            continue
        d = round(done_by_group.get(vg, 0))
        restante = max(0, lm['mrv'] - d)
        out[vg] = {
            'hechas':       d,
            'mav':          lm['mav'],
            'mrv':          lm['mrv'],
            'restante':     restante,
            'sugerido_hoy': ceil(restante / sesiones_restantes) if restante else 0,
        }
    return out


def is_free_weight(equipment_categories=None, equipamiento_names=None, nombre='') -> bool:
    """¿El ejercicio es de peso libre?
    1) Ruta normalizada (prod): alguna categoría de equipo es 'Libre'.
    2) Fallback JSON/local: heurística por nombre del equipo o del ejercicio."""
    if equipment_categories:
        if any(_norm(c) == _norm(FREE_WEIGHT_CATEGORY) for c in equipment_categories):
            return True
    haystack = ' '.join(_norm(x) for x in (equipamiento_names or [])) + ' ' + _norm(nombre)
    return any(h in haystack for h in FREE_WEIGHT_NAME_HINTS)


def rep_range_default(es_compuesto: bool, free_weight: bool, patron: str = '') -> tuple | None:
    """Rango (mín, máx) de reps DEFAULT (sin ciclo activo).
    Core → rango propio; movilidad/cardio → None (sin prescripción de fuerza)."""
    if patron in NON_STRENGTH_PATTERNS:
        return None
    if patron in CORE_PATTERNS:
        return CORE_REP_RANGE
    key = ('compuesto' if es_compuesto else 'aislamiento',
           'libre' if free_weight else 'maquina')
    return REP_RANGES_DEFAULT.get(key)


def rpe_safety_cap(es_compuesto: bool, free_weight: bool, patron: str = '',
                   error_risk=None, nivel: str = 'intermedio') -> int | None:
    """Tope de RPE de seguridad (o None si el ejercicio no es de alto riesgo).
    Alto riesgo = error_risk ≥ 4, o compuesto + peso libre en patrón de riesgo
    (sentadilla, bisagra/peso muerto, press)."""
    high_risk = (
        (error_risk is not None and error_risk >= ERROR_RISK_THRESHOLD)
        or (es_compuesto and free_weight and patron in HIGH_RISK_PATTERNS)
    )
    if not high_risk:
        return None
    return RPE_CAP_HIGH_RISK_BEGINNER if nivel == 'principiante' else RPE_CAP_HIGH_RISK


def rest_seconds(es_compuesto: bool, fatiga: str = None, estado_animo=None) -> int:
    """Descanso designado en segundos: el MÁX por evidencia para el tipo de
    ejercicio, +bonus si el atleta llega fatigado (check-in)."""
    _lo, hi = REST_STANDARD['compuesto' if es_compuesto else 'aislamiento']
    fatigado = (fatiga == 'alto') or (estado_animo is not None and estado_animo <= 2)
    return hi + REST_FATIGUE_BONUS_S if fatigado else hi


def parse_rep_range(s) -> tuple | None:
    """Extrae (mín, máx) de un string de reps de periodización ('6–10', '3-6',
    '1–3 a velocidad máxima'…). None si no hay dígitos."""
    import re
    nums = re.findall(r'\d+', str(s or ''))
    if not nums:
        return None
    lo = int(nums[0])
    hi = int(nums[1]) if len(nums) > 1 else lo
    return (lo, hi) if lo <= hi else (hi, lo)


def prescribe_exercise(*, es_compuesto: bool, peso_libre: bool, patron: str,
                       error_risk, nivel: str, rpe_target: float,
                       fatiga: str = None, estado_animo=None,
                       periodizacion: dict = None, rpe_bias: float = 0.0) -> dict:
    """Prescripción determinística por ejercicio: {reps, descanso_s, rpe, rir}.

    - Reps: con ciclo activo manda la periodización en los COMPUESTOS; el resto
      (aislamiento, o sin ciclo) usa el rango por cuadrante. Core/movilidad → reps None.
    - Descanso: rango de periodización si hay ciclo, si no el estándar por tipo;
      +bonus si el atleta llega fatigado.
    - RPE: objetivo de la sesión ajustado por el sesgo del atleta (rpe_bias) y
      ACOTADO por el tope de seguridad. RIR = 10 − RPE."""
    cycle = periodizacion if (periodizacion and periodizacion.get('active')) else None
    params = cycle.get('params') if cycle else None

    # ── Reps ──
    if params and es_compuesto:
        reps = parse_rep_range(params.get('reps')) or rep_range_default(es_compuesto, peso_libre, patron)
    else:
        reps = rep_range_default(es_compuesto, peso_libre, patron)

    # ── Descanso ──
    if params and params.get('rest_max_s'):
        base_rest = params['rest_max_s']
        fatigado = (fatiga == 'alto') or (estado_animo is not None and estado_animo <= 2)
        descanso = base_rest + REST_FATIGUE_BONUS_S if fatigado else base_rest
    else:
        descanso = rest_seconds(es_compuesto, fatiga, estado_animo)

    # ── RPE (sesgo + tope de seguridad) ──
    rpe = float(rpe_target) - float(rpe_bias or 0.0)   # sesgo>0 → percibe más → bajar
    cap = rpe_safety_cap(es_compuesto, peso_libre, patron, error_risk, nivel)
    if cap is not None:
        rpe = min(rpe, cap)
    rpe = max(4, min(9, round(rpe)))
    rir = max(0, 10 - rpe)

    return {'reps': reps, 'descanso_s': int(descanso), 'rpe': rpe, 'rir': rir}


# ─── Objetivo principal (rendimiento / hipertrofia / salud_general) ──────────
#
# Deriva de Profile.goal (users/models.py, GOAL_CHOICES de 5 vías: fuerza/
# potencia/hipertrofia/salud/perdida_grasa), que ya existe y ya alimenta la
# periodización (TrainingCycle.goal, mismas choices) y Zyfit Score v2
# (scores/service.py::GOAL_TO_PERFIL). Este mapeo es de 3 vías y DISTINTO del
# de Score v2: ese colapsa hipertrofia dentro de "rendimiento" (perfil.py solo
# necesita 2 sub-modelos), pero el sistema de evidencia por ejercicio (ver
# zyfit-evidencia-ejercicios-spec.md sección 1) necesita distinguir hipertrofia
# como objetivo propio — no reusar GOAL_TO_PERFIL acá.
GOAL_TO_OBJETIVO_PRINCIPAL: dict[str, str] = {
    'fuerza':        'rendimiento',
    'potencia':      'rendimiento',
    'hipertrofia':   'hipertrofia',
    'salud':         'salud_general',
    'perdida_grasa': 'salud_general',
}


def objetivo_principal(goal: str, objetivo_texto: str = '') -> str | None:
    """Resuelve el objetivo_principal del usuario para el ranking del pool
    (rendimiento/hipertrofia/salud_general). Prioriza `Profile.goal`; si está
    vacío (se escribe fire-and-forget en el onboarding y puede quedar sin
    poblar), cae al mismo fallback estricto que ya usa Zyfit Score v2 sobre
    el string libre `Profile.objetivo` — allowlist exacta, sin fuzzy-match
    (ver users/onboarding_goals.py). None si no se puede resolver ninguno de
    los dos: el generador debe comportarse igual que hoy, sin ponderar."""
    mapped = GOAL_TO_OBJETIVO_PRINCIPAL.get((goal or '').strip())
    if mapped:
        return mapped
    resolved_goal = resolve_goal_from_objetivo(objetivo_texto)
    if resolved_goal:
        return GOAL_TO_OBJETIVO_PRINCIPAL.get(resolved_goal)
    return None


# Valores exactos de la lista DEPORTES en mobile/app/(auth)/onboarding.tsx que
# implican historial de entrenamiento olímpico/halterofilia. Se guardan como
# Profile.experiencia_deportiva = deportes.join(', ') — texto libre separado
# por coma, pero con tokens conocidos y exactos (no requiere fuzzy-match).
HISTORIAL_OLIMPICO_TOKENS = frozenset({'Halterofilia', 'CrossFit'})


def tiene_historial_olimpico(experiencia_deportiva: str) -> bool:
    """True si el usuario declaró Halterofilia o CrossFit entre sus deportes
    practicados en el onboarding. Usado para permitir ejercicios de
    injury_risk_profile='alto' (derivados olímpicos, sentadilla overhead) a
    usuarios que no son nivel avanzado pero sí tienen ese entrenamiento previo."""
    tokens = {t.strip() for t in (experiencia_deportiva or '').split(',')}
    return bool(tokens & HISTORIAL_OLIMPICO_TOKENS)
