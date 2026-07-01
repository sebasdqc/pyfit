// Constantes de la web de Zyfit Academy.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Slug del tenant activo. Se inyecta en BUILD TIME vía VITE_TENANT_SLUG.
// El cliente axios lo envía como X-Tenant-Slug en cada request para que el
// backend resuelva el catálogo correcto sin necesitar dominios propios.
// Vacío = catálogo raíz de Zyfit (local dev sin tenant específico).
export const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || ''

// Claves de almacenamiento de tokens JWT (localStorage). Prefijo propio para no
// colisionar con el panel Performance (zperf_*) si comparten dominio en el futuro.
export const ACCESS_TOKEN_KEY = 'zacad_access'
export const REFRESH_TOKEN_KEY = 'zacad_refresh'

// Identidad de producto base. El branding específico (colores, tagline, logo)
// lo provee el tenant via API → TenantContext. Solo name/product son fijos.
export const BRAND = {
  name: 'Zyfit',
  product: 'Academy',
}

// Catálogos de presentación (coinciden con los choices del backend).
export const NIVELES = [
  { id: 'principiante', label: 'Principiante' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'avanzado', label: 'Avanzado' },
] as const

// Categorías sugeridas. Es solo una ayuda de UI (el backend acepta texto libre).
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
  'formación de entrenadores',
] as const

export const NIVEL_LABEL: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

// ── Ejes de la formación CONMEBOL Evolución (espejan los choices del backend) ──

// Disciplina federada del curso. 'general' = curso de Academy no ligado a una
// disciplina (p. ej. fuerza); el resto replica las disciplinas CONMEBOL.
export const DISCIPLINAS = [
  { id: 'general', label: 'General' },
  { id: 'futbol', label: 'Fútbol' },
  { id: 'futsal', label: 'Futsal' },
  { id: 'futbol_playa', label: 'Fútbol Playa' },
  { id: 'arqueros', label: 'Entrenadores de Arqueros' },
  { id: 'preparacion_fisica', label: 'Preparación Física' },
] as const

export const DISCIPLINA_LABEL: Record<string, string> = Object.fromEntries(
  DISCIPLINAS.map((d) => [d.id, d.label]),
)

// Niveles de Licencia CONMEBOL (itinerario escalonado C → B → A → PRO). El valor
// vacío ('') significa curso/taller sin licencia.
export const LICENCIAS = [
  { id: 'C', label: 'Licencia C' },
  { id: 'B', label: 'Licencia B' },
  { id: 'A', label: 'Licencia A' },
  { id: 'PRO', label: 'Licencia PRO' },
] as const

export const LICENCIA_LABEL: Record<string, string> = Object.fromEntries(
  LICENCIAS.map((l) => [l.id, l.label]),
)

export const MODALIDADES = [
  { id: 'presencial', label: 'Presencial' },
  { id: 'virtual', label: 'Virtual' },
  { id: 'semipresencial', label: 'Semipresencial' },
] as const

export const MODALIDAD_LABEL: Record<string, string> = Object.fromEntries(
  MODALIDADES.map((m) => [m.id, m.label]),
)
