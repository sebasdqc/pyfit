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

// ── Módulo TEST: catálogo de calculadoras (performance/calculators) ──────────
export type TestFamilia = 'fisico' | 'tecnico' | 'tactico'

// Sub-campo de un input compuesto (p. ej. cada fila de componentes del GPAI).
export interface TestSchemaSubField {
  name: string
  label: string
  type: 'text' | 'int' | 'number'
  min?: number
  max?: number
}

// Un campo del formulario que el frontend renderiza desde el backend.
export interface TestSchemaField {
  name: string
  label: string
  type: 'int' | 'number' | 'list' | 'componentes'
  unit?: string
  required?: boolean
  min?: number
  max?: number
  fields?: TestSchemaSubField[] // solo cuando type === 'componentes'
}

export interface TestCatalogItem {
  slug: string
  familia: TestFamilia
  nombre: string
  descripcion: string
  input_schema: TestSchemaField[]
}

// Respuesta de POST /tests/compute/ (cálculo en servidor, sin persistir).
export interface TestComputeResponse {
  test_slug: string
  nombre: string
  familia: TestFamilia
  resultados: Record<string, unknown>
}
