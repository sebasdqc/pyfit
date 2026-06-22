"""
Capa de evidencia del motor de RUNNING — F0 (ciencia pura).

FUENTE ÚNICA DE VERDAD para las constantes de carrera derivadas de la literatura:
  · Catálogo de tipos de sesión (easy/long/tempo/vo2/fartlek/hills/…) con su zona,
    si es de calidad y su fracción del volumen semanal.
  · Derivación de ZONAS de intensidad: ritmo desde el umbral (LT2) y FC por Karvonen.
  · Estimación de FCmáx por edad (Tanaka) cuando no hay dato medido.
  · Estimación de baseline/umbral desde el historial de carreras (Riegel) o un
    tiempo declarado.
  · Landmarks de volumen semanal (km/sem) por nivel, regla del 10%, distribución
    polarizada 80/20.
  · Reglas duras de seguridad (espaciado de calidad, deload, cap de long run).
  · prescribe_run_session(): prescripción determinística de la estructura de una
    sesión (espejo de prescribe_exercise() en ai_workout/training_science.py).

Constantes en código A PROPÓSITO: solo cambian cuando cambia la evidencia, no en
runtime. Módulo PURO: no importa Django ni modelos; recibe primitivos y devuelve
dicts/tuplas para ser testeable sin BD y reutilizable desde cualquier capa.

Referencias:
  · Zonas e intensidad polarizada: Seiler 2010 (distribución de intensidad);
    Esteve-Lanao et al. 2007 (80/20).
  · Umbral / VDOT y conversión entre distancias: Daniels 2014 (Running Formula);
    Riegel 1981 (modelo de resistencia, exponente de fatiga ≈1.06).
  · FCmáx por edad: Tanaka, Monahan & Seals 2001 (208 − 0.7·edad, > 220−edad).
  · Zonas de FC por reserva: Karvonen, Kentala & Mustala 1957.
  · Progresión de carga y gestión de lesión: Gabbett 2016 (ACWR);
    Nielsen et al. 2012 (incrementos de volumen y riesgo).
"""

# NIVEL_FACTOR se comparte con el motor de fuerza (mismo escalado por nivel).
from ai_workout.training_science import NIVEL_FACTOR, _norm  # noqa: F401  (reexport útil)


# ─── Catálogo de tipos de sesión de carrera ───────────────────────────────────
#
# zona        : zona de intensidad principal del bloque de trabajo.
# es_calidad  : alta intensidad → cuenta para "no dos calidades consecutivas".
# pct_volumen : (mín, máx) fracción del volumen SEMANAL que aporta esta sesión.
# proposito   : objetivo fisiológico (va al prompt como contexto).

SESSION_TYPES = {
    'easy':        {'zona': 'Z2', 'es_calidad': False, 'pct_volumen': (0.18, 0.28),
                    'proposito': 'Base aeróbica, recuperación activa'},
    'long':        {'zona': 'Z2', 'es_calidad': False, 'pct_volumen': (0.25, 0.35),
                    'proposito': 'Resistencia aeróbica, eficiencia, economía de carrera'},
    'tempo':       {'zona': 'Z4', 'es_calidad': True,  'pct_volumen': (0.10, 0.18),
                    'proposito': 'Umbral lactacídico (LT2), clearance de lactato'},
    'vo2':         {'zona': 'Z5', 'es_calidad': True,  'pct_volumen': (0.06, 0.12),
                    'proposito': 'Potencia aeróbica máxima (vVO2máx)'},
    'fartlek':     {'zona': 'Z3', 'es_calidad': True,  'pct_volumen': (0.08, 0.15),
                    'proposito': 'Cambios de ritmo, fuerza-resistencia, variedad'},
    'hills':       {'zona': 'Z4', 'es_calidad': True,  'pct_volumen': (0.06, 0.12),
                    'proposito': 'Fuerza específica, economía, menor impacto articular'},
    'progressive': {'zona': 'Z3', 'es_calidad': False, 'pct_volumen': (0.12, 0.20),
                    'proposito': 'Resistencia con final controlado, disciplina de ritmo'},
    'strides':     {'zona': 'Z5', 'es_calidad': False, 'pct_volumen': (0.0, 0.05),
                    'proposito': 'Neuromuscular y técnica, sin fatiga (4-8x 15-20s)'},
    'recovery':    {'zona': 'Z1', 'es_calidad': False, 'pct_volumen': (0.10, 0.18),
                    'proposito': 'Recuperación regenerativa, muy suave'},
    'rest':        {'zona': None, 'es_calidad': False, 'pct_volumen': (0.0, 0.0),
                    'proposito': 'Descanso total'},
    'cross':       {'zona': 'Z2', 'es_calidad': False, 'pct_volumen': (0.0, 0.0),
                    'proposito': 'Cross-training de bajo impacto (bici/nado/elíptica)'},
}

QUALITY_TYPES = frozenset(t for t, s in SESSION_TYPES.items() if s['es_calidad'])

# RPE percibido nominal por zona (escala Borg CR10). Es el ancla universal: SIEMPRE
# se prescribe RPE aunque falten ritmo y FC.
RPE_BY_ZONE = {'Z1': 3, 'Z2': 4, 'Z3': 6, 'Z4': 8, 'Z5': 9}


# ─── Zonas de RITMO desde el umbral ───────────────────────────────────────────
#
# El umbral (threshold pace, ≈ pace sostenible ~1 h, LT2) es el ancla. Como en
# ritmo "menos segundos = más rápido", los multiplicadores >1 dan paces MÁS lentos.
# Cada zona = (mult_rápido, mult_lento) × threshold_pace; rápido < lento.

PACE_ZONE_FACTORS = {
    'Z1': (1.29, 1.45),   # recuperación — muy fácil
    'Z2': (1.14, 1.29),   # easy / aeróbico base
    'Z3': (1.06, 1.14),   # maratón / steady
    'Z4': (0.99, 1.06),   # umbral / tempo (≈ threshold)
    'Z5': (0.90, 0.99),   # VO2máx / intervalos
}

# ─── Zonas de FC por Karvonen (% de la FC de reserva = FCmáx − FCreposo) ──────
HR_ZONE_PCT = {
    'Z1': (0.50, 0.60),
    'Z2': (0.60, 0.70),
    'Z3': (0.70, 0.80),
    'Z4': (0.80, 0.90),
    'Z5': (0.90, 1.00),
}


def pace_zones(threshold_pace_s_km: int) -> dict:
    """{zona: (rapido_s_km, lento_s_km)} a partir del ritmo de umbral (s/km)."""
    tp = float(threshold_pace_s_km)
    return {z: (round(tp * r), round(tp * s)) for z, (r, s) in PACE_ZONE_FACTORS.items()}


def hr_zones(fc_max: int, fc_reposo: int) -> dict:
    """{zona: (bpm_lo, bpm_hi)} por Karvonen. Requiere FCmáx > FCreposo."""
    reserva = float(fc_max) - float(fc_reposo)
    return {z: (round(fc_reposo + lo * reserva), round(fc_reposo + hi * reserva))
            for z, (lo, hi) in HR_ZONE_PCT.items()}


def fc_max_tanaka(edad: int) -> int:
    """FCmáx estimada por edad (Tanaka 2001: 208 − 0.7·edad). Más precisa que 220−edad."""
    return round(208 - 0.7 * float(edad))


def derive_zones(*, threshold_pace_s_km=None, fc_max=None, fc_reposo=None,
                 fc_max_es_estimada: bool = True) -> dict:
    """Construye el dict de ZONAS que se guarda en RunnerProfile.zonas.
    pace=None si no hay umbral; hr=None si no hay FCmáx/reposo válidos."""
    z = {'pace': None, 'hr': None, 'metodo_pace': None, 'metodo_hr': None}
    if threshold_pace_s_km:
        z['pace'] = {k: list(v) for k, v in pace_zones(threshold_pace_s_km).items()}
        z['metodo_pace'] = 'pct_umbral'
    if fc_max and fc_reposo and fc_max > fc_reposo:
        z['hr'] = {k: list(v) for k, v in hr_zones(fc_max, fc_reposo).items()}
        z['metodo_hr'] = 'karvonen' + ('_fcmax_estimada' if fc_max_es_estimada else '')
    return z


# ─── Estimación de baseline / umbral ──────────────────────────────────────────

RIEGEL_EXP = 1.06   # exponente de fatiga del modelo de Riegel (válido ~1.5–30 km)


def riegel(t1_s: float, d1_km: float, d2_km: float, exp: float = RIEGEL_EXP) -> float:
    """Predice el tiempo (s) para la distancia d2 a partir de un esfuerzo (t1, d1)."""
    if not d1_km or float(d1_km) <= 0:
        return 0.0
    return float(t1_s) * (float(d2_km) / float(d1_km)) ** exp


def _threshold_from_effort(tiempo_s: float, distancia_km: float,
                           exp: float = RIEGEL_EXP) -> int | None:
    """Ritmo de umbral (s/km) ≈ el ritmo sostenible durante ~1 h, derivado de un
    esfuerzo (tiempo, distancia) con Riegel.

    Se resuelve la distancia d que se cubriría en 3600 s a ese nivel de esfuerzo:
        t1·(d/d1)^exp = 3600  →  d = d1·(3600/t1)^(1/exp)
    y el umbral = 3600 / d. Nota: desde distancias muy cortas (1 km) Riegel tiende
    a SUBESTIMAR (umbral más lento) — conservador a propósito; la confianza lo refleja."""
    if not tiempo_s or not distancia_km or float(tiempo_s) <= 0 or float(distancia_km) <= 0:
        return None
    d_1h = float(distancia_km) * (3600.0 / float(tiempo_s)) ** (1.0 / exp)
    return round(3600.0 / d_1h)


def _vdot_like(threshold_pace_s_km) -> float | None:
    """VO2máx estimado (informativo) desde el ritmo de umbral. ACSM running para el
    VO2 a ritmo de umbral; el umbral ≈ 88% del VO2máx."""
    if not threshold_pace_s_km:
        return None
    v_m_min = 60000.0 / float(threshold_pace_s_km)   # m/min
    vo2_umbral = 0.2 * v_m_min + 3.5                 # ACSM (ml/kg/min)
    return round(vo2_umbral / 0.88, 1)


# Una carrera cuenta para estimar baseline si fue suficientemente larga (evita que
# un sprint de 200 m de un free run casual contamine la estimación).
MIN_RUN_KM_FOR_BASELINE = 2.0


def estimate_threshold_pace(*, declared=None, runs=None, nivel: str = 'intermedio') -> dict:
    """Estima el ritmo de umbral en cascada de confianza.

    declared : (tiempo_s, distancia_km) de una carrera reciente declarada → ALTA.
    runs     : lista de dicts de RunSession completadas, con al menos
               {'best_pace_s_km', 'distance_km'} → MEDIA (≥3) / BAJA (1–2).
    Sin datos → cold-start (threshold_pace_s_km=None).

    Devuelve {threshold_pace_s_km, fuente, confianza, n, vo2_estimado}."""
    # 1) Tiempo declarado — máxima confianza.
    if declared:
        t, d = declared
        if t and d and float(t) > 0 and float(d) > 0:
            tp = _threshold_from_effort(t, d)
            return {'threshold_pace_s_km': tp, 'fuente': 'declarado',
                    'confianza': 'alta', 'n': 0, 'vo2_estimado': _vdot_like(tp)}

    # 2) Historial de free runs — mejor esfuerzo de 1 km demostrado.
    quality = [r for r in (runs or [])
               if (r.get('distance_km') or 0) >= MIN_RUN_KM_FOR_BASELINE
               and (r.get('best_pace_s_km') or 0) > 0]
    if quality:
        best_1km = min(r['best_pace_s_km'] for r in quality)   # menos s/km = más rápido
        tp = _threshold_from_effort(best_1km, 1.0)
        n = len(quality)
        return {'threshold_pace_s_km': tp, 'fuente': 'historial',
                'confianza': 'media' if n >= 3 else 'baja', 'n': n,
                'vo2_estimado': _vdot_like(tp)}

    # 3) Cold-start — sin dato fiable; el motor usará solo RPE.
    return {'threshold_pace_s_km': None, 'fuente': 'cold_start',
            'confianza': 'baja', 'n': 0, 'vo2_estimado': None}


def weekly_volume_baseline(runs_last_28d) -> float | None:
    """Media de km/semana de las últimas 4 semanas (suma de distancias / 4)."""
    total = sum((r.get('distance_km') or 0) for r in (runs_last_28d or []))
    return round(total / 4.0, 1) if total > 0 else None


# ─── Volumen semanal, progresión y polarización ───────────────────────────────
#
# km/semana base para nivel INTERMEDIO por meta; se escala por NIVEL_FACTOR.

VOLUME_BASE_KM = {
    '5k': 25, '10k': 35, '21k': 50, '42k': 65,
    'fitness_general': 30, 'otra': 30,
}

# Multiplicador de volumen por fase de periodización.
PHASE_VOLUME_FACTOR = {
    'base': 1.0, 'build': 1.10, 'peak': 1.0, 'taper': 0.55, 'recovery': 0.60,
}

POLARIZED_SPLIT = (0.80, 0.20)   # 80% fácil (Z1-Z2) / 20% calidad (Z3-Z5)
TEN_PERCENT = 1.10               # tope de incremento semanal de volumen


def apply_ten_percent_rule(prev_km, propuesto_km) -> float:
    """No subir el volumen semanal más de un 10% sobre la semana previa."""
    if prev_km and float(prev_km) > 0:
        return round(min(float(propuesto_km), float(prev_km) * TEN_PERCENT), 1)
    return round(float(propuesto_km), 1)


def polarized_distribution(total_km) -> dict:
    """Reparte el volumen semanal en 80% fácil / 20% calidad."""
    easy = round(float(total_km) * POLARIZED_SPLIT[0], 1)
    return {'easy_km': easy, 'quality_km': round(float(total_km) - easy, 1)}


def weekly_volume_target(*, meta_tipo: str, nivel: str, fase: str,
                         prev_km=None) -> float:
    """km objetivo de la semana: base por meta×nivel×fase, acotado por la regla del
    10% en fases de carga; reducción directa en taper/recovery."""
    base = VOLUME_BASE_KM.get(meta_tipo, 30) * NIVEL_FACTOR.get(nivel, 1.0)
    objetivo = base * PHASE_VOLUME_FACTOR.get(fase, 1.0)
    if fase in ('taper', 'recovery'):
        ref = float(prev_km) if prev_km else base
        return round(ref * PHASE_VOLUME_FACTOR[fase], 1)
    return apply_ten_percent_rule(prev_km, objetivo)


# ─── Reglas duras de seguridad (texto para el prompt + constantes de runtime) ──

RUN_SAFETY_RULES = {
    'no_two_quality_consecutive': 'Nunca dos sesiones de calidad en días consecutivos.',
    'min_easy_days':              'Al menos los días easy indicados entre cada par de calidad.',
    'deload_every_3_4_weeks':     'Semana de recuperación (volumen reducido) cada 3-4 semanas.',
    'cap_ten_percent':            'El volumen semanal no sube más del 10% vs la semana previa.',
    'injury_pain_cap':            'Dolor en zona de carga → degradar a easy o descanso, sin calidad.',
    'long_run_cap':               'El long run no supera ~30-35% del volumen semanal.',
}

# Días easy mínimos entre dos sesiones de calidad, por nivel.
MIN_EASY_DAYS_BY_NIVEL = {'principiante': 2, 'intermedio': 1, 'avanzado': 1}
DELOAD_CADENCE_WEEKS = (3, 4)
LONG_RUN_MAX_PCT = 0.35


# ─── Prescripción determinística de la sesión ─────────────────────────────────
#
# Estructura canónica del bloque principal para los tipos de INTERVALO. Las
# repeticiones se eligen por nivel/fase entre (mín, máx).

INTERVAL_TEMPLATES = {
    'vo2':     {'reps': (4, 6),  'work': {'distancia_km': 1.0}, 'work_zona': 'Z5',
                'rec': {'min': 2, 'tipo': 'trote suave'}},
    'fartlek': {'reps': (6, 8),  'work': {'min': 2},            'work_zona': 'Z3',
                'rec': {'min': 2, 'tipo': 'trote suave'}},
    'hills':   {'reps': (6, 10), 'work': {'seg': 45},           'work_zona': 'Z4',
                'rec': {'tipo': 'bajar trotando'}},
    'strides': {'reps': (4, 8),  'work': {'seg': 20},           'work_zona': 'Z5',
                'rec': {'seg': 60, 'tipo': 'caminar/trote'}},
}

# Duración del bloque continuo de tempo por nivel (min).
TEMPO_MIN_BY_NIVEL = {'principiante': 15, 'intermedio': 22, 'avanzado': 30}

# Ritmo easy nominal por nivel (s/km) — solo para ESTIMAR duraciones en cold-start
# (cuando aún no hay zonas de ritmo).
NOMINAL_EASY_PACE = {'principiante': 420, 'intermedio': 360, 'avanzado': 300}

# Calentamiento / enfriamiento estándar de las sesiones de calidad (min).
WARMUP_MIN = 12
COOLDOWN_MIN = 10


def _pick_reps(rango: tuple, nivel: str, fase: str = None) -> int:
    """Elige nº de repeticiones dentro de (mín, máx) según nivel y fase."""
    lo, hi = rango
    if nivel == 'principiante':
        return lo
    if nivel == 'avanzado' or fase in ('build', 'peak'):
        return hi
    return round((lo + hi) / 2)


def _zone_pace_mid(zona: str, zonas: dict, nivel: str) -> float:
    """Ritmo medio (s/km) de una zona. Usa las zonas reales si existen; si no, deriva
    un nominal por nivel para poder estimar duraciones en cold-start."""
    pace = (zonas or {}).get('pace')
    if pace and zona in pace:
        lo, hi = pace[zona]
        return (lo + hi) / 2.0
    base = NOMINAL_EASY_PACE.get(nivel, 360)   # ≈ Z2
    zf = {z: (PACE_ZONE_FACTORS[z][0] + PACE_ZONE_FACTORS[z][1]) / 2.0 for z in PACE_ZONE_FACTORS}
    return base * (zf.get(zona, zf['Z2']) / zf['Z2'])


def _seg(fase: str, repeticiones: int, trabajo: dict, recuperacion, zona: str,
         zonas: dict, rpe: int) -> dict:
    """Arma un segmento rellenando pace/FC SOLO si la zona existe en las zonas
    del corredor. rpe SIEMPRE presente (ancla universal)."""
    pace = (zonas or {}).get('pace')
    hr = (zonas or {}).get('hr')
    return {
        'fase': fase,
        'repeticiones': repeticiones,
        'trabajo': trabajo,
        'recuperacion': recuperacion,
        'pace_objetivo': (pace.get(zona) if (pace and zona) else None),
        'fc_objetivo': (hr.get(zona) if (hr and zona) else None),
        'rpe': rpe,
    }


def _seg_min_km(seg: dict, zona: str, zonas: dict, nivel: str) -> tuple:
    """Estima (minutos, km) de un segmento para calcular el total de la sesión."""
    pace = _zone_pace_mid(zona, zonas, nivel)   # s/km
    reps = seg.get('repeticiones') or 1
    w = seg.get('trabajo') or {}
    rec = seg.get('recuperacion') or {}
    if 'distancia_km' in w:
        w_min, w_km = w['distancia_km'] * pace / 60.0, w['distancia_km']
    elif 'min' in w:
        w_min, w_km = w['min'], w['min'] * 60.0 / pace
    elif 'seg' in w:
        w_min, w_km = w['seg'] / 60.0, w['seg'] / pace
    else:
        w_min, w_km = 0.0, 0.0
    rec_min = (rec.get('min', 0) or 0) + (rec.get('seg', 0) or 0) / 60.0
    n_rec = max(0, reps - 1) if reps > 1 else 0
    return reps * w_min + n_rec * rec_min, reps * w_km


def prescribe_run_session(*, tipo_sesion: str, zonas: dict, nivel: str,
                          readiness: dict = None, periodizacion: dict = None) -> dict:
    """Prescripción determinística de la ESTRUCTURA de una sesión de carrera.
    Espejo de prescribe_exercise(): el motor fija los números, el LLM solo redacta.

    zonas         = {'pace': {...}|None, 'hr': {...}|None} (RunnerProfile.zonas).
    readiness     = {'rpe_cap': int|None, 'km_factor': float} opcional.
    periodizacion = {'fase', 'km_objetivo_semana', 'is_deload'} opcional.

    Devuelve {tipo_sesion, zona_principal, duracion_min, distancia_km, rpe_target,
              segmentos:[{fase, repeticiones, trabajo, recuperacion, pace_objetivo,
                          fc_objetivo, rpe}]}.
    pace_objetivo es None si no hay zonas de ritmo; fc_objetivo None si no hay FC;
    rpe SIEMPRE presente."""
    spec = SESSION_TYPES.get(tipo_sesion)
    if spec is None:
        raise ValueError(f'tipo_sesion desconocido: {tipo_sesion}')

    periodizacion = periodizacion or {}
    readiness = readiness or {}
    fase = periodizacion.get('fase')
    km_factor = float(readiness.get('km_factor', 1.0) or 1.0)
    km_sem = periodizacion.get('km_objetivo_semana')
    if not km_sem:
        km_sem = VOLUME_BASE_KM.get('fitness_general', 30) * NIVEL_FACTOR.get(nivel, 1.0)
    km_sem *= km_factor

    zona = spec['zona']
    pct_lo, pct_hi = spec['pct_volumen']
    pct_mid = (pct_lo + pct_hi) / 2.0
    segmentos: list[dict] = []

    if tipo_sesion == 'rest':
        return {'tipo_sesion': 'rest', 'zona_principal': None, 'duracion_min': 0,
                'distancia_km': 0.0, 'rpe_target': 0, 'segmentos': []}

    # Acumula el total de la sesión usando la zona REAL de cada segmento.
    tot_min, tot_km = 0.0, 0.0

    def add(fase_seg, reps, trabajo, rec, zona_seg, rpe):
        nonlocal tot_min, tot_km
        seg = _seg(fase_seg, reps, trabajo, rec, zona_seg, zonas, rpe)
        m, k = _seg_min_km(seg, zona_seg, zonas, nivel)
        tot_min += m
        tot_km += k
        segmentos.append(seg)

    if tipo_sesion in INTERVAL_TEMPLATES:
        tmpl = INTERVAL_TEMPLATES[tipo_sesion]
        reps = _pick_reps(tmpl['reps'], nivel, fase)
        wz = tmpl['work_zona']
        if spec['es_calidad']:
            add('calentamiento', 1, {'min': WARMUP_MIN}, None, 'Z2', RPE_BY_ZONE['Z2'])
        else:  # strides: rodaje base easy + series cortas neuromusculares
            add('principal', 1, {'distancia_km': round(km_sem * 0.10, 1)}, None, 'Z2',
                RPE_BY_ZONE['Z2'])
        add('principal', reps, tmpl['work'], tmpl['rec'], wz, RPE_BY_ZONE[wz])
        if spec['es_calidad']:
            add('enfriamiento', 1, {'min': COOLDOWN_MIN}, None, 'Z1', RPE_BY_ZONE['Z1'])

    elif tipo_sesion == 'tempo':
        add('calentamiento', 1, {'min': WARMUP_MIN}, None, 'Z2', RPE_BY_ZONE['Z2'])
        add('principal', 1, {'min': TEMPO_MIN_BY_NIVEL.get(nivel, 22)}, None, 'Z4',
            RPE_BY_ZONE['Z4'])
        add('enfriamiento', 1, {'min': COOLDOWN_MIN}, None, 'Z1', RPE_BY_ZONE['Z1'])

    else:
        # Continuas: easy, long, recovery, progressive, cross.
        main_km = round(max(2.0, km_sem * pct_mid), 1)
        if tipo_sesion == 'long':
            main_km = round(min(main_km, km_sem * LONG_RUN_MAX_PCT), 1)
        add('principal', 1, {'distancia_km': main_km}, None, zona, RPE_BY_ZONE.get(zona, 4))

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
        'distancia_km': round(tot_km, 1),
        'rpe_target': int(rpe_target),
        'segmentos': segmentos,
    }
