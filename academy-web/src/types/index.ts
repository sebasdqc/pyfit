// Tipos compartidos de la web de Academy. Espejan las respuestas del backend
// Django (academy/serializers.py + academy/views._user_payload).

// ── White-label / tenant ──────────────────────────────────────────────────────

export interface TenantConfig {
  slug?: string
  nombre_plataforma: string
  // Colores en hex (#rrggbb). El frontend los convierte a canales RGB al
  // aplicarlos como CSS variables para soportar los modificadores de opacidad.
  color_brand:        string
  color_brand_dark:   string
  color_brand_deep:   string
  color_accent:       string
  color_accent_light: string
  color_accent_dark:  string
  color_ok:     string
  color_warn:   string
  color_danger: string
  fuente:      string
  tagline:     string
  logo_url:    string
  favicon_url: string
  tema:        'light' | 'dark'
}

export type GlobalRole = 'athlete' | 'coach' | 'director_tecnico' | 'admin'
export type Nivel = 'principiante' | 'intermedio' | 'avanzado'
// Ejes de la formación CONMEBOL Evolución (ver lib/constants.ts).
export type Disciplina =
  | 'general' | 'futbol' | 'futsal' | 'futbol_playa' | 'arqueros' | 'preparacion_fisica'
export type Licencia = '' | 'C' | 'B' | 'A' | 'PRO'
export type Modalidad = 'presencial' | 'virtual' | 'semipresencial'
// Los tres últimos tipos son del Programa Evolución 360° (modalidad híbrida):
// sesión sincrónica en vivo, práctica presencial y entregable con revisión.
export type LessonTipo = 'video' | 'texto' | 'audio' | 'quiz' | 'en_vivo' | 'practica' | 'entregable'
export type EntregableTipo = '' | 'texto' | 'video' | 'planificacion'
export type QuestionTipo = 'opcion_unica' | 'opcion_multiple' | 'verdadero_falso'
export type EnrollmentEstado = 'activa' | 'completada' | 'cancelada'
export type SubmissionEstado = 'enviada' | 'aprobada' | 'rechazada'

// Payload de /api/academy/me/ y del login.
export interface AuthUser {
  id: number
  email: string
  nombre: string
  role: GlobalRole
  is_admin: boolean
  is_instructor: boolean
  puede_crear_cursos: boolean
  total_inscripciones: number
  total_cursos_creados: number
}

export interface LoginResponse {
  access: string
  refresh: string
  user: AuthUser
}

// ── Catálogo ────────────────────────────────────────────────────────────────

export interface School {
  id: number
  nombre: string
  slug: string
  descripcion: string
  orden: number
  total_cursos: number
  created_at: string
  cursos: Course[]
}

export interface Course {
  id: number
  school: number | null
  escuela_nombre: string | null
  escuela_slug: string | null
  instructor: number | null
  instructor_nombre: string
  titulo: string
  slug: string
  resumen: string
  descripcion: string
  categoria: string
  nivel: Nivel
  // Ejes de la formación CONMEBOL Evolución.
  disciplina: Disciplina
  licencia: Licencia
  modalidad: Modalidad
  carga_horaria_h: number // carga horaria oficial, en horas (0 si no aplica)
  acredita_renovacion: boolean // acredita horas para renovar la licencia (≥20h/3 años)
  portada: string // data URL, URL http(s) o '' (placeholder en UI)
  duracion_estimada_min: number
  publicado: boolean
  total_modulos: number
  total_lecciones: number
  total_inscritos: number
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  id: number
  quiz: number
  orden: number
  enunciado: string
  video_url: string // Video-Quiz Interactivo: clip de juego de la pregunta ('' si no hay)
  tipo: QuestionTipo
  opciones: { id: string; texto: string }[]
  puntos: number
  // `respuestas_correctas` NO se expone al estudiante (solo al autor).
  respuestas_correctas?: string[]
}

export interface Quiz {
  id: number
  lesson: number
  titulo: string
  puntaje_aprobacion: number
  preguntas: QuizQuestion[]
  total_puntos: number
}

export interface Lesson {
  id: number
  module: number
  orden: number
  titulo: string
  tipo: LessonTipo
  contenido: string
  video_url: string // video de la lección o enlace de la reunión (en_vivo)
  duracion_min: number
  fecha_en_vivo: string | null // fecha/hora de la sesión sincrónica (en_vivo)
  entregable_tipo: EntregableTipo // qué sube el estudiante (solo tipo entregable)
  quiz: Quiz | null
  created_at: string
}

export interface Module {
  id: number
  course: number
  orden: number
  titulo: string
  descripcion: string
  lecciones: Lesson[]
  created_at: string
}

// Insignia del Check-list de Competencias (Programa 360°): hito ligado a la
// lección que la otorga al completarse (las otorga SIEMPRE el servidor).
export interface CourseBadge {
  id: number
  course: number
  orden: number
  nombre: string
  icono: string // emoji
  descripcion: string
  lesson: number
}

export interface CourseDetail extends Course {
  modulos: Module[]
  insignias: CourseBadge[]
}

// ── Aprendizaje ───────────────────────────────────────────────────────────────

export interface QuizAttempt {
  id: number
  enrollment: number
  quiz: number
  respuestas: Record<string, string[]>
  detalle: { question_id: number; correcta: boolean; puntos: number }[]
  puntaje: number
  aprobado: boolean
  created_at: string
}

export interface Enrollment {
  id: number
  student: number
  course: number
  curso_titulo: string
  curso_slug: string
  estudiante_nombre: string
  estado: EnrollmentEstado
  progreso: number
  certificado: string | null // código del certificado o null
  created_at: string
  completado_at: string | null
}

// Entrega de un "entregable" (Programa 360°). El estudiante envía texto o la URL
// de su video; estado/feedback/revisión los escribe el servidor.
export interface Submission {
  id: number
  enrollment: number
  lesson: number
  leccion_titulo: string
  entregable_tipo: EntregableTipo
  estudiante_nombre: string
  texto: string
  video_url: string
  estado: SubmissionEstado
  feedback: string
  revisado_por: number | null
  revisado_por_nombre: string
  revisado_at: string | null
  created_at: string
  updated_at: string
}

export interface EarnedBadgeEntry {
  badge: number // id de la CourseBadge
  otorgada_at: string
}

export interface EnrollmentDetail extends Enrollment {
  curso: CourseDetail
  lecciones_completadas: number[]
  intentos: QuizAttempt[]
  entregas: Submission[]
  insignias_obtenidas: EarnedBadgeEntry[]
}

export interface Certificate {
  id: number
  enrollment: number
  codigo: string
  curso_titulo: string
  estudiante_nombre: string
  emitido_at: string
}

// ── Racha de estudio (gamificación de retención) ──────────────────────────────
// Espeja academy.streak_service.streak_state().

export type StreakEstado = 'sin_iniciar' | 'activa' | 'en_riesgo' | 'congelada' | 'recuperable'
export type StreakColor = 'brand' | 'accent' | 'ok' | 'warn' | 'neutral'

export interface StreakAlerta {
  tipo: string
  mensaje: string
  color: StreakColor
}

export interface StreakLogro {
  id: string
  label: string
  icon: string // emoji
}

export interface StreakRecuperacion {
  racha_en_riesgo: number
  horas_restantes: number
}

export interface StreakState {
  racha_actual: number
  mejor_racha: number
  ultima_actividad: string | null
  estudiado_hoy: boolean
  estado: StreakEstado
  en_riesgo: boolean
  freezes_disponibles: number
  freezes_usados: number
  congelada: boolean
  proximo_freeze_en: number | null // días hasta el próximo freeze (null si al tope)
  freezes_max: number
  dias_por_freeze: number
  recuperacion: StreakRecuperacion | null
  total_dias_activos: number
  total_rachas_rotas: number
  puntos_totales: number
  logros: StreakLogro[]
  alerta: StreakAlerta | null
}

// ── Dashboard (Home del estudiante) ───────────────────────────────────────────
// Espeja academy.dashboard_service.build_dashboard().

export type CourseEstado = 'completado' | 'en_progreso' | 'no_iniciado'

export interface DashboardCourse {
  id: number
  titulo: string
  slug: string
  estado: CourseEstado
  progreso: number
  enrollment_id: number | null
  certificado: string | null
}

export interface DashboardSchool {
  id: number
  nombre: string
  slug: string
  orden: number
  progreso_general: number
  total_cursos: number
  cursos_completados: number
  cursos_en_progreso: number
  cursos_no_iniciados: number
  cursos: DashboardCourse[]
}

export interface DashboardEarnedBadge {
  id: number
  nombre: string
  icono: string // emoji
  descripcion: string
  curso_id: number
  curso_titulo: string
  otorgada_at: string
}

export interface DashboardNextStep {
  enrollment_id: number
  curso_id: number
  curso_titulo: string
  curso_slug: string
  escuela_nombre: string | null
  progreso: number
  leccion: { id: number; titulo: string; tipo: LessonTipo; modulo_titulo: string }
}

export interface DashboardStats {
  cursos_completados: number
  cursos_activos: number
  total_inscripciones: number
  mejor_racha: number
  // Estimado a partir de la duración de las lecciones completadas — no es
  // tiempo de reproducción medido.
  minutos_estimados_invertidos: number
}

export interface DashboardData {
  progreso_general: number
  tiene_matriculas: boolean
  escuelas: DashboardSchool[]
  racha: StreakState
  insignias: { total: number; recientes: DashboardEarnedBadge[] }
  continuar: DashboardNextStep | null
  siguiente_paso: DashboardNextStep | null
  stats: DashboardStats
}
