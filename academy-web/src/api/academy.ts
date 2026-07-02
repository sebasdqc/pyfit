// Llamadas al backend de Zyfit Academy (cursos, inscripción, progreso, etc.).
// El cliente axios (client.ts) ya añade el JWT y refresca ante 401.

import { api } from './client'
import type {
  Course, CourseDetail, Enrollment, EnrollmentDetail, Certificate, Lesson,
  LessonTipo, QuizAttempt, Submission, SubmissionEstado, School,
} from '@/types'

// ── Escuelas ──────────────────────────────────────────────────────────────────

export async function listSchools(): Promise<School[]> {
  const res = await api.get<School[]>('/academy/schools/')
  return res.data
}

// ── Catálogo / cursos ─────────────────────────────────────────────────────────

export interface CourseFilters {
  mine?: boolean
  categoria?: string
  nivel?: string
  disciplina?: string
  licencia?: string
  q?: string
}

export async function listCourses(filters: CourseFilters = {}): Promise<Course[]> {
  const params: Record<string, string> = {}
  if (filters.mine) params.mine = '1'
  if (filters.categoria) params.categoria = filters.categoria
  if (filters.nivel) params.nivel = filters.nivel
  if (filters.disciplina) params.disciplina = filters.disciplina
  if (filters.licencia) params.licencia = filters.licencia
  if (filters.q) params.q = filters.q
  const res = await api.get<Course[]>('/academy/courses/', { params })
  return res.data
}

export async function getCourse(id: number): Promise<CourseDetail> {
  const res = await api.get<CourseDetail>(`/academy/courses/${id}/`)
  return res.data
}

export interface CreateCoursePayload {
  titulo: string
  slug: string
  resumen?: string
  descripcion?: string
  categoria?: string
  nivel?: string
  disciplina?: string
  licencia?: string
  modalidad?: string
  carga_horaria_h?: number
  acredita_renovacion?: boolean
  duracion_estimada_min?: number
  publicado?: boolean
}

export async function createCourse(payload: CreateCoursePayload): Promise<Course> {
  const res = await api.post<Course>('/academy/courses/', payload)
  return res.data
}

export async function updateCourse(id: number, payload: Partial<CreateCoursePayload>): Promise<CourseDetail> {
  const res = await api.patch<CourseDetail>(`/academy/courses/${id}/`, payload)
  return res.data
}

// Edición puntual de una lección (autor/admin). Lo usa la pantalla "Contenido"
// del instructor para anexar/quitar el video de una lección o retiparla.
export interface UpdateLessonPayload {
  tipo?: LessonTipo
  video_url?: string
  titulo?: string
  contenido?: string
  duracion_min?: number
}

export async function updateLesson(
  courseId: number,
  moduleId: number,
  lessonId: number,
  payload: UpdateLessonPayload,
): Promise<Lesson> {
  const res = await api.patch<Lesson>(
    `/academy/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`,
    payload,
  )
  return res.data
}

// ── Inscripción / aprendizaje ───────────────────────────────────────────────

export async function enroll(courseId: number): Promise<Enrollment> {
  const res = await api.post<Enrollment>(`/academy/courses/${courseId}/enroll/`)
  return res.data
}

export async function listMyEnrollments(): Promise<Enrollment[]> {
  const res = await api.get<Enrollment[]>('/academy/enrollments/')
  return res.data
}

export async function getEnrollment(id: number): Promise<EnrollmentDetail> {
  const res = await api.get<EnrollmentDetail>(`/academy/enrollments/${id}/`)
  return res.data
}

export async function completeLesson(enrollmentId: number, lessonId: number): Promise<{ progreso: number; estado: string }> {
  const res = await api.post(`/academy/enrollments/${enrollmentId}/lessons/${lessonId}/complete/`)
  return res.data
}

// El intento de quiz lo califica el SERVIDOR; la respuesta añade el progreso y
// estado actualizados de la matrícula (la vista los agrega al QuizAttempt).
export interface AttemptResult extends QuizAttempt {
  progreso: number
  estado: string
}

export async function submitQuizAttempt(
  enrollmentId: number,
  quizId: number,
  respuestas: Record<string, string[]>,
): Promise<AttemptResult> {
  const res = await api.post<AttemptResult>(
    `/academy/enrollments/${enrollmentId}/quizzes/${quizId}/attempt/`,
    { respuestas },
  )
  return res.data
}

// ── Entregables del Programa Evolución 360° ──────────────────────────────────

// Envía (o reenvía, si fue rechazada / sigue en revisión) mi entrega de una
// lección entregable. El estado y la revisión los gestiona el servidor.
export async function submitDeliverable(
  enrollmentId: number,
  lessonId: number,
  payload: { texto?: string; video_url?: string },
): Promise<Submission> {
  const res = await api.post<Submission>(
    `/academy/enrollments/${enrollmentId}/lessons/${lessonId}/submission/`,
    payload,
  )
  return res.data
}

// Bandeja de entregas de un curso (solo autor/admin).
export async function listCourseSubmissions(
  courseId: number,
  estado?: SubmissionEstado,
): Promise<Submission[]> {
  const res = await api.get<Submission[]>(`/academy/courses/${courseId}/submissions/`, {
    params: estado ? { estado } : {},
  })
  return res.data
}

// Revisión del instructor. Al aprobar, el servidor completa la lección,
// recalcula progreso e insignias y devuelve la entrega actualizada.
export interface ReviewResult extends Submission {
  progreso: number
  estado_matricula: string
}

export async function reviewSubmission(
  submissionId: number,
  payload: { estado: 'aprobada' | 'rechazada'; feedback?: string },
): Promise<ReviewResult> {
  const res = await api.post<ReviewResult>(`/academy/submissions/${submissionId}/review/`, payload)
  return res.data
}

export async function getCertificate(enrollmentId: number): Promise<Certificate> {
  const res = await api.get<Certificate>(`/academy/enrollments/${enrollmentId}/certificate/`)
  return res.data
}

export async function verifyCertificate(codigo: string): Promise<Certificate> {
  const res = await api.get<Certificate>(`/academy/certificates/verify/${encodeURIComponent(codigo)}/`)
  return res.data
}
