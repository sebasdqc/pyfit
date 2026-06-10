// Llamadas al backend de Zyfit Academy (cursos, inscripción, progreso, etc.).
// El cliente axios (client.ts) ya añade el JWT y refresca ante 401.

import { api } from './client'
import type {
  Course, CourseDetail, Enrollment, EnrollmentDetail, Certificate, QuizAttempt,
} from '@/types'

// ── Catálogo / cursos ─────────────────────────────────────────────────────────

export interface CourseFilters {
  mine?: boolean
  categoria?: string
  nivel?: string
  q?: string
}

export async function listCourses(filters: CourseFilters = {}): Promise<Course[]> {
  const params: Record<string, string> = {}
  if (filters.mine) params.mine = '1'
  if (filters.categoria) params.categoria = filters.categoria
  if (filters.nivel) params.nivel = filters.nivel
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

export async function getCertificate(enrollmentId: number): Promise<Certificate> {
  const res = await api.get<Certificate>(`/academy/enrollments/${enrollmentId}/certificate/`)
  return res.data
}

export async function verifyCertificate(codigo: string): Promise<Certificate> {
  const res = await api.get<Certificate>(`/academy/certificates/verify/${encodeURIComponent(codigo)}/`)
  return res.data
}
