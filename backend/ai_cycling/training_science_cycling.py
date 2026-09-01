"""
Capa de evidencia del motor de CICLISMO — F0 (ciencia pura), espejo de
`ai_running/training_science_running.py`.

FUENTE ÚNICA DE VERDAD para las constantes de ciclismo derivadas de la
literatura:
  · Catálogo de tipos de sesión (easy/long_ride/tempo/sweet_spot/threshold/
    vo2max/anaerobic/sprints/…) con su zona, si es de calidad y su fracción
    del volumen semanal.
  · Derivación de ZONAS: potencia (% FTP, modelo Coggan de 7 zonas + sweet
    spot) y FC (% FTHR cuando hay umbral medido; Karvonen cuando no).
  · Estimación de FTP/FTHR desde un test de 20 min declarado.
  · Volumen semanal en HORAS (no km — en ciclismo la distancia es un
    resultado, no un insumo de entrenamiento: una hora a Z2 y una hora a
    umbral valen lo mismo en tiempo pero muy distinto en distancia).
  · Reglas duras de seguridad (espaciado de calidad, deload, cap de
    progresión).
  · prescribe_ride_session(): prescripción determinística de la estructura de
    una sesión (mismo patrón que prescribe_run_session() y
    prescribe_exercise(): el motor fija los números, el LLM solo redacta).

⚠️ DECISIÓN DE PRODUCTO (confirmada 2026-08-21): el ancla de intensidad es
**FC + RPE, con potencia OPCIONAL**. La mayoría de quien entrena en bici no
tiene potenciómetro; anclar todo en FTP habría dejado afuera al usuario
típico. Por eso `derive_zones()` siempre intenta resolver FC (por FTHR medido
o, en su defecto, Karvonen desde FCmáx/FCreposo — igual que running) y solo
añade zonas de potencia si hay `ftp_w`. RPE está SIEMPRE presente, igual que
en running.

Constantes en código A PROPÓSITO: solo cambian cuando cambia la evidencia, no
en runtime. Módulo PURO: no importa Django ni modelos; recibe primitivos y
devuelve dicts/tuplas para ser testeable sin BD y reutilizable desde
cualquier capa.

Referencias:
  · Modelo de 7 zonas de potencia (%FTP) y FTP por test de 20 min × 0.95:
    Allen & Coggan, "Training and Racing with a Power Meter" (2010).
  · Zonas de FC por %FTHR (umbral de FC funcional) y protocolo de 30 min
    (FTHR ≈ FC media de los últimos 20 min): Friel, "The Cyclist's Training
    Bible" (2018 ed.).
  · Sweet spot (88-94% FTP): no es una de las 7 zonas oficiales de Coggan,
    pero es el target más usado en el coaching moderno de base aeróbica
    (p. ej. TrainerRoad, FasCat Coaching) — se incluye como zona propia por
    su uso extendido, documentado acá para no confundirlo con un estándar
    "oficial".
  · FCmáx por edad y Karvonen: mismas referencias que running (Tanaka 2001;
    Karvonen, Kentala & Mustala 1957) — ver endurance/science.py.
  · Por qué el cap de progresión semanal NO es el 10% de running: Nielsen
    et al. 2012 mide el riesgo del incremento de volumen específicamente en
    corredores, con la carga de impacto óseo/tendinoso como mecanismo. El
    ciclismo no tiene ese mecanismo de lesión — no hay evidencia equivalente
    que exija el mismo tope, así que se usa uno más permisivo (ver
    CYCLING_PROGRESSION_CAP).
"""

# NIVEL_FACTOR se comparte con los otros motores (mismo escalado por nivel).
from ai_workout.training_science import NIVEL_FACTOR  # noqa: F401  (reexport útil)

# Reglas SPORT-AGNOSTIC compartidas con running — ver endurance/science.py.
from endurance import science as _sc  # noqa: F401  (reexport útil)
from endurance.science import (  # noqa: F401  (reexport útil)
    POLARIZED_SPLIT, PHASE_VOLUME_FACTOR, DELOAD_CADENCE_WEEKS,
    MIN_EASY_DAYS_BY_NIVEL, polarized_distribution, fc_max_tanaka,
)


# ─── Catálogo de tipos de sesión de ciclismo ──────────────────────────────────
#
# zona        : zona de intensidad principal del bloque de trabajo.
# es_calidad  : sweet spot o más → cuenta para "no dos calidades consecutivas".
# pct_volumen : (mín, máx) fracción del volumen SEMANAL EN HORAS que aporta
#               esta sesión.
# proposito   : objetivo fisiológico (va al prompt como contexto).
#
# 'easy' y 'rest' están garantizados en este catálogo porque
# endurance.readiness.adapt_today los usa como vocabulario UNIVERSAL de
# degradación — cualquier motor de deporte de resistencia debe tenerlos.

SESSION_TYPES = {
    'easy':       {'zona': 'Z2', 'es_calidad': False, 'pct_volumen': (0.20, 0.30),
                   'proposito': 'Base aeróbica, resistencia de base, eficiencia metabólica'},
    'long_ride':  {'zona': 'Z2', 'es_calidad': False, 'pct_volumen': (0.30, 0.45),
                   'proposito': 'Resistencia aeróbica larga, adaptación a usar grasa como combustible'},
    'tempo':      {'zona': 'Z3', 'es_calidad': False, 'pct_volumen': (0.10, 0.18),
                   'proposito': 'Resistencia muscular submáxima, tolerancia sostenida'},
    'sweet_spot': {'zona': 'SS', 'es_calidad': True,  'pct_volumen': (0.08, 0.15),
                   'proposito': 'Máximo estímulo de umbral con mínima fatiga acumulada'},
    'threshold':  {'zona': 'Z4', 'es_calidad': True,  'pct_volumen': (0.06, 0.12),
                   'proposito': 'Potencia funcional de umbral (FTP), tolerancia al lactato'},
    'vo2max':     {'zona': 'Z5', 'es_calidad': True,  'pct_volumen': (0.05, 0.10),
                   'proposito': 'Potencia aeróbica máxima (VO2máx)'},
    'anaerobic':  {'zona': 'Z6', 'es_calidad': True,  'pct_volumen': (0.02, 0.05),
                   'proposito': 'Capacidad anaeróbica, tolerancia a esfuerzos supraumbral cortos'},
    'sprints':    {'zona': 'Z7', 'es_calidad': False, 'pct_volumen': (0.0, 0.03),
                   'proposito': 'Potencia neuromuscular y técnica, sin fatiga acumulada (esfuerzos de segundos)'},
    'recovery':   {'zona': 'Z1', 'es_calidad': False, 'pct_volumen': (0.10, 0.20),
                   'proposito': 'Recuperación activa, muy suave'},
    'rest':       {'zona': None, 'es_calidad': False, 'pct_volumen': (0.0, 0.0),
                   'proposito': 'Descanso total'},
    'cross':      {'zona': 'Z2', 'es_calidad': False, 'pct_volumen': (0.0, 0.0),
                   'proposito': 'Cross-training de bajo impacto (correr/nadar/elíptica)'},
}

QUALITY_TYPES = frozenset(t for t, s in SESSION_TYPES.items() if s['es_calidad'])

# RPE percibido nominal por zona (escala Borg CR10). Ancla universal: SIEMPRE
# se prescribe RPE aunque falten potencia y FC.
RPE_BY_ZONE = {'Z1': 3, 'Z2': 4, 'Z3': 5, 'SS': 7, 'Z4': 8, 'Z5': 9, 'Z6': 10, 'Z7': 10}


# ─── Zonas de POTENCIA desde el FTP (% de FTP, modelo Coggan + sweet spot) ────

POWER_ZONE_FACTORS = {
    'Z1': (0.00, 0.55),   # recuperación activa
    'Z2': (0.56, 0.75),   # resistencia / base aeróbica
    'Z3': (0.76, 0.87),   # tempo
    'SS': (0.88, 0.94),   # sweet spot
    'Z4': (0.95, 1.05),   # umbral funcional (FTP)
    'Z5': (1.06, 1.20),   # VO2máx
    'Z6': (1.21, 1.50),   # capacidad anaeróbica
    'Z7': (1.51, 2.50),   # potencia neuromuscular (esfuerzos de segundos, pico)
}

# ─── Zonas de FC desde el FTHR (% de FTHR directo — no reserva) ───────────────
#
# El FTHR (umbral de FC funcional) es el ancla PRIMARIA cuando existe: igual
# que running usa % del threshold_pace, acá se usa % del FTHR directamente
# (no Karvonen) porque el FTHR YA es un punto de referencia medido, no
# estimado desde FCmáx/reposo.

HR_FTHR_ZONE_FACTORS = {
    'Z1': (0.00, 0.81),
    'Z2': (0.81, 0.89),
    'Z3': (0.90, 0.93),
    'SS': (0.94, 0.97),
    'Z4': (0.98, 1.03),
    'Z5': (1.04, 1.10),
    'Z6': (1.11, 1.15),
    # Z7: esfuerzos de segundos — la FC no llega a responder a tiempo. No hay
    # zona de FC fiable; se repite el techo de Z6 solo para no dejar un hueco,
    # nunca se debe leer como "objetivo de FC" en un sprint.
    'Z7': (1.15, 1.15),
}

# ─── Zonas de FC por Karvonen — FALLBACK cuando no hay FTHR medido ────────────
#
# %FC de reserva (FCmáx − FCreposo), no % de FTHR. Se usa solo si el corredor
# no hizo el test de 20-30 min pero sí tiene FCmáx/FCreposo (medidos o
# estimados por edad).

HR_ZONE_PCT_KARVONEN = {
    'Z1': (0.00, 0.60),
    'Z2': (0.60, 0.70),
    'Z3': (0.70, 0.80),
    'SS': (0.80, 0.85),
    'Z4': (0.85, 0.90),
    'Z5': (0.90, 0.95),
    'Z6': (0.95, 1.00),
    'Z7': (1.00, 1.00),   # mismo techo — ver nota de Z7 arriba.
}


def power_zones(ftp_w) -> dict:
    """{zona: (watts_lo, watts_hi)} a partir del FTP declarado o estimado."""
    ftp = float(ftp_w)
    return {z: (round(ftp * lo), round(ftp * hi)) for z, (lo, hi) in POWER_ZONE_FACTORS.items()}


def hr_zones_from_fthr(fthr_bpm) -> dict:
    """{zona: (bpm_lo, bpm_hi)} a partir del FTHR medido — ancla PRIMARIA de FC."""
    fthr = float(fthr_bpm)
    return {z: (round(fthr * lo), round(fthr * hi)) for z, (lo, hi) in HR_FTHR_ZONE_FACTORS.items()}


def hr_zones_karvonen(fc_max, fc_reposo) -> dict:
    """{zona: (bpm_lo, bpm_hi)} por Karvonen — FALLBACK de FC sin FTHR medido."""
    return _sc.karvonen_zones(fc_max, fc_reposo, HR_ZONE_PCT_KARVONEN)


def derive_zones(*, fthr_bpm=None, ftp_w=None, fc_max=None, fc_reposo=None,
                 fc_max_es_estimada: bool = True) -> dict:
    """Construye el dict de ZONAS que se guarda en CyclistProfile.zonas (Fase 3).

    hr=None solo si no hay NINGÚN dato de FC (ni FTHR ni FCmáx/reposo válidos)
    — dado el ancla FC+RPE del producto, esto solo pasa en cold-start total.
    power=None si no hay FTP (el caso más común: sin potenciómetro)."""
    z = {'hr': None, 'power': None, 'metodo_hr': None, 'metodo_power': None}
    if fthr_bpm:
        z['hr'] = hr_zones_from_fthr(fthr_bpm)
        z['metodo_hr'] = 'pct_fthr'
    elif fc_max and fc_reposo and fc_max > fc_reposo:
        z['hr'] = hr_zones_karvonen(fc_max, fc_reposo)
        z['metodo_hr'] = 'karvonen' + ('_fcmax_estimada' if fc_max_es_estimada else '')
    if ftp_w:
        z['power'] = power_zones(ftp_w)
        z['metodo_power'] = 'pct_ftp'
    return z


# ─── Estimación de FTP / FTHR ─────────────────────────────────────────────────
#
# Protocolo de 20 min (Coggan/Friel): 20 min al máximo esfuerzo sostenible.
#   FTP   = potencia media del test × 0.95 (el test sobreestima el FTP real de
#           60 min porque 20 min es más corto — el factor 0.95 lo corrige).
#   FTHR  = FC media de los ÚLTIMOS 20 min de un esfuerzo de 30 min sostenido
#           (la FC tarda más que la potencia en estabilizarse, por eso el
#           protocolo estándar de FTHR usa una ventana más larga — no se
#           aplica el ×0.95, ese factor es un artefacto propio de potencia).
#
# Sin datos de historial de RideSession todavía (eso es Fase 3): esta cascada
# tiene 2 niveles, no 3 como estimate_threshold_pace() de running (que suma
# un nivel "desde el historial"). Cuando exista RideSession, sumar ese nivel
# acá siguiendo el mismo patrón.

FTP_TEST_FACTOR = 0.95

# ─── Nivel "historial" (equivalente al de running, ver
# training_science_running._confianza_historial) ──────────────────────────────
#
# Sin RidePoint no hay forma de aislar "el mejor tramo sostenido de 20 min"
# dentro de una salida (running sí puede, desde el GPS). El proxy que usamos:
# potencia NORMALIZADA (Coggan — ya corrige por variabilidad, mejor estimador
# de intensidad "efectiva" que el promedio crudo) de salidas suficientemente
# largas Y sentidas como duras (RPE alto), asumiendo que un esfuerzo así
# probablemente contiene un tramo sostenido representativo del umbral. Es una
# aproximación deliberadamente conservadora — un test de 20 min declarado
# sigue siendo mejor evidencia (protocolo controlado) y gana siempre.
MIN_RIDE_MIN_FOR_BASELINE = 40   # duración mínima para que un NP alto sea creíble como "sostenido"
MIN_RPE_FOR_BASELINE_RIDE = 7    # debe haberse sentido duro — descarta NP alto por ruido de sensor

CONFIANZA_ALTA_MIN_RIDES = 8
CONFIANZA_ALTA_MAX_CV = 0.06   # mismo umbral que running (coef. de variación)


def _confianza_historial(valores: list) -> str:
    n = len(valores)
    if n < 3:
        return 'baja'
    if n < CONFIANZA_ALTA_MIN_RIDES:
        return 'media'
    media = sum(valores) / n
    if media <= 0:
        return 'media'
    varianza = sum((v - media) ** 2 for v in valores) / n
    cv = (varianza ** 0.5) / media
    return 'alta' if cv <= CONFIANZA_ALTA_MAX_CV else 'media'


def estimate_threshold(*, declared_test: dict = None, rides: list = None) -> dict:
    """Estima FTP/FTHR en cascada de confianza.

    declared_test = {'avg_power_w': ..., 'avg_hr_20min': ...} de un test de
    20-30 min declarado por el usuario → confianza ALTA (potencia) o MEDIA
    (solo FC, sin potenciómetro — la FC es más variable sesión a sesión que
    la potencia). Gana siempre sobre `rides` (protocolo controlado > estimado).

    rides = lista de dicts de RideSession completadas, con al menos
    {'duration_min', 'rpe_real', 'normalized_power_w'|'avg_power_w',
    'avg_heart_rate'} → nivel HISTORIAL (ALTA con ≥8 salidas calificadas y
    dispersión baja / MEDIA con 3-7 o dispersión alta / BAJA con 1-2) — ver
    MIN_RIDE_MIN_FOR_BASELINE/MIN_RPE_FOR_BASELINE_RIDE para qué salidas
    califican.

    Sin datos → cold-start: el motor usa Karvonen (si hay FCmáx/reposo) + RPE.

    Devuelve {ftp_w, fthr_bpm, fuente, confianza, n}."""
    if declared_test:
        avg_power = declared_test.get('avg_power_w')
        avg_hr = declared_test.get('avg_hr_20min')
        ftp = round(float(avg_power) * FTP_TEST_FACTOR) if avg_power else None
        fthr = round(float(avg_hr)) if avg_hr else None
        if ftp or fthr:
            return {'ftp_w': ftp, 'fthr_bpm': fthr, 'fuente': 'test_20min',
                    'confianza': 'alta' if ftp else 'media', 'n': 0}

    quality = [
        r for r in (rides or [])
        if (r.get('duration_min') or 0) >= MIN_RIDE_MIN_FOR_BASELINE
        and (r.get('rpe_real') or 0) >= MIN_RPE_FOR_BASELINE_RIDE
    ]
    if quality:
        potencias = [
            r['normalized_power_w'] if r.get('normalized_power_w') else r.get('avg_power_w')
            for r in quality
        ]
        potencias = [p for p in potencias if p]
        ftp = round(max(potencias) * FTP_TEST_FACTOR) if potencias else None
        hrs = [r['avg_heart_rate'] for r in quality if r.get('avg_heart_rate')]
        fthr = round(max(hrs)) if hrs else None
        if ftp or fthr:
            n = len(potencias) if potencias else len(hrs)
            return {'ftp_w': ftp, 'fthr_bpm': fthr, 'fuente': 'historial',
                    'confianza': _confianza_historial(potencias or hrs), 'n': n}

    return {'ftp_w': None, 'fthr_bpm': None, 'fuente': 'cold_start', 'confianza': 'baja', 'n': 0}


# ─── Progresión por tipo de sesión (equivalente a pace_bias_from_profile de
# running / rpe_bias de fuerza) ────────────────────────────────────────────────
#
# El dial que se ajusta en ciclismo es potencia/FC objetivo dentro de la zona
# ya derivada del FTP/FTHR, no el RPE (fijo por zona, RPE_BY_ZONE). Mismo
# patrón exacto que training_science_running.pace_bias_from_profile/
# apply_pace_bias — ver esos docstrings para el razonamiento completo.

POWER_BIAS_PCT_PER_RPE = 0.02   # +1 RPE de más duro de lo esperado ≈ 2% menos potencia/FC objetivo
POWER_BIAS_CAP_PCT = 0.05       # nunca ajusta más de ±5% — afinado, no re-derivación del FTP/FTHR


def power_bias_from_profile(rpe_promedio_real, rpe_promedio_target) -> float:
    """% de ajuste de potencia/FC objetivo según cómo se sintieron REALMENTE
    las últimas sesiones de este tipo vs su RPE objetivo. Positivo = se
    sintieron más duras de lo esperado → objetivo más bajo (conservador);
    negativo = más fáciles → objetivo más exigente. Capado a ±5%."""
    if rpe_promedio_real is None or rpe_promedio_target is None:
        return 0.0
    delta = float(rpe_promedio_real) - float(rpe_promedio_target)
    return max(-POWER_BIAS_CAP_PCT, min(POWER_BIAS_CAP_PCT, delta * POWER_BIAS_PCT_PER_RPE))


def apply_power_bias(zonas: dict, pct: float) -> dict:
    """Copia de `zonas` con potencia/FC de cada zona ajustadas por `pct`
    (positivo = más FÁCIL, o sea potencia/FC MENOR — a diferencia del ritmo de
    running, donde "más lento" es un número MAYOR en s/km). No muta el
    original — `zonas` viene directo de `CyclistProfile.zonas`."""
    if not pct:
        return zonas
    ajustadas = dict(zonas or {})
    if (zonas or {}).get('power'):
        ajustadas['power'] = {
            z: (round(lo * (1 - pct)), round(hi * (1 - pct)))
            for z, (lo, hi) in zonas['power'].items()
        }
    if (zonas or {}).get('hr'):
        ajustadas['hr'] = {
            z: (round(lo * (1 - pct)), round(hi * (1 - pct)))
            for z, (lo, hi) in zonas['hr'].items()
        }
    return ajustadas


# ─── Volumen semanal (HORAS, no km) ────────────────────────────────────────────
#
# Horas/semana base para nivel INTERMEDIO por meta; se escala por NIVEL_FACTOR.
# Catálogo de metas PROVISIONAL — se revisa en Fase 3 cuando exista CyclistPlan
# y haya que decidir qué opciones ve el usuario en el producto.

VOLUME_BASE_HOURS = {
    'fitness_general':  4.0,   # recreativo, sin evento objetivo
    'gran_fondo':        6.0,   # fondo largo / cicloturismo de un día
    'crono':             5.0,   # contrarreloj — menos volumen, más calidad
    'ruta_competitiva':  7.0,   # ciclismo de ruta competitivo
    'otra':              4.0,
}

# Sin la carga de impacto óseo/tendinoso que justifica el 10% de running
# (Nielsen 2012) — cap más permisivo. 15% es una guía razonada, no una regla
# con el mismo respaldo de evidencia que el 10% de running; ajustar si
# aparece literatura específica de ciclismo mejor fundamentada.
CYCLING_PROGRESSION_CAP = 1.15


def weekly_volume_target(*, meta_tipo: str, nivel: str, fase: str,
                         prev_hours=None) -> float:
    """Horas objetivo de la semana: base por meta×nivel, fórmula de fase/cap
    en endurance.science.volume_target (misma que usa running, con el cap
    propio de ciclismo)."""
    base = VOLUME_BASE_HOURS.get(meta_tipo, 4.0) * NIVEL_FACTOR.get(nivel, 1.0)
    return _sc.volume_target(base_volume=base, fase=fase, prev_realized=prev_hours,
                             cap=CYCLING_PROGRESSION_CAP)


# ─── Reglas duras de seguridad (texto para el prompt + constantes de runtime) ──

RIDE_SAFETY_RULES = {
    'no_two_quality_consecutive': 'Nunca dos sesiones de calidad (sweet spot o más) en días consecutivos.',
    'min_easy_days':              'Al menos los días easy/recovery indicados entre cada par de calidad.',
    'deload_every_3_4_weeks':     'Semana de recuperación (volumen reducido) cada 3-4 semanas.',
    'cap_progresion':             f'El volumen semanal no sube más del {int(round((CYCLING_PROGRESSION_CAP - 1) * 100))}% vs la semana previa.',
    'injury_pain_cap':            'Dolor/molestia → degradar a easy/recovery, sin calidad.',
}


# ─── Prescripción determinística de la sesión ─────────────────────────────────
#
# Estructura canónica del bloque principal para los tipos de INTERVALO. Las
# repeticiones se eligen por nivel/fase entre (mín, máx) — endurance.science.pick_reps.
# A diferencia de running, NO hay bifurcación distancia/tiempo: en ciclismo el
# insumo de entrenamiento es siempre TIEMPO (una hora a Z2 y una hora a umbral
# valen lo mismo en duración, muy distinto en distancia) — la distancia es un
# resultado, nunca un objetivo de sesión.

INTERVAL_TEMPLATES = {
    'threshold':  {'reps': (2, 4),  'work': {'min': 10}, 'work_zona': 'Z4',
                   'rec': {'min': 5, 'tipo': 'pedaleo suave'}},
    'vo2max':     {'reps': (5, 8),  'work': {'min': 3},  'work_zona': 'Z5',
                   'rec': {'min': 3, 'tipo': 'pedaleo suave'}},
    'anaerobic':  {'reps': (6, 10), 'work': {'seg': 30},  'work_zona': 'Z6',
                   'rec': {'min': 4, 'tipo': 'pedaleo suave'}},
    'sprints':    {'reps': (4, 8),  'work': {'seg': 15},  'work_zona': 'Z7',
                   'rec': {'min': 3, 'tipo': 'pedaleo suave'}},
}

# Duración del bloque continuo de sweet spot por nivel (min).
SWEET_SPOT_MIN_BY_NIVEL = {'principiante': 20, 'intermedio': 30, 'avanzado': 45}

# Calentamiento / enfriamiento estándar de las sesiones de calidad (min).
# Más largo que running (15 vs 12): el músculo necesita más tiempo para
# producir potencia alta de forma limpia que para simplemente correr rápido.
WARMUP_MIN = 15
COOLDOWN_MIN = 10


def _seg(fase: str, repeticiones: int, trabajo: dict, recuperacion, zona: str,
        zonas: dict, rpe: int) -> dict:
    """Arma un segmento rellenando FC/potencia SOLO si la zona existe en las
    zonas del ciclista. rpe SIEMPRE presente (ancla universal). Sin
    pace_objetivo — ciclismo no tiene ritmo, tiene potencia."""
    hr = (zonas or {}).get('hr')
    power = (zonas or {}).get('power')
    return {
        'fase': fase,
        'repeticiones': repeticiones,
        'trabajo': trabajo,
        'recuperacion': recuperacion,
        'fc_objetivo': (hr.get(zona) if (hr and zona) else None),
        'potencia_objetivo': (power.get(zona) if (power and zona) else None),
        'rpe': rpe,
    }


def _seg_min(seg: dict) -> float:
    """Minutos totales de un segmento (todas las repeticiones + recuperaciones)."""
    reps = seg.get('repeticiones') or 1
    w = seg.get('trabajo') or {}
    rec = seg.get('recuperacion') or {}
    w_min = (w.get('min', 0) or 0) + (w.get('seg', 0) or 0) / 60.0
    rec_min = (rec.get('min', 0) or 0) + (rec.get('seg', 0) or 0) / 60.0
    n_rec = max(0, reps - 1) if reps > 1 else 0
    return reps * w_min + n_rec * rec_min


def prescribe_ride_session(*, tipo_sesion: str, zonas: dict, nivel: str,
                           readiness: dict = None, periodizacion: dict = None) -> dict:
    """Prescripción determinística de la ESTRUCTURA de una sesión de ciclismo.
    Espejo de prescribe_run_session()/prescribe_exercise(): el motor fija los
    números, el LLM solo redacta.

    zonas         = {'hr': {...}|None, 'power': {...}|None} (CyclistProfile.zonas).
    readiness     = {'rpe_cap': int|None, 'horas_factor': float} opcional.
    periodizacion = {'fase', 'horas_objetivo_semana', 'is_deload'} opcional.

    Devuelve {tipo_sesion, zona_principal, duracion_min, rpe_target,
              segmentos:[{fase, repeticiones, trabajo, recuperacion,
                          fc_objetivo, potencia_objetivo, rpe}]}.
    fc_objetivo es None si no hay zonas de FC (solo pasa en cold-start total);
    potencia_objetivo es None si no hay FTP (el caso común, sin potenciómetro);
    rpe SIEMPRE presente. Sin distancia_km: ciclismo se prescribe en tiempo."""
    spec = SESSION_TYPES.get(tipo_sesion)
    if spec is None:
        raise ValueError(f'tipo_sesion desconocido: {tipo_sesion}')

    periodizacion = periodizacion or {}
    readiness = readiness or {}
    fase = periodizacion.get('fase')
    horas_factor = float(readiness.get('horas_factor', 1.0) or 1.0)
    horas_sem = periodizacion.get('horas_objetivo_semana')
    if not horas_sem:
        horas_sem = VOLUME_BASE_HOURS.get('fitness_general', 4.0) * NIVEL_FACTOR.get(nivel, 1.0)
    horas_sem *= horas_factor

    zona = spec['zona']
    pct_lo, pct_hi = spec['pct_volumen']
    pct_mid = (pct_lo + pct_hi) / 2.0
    segmentos: list[dict] = []

    if tipo_sesion == 'rest':
        return {'tipo_sesion': 'rest', 'zona_principal': None, 'duracion_min': 0,
                'rpe_target': 0, 'segmentos': []}

    tot_min = 0.0

    def add(fase_seg, reps, trabajo, rec, zona_seg, rpe):
        nonlocal tot_min
        seg = _seg(fase_seg, reps, trabajo, rec, zona_seg, zonas, rpe)
        tot_min += _seg_min(seg)
        segmentos.append(seg)

    if tipo_sesion in INTERVAL_TEMPLATES:
        tmpl = INTERVAL_TEMPLATES[tipo_sesion]
        reps = _sc.pick_reps(tmpl['reps'], nivel, fase)
        if horas_factor != 1.0:
            # La readiness (ej. ánimo bajo, monotonía alta) puede pedir
            # "suavizar" una sesión de calidad sin degradarla a easy — para
            # intervalos eso solo puede significar MENOS repeticiones (la
            # zona/potencia de trabajo no se suaviza, es lo que define el tipo
            # de sesión). Mismo fix que training_science_running.py — antes
            # horas_factor solo escalaba horas_sem, que la rama de intervalos
            # ni lee. Nunca por debajo del mínimo del template.
            lo_reps, hi_reps = tmpl['reps']
            reps = max(lo_reps, min(hi_reps, round(reps * horas_factor)))
        wz = tmpl['work_zona']
        add('calentamiento', 1, {'min': WARMUP_MIN}, None, 'Z2', RPE_BY_ZONE['Z2'])
        add('principal', reps, tmpl['work'], tmpl['rec'], wz, RPE_BY_ZONE[wz])
        add('enfriamiento', 1, {'min': COOLDOWN_MIN}, None, 'Z1', RPE_BY_ZONE['Z1'])

    elif tipo_sesion == 'sweet_spot':
        # Mismo criterio que en INTERVAL_TEMPLATES: el factor de readiness
        # suaviza acortando el bloque, no bajando la zona/potencia.
        ss_min = max(10, round(SWEET_SPOT_MIN_BY_NIVEL.get(nivel, 30) * horas_factor))
        add('calentamiento', 1, {'min': WARMUP_MIN}, None, 'Z2', RPE_BY_ZONE['Z2'])
        add('principal', 1, {'min': ss_min}, None, 'SS', RPE_BY_ZONE['SS'])
        add('enfriamiento', 1, {'min': COOLDOWN_MIN}, None, 'Z1', RPE_BY_ZONE['Z1'])

    else:
        # Continuas: easy, long_ride, recovery, tempo, cross.
        main_min = round(max(20, horas_sem * 60 * pct_mid))
        add('principal', 1, {'min': main_min}, None, zona, RPE_BY_ZONE.get(zona, 4))

    # RPE objetivo de la sesión = el del bloque principal, acotado por el cap de readiness.
    rpe_target = RPE_BY_ZONE.get(zona, 4)
    rpe_cap = readiness.get('rpe_cap')
    if rpe_cap is not None:
        rpe_target = min(rpe_target, rpe_cap)
        for s in segmentos:
            s['rpe'] = min(s['rpe'], rpe_cap)

    return {
        'tipo_sesion': tipo_sesion,
        'zona_principal': zona,
        'duracion_min': int(round(tot_min)),
        'rpe_target': int(rpe_target),
        'segmentos': segmentos,
    }
