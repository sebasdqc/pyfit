"""Reconstrucción de series diarias de carga, compartida entre `carga_service.py`
(ACWR/monotonía/strain) y `forma_service.py` (fitness/fatiga/TSB) — ambos parten
del mismo dato crudo (`PerformanceMetric` tipo='carga') y necesitan la misma
serie continua día a día, solo cambia qué calculadora se le aplica después."""

from collections import defaultdict
from datetime import timedelta


def serie_diaria(loads, end_date, dias):
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
