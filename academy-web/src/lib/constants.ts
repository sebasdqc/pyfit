export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const ACCESS_TOKEN_KEY = 'zacad_access'
export const REFRESH_TOKEN_KEY = 'zacad_refresh'

// Onboarding sin registro: id de la sesión anónima (ver lib/anonSession.ts).
export const ANON_SESSION_KEY = 'zacad_anon_session'

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

export const LIBRARY_TIPOS = [
  'documento', 'video', 'plantilla', 'guia', 'infografia', 'herramienta', 'enlace',
] as const

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

// Ejes de la formación CONMEBOL Evolución (academy.models: DISCIPLINA/LICENCIA/
// MODALIDAD_CHOICES). Un curso "normal" (sin licencia) queda con disciplina
// 'general', licencia '' y modalidad 'virtual' — son aditivos, no obligatorios.
export const DISCIPLINAS = [
  { id: 'general', label: 'General' },
  { id: 'futbol', label: 'Fútbol' },
  { id: 'futsal', label: 'Futsal' },
  { id: 'futbol_playa', label: 'Fútbol Playa' },
  { id: 'arqueros', label: 'Entrenadores de Arqueros' },
  { id: 'preparacion_fisica', label: 'Preparación Física' },
] as const

export const LICENCIAS = [
  { id: '', label: 'Sin licencia (curso/taller)' },
  { id: 'C', label: 'Licencia C' },
  { id: 'B', label: 'Licencia B' },
  { id: 'A', label: 'Licencia A' },
  { id: 'PRO', label: 'Licencia PRO' },
] as const

export const MODALIDADES = [
  { id: 'presencial', label: 'Presencial' },
  { id: 'virtual', label: 'Virtual' },
  { id: 'semipresencial', label: 'Semipresencial (blended)' },
] as const
