export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const ACCESS_TOKEN_KEY = 'zacad_access'
export const REFRESH_TOKEN_KEY = 'zacad_refresh'

export const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || ''

export const BRAND = {
  name: 'Zyfit',
  product: 'Academy',
}

export const NIVELES = [
  { id: 'principiante', label: 'Principiante' },
  { id: 'intermedio',   label: 'Intermedio' },
  { id: 'avanzado',     label: 'Avanzado' },
] as const

export const NIVEL_LABEL: Record<string, string> = {
  principiante: 'Principiante',
  intermedio:   'Intermedio',
  avanzado:     'Avanzado',
}

export const CATEGORIAS = [
  'entrenamiento personal',
  'nutrición deportiva',
  'fisiología del ejercicio',
  'entrenamiento concurrente',
  'suplementación',
  'biomecánica',
  'rendimiento deportivo',
  'recuperación y salud',
  'preparación física',
  'metodología del entrenamiento',
] as const
