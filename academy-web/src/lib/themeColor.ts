// Puente entre las variables CSS de marca (canales RGB, ej. "204 31 54" — ver
// index.css) y librerías que solo aceptan hex (ogl/Aurora). Así los efectos
// WebGL heredan el color del tenant activo en vez de tener un color fijo,
// igual que el resto del sistema de theming multi-tenant.
export function cssVarToHex(varName: string, fallback: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  const parts = raw.split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return fallback
  return '#' + parts.map((c) => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0')).join('')
}
