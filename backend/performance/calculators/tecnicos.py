"""Familia 2 — Tests TÉCNICOS.

LSPT (Loughborough Soccer Passing Test) y Conducción en slalom. Las penalizaciones
y sus segundos viven en constants.py (matriz auditable); aquí solo se aplican. Todo
cálculo ocurre en el servidor.
"""

from . import constants as C
from .base import FAMILIA_TECNICO, CalculatorError, TestCalculator, register, round2


@register
class LSPTCalculator(TestCalculator):
    slug = 'lspt'
    familia = FAMILIA_TECNICO
    nombre = 'LSPT (Loughborough Soccer Passing Test)'
    descripcion = 'Tiempo de rendimiento = ejecución + penalizaciones − bonus por diana.'
    # Los contadores de error usan las MISMAS claves que C.LSPT_PENALIZACIONES, de
    # modo que la matriz de constants.py es la única fuente de la tabla de segundos.
    input_schema = [
        {'name': 'tiempo_ejecucion_s', 'label': 'Tiempo de ejecución', 'type': 'number', 'unit': 's', 'required': True, 'min': 0},
        {'name': 'pase_impreciso', 'label': 'Pases imprecisos', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
        {'name': 'objetivo_equivocado', 'label': 'Pases a diana equivocada', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
        {'name': 'balon_fuera_area', 'label': 'Balón fuera del área', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
        {'name': 'manejo_balon', 'label': 'Manejo ilegal del balón', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
        {'name': 'no_parar_zona', 'label': 'No parar en la zona', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
        {'name': 'dianas_banda', 'label': 'Golpes a la banda central (bonus)', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
    ]

    def compute(self, clean):
        penal_total = 0.0
        desglose = {}
        for clave, segundos in C.LSPT_PENALIZACIONES.items():
            n = clean.get(clave, 0)
            sub = n * segundos
            penal_total += sub
            desglose[clave] = round2(sub)
        bonus_total = clean.get('dianas_banda', 0) * C.LSPT_BONUS_DIANA
        tiempo_ejec = clean['tiempo_ejecucion_s']
        tiempo_rend = tiempo_ejec + penal_total - bonus_total
        return {
            'tiempo_ejecucion_s': round2(tiempo_ejec),
            'penalizacion_total_s': round2(penal_total),
            'bonus_total_s': round2(bonus_total),
            'tiempo_rendimiento_s': round2(tiempo_rend),
            'desglose_penalizaciones': desglose,
        }


@register
class ConduccionSlalomCalculator(TestCalculator):
    slug = 'conduccion-slalom'
    familia = FAMILIA_TECNICO
    nombre = 'Conducción en slalom'
    descripcion = 'Tiempo total con penalización por cono derribado; velocidad si se aporta la distancia.'
    input_schema = [
        {'name': 'tiempo_s', 'label': 'Tiempo de conducción', 'type': 'number', 'unit': 's', 'required': True, 'min': 0},
        {'name': 'conos_derribados', 'label': 'Conos derribados', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
        {'name': 'distancia_m', 'label': 'Distancia del recorrido', 'type': 'number', 'unit': 'm', 'required': False, 'min': 0},
    ]

    def compute(self, clean):
        tiempo = clean['tiempo_s']
        conos = clean.get('conos_derribados', 0)
        penal = conos * C.PENAL_CONO_S
        total = tiempo + penal
        out = {
            'tiempo_base_s': round2(tiempo),
            'conos_derribados': conos,
            'penalizacion_s': round2(penal),
            'tiempo_total_s': round2(total),
        }
        if 'distancia_m' in clean:
            if total <= 0:
                raise CalculatorError({'tiempo_s': 'El tiempo total debe ser mayor que 0.'})
            vel = clean['distancia_m'] / total
            out['velocidad_ms'] = round2(vel)
            out['velocidad_kmh'] = round2(vel * 3.6)
        return out
