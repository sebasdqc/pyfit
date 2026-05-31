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

// Keep COLORS alias pointing to dark for backward compatibility
export const COLORS = DARK_COLORS

export type Colors = typeof DARK_COLORS

export const FASES = {
  Calentamiento: { color: '#ffaa32', bg: 'rgba(255,160,50,0.1)', label: '🔥 CALENTAMIENTO' },
  'Bloque principal': { color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', label: '⚡ BLOQUE PRINCIPAL' },
  'Vuelta a la calma': { color: '#32c896', bg: 'rgba(50,200,150,0.1)', label: '❄️ VUELTA A LA CALMA' },
}
