"""Simulador de planificación de sesión — escuela Entrenamiento y Rendimiento Deportivo.

Práctica pedagógica sobre las funciones INSIGNIA del motor de generación de
PyFit (ver CLAUDE.md § "Funciones a migrar"): calcular_fatiga/calcular_rpe_target
(ai_workout.views) y las restricciones absolutas (dolor_hoy vía
ai_workout.adaptive_engine.DOLOR_KEYWORDS). El NÚMERO correcto de fatiga/RPE
siempre sale de las funciones reales — nunca se reimplementa la fórmula aquí.

Los "casos" y su catálogo de ejercicios candidatos son contenido pedagógico
propio de la Academia (no el catálogo real de producción): mantiene la
separación entre la Academia y el motor de generación, que no debe exponerse.
"""

from ai_workout.adaptive_engine import DOLOR_KEYWORDS
from ai_workout.views import calcular_rpe_target, fatiga_from_count

CASOS = [
    {
        'id': 'sobrecarga-lumbar',
        'titulo': 'Vuelta a cargar tras un microciclo intenso',
        'atleta': 'Camila, 27 años · nivel intermedio',
        'narrativa': (
            'Camila entrenó fuerza 3 veces en las últimas 72 horas. Hoy llega con el ánimo bajo '
            'y reporta: "Siento una molestia en la zona lumbar desde ayer, nada agudo pero prefiero '
            'evitar cargar la espalda". Su reloj marca un HRV de 42 ms.'
        ),
        'sesiones_72h': 3,
        'estado_animo': 2,
        'hrv': 42,
        'dolor_hoy': 'Siento una molestia en la zona lumbar desde ayer, nada agudo.',
        'ejercicios_evitar': ['Peso muerto convencional'],
        'implementos_disponibles': ['mancuernas', 'banda elástica'],
        'ejercicios_candidatos': [
            {'nombre': 'Peso muerto convencional', 'zona': 'lumbar', 'patron': 'bisagra', 'equipo': ['barra']},
            {'nombre': 'Sentadilla goblet con mancuerna', 'zona': None, 'patron': 'sentadilla', 'equipo': ['mancuernas']},
            {'nombre': 'Puente de glúteo con banda', 'zona': None, 'patron': 'bisagra', 'equipo': ['banda elástica']},
            {'nombre': 'Remo con mancuerna a un brazo', 'zona': None, 'patron': 'traccion', 'equipo': ['mancuernas']},
            {'nombre': 'Press de banca con barra', 'zona': None, 'patron': 'empuje_horizontal', 'equipo': ['barra']},
            {'nombre': 'Plancha frontal', 'zona': 'lumbar', 'patron': 'core', 'equipo': []},
            {'nombre': 'Elevaciones laterales con mancuerna', 'zona': None, 'patron': 'aislamiento_hombro', 'equipo': ['mancuernas']},
            {'nombre': 'Curl de bíceps con mancuerna', 'zona': None, 'patron': 'aislamiento_brazo', 'equipo': ['mancuernas']},
        ],
    },
    {
        'id': 'atleta-fresco',
        'titulo': 'Ventana de sobrecarga: atleta fresco',
        'atleta': 'Julián, 24 años · nivel intermedio',
        'narrativa': (
            'Julián no entrenó en las últimas 72 horas, durmió bien y llega con el ánimo muy alto. '
            'Su reloj marca un HRV de 88 ms. No reporta dolor, pero tiene una molestia crónica de '
            'hombro que le hace evitar el press militar de pie.'
        ),
        'sesiones_72h': 0,
        'estado_animo': 5,
        'hrv': 88,
        'dolor_hoy': '',
        'ejercicios_evitar': ['Press militar de pie'],
        'implementos_disponibles': ['barra', 'rack', 'mancuernas', 'banco'],
        'ejercicios_candidatos': [
            {'nombre': 'Sentadilla trasera con barra', 'zona': None, 'patron': 'sentadilla', 'equipo': ['barra', 'rack']},
            {'nombre': 'Press militar de pie', 'zona': None, 'patron': 'empuje_vertical', 'equipo': ['barra']},
            {'nombre': 'Press de banca con barra', 'zona': None, 'patron': 'empuje_horizontal', 'equipo': ['barra', 'banco']},
            {'nombre': 'Peso muerto rumano con barra', 'zona': None, 'patron': 'bisagra', 'equipo': ['barra']},
            {'nombre': 'Dominadas asistidas con banda', 'zona': None, 'patron': 'traccion', 'equipo': ['banda elástica']},
            {'nombre': 'Remo con barra', 'zona': None, 'patron': 'traccion', 'equipo': ['barra']},
            {'nombre': 'Zancadas con mancuernas', 'zona': None, 'patron': 'sentadilla', 'equipo': ['mancuernas']},
            {'nombre': 'Curl con mancuernas', 'zona': None, 'patron': 'aislamiento_brazo', 'equipo': ['mancuernas']},
        ],
    },
]

_CASOS_BY_ID = {c['id']: c for c in CASOS}


class SimuladorSesionError(Exception):
    def __init__(self, errors):
        self.errors = errors if isinstance(errors, dict) else {'__all__': str(errors)}
        super().__init__(str(self.errors))


def _public_caso(caso: dict) -> dict:
    """Versión del caso SIN las respuestas correctas (fatiga/RPE no se envían;
    el candidato de ejercicios se envía sin resolver contra dolor_hoy/evitar)."""
    return {
        'id': caso['id'],
        'titulo': caso['titulo'],
        'atleta': caso['atleta'],
        'narrativa': caso['narrativa'],
        'sesiones_72h': caso['sesiones_72h'],
        'estado_animo': caso['estado_animo'],
        'hrv': caso['hrv'],
        'dolor_hoy': caso['dolor_hoy'],
        'ejercicios_evitar': caso['ejercicios_evitar'],
        'implementos_disponibles': caso['implementos_disponibles'],
        'ejercicios_candidatos': [
            {'nombre': e['nombre'], 'patron': e['patron'], 'equipo': e['equipo']}
            for e in caso['ejercicios_candidatos']
        ],
    }


def listar_casos() -> list[dict]:
    return [_public_caso(c) for c in CASOS]


def zonas_from_dolor(dolor_hoy: str) -> set[str]:
    """Zonas contraindicadas por el texto de dolor_hoy, con el MISMO vocabulario
    (DOLOR_KEYWORDS) que usa el motor real para el resto de la app."""
    zones: set[str] = set()
    if dolor_hoy:
        lower = dolor_hoy.lower()
        for kw, zona in DOLOR_KEYWORDS.items():
            if kw in lower:
                zones.add(zona)
    return zones


def _motivo_invalidez(ejercicio: dict, caso: dict, zonas_dolor: set[str]) -> str | None:
    nombre_norm = ejercicio['nombre'].strip().lower()
    if any(nombre_norm == ev.strip().lower() for ev in caso['ejercicios_evitar']):
        return 'Está en la lista de ejercicios a evitar del atleta.'
    if ejercicio.get('zona') and ejercicio['zona'] in zonas_dolor:
        return f"Carga la zona \"{ejercicio['zona']}\", contraindicada por el dolor reportado hoy."
    faltantes = [eq for eq in ejercicio['equipo'] if eq not in caso['implementos_disponibles']]
    if faltantes:
        return f"Requiere {', '.join(faltantes)}, no disponible en esta sesión."
    return None


def evaluar(caso_id: str, respuesta: dict) -> dict:
    """Corrige la respuesta del estudiante contra el caso. `respuesta`:
    {fatiga, rpe_target, ejercicios_seleccionados}. Los valores CORRECTOS de
    fatiga/RPE salen de las funciones reales del motor (fatiga_from_count +
    calcular_rpe_target), nunca de una fórmula propia de la Academia."""
    caso = _CASOS_BY_ID.get(caso_id)
    if not caso:
        raise SimuladorSesionError({'caso_id': 'Caso no encontrado.'})

    fatiga_alumno = (respuesta.get('fatiga') or '').strip().lower()
    if fatiga_alumno not in ('bajo', 'medio', 'alto'):
        raise SimuladorSesionError({'fatiga': 'Elige bajo, medio o alto.'})
    try:
        rpe_alumno = int(respuesta.get('rpe_target'))
    except (TypeError, ValueError):
        raise SimuladorSesionError({'rpe_target': 'Debe ser un número entero.'})
    seleccionados = set(respuesta.get('ejercicios_seleccionados') or [])

    fatiga_correcta = fatiga_from_count(caso['sesiones_72h'])
    rpe_correcto = calcular_rpe_target(fatiga_correcta, caso['estado_animo'], caso['hrv'])
    zonas_dolor = zonas_from_dolor(caso['dolor_hoy'])

    ejercicios_feedback = []
    aciertos_ejercicios = 0
    for ex in caso['ejercicios_candidatos']:
        motivo = _motivo_invalidez(ex, caso, zonas_dolor)
        valido = motivo is None
        elegido = ex['nombre'] in seleccionados
        acierto = elegido == valido
        aciertos_ejercicios += int(acierto)
        ejercicios_feedback.append({
            'nombre': ex['nombre'],
            'elegido': elegido,
            'valido': valido,
            'acierto': acierto,
            'motivo_invalido': motivo,
        })

    total_ejercicios = len(caso['ejercicios_candidatos'])
    fatiga_ok = fatiga_alumno == fatiga_correcta
    rpe_ok = rpe_alumno == rpe_correcto
    puntaje = round(
        100 * (int(fatiga_ok) + int(rpe_ok) + aciertos_ejercicios) / (2 + total_ejercicios)
    )

    return {
        'fatiga_correcta': fatiga_correcta,
        'fatiga_ok': fatiga_ok,
        'rpe_correcto': rpe_correcto,
        'rpe_ok': rpe_ok,
        'ejercicios': ejercicios_feedback,
        'aciertos_ejercicios': aciertos_ejercicios,
        'total_ejercicios': total_ejercicios,
        'puntaje': puntaje,
    }
