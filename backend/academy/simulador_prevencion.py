"""Simulador de Return-to-Play y decisiones en partido — escuela Recuperación,
Prevención y Wellness.

Reutiliza la familia 'prevencion' del motor de Zyfit Performance
(performance.calculators: nordic-asimetria, lsi, hidratacion) — MISMO cálculo
que el panel B2B. La decisión (autorizar RTP / sacar del partido) es una capa
pedagógica propia de la Academia que combina las banderas ya calculadas por el
motor (apto_rtp, asimetria_alerta, deshidratacion_alerta); nunca reinventa los
umbrales o fórmulas de esos tests.

Los "casos" son contenido propio de la Academia (jugadores ficticios), no datos
reales de ningún centro de Zyfit Performance.
"""

from performance.calculators import CalculatorError, get_calculator

OPCIONES_RTP = ('sin_restriccion', 'con_control', 'no_autorizar')
OPCIONES_PARTIDO = ('vigilar_y_continuar', 'sacar_y_rehidratar')

CASOS = [
    {
        'id': 'isquiotibial-mixto',
        'tipo': 'rtp',
        'titulo': 'Alta de isquiotibiales con señales mixtas',
        'atleta': 'Mateo, 22 años · volante',
        'narrativa': (
            'Mateo volvió de una lesión de isquiotibial izquierdo hace 8 semanas. Hoy se le hacen '
            'los tests de reincorporación antes de autorizarlo a entrenar con el grupo.'
        ),
        'tests': {
            'nordic-asimetria': {'fuerza_izquierda_n': 245, 'fuerza_derecha_n': 290},
            'lsi': {'lado_lesionado': 168, 'lado_sano': 182},
        },
    },
    {
        'id': 'tobillo-alta-limpia',
        'tipo': 'rtp',
        'titulo': 'Alta de tobillo, tests de control',
        'atleta': 'Renata, 24 años · lateral',
        'narrativa': (
            'Renata se recupera de un esguince de tobillo leve. En su control de alta se le repiten '
            'los mismos tests para confirmar que puede volver sin restricciones.'
        ),
        'tests': {
            'nordic-asimetria': {'fuerza_izquierda_n': 265, 'fuerza_derecha_n': 270},
            'lsi': {'lado_lesionado': 190, 'lado_sano': 195},
        },
    },
    {
        'id': 'calor-entretiempo',
        'tipo': 'partido',
        'titulo': 'Calambres en el entretiempo',
        'atleta': 'Ignacio, 26 años · mediocampista',
        'narrativa': (
            'Partido a 34 °C. Ignacio termina el primer tiempo reportando calambres leves en los '
            'gemelos. Se lo pesa en el vestuario antes de decidir si sigue en cancha.'
        ),
        'tests': {
            'hidratacion': {'peso_pre_kg': 74.0, 'peso_post_kg': 71.6, 'liquido_ingerido_l': 0.8},
        },
    },
]

_CASOS_BY_ID = {c['id']: c for c in CASOS}


class SimuladorPrevencionError(Exception):
    def __init__(self, errors):
        self.errors = errors if isinstance(errors, dict) else {'__all__': str(errors)}
        super().__init__(str(self.errors))


def _public_caso(caso: dict) -> dict:
    """Caso sin resolver: los inputs crudos de cada test, sin sus resultados
    (el estudiante los calcula/interpreta; el servidor corrige en /evaluar/)."""
    opciones = OPCIONES_RTP if caso['tipo'] == 'rtp' else OPCIONES_PARTIDO
    return {
        'id': caso['id'],
        'tipo': caso['tipo'],
        'titulo': caso['titulo'],
        'atleta': caso['atleta'],
        'narrativa': caso['narrativa'],
        'tests': caso['tests'],
        'opciones': list(opciones),
    }


def listar_casos() -> list[dict]:
    return [_public_caso(c) for c in CASOS]


def _decidir_rtp(lsi_res: dict, nordic_res: dict) -> str:
    """Regla pedagógica de la Academia sobre las banderas del motor real: el
    LSI manda si NO está apto (no se autoriza pase lo que pase en Nordic); si
    está apto pero hay asimetría de fuerza, la cautela documentada en el propio
    test ('el LSI puede sobreestimar la recuperación') baja a 'con control'."""
    if not lsi_res['apto_rtp']:
        return 'no_autorizar'
    if nordic_res['asimetria_alerta']:
        return 'con_control'
    return 'sin_restriccion'


def _decidir_partido(hidra_res: dict) -> str:
    return 'sacar_y_rehidratar' if hidra_res['deshidratacion_alerta'] else 'vigilar_y_continuar'


def evaluar(caso_id: str, decision: str) -> dict:
    caso = _CASOS_BY_ID.get(caso_id)
    if not caso:
        raise SimuladorPrevencionError({'caso_id': 'Caso no encontrado.'})

    opciones = OPCIONES_RTP if caso['tipo'] == 'rtp' else OPCIONES_PARTIDO
    if decision not in opciones:
        raise SimuladorPrevencionError({'decision': f'Elige una de: {", ".join(opciones)}.'})

    try:
        resultados = {slug: get_calculator(slug).run(inputs) for slug, inputs in caso['tests'].items()}
    except CalculatorError as e:
        raise SimuladorPrevencionError(e.errors)

    if caso['tipo'] == 'rtp':
        decision_correcta = _decidir_rtp(resultados['lsi'], resultados['nordic-asimetria'])
    else:
        decision_correcta = _decidir_partido(resultados['hidratacion'])

    return {
        'resultados': resultados,
        'decision_correcta': decision_correcta,
        'acierto': decision == decision_correcta,
    }
