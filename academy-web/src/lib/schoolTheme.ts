// Identidad visual por escuela: un color + gradiente + ícono/motivo propios de
// cada escuela, usados de forma consistente en las portadas de curso y en las
// cabeceras del catálogo. Es un eje de color INDEPENDIENTE de la marca del tenant
// (los colores de marca son themables por CSS variables; estos identifican a la
// escuela dentro del catálogo Zyfit). Si un curso no tiene escuela, cae al tema
// neutro de marca.

import type { IconName } from '@/components/Icon'

export interface SchoolTheme {
  from: string // color inicial del gradiente (hex)
  to: string // color final del gradiente (hex)
  accent: string // color de acento (bordes, chips, íconos)
  icon: IconName // motivo temático de la escuela
}

const THEMES: Record<string, SchoolTheme> = {
  'entrenamiento-y-rendimiento-deportivo': {
    from: '#1e3a8a',
    to: '#0b1e40',
    accent: '#3b6fd4',
    icon: 'layers',
  },
  'readaptacion-deportiva-y-prevencion-de-lesiones': {
    from: '#0e7490',
    to: '#083641',
    accent: '#0e9bb8',
    icon: 'activity',
  },
  'recomposicion-corporal': {
    from: '#92400e',
    to: '#2c1204',
    accent: '#d97706',
    icon: 'flame',
  },
  'salud-y-bienestar-deportivo': {
    from: '#047857',
    to: '#052e26',
    accent: '#0d9668',
    icon: 'heart',
  },
  'psicologia-deportiva': {
    from: '#5b21b6',
    to: '#1e0a3c',
    accent: '#8b5cf6',
    icon: 'sparkles',
  },
  'biomecanica-y-readaptacion': {
    from: '#86198f',
    to: '#2c0a2f',
    accent: '#c026d3',
    icon: 'pitch',
  },
  'fisiologia-y-anatomia-aplicada': {
    from: '#9f1239',
    to: '#2c0a17',
    accent: '#e11d48',
    icon: 'doc',
  },
  'poblaciones-especiales': {
    from: '#854d0e',
    to: '#271703',
    accent: '#ca8a04',
    icon: 'users',
  },
  'negocio-y-marca-personal-en-el-deporte': {
    from: '#334155',
    to: '#0f172a',
    accent: '#64748b',
    icon: 'star',
  },
}

const FALLBACK: SchoolTheme = {
  from: '#1a3e72',
  to: '#0c1a30',
  accent: '#0066b3',
  icon: 'catalog',
}

export function schoolTheme(slug: string | null | undefined): SchoolTheme {
  return (slug && THEMES[slug]) || FALLBACK
}

// Gradiente CSS listo para inline style (portadas y cabeceras).
export function schoolGradient(theme: SchoolTheme): string {
  return `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`
}
