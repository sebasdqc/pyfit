import re

from rest_framework import serializers

# Nombres humanos: letras (incl. acentos/ñ de ES/EN/PT/FR/DE), espacios, apóstrofe
# y guion. Rechaza dígitos y símbolos de raíz -> mata tanto "Sebas42*%" como
# cualquier intento de pegar un bloque tipo JSON en el nombre.
HUMAN_NAME_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}$")

# Puntuación de riesgo para campos tipo tag/handle (intereses, redes sociales,
# posición, grupo): bloquea sintaxis de código/instrucciones sin restringir el
# resto del texto (permite dígitos, guiones, acentos, puntuación normal).
_UNSAFE_CHARS_RE = re.compile(r"[{}<>\\`\x00-\x08\x0b\x0c\x0e-\x1f]")


def validate_human_name(value: str) -> str:
    """Valida que `value` sea un nombre humano razonable. Devuelve el valor
    normalizado (strip) o lanza ValidationError con mensaje para el usuario."""
    normalized = (value or '').strip()
    if not HUMAN_NAME_RE.match(normalized):
        raise serializers.ValidationError(
            'El nombre solo puede contener letras, espacios, apóstrofes y '
            'guiones (2-60 caracteres).'
        )
    return normalized


def contains_unsafe_chars(value: str) -> bool:
    """True si `value` contiene puntuación asociada a inyección de código o
    instrucciones (llaves, ángulos, backslash, backtick, caracteres de control)."""
    return bool(_UNSAFE_CHARS_RE.search(str(value or '')))
