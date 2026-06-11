"""Familia 5 — PREVENCIÓN DE LESIONES Y RETURN-TO-PLAY (sin hardware o mínimo).

Herramientas del núcleo de prevención que el documento prioriza junto al ACWR
(que vive en la familia de carga): asimetría de fuerza excéntrica de isquiotibiales
(Nordic / NordBord), Limb Symmetry Index para criterios de RTP y control de
deshidratación por cambio de masa. El cálculo y los umbrales viven en el servidor.

Cautelas (documentadas en cada test): el LSI ≥ 90 % puede SOBREESTIMAR la
recuperación; la asimetría es más informativa que un score aislado.
"""

from . import constants as C
from .base import FAMILIA_PREVENCION, CalculatorError, TestCalculator, register, round2


@register
class NordicCalculator(TestCalculator):
    slug = 'nordic-asimetria'
    familia = FAMILIA_PREVENCION
    nombre = 'Nordic Hamstring — fuerza y asimetría'
    descripcion = (
        'Fuerza excéntrica de isquiotibiales por pierna (NordBord y similares): media y '
        'asimetría entre piernas. Asimetría > 10 % = bandera de riesgo.'
    )
    input_schema = [
        {'name': 'fuerza_izquierda_n', 'label': 'Fuerza pierna izquierda', 'type': 'number', 'unit': 'N', 'required': True, 'min': 0},
        {'name': 'fuerza_derecha_n', 'label': 'Fuerza pierna derecha', 'type': 'number', 'unit': 'N', 'required': True, 'min': 0},
    ]

    def compute(self, clean):
        izq, der = clean['fuerza_izquierda_n'], clean['fuerza_derecha_n']
        mayor = max(izq, der)
        if mayor <= 0:
            raise CalculatorError({'__all__': 'Al menos una pierna debe registrar fuerza > 0.'})
        asimetria = abs(izq - der) / mayor * 100
        return {
            'fuerza_media_n': round2((izq + der) / 2),
            'pierna_debil': 'izquierda' if izq < der else 'derecha' if der < izq else 'simétrica',
            'asimetria_pct': round2(asimetria),
            'asimetria_alerta': asimetria > C.ASIMETRIA_NORDIC_UMBRAL_PCT,
        }


@register
class LSICalculator(TestCalculator):
    slug = 'lsi'
    familia = FAMILIA_PREVENCION
    nombre = 'Limb Symmetry Index (LSI)'
    descripcion = (
        'Simetría entre la pierna lesionada y la sana (hop tests o fuerza). Criterio RTP: '
        '≥ 90 %. Cautela: puede sobreestimar la recuperación (compara con valores pre-lesión).'
    )
    input_schema = [
        {'name': 'lado_lesionado', 'label': 'Rendimiento pierna lesionada/operada', 'type': 'number', 'unit': '', 'required': True, 'min': 0},
        {'name': 'lado_sano', 'label': 'Rendimiento pierna sana', 'type': 'number', 'unit': '', 'required': True, 'min': 0},
    ]

    def compute(self, clean):
        lesionado, sano = clean['lado_lesionado'], clean['lado_sano']
        if sano <= 0:
            raise CalculatorError({'lado_sano': 'El rendimiento de la pierna sana debe ser > 0.'})
        lsi = lesionado / sano * 100
        return {
            'lsi_pct': round2(lsi),
            'apto_rtp': lsi >= C.LSI_UMBRAL_RTP_PCT,
            'deficit_pct': round2(max(0.0, 100 - lsi)),
        }


@register
class HidratacionCalculator(TestCalculator):
    slug = 'hidratacion'
    familia = FAMILIA_PREVENCION
    nombre = 'Hidratación (cambio de masa pre/post)'
    descripcion = (
        'Pérdida de fluidos como % del peso corporal a partir de la báscula pre y post sesión. '
        'Pérdida > 2 % = afectación del rendimiento.'
    )
    input_schema = [
        {'name': 'peso_pre_kg', 'label': 'Peso antes de la sesión', 'type': 'number', 'unit': 'kg', 'required': True, 'min': 0},
        {'name': 'peso_post_kg', 'label': 'Peso después de la sesión', 'type': 'number', 'unit': 'kg', 'required': True, 'min': 0},
        {'name': 'liquido_ingerido_l', 'label': 'Líquido ingerido durante la sesión', 'type': 'number', 'unit': 'L', 'required': False, 'min': 0},
    ]

    def compute(self, clean):
        pre, post = clean['peso_pre_kg'], clean['peso_post_kg']
        if pre <= 0:
            raise CalculatorError({'peso_pre_kg': 'El peso pre debe ser mayor que 0.'})
        # La ingesta de líquido enmascara la pérdida real: se suma a la diferencia bruta.
        ingerido = clean.get('liquido_ingerido_l', 0.0)
        perdida_kg = (pre - post) + ingerido
        deshidratacion = perdida_kg / pre * 100
        return {
            'perdida_fluidos_l': round2(perdida_kg),
            'deshidratacion_pct': round2(deshidratacion),
            'deshidratacion_alerta': deshidratacion > C.DESHIDRATACION_ALERTA_PCT,
        }
