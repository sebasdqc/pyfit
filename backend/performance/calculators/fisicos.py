"""Familia 1 — Tests FÍSICOS.

Yo-Yo IR1, Sprint lineal, Test 505 (COD), RSA y CMJ. Las fórmulas y sus factores
están en constants.py; aquí solo se aplican. Todo cálculo ocurre en el servidor.
"""

from . import constants as C
from .base import FAMILIA_FISICO, CalculatorError, TestCalculator, register, round2


@register
class YoYoIR1Calculator(TestCalculator):
    slug = 'yoyo-ir1'
    familia = FAMILIA_FISICO
    nombre = 'Yo-Yo Intermittent Recovery Test (IR1)'
    descripcion = 'Distancia total recorrida y VO2máx estimado (Bangsbo).'
    input_schema = [
        {'name': 'shuttles', 'label': 'Shuttles completados', 'type': 'int', 'unit': '', 'required': True, 'min': 0},
        {'name': 'nivel', 'label': 'Nivel / velocidad alcanzada', 'type': 'number', 'unit': '', 'required': False, 'min': 0},
    ]

    def compute(self, clean):
        distancia = clean['shuttles'] * C.YOYO_IR1_SHUTTLE_M
        vo2max = distancia * C.BANGSBO_IR1_SLOPE + C.BANGSBO_IR1_INTERCEPT
        out = {
            'distancia_m': round2(distancia),
            'vo2max_ml_min_kg': round2(vo2max),
        }
        if 'nivel' in clean:
            out['nivel'] = round2(clean['nivel'])
        return out


@register
class SprintLinealCalculator(TestCalculator):
    slug = 'sprint-lineal'
    familia = FAMILIA_FISICO
    nombre = 'Sprint lineal'
    descripcion = 'Velocidad media a partir de distancia y tiempo.'
    input_schema = [
        {'name': 'distancia_m', 'label': 'Distancia', 'type': 'number', 'unit': 'm', 'required': True, 'min': 0},
        {'name': 'tiempo_s', 'label': 'Tiempo', 'type': 'number', 'unit': 's', 'required': True, 'min': 0},
    ]

    def compute(self, clean):
        d, t = clean['distancia_m'], clean['tiempo_s']
        if t <= 0:
            raise CalculatorError({'tiempo_s': 'Debe ser mayor que 0.'})
        vel = d / t
        return {
            'velocidad_ms': round2(vel),
            'velocidad_kmh': round2(vel * 3.6),
        }


@register
class Test505Calculator(TestCalculator):
    slug = 'test-505'
    familia = FAMILIA_FISICO
    nombre = 'Test 505 (cambio de dirección)'
    descripcion = 'Tiempo medio e índice de asimetría entre piernas; alerta si > 10%.'
    input_schema = [
        {'name': 'tiempo_dominante', 'label': 'Tiempo pierna dominante', 'type': 'number', 'unit': 's', 'required': True, 'min': 0},
        {'name': 'tiempo_no_dominante', 'label': 'Tiempo pierna no dominante', 'type': 'number', 'unit': 's', 'required': True, 'min': 0},
    ]

    def compute(self, clean):
        dom, no_dom = clean['tiempo_dominante'], clean['tiempo_no_dominante']
        mayor = max(dom, no_dom)
        if mayor <= 0:
            raise CalculatorError({'__all__': 'Los tiempos deben ser mayores que 0.'})
        asimetria = abs(dom - no_dom) / mayor * 100
        return {
            'tiempo_medio_s': round2((dom + no_dom) / 2),
            'asimetria_pct': round2(asimetria),
            'asimetria_alerta': asimetria > C.ASIMETRIA_UMBRAL_PCT,
        }


@register
class RSACalculator(TestCalculator):
    slug = 'rsa'
    familia = FAMILIA_FISICO
    nombre = 'RSA (sprints repetidos)'
    descripcion = 'Mejor tiempo, media, total e índice de decremento (%).'
    input_schema = [
        {'name': 'tiempos', 'label': 'Tiempos de cada sprint', 'type': 'list', 'unit': 's', 'required': True, 'min': 0},
    ]

    def validate(self, raw):
        clean = super().validate(raw)
        if len(clean['tiempos']) < 2:
            raise CalculatorError({'tiempos': 'Se requieren al menos 2 sprints.'})
        return clean

    def compute(self, clean):
        tiempos = clean['tiempos']
        mejor = min(tiempos)
        media = sum(tiempos) / len(tiempos)
        if mejor <= 0:
            raise CalculatorError({'tiempos': 'Los tiempos deben ser mayores que 0.'})
        decremento = (media / mejor - 1) * 100
        return {
            'n_sprints': len(tiempos),
            'mejor_tiempo_s': round2(mejor),
            'tiempo_medio_s': round2(media),
            'tiempo_total_s': round2(sum(tiempos)),
            'indice_decremento_pct': round2(decremento),
        }


@register
class CMJCalculator(TestCalculator):
    slug = 'cmj'
    familia = FAMILIA_FISICO
    nombre = 'CMJ (Counter Movement Jump)'
    descripcion = 'Altura de salto (directa o desde tiempo de vuelo) y potencia (Sayers).'
    input_schema = [
        {'name': 'altura_cm', 'label': 'Altura del salto', 'type': 'number', 'unit': 'cm', 'required': False, 'min': 0},
        {'name': 'tiempo_vuelo_s', 'label': 'Tiempo de vuelo', 'type': 'number', 'unit': 's', 'required': False, 'min': 0},
        {'name': 'masa_kg', 'label': 'Masa corporal', 'type': 'number', 'unit': 'kg', 'required': False, 'min': 0},
    ]

    def validate(self, raw):
        clean = super().validate(raw)
        if 'altura_cm' not in clean and 'tiempo_vuelo_s' not in clean:
            raise CalculatorError({'__all__': 'Indica la altura del salto (cm) o el tiempo de vuelo (s).'})
        return clean

    def compute(self, clean):
        if 'altura_cm' in clean:
            altura_cm = clean['altura_cm']
            origen = 'directo'
        else:
            t = clean['tiempo_vuelo_s']
            altura_cm = (C.G * t * t) / 8 * 100  # h = g·t²/8 (m) → cm
            origen = 'tiempo_vuelo'

        out = {
            'altura_cm': round2(altura_cm),
            'origen_altura': origen,
        }
        if 'masa_kg' in clean:
            potencia = C.SAYERS_ALTURA * altura_cm + C.SAYERS_MASA * clean['masa_kg'] - C.SAYERS_CONST
            out['potencia_w'] = round2(potencia)
        else:
            out['potencia_w'] = None
            out['nota'] = 'Aporta la masa corporal (kg) para estimar la potencia (Sayers).'
        return out
