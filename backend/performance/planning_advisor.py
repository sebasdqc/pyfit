"""Motor asesor de planificación (módulo Planificación) — SOLO LECTURA.

Compara lo planeado (`Microcycle.tipo`/`carga_relativa`, `Mesocycle.carga_objetivo`)
contra la carga y el bienestar REALES del plantel durante la semana del
microciclo, y devuelve sugerencias con justificación. Reusa los umbrales que
YA existen en `calculators/constants.py` y `wellness.py` — no introduce
números mágicos nuevos.

`suggest_for_microciclo` NUNCA escribe en la base de datos. El botón "Aplicar"
del frontend reusa el mismo PATCH manual que ya existe para editar
mesociclo/microciclo — no hay un segundo camino de escritura que auditar, así
se cumple "nunca reescribe el plan solo" de la forma más fuerte posible.
"""

from collections import defaultdict
from datetime import timedelta

from . import wellness
from .calculators import constants as C
from .carga_service import athlete_carga
from .models import Microcycle, PerformanceMetric, WellnessCheckin
from .roster_service import team_athlete_ids

# % del plantel (con datos suficientes) en alerta para que se dispare una sugerencia.
UMBRAL_PCT_ROSTER = 30.0


def _rango_semana(micro):
    """(desde, hasta) de la semana del microciclo, o None si no tiene fecha."""
    if not micro.fecha_inicio:
        return None
    return micro.fecha_inicio, micro.fecha_inicio + timedelta(days=6)


def _team_load_rollup(center, athlete_ids, hasta):
    """% del plantel (con ≥7 días de historial) en zona de riesgo ACWR o con
    monotonía en alerta, a la fecha `hasta` (último día de la semana evaluada)."""
    if not athlete_ids:
        return {'n_con_datos': 0, 'pct_riesgo_acwr': 0.0, 'pct_monotonia_alerta': 0.0}

    qs = PerformanceMetric.objects.filter(
        center=center, tipo='carga', athlete_id__in=athlete_ids, fecha__lte=hasta,
    ).only('athlete_id', 'fecha', 'valor')
    por_atleta = defaultdict(list)
    for r in qs:
        por_atleta[r.athlete_id].append((r.fecha, float(r.valor)))

    n = riesgo = monotonia = 0
    for loads in por_atleta.values():
        m = athlete_carga(loads, hasta)
        if not m or not m.get('suficiente'):
            continue
        n += 1
        riesgo += bool(m.get('riesgo_alerta'))
        monotonia += bool(m.get('monotonia_alerta'))

    if not n:
        return {'n_con_datos': 0, 'pct_riesgo_acwr': 0.0, 'pct_monotonia_alerta': 0.0}
    return {
        'n_con_datos': n,
        'pct_riesgo_acwr': round(riesgo / n * 100, 1),
        'pct_monotonia_alerta': round(monotonia / n * 100, 1),
    }


def _team_wellness_rollup(center, athlete_ids, desde, hasta):
    """Promedio simple del índice de bienestar de todos los check-ins de la
    semana (no promedio-por-atleta-luego-equipo): heurística de asesor, no una
    medida clínica — un atleta que hace más check-ins pesa un poco más."""
    if not athlete_ids:
        return {'n_con_datos': 0, 'indice_promedio': None}
    indices = list(
        WellnessCheckin.objects
        .filter(center=center, athlete_id__in=athlete_ids, fecha__gte=desde, fecha__lte=hasta)
        .values_list('indice_bienestar', flat=True)
    )
    if not indices:
        return {'n_con_datos': 0, 'indice_promedio': None}
    return {'n_con_datos': len(indices), 'indice_promedio': round(sum(indices) / len(indices), 1)}


def suggest_for_microciclo(micro: Microcycle) -> dict:
    """Sugerencias de solo lectura para UN microciclo.

    Devuelve `{'disponible': False, 'motivo': ...}` si falta `fecha_inicio` o
    no hay datos reales en el rango; si no, `{'disponible': True, 'rango':
    [...], 'real': {...}, 'sugerencias': [...]}`.
    """
    rango = _rango_semana(micro)
    if not rango:
        return {'disponible': False, 'motivo': 'Este microciclo no tiene fecha de inicio.'}
    desde, hasta = rango

    meso = micro.mesociclo
    plan = meso.plan
    center = plan.center
    athlete_ids = team_athlete_ids(center, plan.grupo)

    carga = _team_load_rollup(center, athlete_ids, hasta)
    bienestar = _team_wellness_rollup(center, athlete_ids, desde, hasta)

    if not carga['n_con_datos'] and not bienestar['n_con_datos']:
        return {
            'disponible': False,
            'motivo': 'Sin datos reales de carga o bienestar del plantel en el rango de esta semana.',
        }

    sugerencias = []

    # Regla 1: ACWR en zona de riesgo en buena parte del plantel + semana
    # planeada como carga/choque → sugerir bajarla a recuperación.
    if (
        carga['n_con_datos'] and carga['pct_riesgo_acwr'] >= UMBRAL_PCT_ROSTER
        and micro.tipo in (Microcycle.TIPO_CARGA, Microcycle.TIPO_CHOQUE)
    ):
        sugerencias.append({
            'nivel': 'microciclo', 'campo': 'tipo',
            'valor_actual': micro.tipo, 'valor_sugerido': Microcycle.TIPO_RECUPERACION,
            'motivo': (
                f"{carga['pct_riesgo_acwr']:.0f}% del plantel con datos suficientes tiene ACWR en "
                f"zona de precaución/riesgo (> {C.ACWR_PRECAUCION_MAX}) y la semana está planeada "
                f"como '{micro.get_tipo_display()}'."
            ),
        })

    # Regla 2: monotonía en alerta en buena parte del plantel + carga relativa
    # alta → sugerir bajarla (piso 40, para no proponer una semana en cero).
    if (
        carga['n_con_datos'] and carga['pct_monotonia_alerta'] >= UMBRAL_PCT_ROSTER
        and micro.carga_relativa > 60
    ):
        sugerido = max(40, micro.carga_relativa - 20)
        sugerencias.append({
            'nivel': 'microciclo', 'campo': 'carga_relativa',
            'valor_actual': micro.carga_relativa, 'valor_sugerido': sugerido,
            'motivo': (
                f"{carga['pct_monotonia_alerta']:.0f}% del plantel con datos suficientes supera la "
                f"monotonía de alerta (> {C.MONOTONIA_ALERTA}); la carga relativa planeada es alta."
            ),
        })

    # Regla 3: bienestar promedio bajo + fase planeada en carga alta/pico →
    # sugerir bajar el objetivo a nivel de FASE (no de semana individual).
    if (
        bienestar['indice_promedio'] is not None
        and bienestar['indice_promedio'] < wellness.UMBRAL_DUDA
        and meso.carga_objetivo in ('alta', 'pico')
    ):
        sugerencias.append({
            'nivel': 'mesociclo', 'campo': 'carga_objetivo',
            'valor_actual': meso.carga_objetivo, 'valor_sugerido': 'media',
            'motivo': (
                f"Bienestar promedio del plantel de {bienestar['indice_promedio']:.0f}/100 "
                f"(< {wellness.UMBRAL_DUDA}) mientras la fase está planeada como carga "
                f"'{meso.carga_objetivo}'."
            ),
        })

    return {
        'disponible': True,
        'rango': [desde.isoformat(), hasta.isoformat()],
        'real': {'carga': carga, 'bienestar': bienestar},
        'sugerencias': sugerencias,
    }
