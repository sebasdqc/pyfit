"""Guardrails de Comunidad: detectan spam y contenido dañino OBVIO antes de
llamar a Groq (ahorran tokens y cuota, y son testeables de forma determinista).

Deliberadamente CONSERVADOR, mismo criterio que `ai_tutor.guardrails`: solo
intercepta señales fuertes; el resto de casos (incluido "fuera_de_tema", que
requiere comprensión semántica) los clasifica el LLM en
`community_prompts.build_moderation_prompt`. Preferimos un falso negativo
(que lo termine viendo el LLM, o el sistema de reportes de alumnos) a un falso
positivo que oculte una pregunta legítima."""

import re
import unicodedata

CATEGORIA_SPAM = 'spam'
CATEGORIA_DANINO = 'dañino'


def _norm(text: str) -> str:
    """Minúsculas sin acentos, para que las heurísticas no dependan de tildes."""
    text = (text or '').lower()
    text = unicodedata.normalize('NFD', text)
    return ''.join(c for c in text if unicodedata.category(c) != 'Mn')


_URL_RE = re.compile(r'https?://\S+|www\.\S+')
# 8+ repeticiones del mismo carácter ("aaaaaaaa", "!!!!!!!!") — spam clásico.
_REPETICION_RE = re.compile(r'(.)\1{7,}')

_SPAM_FRASES = [
    r'\bcompra ya\b', r'\bclic aqui\b', r'\bclick aqui\b', r'\bgana dinero\b',
    r'\bdinero facil\b', r'\b100% gratis\b', r'\boferta exclusiva\b',
    r'\bescribeme al whatsapp\b', r'\bagregame al whatsapp\b', r'\bvisita mi pagina\b',
]

# Insultos/amenazas severos e inequívocos. Lista corta a propósito — casos
# ambiguos u ofensas más sutiles quedan para el LLM, que ve el texto completo.
_DANINO_FRASES = [
    r'\bhijo de puta\b', r'\bhijueputa\b', r'\bmaldito seas\b',
    r'\bte voy a matar\b', r'\bojala te mueras\b', r'\beres un(a)? mierda\b',
]


def _any(patterns, text) -> bool:
    return any(re.search(p, text) for p in patterns)


def check(texto: str):
    """Devuelve {'categoria', 'razon'} si detecta spam/daño obvio; None si no
    hay señal fuerte (el texto sigue a la clasificación de Groq)."""
    t = _norm(texto)
    if not t:
        return None

    if _any(_DANINO_FRASES, t):
        return {'categoria': CATEGORIA_DANINO, 'razon': 'Lenguaje ofensivo detectado.'}

    if len(_URL_RE.findall(texto or '')) >= 2:
        return {'categoria': CATEGORIA_SPAM, 'razon': 'Múltiples enlaces detectados.'}
    if _any(_SPAM_FRASES, t):
        return {'categoria': CATEGORIA_SPAM, 'razon': 'Frase promocional detectada.'}
    if _REPETICION_RE.search(texto or ''):
        return {'categoria': CATEGORIA_SPAM, 'razon': 'Repetición de caracteres detectada.'}

    return None
