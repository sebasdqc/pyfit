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
  // Wizard de bienvenida del primer inicio de sesión. Viaja en el mismo payload
  // (no en una petición aparte) para decidir el destino de la sesión sin un
  // parpadeo entre el dashboard y /bienvenida.
  onboarding_completo: boolean
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
  nombre: string // nombre visible de la cuenta (servidor)
  registrado_por: number | null
  dorsal: string
  posicion: string
  grupo: string
  estado: 'activo' | 'lesionado' | 'baja'
  foto: string // data URL (base64) o '' — ver CenterAthlete.foto en el backend
  cuenta_activa: boolean // cuenta reclamada (puede iniciar sesión) vs invitación pendiente
  created_at: string
}

// Check-in de bienestar (performance.WellnessCheckin). `athlete` = id de USUARIO
// (no el del vínculo CenterAthlete). El índice y el estado los calcula el servidor.
export interface WellnessRecord {
  id: number
  center: number
  athlete: number
  fecha: string // YYYY-MM-DD
  sueno: number
  fatiga: number
  estres: number
  dolor_muscular: number
  animo: number
  indice_bienestar: number
  estado: 'ok' | 'duda' | 'alerta'
  notas: string
  created_at: string
}

// ── Módulo LESIONES (performance.InjuryReport) ───────────────────────────────
// `athlete` = id de USUARIO (no el del vínculo CenterAthlete). `zona_x`/`zona_y`
// son coordenadas sobre el maniquí del mapa corporal (viewBox 200×415).
export type InjurySeveridad = 'leve' | 'moderada' | 'grave'
export type InjuryEstadoApi = 'activa' | 'recuperacion' | 'alta'
export type InjuryTipo = 'muscular' | 'articular' | 'ligamentosa' | 'tendinosa' | 'osea'
export type InjuryVista = 'frente' | 'espalda'

export interface InjuryReport {
  id: number
  center: number
  athlete: number
  registrado_por: number | null
  fecha: string // YYYY-MM-DD
  zona: string
  tipo: InjuryTipo
  diagnostico: string
  mecanismo: string
  severidad: InjurySeveridad
  estado: InjuryEstadoApi
  tratamiento: string
  fecha_alta_estimada: string | null
  vista: InjuryVista
  zona_x: number
  zona_y: number
  dias_baja: number // derivado en el servidor
  notas: string
  created_at: string
}

// Registro persistido de un test (performance.PhysicalTest). `categoria` = familia.
export interface PhysicalTestRecord {
  id: number
  center: number
  athlete: number
  registrado_por: number | null
  fecha: string
  test_slug: string
  nombre: string
  categoria: string
  inputs: Record<string, unknown>
  resultados: Record<string, unknown>
  resultado: string | null
  unidad: string
  notas: string
  created_at: string
}

// ── Módulo CARGA INTERNA (sRPE → ACWR) — sobre PerformanceMetric, sin modelo nuevo.
// Las métricas (ACWR RA/EWMA, monotonía, strain, zona) las calcula el SERVIDOR
// (performance.carga_service, que delega en las calculadoras). `athlete` = id de USUARIO.
export interface CargaMetrics {
  dias_con_datos: number
  suficiente: boolean // ≥ 7 días de registro → ACWR con sentido
  carga_serie: number[] // carga diaria continua (UA), más antigua → hoy
  carga_semanal_ua: number
  carga_aguda_ua?: number
  carga_cronica_ua?: number
  acwr_ra: number | null
  acwr_ewma: number | null
  zona: string // Infracarga | Óptima (sweet spot) | Precaución | Zona de peligro | Riesgo alto | Acumulando datos
  riesgo_alerta: boolean
  monotonia: number | null
  strain_ua: number | null
  monotonia_alerta?: boolean
}

export interface CargaTeamRow extends CargaMetrics {
  athlete: number
}

export interface CargaRecord {
  id: number
  athlete: number
  fecha: string
  carga_ua: number
  metrica: string
  notas: string
}

export interface CargaAthleteResponse {
  athlete: number
  metricas: CargaMetrics | null
  registros: CargaRecord[]
}

// Registro persistido de una evaluación psicológica (performance.PsychAssessment).
export interface PsychRecord {
  id: number
  center: number
  athlete: number
  registrado_por: number | null
  fecha: string
  tipo: string
  instrument: string // slug del cuestionario
  subescalas: Record<string, number>
  resultados: { indice: number; indice_label: string; interpretacion: string } & Record<string, unknown>
  puntuacion: string | null
  notas: string
  created_at: string
}

// Miembro del staff de un centro (performance.CenterMembership).
export interface CenterStaff {
  id: number
  center: number
  user: number
  email: string
  nombre: string
  rol: CenterRole
  modulos: ModuleId[]
  activo: boolean
  created_at: string
}

// ── Simulador: pizarra táctica (performance.TacticalPlay) ────────────────────
// Coordenadas SIEMPRE normalizadas (x, y ∈ [0,1]) relativas al campo, nunca px.
export type FichaTipo = 'jugador' | 'rival' | 'balon'
export type TrazoTipo = 'pase' | 'conduccion' | 'mov_sin_balon' | 'bloqueo'

export interface Pt {
  x: number
  y: number
}

export interface Ficha {
  id: string
  tipo: FichaTipo
  ref?: string | number | null // id del atleta de la plantilla (solo 'jugador')
  etiqueta: string // dorsal / número de rival / ''
  x: number
  y: number
}

export interface Trazo {
  id: string
  tipo: TrazoTipo
  puntos: Pt[]
}

export interface EscenaFrame {
  fichas: Ficha[]
  trazos: Trazo[]
}

// La escena se guarda como lista de frames (keyframes) pensando en animaciones
// futuras; hoy la UI produce un único frame (estático).
export interface Escena {
  version: number
  frames: EscenaFrame[]
}

export interface TacticalPlay {
  id: number
  center: number
  nombre: string
  descripcion: string
  formacion: string
  campo: string
  escena: Escena
  registrado_por: number | null
  registrado_por_nombre: string
  created_at: string
  updated_at: string
}

// ── Módulo CALENDARIO: temporadas, torneos, partidos y eventos del centro ─────
export type EventTipo =
  | 'temporada'
  | 'torneo'
  | 'concentracion'
  | 'partido'
  | 'entrenamiento'
  | 'evaluacion'
  | 'descanso'
  | 'otro'

export type LocaliaTipo = 'local' | 'visita' | 'neutral' | ''

export interface CalendarEvent {
  id: number
  center: number
  tipo: EventTipo
  titulo: string
  descripcion: string
  fecha_inicio: string // YYYY-MM-DD
  fecha_fin: string | null // null = evento de un día
  hora_inicio: string | null // HH:MM:SS | null
  todo_el_dia: boolean
  ubicacion: string
  grupo: string
  rival: string
  localia: LocaliaTipo
  registrado_por: number | null
  registrado_por_nombre: string
  created_at: string
  updated_at: string
}

// ── Módulo TEST: catálogo de calculadoras (performance/calculators) ──────────
export type TestFamilia = 'fisico' | 'tecnico' | 'tactico' | 'carga' | 'prevencion'

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

// ── Módulo PLANIFICACIÓN: periodización (macro → meso → micro) ────────────────
export type MesoTipo =
  | 'prep_general' | 'prep_especifica' | 'precompetitivo' | 'competitivo' | 'transicion'
export type MicroTipo =
  | 'ajuste' | 'carga' | 'choque' | 'activacion' | 'competitivo' | 'recuperacion'
export type Nivel = 'bajo' | 'medio' | 'alto'
export type CargaObjetivo = 'baja' | 'media' | 'alta' | 'pico'

// Sesión (día) dentro de un microciclo — módulo PLANIFICACIÓN.
export type SesionTipo =
  | 'fuerza' | 'tecnico_tactico' | 'fisico' | 'recuperacion' | 'partido' | 'descanso' | 'otro'
export type SesionEstado = 'borrador' | 'generada' | 'publicada'
export type SesionOrigen = 'manual' | 'ia'

export interface PlannedSessionContenido {
  titulo?: string
  objetivo_sesion?: string
  fases?: Array<{
    nombre: string
    bloques: Array<{
      nombre: string
      duracion_min?: number
      descripcion?: string
      jugadores?: string
      espacio?: string
      objetivo?: string
    }>
  }>
  variantes_individuales?: Array<{ athlete_id: number; motivo: string; ajuste: string }>
  nota_del_cuerpo_tecnico?: string
}

export interface PlannedSession {
  id: number
  microciclo: number
  dia_semana: number // 0=lunes .. 6=domingo
  fecha: string | null
  orden: number
  tipo: SesionTipo
  nombre: string
  duracion_min: number | null
  rpe_objetivo: number | null
  carga_objetivo_ua: number | null
  evento: number | null
  evento_titulo: string | null
  evento_tipo: EventTipo | null
  origen: SesionOrigen
  contenido: PlannedSessionContenido
  respuesta_ia: PlannedSessionContenido | null
  generacion_ms: number | null
  tokens_in: number | null
  tokens_out: number | null
  estado: SesionEstado
  notas: string
  creado_por: number | null
  created_at: string
  updated_at: string
}

export interface Microcycle {
  id: number
  mesociclo: number
  orden: number
  fecha_inicio: string | null
  nombre: string
  tipo: MicroTipo
  carga_relativa: number
  volumen: Nivel
  intensidad: Nivel
  notas: string
  created_at: string
  sesiones: PlannedSession[]
}

// Sugerencia de solo lectura del motor asesor — GET .../microciclos/<id>/advisor/
export interface AdvisorSugerencia {
  nivel: 'microciclo' | 'mesociclo'
  campo: string
  valor_actual: string | number
  valor_sugerido: string | number
  motivo: string
}

export interface AdvisorResponse {
  disponible: boolean
  motivo?: string
  rango?: [string, string]
  real?: {
    carga: { n_con_datos: number; pct_riesgo_acwr: number; pct_monotonia_alerta: number }
    bienestar: { n_con_datos: number; indice_promedio: number | null }
  }
  sugerencias?: AdvisorSugerencia[]
}

// ── Forma (fitness-fatiga / TSB) — módulo Carga interna ───────────────────────
export type FormaZona = 'Fresco' | 'Neutro / transición' | 'Fatigado' | 'Acumulando datos'

export interface FormaMetrics {
  dias_con_datos: number
  suficiente: boolean
  zona: FormaZona
  tsb: number | null
  fitness_ua: number | null
  fatiga_ua: number | null
  fitness_serie: number[]
  fatiga_serie: number[]
  tsb_serie: number[]
  nota?: string
}

export interface FormaTeamRow extends FormaMetrics {
  athlete: number
}

export interface FormaTeamResponse {
  atletas: FormaTeamRow[]
  resumen_zonas: Record<'Fresco' | 'Neutro / transición' | 'Fatigado', number>
}

export interface FormaAthleteResponse {
  athlete: number
  forma: FormaMetrics
  registros: CargaRecord[]
}

export interface Mesocycle {
  id: number
  plan: number
  orden: number
  nombre: string
  tipo: MesoTipo
  enfasis: string
  carga_objetivo: CargaObjetivo
  duracion_semanas: number
  notas: string
  created_at: string
  microciclos: Microcycle[]
}

export interface TrainingPlan {
  id: number
  center: number
  athlete: number | null
  creado_por: number | null
  nombre: string
  objetivo: string
  grupo: string
  descripcion: string
  fecha_inicio: string
  fecha_fin: string | null
  created_at: string
  total_mesociclos: number
  total_microciclos: number
}

export interface TrainingPlanDetail extends TrainingPlan {
  mesociclos: Mesocycle[]
}


// ─── Onboarding de bienvenida (POST /performance/onboarding/) ────────────────
// Los IDs espejan performance/models.py: CARGO_CHOICES, DISCIPLINA_CHOICES,
// TAMANO_PLANTEL_CHOICES, NECESIDAD_CHOICES y CANAL_CHOICES.

// Mismos IDs que /para-quien/:segment en la landing pública, a propósito.
export type SegmentoId = 'equipos' | 'instituciones' | 'atletas'

export type CargoId =
  | 'preparador_fisico' | 'entrenador' | 'analista' | 'coordinador'
  | 'director_deportivo' | 'dueno' | 'fisioterapeuta' | 'medico'
  | 'nutricionista' | 'psicologo' | 'atleta'
  | 'profesor_ef' | 'director_institucion' | 'entrenador_personal'
  | 'otro'

export type DisciplinaId =
  | 'futbol' | 'futsal' | 'basquet' | 'voley' | 'handball' | 'rugby'
  | 'atletismo' | 'natacion' | 'ciclismo' | 'tenis' | 'combate'
  | 'multideporte' | 'otro'

export type TamanoPlantelId = 'solo_1' | '2_15' | '16_30' | '31_60' | '61_mas'

export type NecesidadId =
  | 'rendimiento' | 'lesiones' | 'tests' | 'carga' | 'planificacion'
  | 'gps' | 'psicologico' | 'calendario' | 'reportes' | 'asesor_ia'

export type CanalId =
  | 'recomendacion' | 'equipo_zyfit' | 'redes' | 'buscador' | 'evento'
  | 'academy' | 'prensa' | 'otro'

export interface OnboardingState {
  segmento: SegmentoId | ''
  pais: string // ISO 3166-1 alfa-2 ('AR', 'CL', …) o '' si no se contestó
  cargo: CargoId | ''
  cargo_otro: string
  disciplina: DisciplinaId | ''
  disciplina_otro: string
  tamano_plantel: TamanoPlantelId | ''
  necesidades: NecesidadId[]
  canal: CanalId | ''
  canal_otro: string
  completado: boolean
  completado_at: string | null
  updated_at: string
}

// Todo es parcial: el wizard guarda paso a paso.
export type OnboardingPatch = Partial<
  Omit<OnboardingState, 'completado' | 'completado_at' | 'updated_at'>
> & { completado?: true }
