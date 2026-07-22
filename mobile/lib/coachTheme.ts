/**
 * coachTheme.ts — Identidad visual del portal de entrenador (Zyfit).
 *
 * Paleta ROJA FIJA, independiente del tema del atleta (dark/light/midnight…).
 * El portal del coach se ve igual siempre: fondo rojo-vino profundo casi negro
 * con acentos rojos. La compartimos entre el login de coach y las pantallas del
 * portal para que no diverja.
 *
 * ⚠️ Los nombres de token (`purple`, `purpleDark`, `purpleMid`…) se CONSERVAN a
 * propósito: los referencian todas las pantallas de `app/(coach)/*`. Cambiar
 * solo los valores hex recolorea todo el portal sin tocar cada pantalla. El
 * nombre es legado — el valor es rojo. (Antes: morado #7C5CFF.)
 */

export const P = {
  bg: '#120507',              // fondo general — rojo-vino muy profundo, casi negro
  cardBg: '#22090E',          // cards / superficies algo más claras que el fondo
  cardBgAlt: '#2B0D13',       // card de "resto de cartera" — rojo neutro oscuro
  inputBg: '#1B070B',         // fondo de inputs
  badgeBg: '#2E0D15',         // badge / círculo de iniciales — rojo muy oscuro

  warmBg: '#1E1512',          // card de atleta con alerta — cálido oscuro
  warmBorder: 'rgba(255,138,61,0.28)',  // borde naranja muy apagado

  border: 'rgba(255,110,130,0.18)',     // borde rojo sutil
  borderBright: 'rgba(255,110,130,0.32)',
  divider: 'rgba(255,110,130,0.12)',    // líneas finas rojas muy apagadas

  purple: '#E5223F',          // rojo sólido (botón, chip activo, dots) [nombre legado]
  purpleDark: '#B3172F',
  purpleMid: '#FF6B7F',       // rojo medio (logo, títulos, tab activo)
  purpleLight: '#FFB0BB',     // rojo claro (acentos suaves, barras)
  purpleSoft: '#D98793',      // rojo apagado (texto secundario, links)
  purpleFaint: '#A0636E',     // rojo muy apagado (subtítulo, placeholder, tab inactivo)
  ink: '#FFE4E8',             // texto claro
  white: '#FFF4F5',

  orange: '#FF8A3D',          // alerta / naranja (chip Atención, badge Alerta)
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
