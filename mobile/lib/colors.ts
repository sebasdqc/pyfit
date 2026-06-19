export const DARK_COLORS = {
  bg: '#0d0d0d',                        // near-black monochromatic (~95% dark)
  sheetBg: '#000000',                   // pure black — alto contraste
  white: '#ffffff',
  accent: '#4f8cff',
  accentLight: '#7ab6ff',
  accentDark: '#2563ff',
  cyan: '#6ce5ff',
  green: '#32c896',
  orange: '#ffaa32',
  red: '#ff4444',
  inkPrimary: '#e8efff',
  inkSecondary: 'rgba(255,255,255,0.6)',
  inkMuted: 'rgba(255,255,255,0.35)',
  inkFaint: 'rgba(255,255,255,0.15)',
  borderDefault: 'rgba(255,255,255,0.08)',
  borderBright: 'rgba(255,255,255,0.15)',
  cardBg: '#000000',                    // card alto contraste — negro puro
  glassBg: 'rgba(255,255,255,0.06)',
  gradientTop: 'rgba(255,255,255,0.03)', // sutil, sin tinte azul
}

export const LIGHT_COLORS = {
  bg: '#f5f2ec',                        // crema — ~5% más oscuro/cálido que blanco
  sheetBg: '#ffffff',                   // pure white — alto contraste
  white: '#ffffff',
  accent: '#2563ff',
  accentLight: '#4f8cff',
  accentDark: '#1d4ed8',
  cyan: '#0ea5e9',
  green: '#16a34a',
  orange: '#d97706',
  red: '#dc2626',
  inkPrimary: '#0d1117',
  inkSecondary: 'rgba(13,17,23,0.65)',
  inkMuted: 'rgba(13,17,23,0.42)',
  inkFaint: 'rgba(13,17,23,0.22)',
  borderDefault: 'rgba(13,17,23,0.09)',
  borderBright: 'rgba(13,17,23,0.16)',
  cardBg: '#ffffff',                    // card alto contraste — blanco puro
  glassBg: 'rgba(13,17,23,0.04)',
  gradientTop: 'rgba(0,0,0,0.03)',      // sutil, sin tinte azul
}

// Rosado = tema CLARO (fondo rosa claro, tinta plum oscura). El acento se
// mantiene saturado (pink-600) para que el texto blanco de los botones siga
// contrastando, igual que el azul del light mode.
export const PINK_COLORS = {
  bg: '#fdf2f8',                        // rosa muy claro (pink-50)
  sheetBg: '#ffffff',                   // blanco puro — alto contraste
  white: '#ffffff',
  accent: '#db2777',                    // pink-600 saturado
  accentLight: '#ec4899',
  accentDark: '#be185d',
  cyan: '#0891b2',
  green: '#16a34a',
  orange: '#d97706',
  red: '#dc2626',
  inkPrimary: '#2d0a1e',                // plum casi negro
  inkSecondary: 'rgba(45,10,30,0.62)',
  inkMuted: 'rgba(45,10,30,0.42)',
  inkFaint: 'rgba(45,10,30,0.20)',
  borderDefault: 'rgba(190,24,93,0.12)',
  borderBright: 'rgba(190,24,93,0.24)',
  cardBg: '#ffffff',                    // card alto contraste — blanco puro
  glassBg: 'rgba(190,24,93,0.05)',
  gradientTop: 'rgba(236,72,153,0.12)', // glow rosa suave arriba
}

// Midnight = tema OSCURO (azul nocturno, acento cian). Mismo set de tokens que
// dark/light/rosado; éxito/alerta/error (green/orange/red) no cambian.
export const MIDNIGHT_COLORS = {
  bg: '#080E1A',                        // fondo primario
  sheetBg: '#0D1525',                   // fondo secundario
  white: '#ffffff',
  accent: '#00C2E0',                    // acento principal (cian)
  accentLight: '#5AD6EE',
  accentDark: '#0098B0',
  cyan: '#6CE5FF',
  green: '#32c896',
  orange: '#ffaa32',
  red: '#ff4444',
  inkPrimary: '#E8F0F8',                // texto primario
  inkSecondary: '#7A90A8',              // texto secundario
  inkMuted: '#3D5468',                  // texto terciario
  inkFaint: 'rgba(232,240,248,0.16)',
  borderDefault: '#1A2940',             // borde sutil
  borderBright: '#243550',              // borde medio
  cardBg: '#111D30',                    // fondo terciario
  glassBg: 'rgba(0,194,224,0.10)',      // acento fondo (baja opacidad)
  gradientTop: 'rgba(0,194,224,0.10)',  // glow cian superior
}

// Sand = tema OSCURO (marrón cálido, acento cobre/ámbar). Mismo set de tokens;
// éxito/alerta/error (green/orange/red) no cambian.
export const SAND_COLORS = {
  bg: '#16120D',                        // fondo primario
  sheetBg: '#1E1810',                   // fondo secundario
  white: '#ffffff',
  accent: '#C8874A',                    // acento principal (cobre)
  accentLight: '#D9A06B',
  accentDark: '#A66B33',
  cyan: '#E0B884',
  green: '#32c896',
  orange: '#ffaa32',
  red: '#ff4444',
  inkPrimary: '#F0E8DC',                // texto primario
  inkSecondary: '#9A8870',              // texto secundario
  inkMuted: '#5C4E3A',                  // texto terciario
  inkFaint: 'rgba(240,232,220,0.16)',
  borderDefault: '#332A1E',             // borde sutil
  borderBright: '#42351F',              // borde medio
  cardBg: '#252015',                    // fondo terciario
  glassBg: 'rgba(200,135,74,0.10)',     // acento fondo (baja opacidad)
  gradientTop: 'rgba(200,135,74,0.10)', // glow cobre superior
}

// Forest = tema OSCURO (verde bosque, acento lima). Mismo set de tokens;
// éxito/alerta/error (green/orange/red) no cambian.
export const FOREST_COLORS = {
  bg: '#080F0A',                        // fondo primario
  sheetBg: '#0D1710',                   // fondo secundario
  white: '#ffffff',
  accent: '#7EC832',                    // acento principal (lima)
  accentLight: '#9BD95E',
  accentDark: '#5FA024',
  cyan: '#B6E08A',
  green: '#32c896',
  orange: '#ffaa32',
  red: '#ff4444',
  inkPrimary: '#E4F0DC',                // texto primario
  inkSecondary: '#7A9870',              // texto secundario
  inkMuted: '#3D5C38',                  // texto terciario
  inkFaint: 'rgba(228,240,220,0.16)',
  borderDefault: '#1A2E1E',             // borde sutil
  borderBright: '#243D28',              // borde medio
  cardBg: '#112015',                    // fondo terciario
  glassBg: 'rgba(126,200,50,0.10)',     // acento fondo (baja opacidad)
  gradientTop: 'rgba(126,200,50,0.10)', // glow lima superior
}

// Neon = tema OSCURO (negro-violeta, acento rosa neón). Mismo set de tokens;
// éxito/alerta/error (green/orange/red) no cambian.
export const NEON_COLORS = {
  bg: '#05050A',                        // fondo primario
  sheetBg: '#0A0A14',                   // fondo secundario
  white: '#ffffff',
  accent: '#FF2D78',                    // acento principal (rosa neón)
  accentLight: '#FF6BA0',
  accentDark: '#D6195E',
  cyan: '#C49DFF',
  green: '#32c896',
  orange: '#ffaa32',
  red: '#ff4444',
  inkPrimary: '#F0E8FF',                // texto primario
  inkSecondary: '#8878A8',              // texto secundario
  inkMuted: '#4A3D6A',                  // texto terciario
  inkFaint: 'rgba(240,232,255,0.16)',
  borderDefault: '#1A1A35',             // borde sutil
  borderBright: '#252545',              // borde medio
  cardBg: '#0F0F1E',                    // fondo terciario
  glassBg: 'rgba(255,45,120,0.10)',     // acento fondo (baja opacidad)
  gradientTop: 'rgba(255,45,120,0.10)', // glow neón superior
}

// ─── Radius scale ─────────────────────────────────────────────────────────────
// Escala única de border-radius para toda la app. Antes había ~9 valores sueltos
// (14, 16, 18, 19, 20, 22, 24…) que rompían la cohesión visual. Usar estos tokens.
//   xs   chips/tags pequeños, dots redondeados
//   sm   inputs, cards internas, botones compactos
//   md   cards estándar (la base)
//   lg   cards prominentes / superficies destacadas
//   xl   sheets, modales, hero cards
//   pill píldoras totalmente redondeadas
export const RADII = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const

// Sombra de elevación sutil para cards sobre fondos oscuros. Un negro puro no se
// ve sobre un fondo casi-negro, por eso se tiñe con un color de acento a baja
// opacidad → leve "lift"/glow en iOS + elevation en Android. Pasar el color del
// acento o de la fase para que la sombra sea contextual.
export function cardShadow(color: string, opacity = 0.18) {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  }
}

// Keep COLORS alias pointing to dark for backward compatibility
export const COLORS = DARK_COLORS

export type Colors = typeof DARK_COLORS

export const FASES = {
  Calentamiento: { color: '#ffaa32', bg: 'rgba(255,160,50,0.1)', label: '🔥 CALENTAMIENTO' },
  'Bloque principal': { color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', label: '⚡ BLOQUE PRINCIPAL' },
  'Vuelta a la calma': { color: '#32c896', bg: 'rgba(50,200,150,0.1)', label: '❄️ VUELTA A LA CALMA' },
}
