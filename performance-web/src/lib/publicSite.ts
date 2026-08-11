// Constantes y copy compartidos entre las páginas públicas de Zyfit
// Performance (Landing, Precio, Para quién) — evita repetir el mismo texto
// de módulos/contacto/logo en cada archivo de página nueva.
//
// `name`/`body` YA NO viven acá: con la traducción es/en (ver src/locale/),
// el nombre visible cambia según el idioma, así que cada página resuelve el
// texto con `t(\`modules.${id}.name\`)` — este array solo fija el id estable
// (usado también para filtrar en AudiencePage) y el ícono.

import type { IconName } from '@/components/Icon'

export const CONTACT_HREF = 'https://pyfit.app'
export const LOGO_IMAGE = '/Logo-Zyfit-Blanco.png'

export type ModuleId =
  | 'rendimiento'
  | 'lesiones'
  | 'tests'
  | 'planificacion'
  | 'psicologico'
  | 'simulador'
  | 'calendario'

export const MODULES: { id: ModuleId; icon: IconName }[] = [
  { id: 'rendimiento', icon: 'rendimiento' },
  { id: 'lesiones', icon: 'lesiones' },
  { id: 'tests', icon: 'tests' },
  { id: 'planificacion', icon: 'planificacion' },
  { id: 'psicologico', icon: 'psicologico' },
  { id: 'simulador', icon: 'simulador' },
  { id: 'calendario', icon: 'calendario' },
]
