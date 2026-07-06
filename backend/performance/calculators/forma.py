"""Familia CARGA — FORMA (fitness-fatiga, estilo Banister/TSB).

Sobre la misma serie diaria de carga (UA) que ya reconstruye `carga_service`
para el ACWR, se calculan dos EWMA con distinta ventana: "fitness" (crónica,
42 días, cambia lento) y "fatiga" (aguda, 7 días, cambia rápido). TSB (Training
Stress Balance) = fitness − fatiga.

IMPORTANTE (mismo encuadre honesto que ACWR): esto es una TENDENCIA de gestión
de carga (zona fresco/neutro/fatigado + serie diaria), nunca "el día exacto"
en que un atleta o plantel alcanzará su pico — y mucho menos para equilibrio
psicológico, para el que no existe un modelo validado equivalente.
"""

from . import constants as C
from .base import FAMILIA_CARGA, CalculatorError, TestCalculator, ewma_series, register, round2


@register
class FormaCalculator(TestCalculator):
    slug = 'forma'
    familia = FAMILIA_CARGA
    nombre = 'Forma (fitness-fatiga / TSB)'
    descripcion = (
        'Tendencia de fitness/fatiga a partir de las cargas diarias (sRPE en UA): '
        'EWMA larga (fitness, 42 d) menos EWMA corta (fatiga, 7 d) = TSB. '
        'Indicador de tendencia, no una fecha exacta de pico de forma.'
    )
    input_schema = [
        {'name': 'cargas_diarias', 'label': 'Cargas diarias (UA · más antigua → más reciente)', 'type': 'list', 'unit': 'UA', 'required': True, 'min': 0},
    ]

    def validate(self, raw):
        clean = super().validate(raw)
        if len(clean['cargas_diarias']) < C.FORMA_VENTANA_FATIGA:
            raise CalculatorError({
                'cargas_diarias': f'Se requieren al menos {C.FORMA_VENTANA_FATIGA} días para estimar la fatiga aguda.',
            })
        return clean

    def _zona(self, tsb):
        if tsb > C.FORMA_TSB_FRESCO:
            return 'Fresco'
        if tsb >= C.FORMA_TSB_NEUTRO_MIN:
            return 'Neutro / transición'
        return 'Fatigado'

    def compute(self, clean):
        cargas = clean['cargas_diarias']
        n = len(cargas)

        fatiga_serie = ewma_series(cargas, C.FORMA_VENTANA_FATIGA)
        ventana_fit = min(C.FORMA_VENTANA_FITNESS, n)
        fitness_serie = ewma_series(cargas[-ventana_fit:], ventana_fit)
        # Alinea ambas series al mismo tramo final (fitness_serie puede ser más
        # corta si aún no hay 42 días de historial).
        fatiga_alineada = fatiga_serie[-len(fitness_serie):]
        tsb_serie = [f - a for f, a in zip(fitness_serie, fatiga_alineada)]

        out = {
            'n_dias': n,
            'fitness_serie': [round2(x) for x in fitness_serie],
            'fatiga_serie': [round2(x) for x in fatiga_alineada],
            'tsb_serie': [round2(x) for x in tsb_serie],
            'fitness_ua': round2(fitness_serie[-1]),
            'fatiga_ua': round2(fatiga_alineada[-1]),
            'tsb': round2(tsb_serie[-1]),
            'zona': self._zona(tsb_serie[-1]),
        }
        if n < C.FORMA_VENTANA_FITNESS:
            out['nota'] = (
                f'Ventana de fitness parcial: {n} de {C.FORMA_VENTANA_FITNESS} días. '
                'El componente de fitness se estabiliza con ~6 semanas de historial.'
            )
        return out
