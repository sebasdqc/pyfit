"""Ciencia de entrenamiento de resistencia SPORT-AGNOSTIC — compartida entre
motores de deporte (`ai_running` hoy, ciclismo cuando exista).

Lo que vive acá NO cambia entre correr y pedalear: la polarización 80/20, la
regla del 10% de progresión semanal, los multiplicadores de volumen por fase
de periodización, y el algoritmo de espaciado de días de calidad. Lo que SÍ
cambia por deporte (catálogo de sesiones, zonas de intensidad, volumen base
por nivel de meta, en km o en horas) se queda en el motor de cada uno — este
módulo recibe esos números ya resueltos, nunca los conoce por su nombre.

Extraído de `ai_running/training_science_running.py` 2026-08-21 (Fase 1 del
plan running+ciclismo): antes de esta extracción, sumar ciclismo hubiera
significado copiar ~40 líneas de estas reglas sin cambiar una coma.

Módulo PURO: no importa Django ni modelos.

Referencias: Seiler 2010 (distribución de intensidad polarizada);
Nielsen et al. 2012 (incrementos de volumen semanal y riesgo).
"""

POLARIZED_SPLIT = (0.80, 0.20)   # 80% fácil (Z1-Z2) / 20% calidad (Z3-Z5)
TEN_PERCENT = 1.10               # tope de incremento semanal de volumen

# Multiplicador de volumen por fase de periodización. Mismo vocabulario de
# fase para cualquier deporte de resistencia con mesociclo.
PHASE_VOLUME_FACTOR = {
    'base': 1.0, 'build': 1.10, 'peak': 1.0, 'taper': 0.55, 'recovery': 0.60,
}

DELOAD_CADENCE_WEEKS = (3, 4)

# Días easy mínimos entre dos sesiones de calidad, por nivel. Mismo criterio
# para cualquier deporte: un principiante necesita más recuperación entre
# esfuerzos duros que un avanzado.
MIN_EASY_DAYS_BY_NIVEL = {'principiante': 2, 'intermedio': 1, 'avanzado': 1}


def apply_ten_percent_rule(prev, propuesto, cap: float = TEN_PERCENT) -> float:
    """No subir el volumen semanal (en la unidad que sea: km, horas) más de
    `cap` sobre la semana previa — 10% por defecto (Nielsen 2012, específico
    de running: el mecanismo de riesgo es la carga de impacto óseo/tendinoso
    acumulada). Un deporte SIN esa carga de impacto (ciclismo) puede pasar su
    propio `cap` más permisivo — no hay evidencia de que el 10% de running
    aplique igual sin el mecanismo de lesión que lo justifica."""
    if prev and float(prev) > 0:
        return round(min(float(propuesto), float(prev) * cap), 1)
    return round(float(propuesto), 1)


def polarized_distribution(total) -> dict:
    """Reparte el volumen semanal en 80% fácil / 20% calidad."""
    easy = round(float(total) * POLARIZED_SPLIT[0], 1)
    return {'easy_km': easy, 'quality_km': round(float(total) - easy, 1)}


def volume_target(*, base_volume, fase: str, prev_realized=None,
                  cap: float = TEN_PERCENT) -> float:
    """Volumen objetivo de la semana: `base_volume` (ya resuelto por el motor
    del deporte — p. ej. km base × factor de nivel, u horas × factor de
    nivel) × multiplicador de fase; acotado por `cap` en fases de carga
    (10% por defecto — ver `apply_ten_percent_rule` para por qué un deporte
    sin impacto puede pasar uno mayor); reducción directa (sin cap, porque
    bajar no es progresar) en taper/recovery.

    `prev_realized` = lo REALIZADO la semana previa, no lo planificado —
    quien llama decide esa distinción (ver `_realized_km_last_week` en
    `ai_running`); acá solo se aplica la fórmula."""
    objetivo = float(base_volume) * PHASE_VOLUME_FACTOR.get(fase, 1.0)
    if fase in ('taper', 'recovery'):
        ref = float(prev_realized) if prev_realized else float(base_volume)
        return round(ref * PHASE_VOLUME_FACTOR[fase], 1)
    return apply_ten_percent_rule(prev_realized, objetivo, cap=cap)


def karvonen_zones(fc_max, fc_reposo, pct_table: dict) -> dict:
    """{zona: (bpm_lo, bpm_hi)} por Karvonen (% de la FC de reserva = FCmáx −
    FCreposo). Requiere FCmáx > FCreposo.

    `pct_table` = {zona: (pct_lo, pct_hi)} — cada deporte define su propia
    tabla de zonas (running: 5 zonas por ritmo; ciclismo: 7 por potencia,
    modelo Coggan); la fórmula de reserva cardíaca es la misma para
    cualquiera — es fisiología, no depende de correr ni pedalear.

    Referencia: Karvonen, Kentala & Mustala 1957.
    """
    reserva = float(fc_max) - float(fc_reposo)
    return {z: (round(fc_reposo + lo * reserva), round(fc_reposo + hi * reserva))
            for z, (lo, hi) in pct_table.items()}


def fc_max_tanaka(edad: int) -> int:
    """FCmáx estimada por edad (Tanaka, Monahan & Seals 2001: 208 − 0.7·edad).
    Más precisa que la vieja 220−edad. Válida para cualquier deporte."""
    return round(208 - 0.7 * float(edad))


def pick_reps(rango: tuple, nivel: str, fase: str = None) -> int:
    """Elige nº de repeticiones dentro de (mín, máx) según nivel y fase de
    periodización. Mismo criterio para cualquier deporte con sesiones de
    intervalos: principiante = mínimo, avanzado (o fases de carga build/peak)
    = máximo, el resto = punto medio."""
    lo, hi = rango
    if nivel == 'principiante':
        return lo
    if nivel == 'avanzado' or fase in ('build', 'peak'):
        return hi
    return round((lo + hi) / 2)


def pick_quality_days(days: list, anchor_day: int, n: int, min_gap: int = 2) -> set:
    """Elige `n` días de calidad maximizando la separación al día ancla (el
    día duro fijo del microciclo — el long run en running) y entre sí,
    respetando un mínimo de `min_gap` días entre días duros ('no dos
    calidades consecutivas'). Si ningún día respeta el mínimo, coloca MENOS
    calidades (las restantes quedan como fácil) en vez de forzar adyacencia.
    """
    pool = [d for d in days if d != anchor_day]
    chosen: list[int] = []
    hard = [anchor_day]
    for _ in range(n):
        best, best_gap = None, -1
        for d in pool:
            if d in chosen:
                continue
            gap = min(abs(d - h) for h in hard)
            if gap > best_gap:
                best_gap, best = gap, d
        if best is None or best_gap < min_gap:
            break
        chosen.append(best)
        hard.append(best)
    return set(chosen)
