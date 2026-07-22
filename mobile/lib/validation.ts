// Nombres humanos: letras (incl. acentos/ñ), espacios, apóstrofe y guion.
// Mismo criterio que HUMAN_NAME_RE en backend/pyfit/text_validators.py — el
// backend es la fuente de verdad real, esto es solo feedback inmediato.
const HUMAN_NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}$/

export function isValidHumanName(value: string): boolean {
  return HUMAN_NAME_RE.test(value.trim())
}
