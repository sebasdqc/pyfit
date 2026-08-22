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


def apply_ten_percent_rule(prev, propuesto) -> float:
    """No subir el volumen semanal (en la unidad que sea: km, horas) más de
    un 10% sobre la semana previa."""
    if prev and float(prev) > 0:
        return round(min(float(propuesto), float(prev) * TEN_PERCENT), 1)
    return round(float(propuesto), 1)


def polarized_distribution(total) -> dict:
    """Reparte el volumen semanal en 80% fácil / 20% calidad."""
    easy = round(float(total) * POLARIZED_SPLIT[0], 1)
    return {'easy_km': easy, 'quality_km': round(float(total) - easy, 1)}


def volume_target(*, base_volume, fase: str, prev_realized=None) -> float:
    """Volumen objetivo de la semana: `base_volume` (ya resuelto por el motor
    del deporte — p. ej. km base × factor de nivel, u horas × factor de
    nivel) × multiplicador de fase; acotado por la regla del 10% en fases de
    carga; reducción directa (sin cap, porque bajar no es progresar) en
    taper/recovery.

    `prev_realized` = lo REALIZADO la semana previa, no lo planificado —
    quien llama decide esa distinción (ver `_realized_km_last_week` en
    `ai_running`); acá solo se aplica la fórmula."""
    objetivo = float(base_volume) * PHASE_VOLUME_FACTOR.get(fase, 1.0)
    if fase in ('taper', 'recovery'):
        ref = float(prev_realized) if prev_realized else float(base_volume)
        return round(ref * PHASE_VOLUME_FACTOR[fase], 1)
    return apply_ten_percent_rule(prev_realized, objetivo)


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
