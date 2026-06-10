// Tipos compartidos de la web de Academy. Espejan las respuestas del backend
// Django (academy/serializers.py + academy/views._user_payload).

export type GlobalRole = 'athlete' | 'coach' | 'director_tecnico' | 'admin'
export type Nivel = 'principiante' | 'intermedio' | 'avanzado'
// Ejes de la formación CONMEBOL Evolución (ver lib/constants.ts).
export type Disciplina =
  | 'general' | 'futbol' | 'futsal' | 'futbol_playa' | 'arqueros' | 'preparacion_fisica'
export type Licencia = '' | 'C' | 'B' | 'A' | 'PRO'
export type Modalidad = 'presencial' | 'virtual' | 'semipresencial'
export type LessonTipo = 'video' | 'texto' | 'quiz'
export type QuestionTipo = 'opcion_unica' | 'opcion_multiple' | 'verdadero_falso'
export type EnrollmentEstado = 'activa' | 'completada' | 'cancelada'

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

export interface Course {
  id: number
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
  video_url: string
  duracion_min: number
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

export interface CourseDetail extends Course {
  modulos: Module[]
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

export interface EnrollmentDetail extends Enrollment {
  curso: CourseDetail
  lecciones_completadas: number[]
  intentos: QuizAttempt[]
}

export interface Certificate {
  id: number
  enrollment: number
  codigo: string
  curso_titulo: string
  estudiante_nombre: string
  emitido_at: string
}
