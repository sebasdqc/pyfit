/**
 * coachTheme.ts — Identidad visual del portal de entrenador (Zyfit).
 *
 * Paleta morada FIJA, independiente del tema del atleta (dark/light/midnight…).
 * El portal del coach se ve igual siempre: fondo azul-morado profundo con
 * acentos púrpura. La compartimos entre el login de coach y las pantallas del
 * portal para que no diverja.
 */

export const P = {
  bg: '#0A0816',              // fondo general — azul-morado muy profundo, casi negro
  cardBg: '#15102C',          // cards / superficies algo más claras que el fondo
  cardBgAlt: '#1A1433',       // card de "resto de cartera" — morado neutro
  inputBg: '#120E26',         // fondo de inputs
  badgeBg: '#1B1340',         // badge / círculo de iniciales — morado muy oscuro

  warmBg: '#1E1512',          // card de atleta con alerta — cálido oscuro
  warmBorder: 'rgba(255,138,61,0.28)',  // borde naranja muy apagado

  border: 'rgba(150,128,255,0.18)',     // borde morado sutil
  borderBright: 'rgba(150,128,255,0.30)',
  divider: 'rgba(150,128,255,0.12)',    // líneas finas moradas muy apagadas

  purple: '#7C5CFF',          // morado sólido (botón, chip activo, dots)
  purpleDark: '#5B3FD9',
  purpleMid: '#A78BFA',       // morado medio (logo, títulos, tab activo)
  purpleLight: '#C4B5FD',     // morado claro (acentos suaves, barras)
  purpleSoft: '#9484C9',      // morado apagado (texto secundario, links)
  purpleFaint: '#605489',     // morado muy apagado (subtítulo, placeholder, tab inactivo)
  ink: '#E7E1FF',             // texto claro
  white: '#F5F2FF',

  orange: '#FF8A3D',          // alerta / naranja-rojo (chip Atención, badge Alerta)
  orangeSoft: 'rgba(255,138,61,0.14)',
  amber: '#FBBF24',           // pendiente
  amberSoft: 'rgba(251,191,36,0.14)',
  green: '#34D399',           // al día
  greenSoft: 'rgba(52,211,153,0.14)',
  red: '#FF5C5C',
}

export const CONTACT_URL = 'mailto:hola@pyfit.app?subject=Quiero%20ser%20coach%20en%20Zyfit'

/** Iniciales (máx. 2 letras) a partir de un nombre. "Coach Caro" → "CC". */
export function iniciales(nombre?: string): string {
  if (!nombre) return '?'
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
