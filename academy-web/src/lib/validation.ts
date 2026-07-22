// Nombres humanos: letras (incl. acentos/ñ), espacios, apóstrofe y guion.
// Mismo criterio que HUMAN_NAME_RE en backend/pyfit/text_validators.py — el
// backend es la fuente de verdad real, esto es solo feedback inmediato.
const HUMAN_NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}$/

// Puntuación de riesgo para campos tipo tag/handle (intereses, redes
// sociales): bloquea sintaxis de código/instrucciones sin restringir el
// resto del texto. Mismo criterio que contains_unsafe_chars en el backend.
const UNSAFE_CHARS_RE = /[{}<>\\`]/

export function isValidHumanName(value: string): boolean {
  return HUMAN_NAME_RE.test(value.trim())
}

export function hasUnsafeChars(value: string): boolean {
  return UNSAFE_CHARS_RE.test(value)
}
