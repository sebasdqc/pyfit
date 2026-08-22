"""Resolución de fase de periodización — SPORT-AGNOSTIC.

Misma lógica para cualquier deporte de resistencia con mesociclo: taper si
hay una competencia cerca o si falta poco para `meta_fecha`; si no, fase por
tercios del plan (base → build); en modo continuo (sin fecha — "fitness
general"), ciclo perpetuo de 4 semanas (base → base → build → recovery).

Extraído de `RunningAdaptiveEngineService.resolve_phase()` 2026-08-21 (Fase 1
del plan running+ciclismo) — no depende de RunningPlan ni de ningún modelo:
recibe los escalares ya resueltos por quien llama.

Módulo PURO: no importa Django ni modelos.
"""
import math

TAPER_WEEKS_UMBRAL = 1
PEAK_WEEKS_UMBRAL = 3
CICLO_CONTINUO_SEMANAS = 4


def resolve_phase(*, ref_date, has_competition_soon: bool, meta_fecha, started_at,
                  semana_actual: int) -> str:
    """`has_competition_soon` = ya resuelto por quien llama (p. ej. hay una
    Competition en los próximos 14 días) — este módulo no sabe qué es una
    Competition, solo reacciona al booleano.

    `meta_fecha` = fecha objetivo del plan (None = modo continuo, sin fecha).
    """
    if has_competition_soon:
        return 'taper'
    if meta_fecha:
        weeks_to = max(0, math.ceil((meta_fecha - ref_date).days / 7))
        if weeks_to <= TAPER_WEEKS_UMBRAL:
            return 'taper'
        if weeks_to <= PEAK_WEEKS_UMBRAL:
            return 'peak'
        total = max(1, math.ceil((meta_fecha - started_at).days / 7))
        elapsed = total - weeks_to
        return 'base' if elapsed <= total / 3 else 'build'
    pos = ((semana_actual or 1) - 1) % CICLO_CONTINUO_SEMANAS
    if pos == 3:
        return 'recovery'
    if pos == 2:
        return 'build'
    return 'base'
