import type { ModuleId } from '@/types'

// Definición canónica de los cinco módulos del panel. Es la fuente única que
// alimenta la barra lateral izquierda y el ruteo. Los `id` coinciden con los
// del backend (performance/models.py MODULE_CHOICES).
export interface ModuleDef {
  id: ModuleId
  label: string
  path: string // ruta relativa dentro de un centro
}

export const MODULES: ModuleDef[] = [
  { id: 'rendimiento', label: 'Rendimiento', path: 'rendimiento' },
  { id: 'lesiones', label: 'Lesiones', path: 'lesiones' },
  { id: 'test', label: 'Test', path: 'test' },
  { id: 'planificacion', label: 'Planificación', path: 'planificacion' },
  { id: 'psicologico', label: 'Psicológico', path: 'psicologico' },
]

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Claves de almacenamiento de tokens JWT (localStorage).
export const ACCESS_TOKEN_KEY = 'zperf_access'
export const REFRESH_TOKEN_KEY = 'zperf_refresh'
