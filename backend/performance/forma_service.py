"""Agregación de FORMA (fitness-fatiga / TSB) por atleta (módulo Carga interna).

Se alimenta del mismo `PerformanceMetric` (tipo='carga') que ya recolecta el
sRPE para el ACWR — no hay una segunda vía de captura de datos. Mismo shape
honesto que `carga_service.athlete_carga`: primero `dias_con_datos`/`suficiente`,
y solo con historial suficiente se calcula la tendencia.
"""

from .calculators import get_calculator
from .calculators import constants as C
from .timeseries import serie_diaria

MIN_DIAS_FORMA = C.FORMA_VENTANA_FATIGA  # 7

ZONAS = ('Fresco', 'Neutro / transición', 'Fatigado')


def athlete_forma(loads, today):
    """Resumen de forma (fitness-fatiga) de un atleta a la fecha `today`.

    `loads` = lista de (fecha, carga). Devuelve None si no hay registros. Si
    hay menos de `MIN_DIAS_FORMA` días desde el primer registro, `suficiente`
    queda en False y no se calcula TSB todavía; con suficiente historial
    delega en la calculadora `forma`."""
    loads = list(loads)
    if not loads:
        return None

    dias_distintos = len({f for f, _ in loads})
    primero = min(f for f, _ in loads)
    span = (today - primero).days + 1

    out = {
        'dias_con_datos': dias_distintos,
        'suficiente': span >= MIN_DIAS_FORMA,
    }
    if span < MIN_DIAS_FORMA:
        out.update({
            'zona': 'Acumulando datos',
            'tsb': None, 'fitness_ua': None, 'fatiga_ua': None,
            'fitness_serie': [], 'fatiga_serie': [], 'tsb_serie': [],
        })
        return out

    ventana = min(C.FORMA_VENTANA_FITNESS, span)
    serie = serie_diaria(loads, today, ventana)
    forma = get_calculator('forma').run({'cargas_diarias': serie})
    out.update(forma)
    return out


def team_forma_rollup(filas):
    """Conteo por zona a partir de una lista de resultados de `athlete_forma`
    (uno por atleta). Extraído de la vista para que sea testeable aparte."""
    conteos = {z: 0 for z in ZONAS}
    for f in filas:
        zona = (f or {}).get('zona')
        if zona in conteos:
            conteos[zona] += 1
    return conteos
