"""Familia 4 — CARGA INTERNA (monitoreo sin hardware).

El núcleo del monitoreo de carga según el método de Foster (session-RPE): a partir
del RPE y la duración se derivan sRPE, carga semanal, monotonía, strain y el ACWR
(relación carga aguda 7 d ÷ crónica 28 d) en sus dos modelos, RA y EWMA. Todo el
cálculo vive en el servidor; las fórmulas y umbrales están en constants.py.

IMPORTANTE (encuadre honesto): el ACWR es un indicador CONTEXTUAL de gestión de
carga, no un predictor causal de lesión. Monotonía/strain son señales de apoyo a
la decisión, no cortes diagnósticos.
"""

import statistics

from . import constants as C
from .base import FAMILIA_CARGA, CalculatorError, TestCalculator, register, round2


@register
class SRPECalculator(TestCalculator):
    slug = 'srpe'
    familia = FAMILIA_CARGA
    nombre = 'sRPE (carga de una sesión)'
    descripcion = 'Carga interna de una sesión = RPE (CR-10 de Borg, 0–10) × duración (min). Unidad: UA.'
    input_schema = [
        {'name': 'rpe', 'label': 'RPE percibido', 'type': 'number', 'unit': '0–10', 'required': True, 'min': 0, 'max': 10},
        {'name': 'duracion_min', 'label': 'Duración de la sesión', 'type': 'number', 'unit': 'min', 'required': True, 'min': 0},
    ]

    def compute(self, clean):
        carga = clean['rpe'] * clean['duracion_min']
        return {'carga_ua': round2(carga)}


@register
class CargaSemanalCalculator(TestCalculator):
    slug = 'carga-semanal'
    familia = FAMILIA_CARGA
    nombre = 'Carga semanal · monotonía y strain (Foster)'
    descripcion = (
        'A partir de las cargas diarias (sRPE en UA) de la semana: carga total, media, '
        'monotonía (variabilidad) y strain. Monotonía > 2.0 = bandera de riesgo.'
    )
    input_schema = [
        {'name': 'cargas_diarias', 'label': 'Cargas diarias de la semana (UA)', 'type': 'list', 'unit': 'UA', 'required': True, 'min': 0},
    ]

    def compute(self, clean):
        cargas = clean['cargas_diarias']
        total = sum(cargas)
        media = total / len(cargas)
        # SD poblacional de la carga diaria (Foster). Con un solo día no hay variación.
        sd = statistics.pstdev(cargas) if len(cargas) > 1 else 0.0
        out = {
            'n_dias': len(cargas),
            'carga_semanal_ua': round2(total),
            'carga_media_diaria_ua': round2(media),
            'desviacion_ua': round2(sd),
        }
        if sd > 0:
            monotonia = media / sd
            strain = total * monotonia
            out['monotonia'] = round2(monotonia)
            out['strain_ua'] = round2(strain)
            out['monotonia_alerta'] = monotonia > C.MONOTONIA_ALERTA
        else:
            # SD = 0 (cargas idénticas) → monotonía no definida (división por cero).
            out['monotonia'] = None
            out['strain_ua'] = None
            out['monotonia_alerta'] = False
            out['nota'] = 'Carga idéntica todos los días (SD = 0): la monotonía no está definida.'
        return out


@register
class TRIMPEdwardsCalculator(TestCalculator):
    slug = 'trimp-edwards'
    familia = FAMILIA_CARGA
    nombre = 'TRIMP de Edwards · perfil de intensidad (FC)'
    descripcion = (
        'Carga por zonas de FC (Z1–Z5 por %FCmáx) y % de tiempo por encima del 80 % y 90 % FCmáx. '
        'En futsal el tiempo a alta intensidad es la métrica clave. Requiere monitor de FC.'
    )
    input_schema = [
        {'name': 'z1_min', 'label': 'Z1 (50–60 % FCmáx)', 'type': 'number', 'unit': 'min', 'required': False, 'min': 0},
        {'name': 'z2_min', 'label': 'Z2 (60–70 % FCmáx)', 'type': 'number', 'unit': 'min', 'required': False, 'min': 0},
        {'name': 'z3_min', 'label': 'Z3 (70–80 % FCmáx)', 'type': 'number', 'unit': 'min', 'required': False, 'min': 0},
        {'name': 'z4_min', 'label': 'Z4 (80–90 % FCmáx)', 'type': 'number', 'unit': 'min', 'required': False, 'min': 0},
        {'name': 'z5_min', 'label': 'Z5 (90–100 % FCmáx)', 'type': 'number', 'unit': 'min', 'required': False, 'min': 0},
    ]

    _ZONAS = ('z1_min', 'z2_min', 'z3_min', 'z4_min', 'z5_min')

    def validate(self, raw):
        clean = super().validate(raw)
        if not any(z in clean for z in self._ZONAS):
            raise CalculatorError({'__all__': 'Indica el tiempo en al menos una zona de FC.'})
        return clean

    def compute(self, clean):
        minutos = [clean.get(z, 0.0) for z in self._ZONAS]
        total = sum(minutos)
        trimp = sum(m * f for m, f in zip(minutos, C.EDWARDS_FACTORES))
        out = {
            'trimp_ua': round2(trimp),
            'tiempo_total_min': round2(total),
        }
        if total > 0:
            # Z5 = >90 % FCmáx ; Z4+Z5 = >80 % FCmáx (banda de alta intensidad).
            out['pct_sobre_90_fcmax'] = round2(minutos[4] / total * 100)
            out['pct_sobre_80_fcmax'] = round2((minutos[3] + minutos[4]) / total * 100)
        return out


def _ewma(serie, ventana):
    """Media móvil exponencial de la serie (más antiguo→más reciente). λ = 2/(N+1).
    Se siembra con el primer valor; devuelve el EWMA del último día."""
    lam = 2.0 / (ventana + 1)
    ewma = serie[0]
    for x in serie[1:]:
        ewma = x * lam + (1 - lam) * ewma
    return ewma


@register
class ACWRCalculator(TestCalculator):
    slug = 'acwr'
    familia = FAMILIA_CARGA
    nombre = 'ACWR (carga aguda : crónica)'
    descripcion = (
        'Relación carga aguda (7 d) ÷ crónica (28 d) en modelos RA y EWMA, con zona de '
        'gestión (sweet spot 0.8–1.3 · peligro > 1.5). Introduce las cargas diarias, de la más antigua a la más reciente.'
    )
    input_schema = [
        {'name': 'cargas_diarias', 'label': 'Cargas diarias (UA · más antigua → más reciente)', 'type': 'list', 'unit': 'UA', 'required': True, 'min': 0},
    ]

    def validate(self, raw):
        clean = super().validate(raw)
        if len(clean['cargas_diarias']) < C.ACWR_VENTANA_AGUDA:
            raise CalculatorError({
                'cargas_diarias': f'Se requieren al menos {C.ACWR_VENTANA_AGUDA} días para calcular la carga aguda.',
            })
        return clean

    def _zona(self, acwr):
        if acwr < C.ACWR_INFRACARGA:
            return 'Infracarga'
        if acwr <= C.ACWR_OPTIMA_MAX:
            return 'Óptima (sweet spot)'
        if acwr <= C.ACWR_PRECAUCION_MAX:
            return 'Precaución'
        if acwr <= C.ACWR_RIESGO_ALTO:
            return 'Zona de peligro'
        return 'Riesgo alto'

    def compute(self, clean):
        cargas = clean['cargas_diarias']
        n = len(cargas)
        aguda_serie = cargas[-C.ACWR_VENTANA_AGUDA:]
        cronica_serie = cargas[-C.ACWR_VENTANA_CRONICA:]

        # Modelo media móvil (RA): media simple de cada ventana.
        aguda_ra = sum(aguda_serie) / len(aguda_serie)
        cronica_ra = sum(cronica_serie) / len(cronica_serie)

        # Modelo EWMA (más sensible al riesgo): decaimiento exponencial.
        aguda_ewma = _ewma(cargas, C.ACWR_VENTANA_AGUDA)
        cronica_ewma = _ewma(cargas, C.ACWR_VENTANA_CRONICA)

        out = {
            'n_dias': n,
            'carga_aguda_ua': round2(aguda_ra),
            'carga_cronica_ua': round2(cronica_ra),
        }
        if cronica_ra > 0 and cronica_ewma > 0:
            acwr_ra = aguda_ra / cronica_ra
            acwr_ewma = aguda_ewma / cronica_ewma
            out['acwr_ra'] = round2(acwr_ra)
            out['acwr_ewma'] = round2(acwr_ewma)
            # El EWMA es la lectura recomendada (más sensible) → manda en la zona.
            out['zona'] = self._zona(acwr_ewma)
            out['riesgo_alerta'] = acwr_ewma > C.ACWR_PRECAUCION_MAX
        else:
            out['acwr_ra'] = None
            out['acwr_ewma'] = None
            out['zona'] = 'Sin carga crónica'
            out['riesgo_alerta'] = False
        if n < C.ACWR_VENTANA_CRONICA:
            out['nota'] = f'Ventana crónica parcial: {n} de {C.ACWR_VENTANA_CRONICA} días. El ACWR se estabiliza con 28 días.'
        return out
