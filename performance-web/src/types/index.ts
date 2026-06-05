// Tipos compartidos del panel. Espejan las respuestas del backend Django
// (performance/serializers.py + views._user_payload).

export type ModuleId =
  | 'rendimiento'
  | 'lesiones'
  | 'test'
  | 'planificacion'
  | 'psicologico'

export type GlobalRole = 'athlete' | 'coach' | 'director_tecnico' | 'admin'

export type CenterRole =
  | 'director_tecnico'
  | 'preparador_fisico'
  | 'fisioterapeuta'
  | 'analista'
  | 'planificador'
  | 'psicologo'

export interface CenterMembershipSummary {
  center_id: number
  center_nombre: string
  rol: CenterRole
  modulos: ModuleId[]
}

// Payload de /api/performance/me/ y del login.
export interface AuthUser {
  id: number
  email: string
  nombre: string
  role: GlobalRole
  is_admin: boolean
  is_director: boolean
  modulos_globales: ModuleId[]
  centros: CenterMembershipSummary[]
}

export interface LoginResponse {
  access: string
  refresh: string
  user: AuthUser
}

export interface SportsCenter {
  id: number
  nombre: string
  slug: string
  ciudad: string
  pais: string
  disciplina: string
  director_principal: number | null
  activo: boolean
  created_at: string
  total_atletas: number
  total_staff: number
}

export interface CenterAthlete {
  id: number
  center: number
  athlete: number
  email: string
  registrado_por: number | null
  dorsal: string
  posicion: string
  grupo: string
  estado: 'activo' | 'lesionado' | 'baja'
  created_at: string
}
