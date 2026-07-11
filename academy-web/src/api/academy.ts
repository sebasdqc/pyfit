// Llamadas al backend de Zyfit Academy (cursos, inscripción, progreso, etc.).
// El cliente axios (client.ts) ya añade el JWT y refresca ante 401.

import { api } from './client'
import type {
  AcademyBadgeCatalog, AcademyPlanTipo, AcademyPromoValidation, AcademySolicitudSuscripcion,
  AcademySubscriptionStatus, AcademyUserAccount, AcademyUserRol,
  BlogPost, BlogPostDetail,
  Course, CourseDetail,
  DashboardData, Enrollment, EnrollmentDetail, Certificate, Lesson, LessonTipo,
  LibraryResource, LibraryTipo, Module,
  NuevaInsigniaOtorgada, QuizAttempt, Submission, SubmissionEstado, School, StreakState,
  SimuladorCargaResponse, SimuladorSesionCaso, SimuladorSesionResultado,
  SimuladorPrevencionCaso, SimuladorPrevencionResultado,
  SupportFAQItem, SupportMessageItem, SupportThreadSummary,
} from '@/types'

// ── Racha de estudio ──────────────────────────────────────────────────────────

export async function getStreak(): Promise<StreakState> {
  const res = await api.get<StreakState>('/academy/streak/')
  return res.data
}

// ── Dashboard (Home del estudiante) ───────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get<DashboardData>('/academy/dashboard/')
  return res.data
}

// ── Insignias de identidad ────────────────────────────────────────────────────

export async function getBadges(): Promise<AcademyBadgeCatalog> {
  const res = await api.get<AcademyBadgeCatalog>('/academy/badges/')
  return res.data
}

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
  school?: number | null
  disciplina?: string
  licencia?: string
  modalidad?: string
  carga_horaria_h?: number
  acredita_renovacion?: boolean
  portada?: string
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

export async function deleteCourse(id: number): Promise<void> {
  await api.delete(`/academy/courses/${id}/`)
}

// ── Módulos (autor/admin) ────────────────────────────────────────────────────

export interface ModulePayload {
  titulo?: string
  descripcion?: string
  es_gratuito?: boolean
  orden?: number
}

export async function createModule(courseId: number, payload: ModulePayload): Promise<Module> {
  const res = await api.post<Module>(`/academy/courses/${courseId}/modules/`, payload)
  return res.data
}

export async function updateModule(
  courseId: number, moduleId: number, payload: ModulePayload,
): Promise<Module> {
  const res = await api.patch<Module>(`/academy/courses/${courseId}/modules/${moduleId}/`, payload)
  return res.data
}

export async function deleteModule(courseId: number, moduleId: number): Promise<void> {
  await api.delete(`/academy/courses/${courseId}/modules/${moduleId}/`)
}

// ── Lecciones (autor/admin) — creación y borrado; la edición puntual (video,
// título, contenido, tipo) ya la resuelve `updateLesson` de más abajo ────────

export interface CreateLessonPayload {
  titulo: string
  tipo?: LessonTipo
  contenido?: string
  video_url?: string
  orden?: number
  puntos?: number
}

export async function createLesson(
  courseId: number, moduleId: number, payload: CreateLessonPayload,
): Promise<Lesson> {
  const res = await api.post<Lesson>(
    `/academy/courses/${courseId}/modules/${moduleId}/lessons/`, payload,
  )
  return res.data
}

export async function deleteLesson(courseId: number, moduleId: number, lessonId: number): Promise<void> {
  await api.delete(`/academy/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`)
}

// Edición puntual de una lección (autor/admin). Lo usa la pantalla "Contenido"
// del instructor para anexar/quitar el video de una lección o retiparla.
export interface UpdateLessonPayload {
  tipo?: LessonTipo
  video_url?: string
  titulo?: string
  contenido?: string
  duracion_min?: number
  orden?: number
  puntos?: number
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

export async function completeLesson(
  enrollmentId: number,
  lessonId: number,
): Promise<{
  progreso: number
  estado: string
  racha_estudio: number | null
  nuevas_insignias: NuevaInsigniaOtorgada[]
}> {
  const res = await api.post(`/academy/enrollments/${enrollmentId}/lessons/${lessonId}/complete/`)
  return res.data
}

// El intento de quiz lo califica el SERVIDOR; la respuesta añade el progreso y
// estado actualizados de la matrícula (la vista los agrega al QuizAttempt).
// `racha_estudio` = racha de estudio tras contar este quiz como actividad del día.
// `nuevas_insignias` = insignias de identidad recién otorgadas en esta misma request.
export interface AttemptResult extends QuizAttempt {
  progreso: number
  estado: string
  racha_estudio: number | null
  nuevas_insignias: NuevaInsigniaOtorgada[]
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
// `nuevas_insignias` son del ALUMNO de la matrícula (no del instructor que revisa).
export interface ReviewResult extends Submission {
  progreso: number
  estado_matricula: string
  nuevas_insignias: NuevaInsigniaOtorgada[]
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

// ── Suscripción "Zyfit Academy Pro" ───────────────────────────────────────────
// No hay endpoint de "activar": sin cobrador conectado todavía, activar solo
// lo hace Django Admin o el webhook de pago — ver academy.payments (backend).

export async function getSubscriptionStatus(): Promise<AcademySubscriptionStatus> {
  const res = await api.get<AcademySubscriptionStatus>('/academy/subscription/')
  return res.data
}

export async function cancelSubscription(): Promise<AcademySubscriptionStatus> {
  const res = await api.post<AcademySubscriptionStatus>('/academy/subscription/cancelar/')
  return res.data
}

// ── Códigos de descuento de influencer (`/api/promos/`, producto 'academy_pro') ──
// Mismo backend administrado que usa mobile para Zyfit Pro (ver promos.views),
// generalizado con un campo `producto` — no hay endpoint de "activar": eso solo
// lo hace Django Admin al confirmar la solicitud.

export async function validarCodigoPromocional(planTipo: AcademyPlanTipo, codigo?: string): Promise<AcademyPromoValidation> {
  const res = await api.post<AcademyPromoValidation>('/promos/validar/', {
    producto: 'academy_pro', plan_tipo: planTipo, codigo,
  })
  return res.data
}

export async function crearSolicitudSuscripcion(planTipo: AcademyPlanTipo, codigo?: string): Promise<AcademySolicitudSuscripcion> {
  const body: Record<string, string> = { producto: 'academy_pro', plan_tipo: planTipo }
  if (codigo) body.codigo = codigo
  const res = await api.post<AcademySolicitudSuscripcion>('/promos/solicitudes/', body)
  return res.data
}

export async function getMiSolicitudSuscripcion(): Promise<AcademySolicitudSuscripcion | null> {
  const res = await api.get<AcademySolicitudSuscripcion | null>('/promos/solicitudes/mias/', {
    params: { producto: 'academy_pro' },
  })
  return res.data
}

// ── Onboarding sin registro (visitante anónimo) ───────────────────────────────
// Mismos serializers que el catálogo/curso autenticado, servidos por endpoints
// AllowAny dedicados (ver academy.anon_views, backend) — un anónimo siempre
// resuelve a nivel 'starter'. `api/client.ts` adjunta `X-Anon-Session`
// automáticamente en estas llamadas.

export interface AnonSessionStatus {
  id: string
  expires_at: string
  migrada: boolean
  lecciones_completadas: number[]
  todo_gratis_completado: boolean
}

export async function getAnonSessionStatus(): Promise<AnonSessionStatus> {
  const res = await api.get<AnonSessionStatus>('/academy/anon/sesion/')
  return res.data
}

export async function listPublicCourses(): Promise<Course[]> {
  const res = await api.get<Course[]>('/academy/anon/catalogo/')
  return res.data
}

export async function getPublicCourse(id: number): Promise<CourseDetail> {
  const res = await api.get<CourseDetail>(`/academy/anon/cursos/${id}/`)
  return res.data
}

export async function getPublicLesson(lessonId: number): Promise<Lesson> {
  const res = await api.get<Lesson>(`/academy/anon/lecciones/${lessonId}/`)
  return res.data
}

export async function completePublicLesson(lessonId: number): Promise<void> {
  await api.post(`/academy/anon/lecciones/${lessonId}/completar/`)
}

// ── Biblioteca de recursos ────────────────────────────────────────────────────

export interface LibraryFilters {
  tipo?: LibraryTipo
  school?: number
  course?: number
  q?: string
  destacados?: boolean
  favoritos?: boolean
}

export async function listLibrary(filters: LibraryFilters = {}): Promise<LibraryResource[]> {
  const params: Record<string, string> = {}
  if (filters.tipo) params.tipo = filters.tipo
  if (filters.school) params.school = String(filters.school)
  if (filters.course) params.course = String(filters.course)
  if (filters.q) params.q = filters.q
  if (filters.destacados) params.destacados = '1'
  if (filters.favoritos) params.favoritos = '1'
  const res = await api.get<LibraryResource[]>('/academy/library/', { params })
  return res.data
}

export async function toggleLibraryFavorite(resourceId: number): Promise<{ favorito: boolean }> {
  const res = await api.post<{ favorito: boolean }>(`/academy/library/${resourceId}/favorito/`)
  return res.data
}

// Registra la apertura (suma una vista en el servidor) y devuelve la URL real
// del recurso — 403 si es de pago y el usuario no tiene Zyfit Academy Pro.
export async function openLibraryResource(resourceId: number): Promise<{ url: string }> {
  const res = await api.post<{ url: string }>(`/academy/library/${resourceId}/abrir/`)
  return res.data
}

// ── Blog editorial ────────────────────────────────────────────────────────────
// Público sin cuenta (catálogo/detalle) + autoría de instructor (mias/crear/
// editar/borrar) — ver academy.blog_views, backend.

export interface BlogFilters {
  school?: number
  tag?: string
  q?: string
}

export async function listBlogPosts(filters: BlogFilters = {}): Promise<BlogPost[]> {
  const params: Record<string, string> = {}
  if (filters.school) params.school = String(filters.school)
  if (filters.tag) params.tag = filters.tag
  if (filters.q) params.q = filters.q
  const res = await api.get<BlogPost[]>('/academy/blog/', { params })
  return res.data
}

export async function getBlogPost(slug: string): Promise<BlogPostDetail> {
  const res = await api.get<BlogPostDetail>(`/academy/blog/${slug}/`)
  return res.data
}

export async function listMyBlogPosts(): Promise<BlogPost[]> {
  const res = await api.get<BlogPost[]>('/academy/blog/mias/')
  return res.data
}

// A diferencia de getBlogPost (público, suma una vista), esta lee un post
// propio por id sin afectar el contador — pensada para precargar el editor.
export async function getMyBlogPost(id: number): Promise<BlogPostDetail> {
  const res = await api.get<BlogPostDetail>(`/academy/blog/mias/${id}/`)
  return res.data
}

export interface BlogPostPayload {
  titulo: string
  slug: string
  resumen?: string
  meta_titulo?: string
  meta_descripcion?: string
  contenido?: string
  portada?: string
  etiquetas?: string[]
  school?: number | null
  publicado?: boolean
}

export async function createBlogPost(payload: BlogPostPayload): Promise<BlogPostDetail> {
  const res = await api.post<BlogPostDetail>('/academy/blog/mias/', payload)
  return res.data
}

export async function updateBlogPost(id: number, payload: Partial<BlogPostPayload>): Promise<BlogPostDetail> {
  const res = await api.patch<BlogPostDetail>(`/academy/blog/mias/${id}/`, payload)
  return res.data
}

export async function deleteBlogPost(id: number): Promise<void> {
  await api.delete(`/academy/blog/mias/${id}/`)
}

// ── Administración de usuarios (SOLO admin) ───────────────────────────────────

export interface AcademyUserFilters {
  rol?: AcademyUserRol
  q?: string
}

export async function listAcademyUsers(filters: AcademyUserFilters = {}): Promise<AcademyUserAccount[]> {
  const params: Record<string, string> = {}
  if (filters.rol) params.rol = filters.rol
  if (filters.q) params.q = filters.q
  const res = await api.get<AcademyUserAccount[]>('/academy/admin/usuarios/', { params })
  return res.data
}

export interface CreateAcademyUserPayload {
  email: string
  password: string
  nombre: string
  rol: AcademyUserRol
}

export async function createAcademyUser(payload: CreateAcademyUserPayload): Promise<AcademyUserAccount> {
  const res = await api.post<AcademyUserAccount>('/academy/admin/usuarios/', payload)
  return res.data
}

// ── Simulador de carga interna (escuela Analítica y Rendimiento Deportivo) ────
// Mismo motor que Zyfit Performance (performance.calculators); el cálculo
// siempre ocurre en el servidor, este cliente solo envía los inputs crudos.

export async function computeSimuladorCarga<T>(
  testSlug: string,
  inputs: Record<string, unknown>,
): Promise<SimuladorCargaResponse<T>> {
  const res = await api.post<SimuladorCargaResponse<T>>('/academy/simulador/carga/compute/', {
    test_slug: testSlug,
    inputs,
  })
  return res.data
}

// ── Simulador de planificación de sesión (escuela Ciencia del Entrenamiento) ──────────────

export async function listSimuladorSesionCasos(): Promise<SimuladorSesionCaso[]> {
  const res = await api.get<SimuladorSesionCaso[]>('/academy/simulador/sesion/casos/')
  return res.data
}

export async function evaluarSimuladorSesion(payload: {
  caso_id: string
  fatiga: string
  rpe_target: number
  ejercicios_seleccionados: string[]
}): Promise<SimuladorSesionResultado> {
  const res = await api.post<SimuladorSesionResultado>('/academy/simulador/sesion/evaluar/', payload)
  return res.data
}

// ── Simulador de Return-to-Play (escuela Recuperación, Prevención y Wellness) ─────────────

export async function listSimuladorPrevencionCasos(): Promise<SimuladorPrevencionCaso[]> {
  const res = await api.get<SimuladorPrevencionCaso[]>('/academy/simulador/prevencion/casos/')
  return res.data
}

export async function evaluarSimuladorPrevencion(payload: {
  caso_id: string
  decision: string
}): Promise<SimuladorPrevencionResultado> {
  const res = await api.post<SimuladorPrevencionResultado>('/academy/simulador/prevencion/evaluar/', payload)
  return res.data
}

// ── Soporte (FAQ + chat) ───────────────────────────────────────────────────────
// Chat por polling (sin WebSockets), mismo criterio que el chat coach↔atleta
// de la app móvil — ver academy.support_service en el backend.

export async function getSupportFAQ(): Promise<SupportFAQItem[]> {
  const res = await api.get<SupportFAQItem[]>('/academy/support/faq/')
  return res.data
}

export async function getSupportChat(): Promise<{ mensajes: SupportMessageItem[] }> {
  const res = await api.get<{ mensajes: SupportMessageItem[] }>('/academy/support/chat/')
  return res.data
}

export async function sendSupportMessage(texto: string): Promise<SupportMessageItem> {
  const res = await api.post<SupportMessageItem>('/academy/support/chat/', { texto })
  return res.data
}

export async function getSupportChatUnread(): Promise<number> {
  const res = await api.get<{ no_leidos: number }>('/academy/support/chat/no-leidos/')
  return res.data.no_leidos
}

// ── Soporte · inbox del admin ─────────────────────────────────────────────────

export async function listSupportThreads(): Promise<SupportThreadSummary[]> {
  const res = await api.get<SupportThreadSummary[]>('/academy/support/admin/hilos/')
  return res.data
}

export async function getSupportThread(studentId: number): Promise<{
  student: { id: number; nombre: string; email: string }
  mensajes: SupportMessageItem[]
}> {
  const res = await api.get(`/academy/support/admin/hilos/${studentId}/`)
  return res.data
}

export async function sendSupportThreadReply(studentId: number, texto: string): Promise<SupportMessageItem> {
  const res = await api.post<SupportMessageItem>(`/academy/support/admin/hilos/${studentId}/`, { texto })
  return res.data
}
