export const DARK_COLORS = {
  bg: '#000000',
  sheetBg: '#0a0a0f',
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
  cardBg: 'rgba(255,255,255,0.05)',
  glassBg: 'rgba(255,255,255,0.07)',
}

export const LIGHT_COLORS = {
  bg: '#f2f4f9',
  sheetBg: '#ffffff',
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
  cardBg: 'rgba(13,17,23,0.05)',
  glassBg: 'rgba(13,17,23,0.04)',
}

// Keep COLORS alias pointing to dark for backward compatibility
// with any static references still in the codebase
export const COLORS = DARK_COLORS

export type Colors = typeof DARK_COLORS

export const FASES = {
  Calentamiento: { color: '#ffaa32', bg: 'rgba(255,160,50,0.1)', label: '🔥 CALENTAMIENTO' },
  'Bloque principal': { color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', label: '⚡ BLOQUE PRINCIPAL' },
  'Vuelta a la calma': { color: '#32c896', bg: 'rgba(50,200,150,0.1)', label: '❄️ VUELTA A LA CALMA' },
}
