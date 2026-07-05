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

export type AcademyNivel = 'starter' | 'pro'

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
  // Nivel de acceso freemium: 'starter' (gratis) o 'pro' (Academy Pro activo).
  nivel_academia: AcademyNivel
  // Datos personales — comparten columnas con el Profile de la app móvil.
  pais: string
  ciudad: string
  fecha_nacimiento: string | null
  profesion: string
  intereses: string[]
  redes_sociales: Record<string, string>
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
  // Freemium: true si el usuario actual no tiene acceso (módulo pago sin
  // Academy Pro). Visible pero bloqueado — contenido/video_url llegan vacíos
  // y quiz llega null cuando bloqueado=true. Ver academy.access_service.
  bloqueado: boolean
  created_at: string
}

export interface Module {
  id: number
  course: number
  orden: number
  titulo: string
  descripcion: string
  // Módulos gratis (freemium) son consumibles por cualquier estudiante.
  es_gratuito: boolean
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
  // Check-list de Competencias por curso (CourseBadge/EarnedBadge, Programa 360°).
  insignias: { total: number; recientes: DashboardEarnedBadge[] }
  // Catálogo global de identidad (escuela completada, racha, inicio). DISTINTO
  // del anterior — ver academy.badges_service. El cliente los unifica en una
  // sola galería visual (BadgeGallery).
  insignias_identidad: AcademyBadgeCatalog
  continuar: DashboardNextStep | null
  siguiente_paso: DashboardNextStep | null
  stats: DashboardStats
}

// ── Insignias de identidad (transversales, por usuario) ───────────────────────
// Espeja academy.badges_service.catalog_state(). DISTINTAS de CourseBadge
// (Check-list de Competencias por curso, arriba): estas son globales — escuela
// completada, hitos de racha, inicio de recorrido — otorgadas por usuario, no
// por matrícula.

export type AcademyBadgeCriterio =
  | 'escuela_completada' | 'streak_dias' | 'primera_leccion' | 'curso_completado'
  | 'respuestas_utiles'

export interface AcademyBadgeItem {
  id: number
  identificador: string
  nombre: string
  descripcion: string
  icono: string // emoji
  criterio_tipo: AcademyBadgeCriterio
  escuela_slug: string | null // solo si criterio_tipo === 'escuela_completada'
  obtenida: boolean
  otorgada_at: string | null
}

export interface AcademyBadgeCatalog {
  total: number
  total_obtenidas: number
  items: AcademyBadgeItem[]
}

// Insignia recién otorgada en la MISMA request (lesson_complete/quiz_attempt/
// submission_review) — para la celebración en el cliente, sin round-trip extra.
export interface NuevaInsigniaOtorgada {
  id: number
  nombre: string
  icono: string
}

// ── Simulador de carga interna (escuela Analítica y Rendimiento Deportivo) ────
// Espeja performance.calculators: MISMO motor que el panel Zyfit Performance,
// solo la familia "carga" (sRPE → carga semanal → ACWR).

export interface CargaSemanalResultado {
  n_dias: number
  carga_semanal_ua: number
  carga_media_diaria_ua: number
  desviacion_ua: number
  monotonia: number | null
  strain_ua: number | null
  monotonia_alerta: boolean
  nota?: string
}

export interface ACWRResultado {
  n_dias: number
  carga_aguda_ua: number
  carga_cronica_ua: number
  acwr_ra: number | null
  acwr_ewma: number | null
  zona: string
  riesgo_alerta: boolean
  nota?: string
}

export interface SimuladorCargaResponse<T> {
  test_slug: string
  nombre: string
  familia: string
  resultados: T
}

// ── Simulador de planificación de sesión (escuela Ciencia del Entrenamiento) ──
// Espeja ai_workout.views (calcular_fatiga/calcular_rpe_target) — ver
// academy.simulador_sesion. El número correcto sale siempre de esas funciones.

export interface SimuladorSesionEjercicio {
  nombre: string
  patron: string
  equipo: string[]
}

export interface SimuladorSesionCaso {
  id: string
  titulo: string
  atleta: string
  narrativa: string
  sesiones_72h: number
  estado_animo: number
  hrv: number | null
  dolor_hoy: string
  ejercicios_evitar: string[]
  implementos_disponibles: string[]
  ejercicios_candidatos: SimuladorSesionEjercicio[]
}

export interface SimuladorSesionEjercicioFeedback {
  nombre: string
  elegido: boolean
  valido: boolean
  acierto: boolean
  motivo_invalido: string | null
}

export interface SimuladorSesionResultado {
  fatiga_correcta: 'bajo' | 'medio' | 'alto'
  fatiga_ok: boolean
  rpe_correcto: number
  rpe_ok: boolean
  ejercicios: SimuladorSesionEjercicioFeedback[]
  aciertos_ejercicios: number
  total_ejercicios: number
  puntaje: number
}

// ── Simulador de Return-to-Play (escuela Recuperación, Prevención y Wellness) ─
// Espeja performance.calculators (familia 'prevencion') — ver
// academy.simulador_prevencion. Los resultados de los tests salen siempre de
// ese motor; la Academia solo añade la capa de decisión (RTP / partido).

export interface SimuladorPrevencionCaso {
  id: string
  tipo: 'rtp' | 'partido'
  titulo: string
  atleta: string
  narrativa: string
  tests: Record<string, Record<string, number>>
  opciones: string[]
}

export interface SimuladorPrevencionResultado {
  resultados: Record<string, Record<string, unknown>>
  decision_correcta: string
  acierto: boolean
}

// ── Comunidad (foro Q&A asíncrono entre alumnos) ──────────────────────────────
// Espeja academy/community_models.py + serializers. Capa de engagement OPCIONAL:
// ningún campo de aquí participa en progreso/certificación/racha/badges core.

export type CommunityEstado = 'visible' | 'oculto_ia' | 'oculto_reportes' | 'oculto_manual'
export type CommunityReportMotivo = 'spam' | 'ofensivo' | 'fuera_de_tema' | 'otro'

export interface CommunityReply {
  id: number
  post: number
  autor: number
  autor_nombre: string
  contenido: string
  estado: CommunityEstado
  votos_count: number
  es_mejor_respuesta: boolean
  created_at: string
}

export interface CommunityPost {
  id: number
  autor: number
  autor_nombre: string
  escuela: number
  escuela_nombre: string
  curso: number | null
  curso_titulo: string | null
  modulo: number | null
  titulo: string
  contenido: string
  estado: CommunityEstado
  respuestas_count: number
  mejor_respuesta: number | null
  created_at: string
  updated_at: string
}

export interface CommunityPostDetail extends CommunityPost {
  respuestas: CommunityReply[]
}

export interface CommunityPostsResponse {
  results: CommunityPost[]
  count: number
}

export interface CommunityVoteResult {
  votos_count: number
  ya_voto: boolean
}

export interface CommunityReport {
  id: number
  post: number | null
  reply: number | null
  reportado_por: number
  motivo: CommunityReportMotivo
  detalle: string
  created_at: string
}

// ── Suscripción "Zyfit Academy Pro" ───────────────────────────────────────────
// Espeja academy.subscription_views._subscription_payload(). Paquete SEPARADO
// de la suscripción "Zyfit Pro" del entrenador principal (app mobile).

export type AcademySubscriptionEstado =
  | 'sin_suscripcion' | 'activa' | 'cancelada' | 'vencida' | 'pago_fallido'
export type AcademyPlanTipo = 'mensual' | 'anual'

export interface AcademySubscriptionStatus {
  estado: AcademySubscriptionEstado
  plan_tipo: AcademyPlanTipo | null
  fecha_renovacion: string | null
  nivel: AcademyNivel
}
