"""Guardrails del tutor: detecta preguntas fuera de alcance ANTES de llamar a la IA.

Dos categorías se redirigen sin gastar cuota ni tokens (y son testeables de forma
determinista):

  • médico   — diagnóstico / tratamiento / indicación clínica de un caso concreto
               (propio o de un tercero) → derivar a un profesional de salud o a un
               mentor humano de la Academy.
  • programa — diseño de un programa / rutina personalizada completa → esa es
               función de la app Zyfit / Zyfit Coach, no del tutor de Academy.

Es deliberadamente CONSERVADOR: solo redirige ante señales fuertes. El resto de
casos los maneja el prompt de sistema (que también instruye a redirigir cuando
corresponda). Preferimos un falso negativo (que responda el LLM, que igual tiene
los guardrails en su prompt) a un falso positivo (redirigir una duda conceptual
legítima, p. ej. "¿qué es una lesión por sobreuso?" — eso SÍ es conceptual).
"""

import re
import unicodedata

TIPO_MEDICO = 'medico'
TIPO_PROGRAMA = 'programa'

RESPUESTA_MEDICO = (
    'Soy el tutor de conceptos de Zyfit Academy, así que no puedo dar diagnósticos '
    'ni indicaciones clínicas sobre un caso concreto. Ante dolor, molestias o una '
    'lesión, lo correcto es consultar a un profesional de la salud o a un mentor '
    'humano de la Academy. Si quieres, puedo explicarte el concepto a nivel de curso '
    '(por ejemplo, cómo el material aborda la prevención o la gestión de la carga).'
)

RESPUESTA_PROGRAMA = (
    'El tutor resuelve dudas conceptuales; no diseña rutinas ni programas '
    'personalizados completos —para eso está la app Zyfit / Zyfit Coach, que genera '
    'sesiones a tu medida. Lo que sí puedo hacer es explicarte el principio detrás '
    '(por ejemplo periodización, o cómo se relacionan MEV/MAV/MRV con el volumen) '
    'para que lo apliques allí con criterio.'
)


def _norm(text: str) -> str:
    """Minúsculas sin acentos, para que las heurísticas no dependan de tildes."""
    text = (text or '').lower()
    text = unicodedata.normalize('NFD', text)
    return ''.join(c for c in text if unicodedata.category(c) != 'Mn')


# ── Señales médicas ───────────────────────────────────────────────────────────
# Diagnóstico / medicación explícitos: redirigen por sí solos.
_MED_FUERTE = [
    r'\bdiagnostic',            # diagnóstico/diagnosticar
    r'\bque medicament',        # qué medicamento
    r'\bque pastilla',
    r'\bque medicina',
    r'\bque antiinflamatorio',
    r'\bpuedo tomar\b',
    r'\bdebo tomar\b',
    r'\bque me tomo\b',
    r'\bcomo curo\b',
    r'\bcomo trato mi\b',
]
# Dolor / lesión en primera persona (o de un tercero concreto) + petición de qué
# hacer: la combinación redirige.
_MED_SINTOMA = [
    r'\bme duele\b',
    r'\bme lastim',
    r'\btengo dolor\b',
    r'\bsiento dolor\b',
    r'\bmi lesion\b',
    r'\bestoy lesionad',
    r'\btengo una lesion\b',
    r'\bme lesione\b',
    r'\bmi rodilla\b',
    r'\bmi hombro\b',
    r'\bmi espalda\b',
    r'\bmi tobillo\b',
    r'\bmi codo\b',
]
_MED_PEDIDO = [
    r'\bque hago\b', r'\bque puedo hacer\b', r'\bque debo hacer\b',
    r'\bque me recomiendas\b', r'\bcomo lo trato\b', r'\bes normal\b',
    r'\bes grave\b', r'\bpuedo entrenar\b', r'\bdebo parar\b',
]

# ── Señales de diseño de programa personalizado ───────────────────────────────
_PROG = [
    r'\bdisename\b', r'\bdisenam\b', r'\bdisena una rutina\b', r'\bdisena un programa\b',
    r'\barmame\b', r'\barma una rutina\b', r'\barma un plan\b', r'\barma un programa\b',
    r'\bhazme una rutina\b', r'\bhazme un plan\b', r'\bhazme un programa\b',
    r'\bcreame\b', r'\bcrea una rutina\b', r'\bcrea un plan\b',
    r'\bdame una rutina\b', r'\bdame un plan\b', r'\bdame un programa\b',
    r'\bgenerame\b', r'\bgenera una rutina\b',
    r'\brutina para mi\b', r'\bplan para mi\b',
    r'\brutina personalizada\b', r'\bprograma personalizado\b', r'\bplan personalizado\b',
    r'\bmi rutina de\b',
]


def _any(patterns, text) -> bool:
    return any(re.search(p, text) for p in patterns)


def check(question: str):
    """Devuelve {'tipo', 'respuesta'} si hay que redirigir; None si está en alcance."""
    t = _norm(question)
    if not t:
        return None

    # Programa personalizado.
    if _any(_PROG, t):
        return {'tipo': TIPO_PROGRAMA, 'respuesta': RESPUESTA_PROGRAMA}

    # Médico: diagnóstico/medicación explícitos, o síntoma en 1ª persona + pedido.
    if _any(_MED_FUERTE, t):
        return {'tipo': TIPO_MEDICO, 'respuesta': RESPUESTA_MEDICO}
    if _any(_MED_SINTOMA, t) and _any(_MED_PEDIDO, t):
        return {'tipo': TIPO_MEDICO, 'respuesta': RESPUESTA_MEDICO}

    return None
