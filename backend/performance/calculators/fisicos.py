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
class YoYoIR2Calculator(TestCalculator):
    slug = 'yoyo-ir2'
    familia = FAMILIA_FISICO
    nombre = 'Yo-Yo Intermittent Recovery Test (IR2)'
    descripcion = (
        'Versión de élite (arranque más rápido, mayor componente anaeróbico). '
        'Distancia total y VO2máx estimado (Bangsbo). Futsalistas: referencia más exigente que el IR1.'
    )
    input_schema = [
        {'name': 'shuttles', 'label': 'Shuttles completados', 'type': 'int', 'unit': '', 'required': True, 'min': 0},
        {'name': 'nivel', 'label': 'Nivel / velocidad alcanzada', 'type': 'number', 'unit': '', 'required': False, 'min': 0},
    ]

    def compute(self, clean):
        distancia = clean['shuttles'] * C.YOYO_IR2_SHUTTLE_M
        vo2max = distancia * C.BANGSBO_IR2_SLOPE + C.BANGSBO_IR2_INTERCEPT
        out = {
            'distancia_m': round2(distancia),
            'vo2max_ml_min_kg': round2(vo2max),
        }
        if 'nivel' in clean:
            out['nivel'] = round2(clean['nivel'])
        return out


@register
class IFT3015Calculator(TestCalculator):
    slug = 'ift-30-15'
    familia = FAMILIA_FISICO
    nombre = '30-15 Intermittent Fitness Test (30-15 IFT)'
    descripcion = (
        'A partir de la VIFT (velocidad de la última etapa) estima el VO2máx (Buchheit) '
        'e individualiza la velocidad de referencia del HIIT. Sexo/edad/peso opcionales (para el VO2máx).'
    )
    input_schema = [
        {'name': 'vift', 'label': 'VIFT (velocidad final)', 'type': 'number', 'unit': 'km/h', 'required': True, 'min': 0},
        {'name': 'sexo', 'label': 'Sexo (1 = hombre · 2 = mujer)', 'type': 'int', 'unit': '', 'required': False, 'min': 1, 'max': 2},
        {'name': 'edad', 'label': 'Edad', 'type': 'number', 'unit': 'años', 'required': False, 'min': 0},
        {'name': 'peso_kg', 'label': 'Peso corporal', 'type': 'number', 'unit': 'kg', 'required': False, 'min': 0},
    ]

    def compute(self, clean):
        vift = clean['vift']
        out = {
            'vift_kmh': round2(vift),
            # La VIFT es la referencia práctica para prescribir el HIIT (95–100 % VIFT).
            'velocidad_hiit_kmh': round2(vift),
        }
        if all(k in clean for k in ('sexo', 'edad', 'peso_kg')):
            g, a, w = clean['sexo'], clean['edad'], clean['peso_kg']
            vo2 = (
                C.IFT_VO2_CONST
                + C.IFT_VO2_SEXO * g
                + C.IFT_VO2_EDAD * a
                + C.IFT_VO2_PESO * w
                + C.IFT_VO2_EDAD_VIFT * a * vift
                + C.IFT_VO2_VIFT * vift
            )
            out['vo2max_ml_min_kg'] = round2(vo2)
        else:
            out['vo2max_ml_min_kg'] = None
            out['nota'] = 'Aporta sexo, edad y peso para estimar el VO2máx (Buchheit).'
        return out


@register
class RASTCalculator(TestCalculator):
    slug = 'rast'
    familia = FAMILIA_FISICO
    nombre = 'RAST (Running Anaerobic Sprint Test)'
    descripcion = (
        'Potencia anaeróbica desde 6 sprints de 35 m: pico, media, mínima e índice de fatiga (Draper & Whyte).'
    )
    input_schema = [
        {'name': 'masa_kg', 'label': 'Masa corporal', 'type': 'number', 'unit': 'kg', 'required': True, 'min': 0},
        {'name': 'tiempos', 'label': 'Tiempos de cada sprint (35 m)', 'type': 'list', 'unit': 's', 'required': True, 'min': 0},
    ]

    def validate(self, raw):
        clean = super().validate(raw)
        if len(clean['tiempos']) < 2:
            raise CalculatorError({'tiempos': 'Se requieren al menos 2 sprints (el protocolo usa 6).'})
        if any(t <= 0 for t in clean['tiempos']):
            raise CalculatorError({'tiempos': 'Los tiempos deben ser mayores que 0.'})
        if clean['masa_kg'] <= 0:
            raise CalculatorError({'masa_kg': 'La masa debe ser mayor que 0.'})
        return clean

    def compute(self, clean):
        m, tiempos = clean['masa_kg'], clean['tiempos']
        d2 = C.RAST_DISTANCIA_M ** 2
        potencias = [m * d2 / (t ** 3) for t in tiempos]
        pico, minima = max(potencias), min(potencias)
        media = sum(potencias) / len(potencias)
        tiempo_total = sum(tiempos)
        indice_fatiga = (pico - minima) / tiempo_total  # W/s
        out = {
            'n_sprints': len(tiempos),
            'potencia_pico_w': round2(pico),
            'potencia_media_w': round2(media),
            'potencia_minima_w': round2(minima),
            'potencia_pico_relativa_w_kg': round2(pico / m),
            'indice_fatiga_w_s': round2(indice_fatiga),
        }
        if len(tiempos) != 6:
            out['nota'] = 'El protocolo estándar son 6 sprints de 35 m con 10 s de descanso.'
        return out


@register
class SprintSplitsCalculator(TestCalculator):
    slug = 'sprint-splits'
    familia = FAMILIA_FISICO
    nombre = 'Sprint con parciales (10/20/30 m)'
    descripcion = (
        'Velocidades por tramo y velocidad máxima (segmento volante 20–30 m). El parcial de 10 m '
        'sirve de base para el COD deficit del test 505.'
    )
    input_schema = [
        {'name': 't10', 'label': 'Tiempo a 10 m', 'type': 'number', 'unit': 's', 'required': True, 'min': 0},
        {'name': 't20', 'label': 'Tiempo a 20 m', 'type': 'number', 'unit': 's', 'required': False, 'min': 0},
        {'name': 't30', 'label': 'Tiempo a 30 m', 'type': 'number', 'unit': 's', 'required': False, 'min': 0},
    ]

    def validate(self, raw):
        clean = super().validate(raw)
        if clean.get('t10', 0) <= 0:
            raise CalculatorError({'t10': 'El tiempo a 10 m debe ser mayor que 0.'})
        # Monotonía temporal: los parciales presentes deben ser crecientes.
        marcas = [(10, clean.get('t10'))]
        if 't20' in clean:
            marcas.append((20, clean['t20']))
        if 't30' in clean:
            marcas.append((30, clean['t30']))
        for (_, ta), (_, tb) in zip(marcas, marcas[1:]):
            if tb is not None and ta is not None and tb <= ta:
                raise CalculatorError({'__all__': 'Los parciales deben crecer con la distancia (10 < 20 < 30 m).'})
        return clean

    def compute(self, clean):
        t10 = clean['t10']
        out = {'velocidad_0_10_ms': round2(10 / t10)}
        t_final, d_final = t10, 10
        if 't20' in clean:
            out['velocidad_10_20_ms'] = round2(10 / (clean['t20'] - t10))
            t_final, d_final = clean['t20'], 20
        if 't30' in clean:
            base = clean.get('t20', t10)
            base_d = 20 if 't20' in clean else 10
            out['velocidad_volante_ms'] = round2((30 - base_d) / (clean['t30'] - base))
            out['velocidad_max_kmh'] = round2(out['velocidad_volante_ms'] * 3.6)
            t_final, d_final = clean['t30'], 30
        out['velocidad_media_ms'] = round2(d_final / t_final)
        out['distancia_medida_m'] = d_final
        return out


@register
class CODDeficitCalculator(TestCalculator):
    slug = 'cod-deficit'
    familia = FAMILIA_FISICO
    nombre = 'COD Deficit (déficit de cambio de dirección)'
    descripcion = (
        'Aísla la capacidad de girar de la velocidad lineal: tiempo del 505 menos el parcial de 10 m.'
    )
    input_schema = [
        {'name': 'tiempo_505', 'label': 'Tiempo test 505', 'type': 'number', 'unit': 's', 'required': True, 'min': 0},
        {'name': 'tiempo_10m', 'label': 'Tiempo sprint lineal 10 m', 'type': 'number', 'unit': 's', 'required': True, 'min': 0},
    ]

    def compute(self, clean):
        t505, t10 = clean['tiempo_505'], clean['tiempo_10m']
        if t10 <= 0:
            raise CalculatorError({'tiempo_10m': 'Debe ser mayor que 0.'})
        if t505 < t10:
            raise CalculatorError({'__all__': 'El tiempo del 505 debe ser ≥ que el parcial de 10 m.'})
        return {
            'cod_deficit_s': round2(t505 - t10),
            'cod_deficit_pct': round2((t505 / t10 - 1) * 100),
        }


@register
class SquatJumpCalculator(TestCalculator):
    slug = 'squat-jump'
    familia = FAMILIA_FISICO
    nombre = 'Squat Jump (SJ)'
    descripcion = 'Salto sin contramovimiento: altura (directa o desde tiempo de vuelo) y potencia (Sayers).'
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
            altura_cm, origen = clean['altura_cm'], 'directo'
        else:
            t = clean['tiempo_vuelo_s']
            altura_cm, origen = (C.G * t * t) / 8 * 100, 'tiempo_vuelo'
        out = {'altura_cm': round2(altura_cm), 'origen_altura': origen}
        if 'masa_kg' in clean:
            out['potencia_w'] = round2(C.SAYERS_ALTURA * altura_cm + C.SAYERS_MASA * clean['masa_kg'] - C.SAYERS_CONST)
        else:
            out['potencia_w'] = None
            out['nota'] = 'Aporta la masa corporal (kg) para estimar la potencia (Sayers).'
        return out


@register
class DropJumpRSICalculator(TestCalculator):
    slug = 'drop-jump'
    familia = FAMILIA_FISICO
    nombre = 'Drop Jump — RSI (Reactive Strength Index)'
    descripcion = 'Capacidad reactiva/pliométrica: RSI = altura del salto ÷ tiempo de contacto con el suelo.'
    input_schema = [
        {'name': 'altura_cm', 'label': 'Altura del salto', 'type': 'number', 'unit': 'cm', 'required': False, 'min': 0},
        {'name': 'tiempo_vuelo_s', 'label': 'Tiempo de vuelo', 'type': 'number', 'unit': 's', 'required': False, 'min': 0},
        {'name': 'tiempo_contacto_s', 'label': 'Tiempo de contacto', 'type': 'number', 'unit': 's', 'required': True, 'min': 0},
    ]

    def validate(self, raw):
        clean = super().validate(raw)
        if 'altura_cm' not in clean and 'tiempo_vuelo_s' not in clean:
            raise CalculatorError({'__all__': 'Indica la altura del salto (cm) o el tiempo de vuelo (s).'})
        if clean.get('tiempo_contacto_s', 0) <= 0:
            raise CalculatorError({'tiempo_contacto_s': 'Debe ser mayor que 0.'})
        return clean

    def compute(self, clean):
        if 'altura_cm' in clean:
            altura_cm, origen = clean['altura_cm'], 'directo'
        else:
            t = clean['tiempo_vuelo_s']
            altura_cm, origen = (C.G * t * t) / 8 * 100, 'tiempo_vuelo'
        rsi = (altura_cm / 100) / clean['tiempo_contacto_s']
        return {
            'altura_cm': round2(altura_cm),
            'origen_altura': origen,
            'tiempo_contacto_s': round2(clean['tiempo_contacto_s']),
            'rsi': round2(rsi),
        }


@register
class BroadJumpCalculator(TestCalculator):
    slug = 'broad-jump'
    familia = FAMILIA_FISICO
    nombre = 'Salto horizontal (Broad Jump)'
    descripcion = 'Potencia horizontal sin equipo: distancia del salto y, si se aporta la talla, ratio relativo.'
    input_schema = [
        {'name': 'distancia_cm', 'label': 'Distancia del salto', 'type': 'number', 'unit': 'cm', 'required': True, 'min': 0},
        {'name': 'talla_cm', 'label': 'Talla del atleta', 'type': 'number', 'unit': 'cm', 'required': False, 'min': 0},
    ]

    def compute(self, clean):
        d = clean['distancia_cm']
        out = {'distancia_cm': round2(d), 'distancia_m': round2(d / 100)}
        if 'talla_cm' in clean and clean['talla_cm'] > 0:
            out['ratio_distancia_talla'] = round2(d / clean['talla_cm'])
        return out


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
