"""Familia 3 — Tests TÁCTICOS.

TSAP (Team Sport Assessment Procedure) y GPAI (Game Performance Assessment
Instrument). Las constantes (amortiguación, divisores y factores del TSAP) viven
en constants.py; aquí solo se aplican. Todo cálculo ocurre en el servidor.

GPAI usa un input compuesto: `componentes`, una lista de filas
{nombre, apropiadas, inapropiadas}. Por eso GPAI sobreescribe validate() en lugar
de apoyarse en la coerción escalar de la base.
"""

from . import constants as C
from .base import FAMILIA_TACTICO, CalculatorError, TestCalculator, register, round2


@register
class TSAPCalculator(TestCalculator):
    slug = 'tsap'
    familia = FAMILIA_TACTICO
    nombre = 'TSAP (Team Sport Assessment Procedure)'
    descripcion = 'Volumen de juego, índice de eficiencia y puntuación de rendimiento (Gréhaigne).'
    # "Balones ofensivos" del TSAP = pases ofensivos + jugadas exitosas; se capturan
    # por separado para que el observador registre cada acción y se suman al calcular.
    input_schema = [
        {'name': 'balones_conquistados', 'label': 'Balones conquistados', 'type': 'int', 'unit': '', 'required': True, 'min': 0},
        {'name': 'balones_recibidos', 'label': 'Balones recibidos', 'type': 'int', 'unit': '', 'required': True, 'min': 0},
        {'name': 'pases_ofensivos', 'label': 'Pases ofensivos', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
        {'name': 'jugadas_exitosas', 'label': 'Jugadas exitosas', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
        {'name': 'balones_perdidos', 'label': 'Balones perdidos', 'type': 'int', 'unit': '', 'required': False, 'min': 0},
    ]

    def compute(self, clean):
        conquistados = clean['balones_conquistados']
        recibidos = clean['balones_recibidos']
        perdidos = clean.get('balones_perdidos', 0)
        ofensivos = clean.get('pases_ofensivos', 0) + clean.get('jugadas_exitosas', 0)

        vj = conquistados + recibidos
        # El denominador "10 + perdidos" siempre es ≥ 10 → nunca hay división por cero.
        ie = (conquistados + ofensivos) / (C.TSAP_IE_AMORTIGUACION + perdidos)
        rendimiento = (vj / C.TSAP_VJ_DIVISOR) + (ie * C.TSAP_IE_FACTOR)
        return {
            'volumen_juego': vj,
            'balones_ofensivos': ofensivos,
            'indice_eficiencia': round2(ie),
            'puntuacion_rendimiento': round2(rendimiento),
        }


@register
class GPAICalculator(TestCalculator):
    slug = 'gpai'
    familia = FAMILIA_TACTICO
    nombre = 'GPAI (Game Performance Assessment Instrument)'
    descripcion = 'Índice por componente (apropiadas/total), implicación y rendimiento de juego (variante proporción 0–1).'
    # Input compuesto: cada componente observado es una fila con sus dos conteos.
    # `fields` describe la sub-estructura para que el frontend renderice la tabla.
    input_schema = [
        {
            'name': 'componentes', 'label': 'Componentes observados', 'type': 'componentes',
            'unit': '', 'required': True,
            'fields': [
                {'name': 'nombre', 'label': 'Componente', 'type': 'text'},
                {'name': 'apropiadas', 'label': 'Apropiadas', 'type': 'int', 'min': 0},
                {'name': 'inapropiadas', 'label': 'Inapropiadas', 'type': 'int', 'min': 0},
            ],
        },
    ]

    def validate(self, raw):
        if not isinstance(raw, dict):
            raise CalculatorError('Los datos de entrada deben ser un objeto.')
        comps = raw.get('componentes')
        if not isinstance(comps, (list, tuple)) or len(comps) == 0:
            raise CalculatorError({'componentes': 'Añade al menos un componente observado.'})

        clean_comps = []
        errors = {}
        for i, c in enumerate(comps):
            campo = f'componentes[{i}]'
            if not isinstance(c, dict):
                errors[campo] = 'Cada componente debe ser un objeto.'
                continue
            try:
                ap = int(c.get('apropiadas', 0) or 0)
                inap = int(c.get('inapropiadas', 0) or 0)
            except (TypeError, ValueError):
                errors[campo] = 'Las acciones deben ser números enteros.'
                continue
            if ap < 0 or inap < 0:
                errors[campo] = 'Las acciones no pueden ser negativas.'
                continue
            # Una fila sin acciones no se observó → se omite del promedio (GP es la
            # media de los componentes OBSERVADOS), no es un error.
            if ap + inap == 0:
                continue
            clean_comps.append({
                'nombre': str(c.get('nombre', '') or f'componente_{i + 1}'),
                'apropiadas': ap,
                'inapropiadas': inap,
            })

        if errors:
            raise CalculatorError(errors)
        if not clean_comps:
            raise CalculatorError({'componentes': 'Se requiere al menos un componente con acciones observadas.'})
        return {'componentes': clean_comps}

    def compute(self, clean):
        indices = []
        game_involvement = 0
        detalle = []
        for c in clean['componentes']:
            total = c['apropiadas'] + c['inapropiadas']  # > 0 por validate()
            game_involvement += total
            idx = c['apropiadas'] / total
            indices.append(idx)
            detalle.append({
                'nombre': c['nombre'],
                'apropiadas': c['apropiadas'],
                'inapropiadas': c['inapropiadas'],
                'indice': round2(idx),
            })
        game_performance = sum(indices) / len(indices)
        return {
            'game_involvement': game_involvement,
            'game_performance': round2(game_performance),
            'n_componentes': len(detalle),
            'componentes': detalle,
        }
