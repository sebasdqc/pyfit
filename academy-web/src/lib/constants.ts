// Constantes de la web de Zyfit Academy.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Claves de almacenamiento de tokens JWT (localStorage). Prefijo propio para no
// colisionar con el panel Performance (zperf_*) si comparten dominio en el futuro.
export const ACCESS_TOKEN_KEY = 'zacad_access'
export const REFRESH_TOKEN_KEY = 'zacad_refresh'

// Identidad de producto. La marca visual sigue el manual CONMEBOL; el nombre del
// producto es Zyfit Academy. Centralizado para ajustarlo en una sola línea.
export const BRAND = {
  name: 'Zyfit',
  product: 'Academy',
  tagline: 'Cree en grande',
}

// Catálogos de presentación (coinciden con los choices del backend).
export const NIVELES = [
  { id: 'principiante', label: 'Principiante' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'avanzado', label: 'Avanzado' },
] as const

// Categorías sugeridas. Es solo una ayuda de UI (el backend acepta texto libre);
// son placeholders que profundizaremos en próximas iteraciones.
export const CATEGORIAS = [
  'entrenamiento',
  'nutrición',
  'salud',
  'movilidad',
  'táctica',
  'arbitraje',
] as const

export const NIVEL_LABEL: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}
