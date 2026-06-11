"""Agregación de CARGA INTERNA por atleta (módulo Carga del panel).

El sRPE diario se PERSISTE reutilizando `PerformanceMetric` (tipo='carga') — no hay
modelo nuevo ni migración. Este servicio reconstruye la serie diaria continua (suma
las sesiones del mismo día, rellena con 0 los días sin entreno dentro de la ventana)
y delega el cálculo de ACWR / monotonía / strain a las calculadoras ya validadas de
`performance.calculators.carga` (única fuente de las fórmulas).

Encuadre honesto: el ACWR es un indicador CONTEXTUAL de gestión de carga, no un
predictor causal de lesión. Sólo se calcula con ≥ 7 días de registro.
"""

from collections import defaultdict
from datetime import timedelta

from .calculators import get_calculator
from .calculators import constants as C

# Mínimo de días de historial (desde el primer registro) para un ACWR con sentido.
MIN_DIAS_ACWR = C.ACWR_VENTANA_AGUDA  # 7


def _serie_diaria(loads, end_date, dias):
    """Serie de carga diaria (UA) de `dias` días terminando en end_date.

    `loads` = iterable de (fecha:date, carga:float). Suma las del mismo día y
    rellena con 0 los días sin registro (días de descanso = 0 de carga)."""
    por_dia = defaultdict(float)
    for f, v in loads:
        por_dia[f] += float(v)
    inicio = end_date - timedelta(days=dias - 1)
    serie, d = [], inicio
    while d <= end_date:
        serie.append(round(por_dia.get(d, 0.0), 2))
        d += timedelta(days=1)
    return serie


def athlete_carga(loads, today):
    """Resumen de carga interna de un atleta a la fecha `today`.

    `loads` = lista de (fecha, carga). Devuelve None si no hay registros. Si hay
    menos de 7 días desde el primer registro, devuelve la serie pero sin ACWR
    (`suficiente=False`); con ≥ 7 días delega en las calculadoras acwr y
    carga-semanal."""
    loads = list(loads)
    if not loads:
        return None

    dias_distintos = len({f for f, _ in loads})
    primero = min(f for f, _ in loads)
    span = (today - primero).days + 1

    out = {
        'dias_con_datos': dias_distintos,
        'suficiente': span >= MIN_DIAS_ACWR,
    }

    if span < MIN_DIAS_ACWR:
        out['carga_serie'] = _serie_diaria(loads, today, max(span, 1))
        out['carga_semanal_ua'] = round(float(sum(float(v) for _, v in loads)), 2)
        out['acwr_ewma'] = None
        out['acwr_ra'] = None
        out['zona'] = 'Acumulando datos'
        out['monotonia'] = None
        out['strain_ua'] = None
        out['riesgo_alerta'] = False
        return out

    cronica_dias = min(C.ACWR_VENTANA_CRONICA, span)
    serie = _serie_diaria(loads, today, cronica_dias)
    acwr = get_calculator('acwr').run({'cargas_diarias': serie})
    semanal = get_calculator('carga-semanal').run({'cargas_diarias': serie[-7:]})

    out.update({
        'carga_serie': serie,
        'carga_aguda_ua': acwr['carga_aguda_ua'],
        'carga_cronica_ua': acwr['carga_cronica_ua'],
        'acwr_ra': acwr['acwr_ra'],
        'acwr_ewma': acwr['acwr_ewma'],
        'zona': acwr['zona'],
        'riesgo_alerta': acwr['riesgo_alerta'],
        'carga_semanal_ua': semanal['carga_semanal_ua'],
        'monotonia': semanal['monotonia'],
        'strain_ua': semanal['strain_ua'],
        'monotonia_alerta': semanal['monotonia_alerta'],
    })
    return out
