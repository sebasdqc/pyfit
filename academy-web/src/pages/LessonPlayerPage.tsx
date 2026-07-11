// Reproductor de lecciones a pantalla completa (modo enfoque). Carga la matrícula
// (árbol del curso + lecciones completadas + intentos), reproduce cada lección
// según su tipo (video / texto / quiz), marca el progreso contra el servidor,
// permite navegar entre lecciones y muestra el certificado al completar.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { completeLesson, getCertificate, getEnrollment, type AttemptResult } from '@/api/academy'
import { useDialogA11y } from '@/lib/useDialogA11y'
import { Wordmark } from '@/components/Emblem'
import { Icon, type IconName } from '@/components/Icon'
import { Spinner } from '@/components/ui/Spinner'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { CourseOutline } from '@/components/player/CourseOutline'
import { QuizLesson } from '@/components/player/QuizLesson'
import { DeliverableLesson } from '@/components/player/DeliverableLesson'
import { TutorChat } from '@/components/tutor/TutorChat'
import { PaywallDialog } from '@/components/academy/PaywallDialog'
import { PromoZyfitApp } from '@/components/promo/PromoZyfitApp'
import { toEmbedUrl } from '@/lib/videoEmbed'
import { useStreak } from '@/lib/useStreak'
import { useTheme } from '@/theme/useTheme'
import type { EnrollmentDetail, Lesson, LessonTipo, NuevaInsigniaOtorgada, Submission } from '@/types'

const TYPE_LABEL: Record<LessonTipo, string> = {
  video: 'Video',
  texto: 'Lectura',
  audio: 'Audio',
  quiz: 'Evaluación',
  en_vivo: 'Sesión en vivo',
  practica: 'Práctica presencial',
  entregable: 'Entregable',
}
const TYPE_ICON: Record<LessonTipo, IconName> = {
  video: 'play',
  texto: 'doc',
  audio: 'audio',
  quiz: 'quiz',
  en_vivo: 'live',
  practica: 'pitch',
  entregable: 'upload',
}

export function LessonPlayerPage() {
  const { enrollmentId } = useParams()
  const navigate = useNavigate()
  const id = Number(enrollmentId)

  const [enr, setEnr] = useState<EnrollmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [progreso, setProgreso] = useState(0)
  const [estado, setEstado] = useState('activa')
  const [certCode, setCertCode] = useState<string | null>(null)
  const [entregas, setEntregas] = useState<Submission[]>([])
  const [earnedBadges, setEarnedBadges] = useState<Set<number>>(new Set())
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [tutorOpen, setTutorOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const [markError, setMarkError] = useState(false)
  // Freemium: título del módulo con el que se intentó navegar sin acceso — abre
  // el paywall en vez de moverse ahí. Ver `goTo`, que centraliza el gating.
  const [paywallModulo, setPaywallModulo] = useState<string | null>(null)
  const outlineRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  // Racha de estudio: cache compartido + confirmación al sumar el día.
  const { streak: myStreak, refresh: refreshStreak } = useStreak()
  const { theme } = useTheme()
  const [rachaToast, setRachaToast] = useState<number | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Insignias de identidad recién otorgadas: se muestran de a una, en cola (si
  // una misma acción desbloqueó varias a la vez), apiladas SOBRE el toast de
  // racha (bottom-24 vs bottom-6) para que ambos puedan convivir sin solaparse.
  const [insigniaQueue, setInsigniaQueue] = useState<NuevaInsigniaOtorgada[]>([])
  const insigniaToastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lecciones aplanadas en orden (con el título de su módulo para el encabezado).
  const lessons = useMemo(
    () =>
      enr
        ? enr.curso.modulos.flatMap((m) => m.lecciones.map((l) => ({ lesson: l, moduleTitle: m.titulo })))
        : [],
    [enr],
  )

  // Ids de lección del curso: habilitan el salto desde una fuente citada por el tutor.
  const courseLessonIds = useMemo(() => new Set(lessons.map((x) => x.lesson.id)), [lessons])

  // Numeración de quizzes dentro del curso (para la pantalla intermedia "Quiz N").
  const quizLessons = useMemo(() => lessons.filter((x) => x.lesson.tipo === 'quiz'), [lessons])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getEnrollment(id)
      .then((e) => {
        if (!active) return
        setEnr(e)
        const done = new Set(e.lecciones_completadas)
        setCompleted(done)
        setProgreso(e.progreso)
        setEstado(e.estado)
        setCertCode(e.certificado)
        setEntregas(e.entregas)
        setEarnedBadges(new Set(e.insignias_obtenidas.map((b) => b.badge)))
        // Lección inicial: la primera no completada, o la primera del curso.
        const flat = e.curso.modulos.flatMap((m) => m.lecciones)
        const firstPending = flat.find((l) => !done.has(l.id))
        setCurrentId((firstPending ?? flat[0])?.id ?? null)
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  // Al completar el curso, traer el certificado emitido por el servidor.
  useEffect(() => {
    if (estado === 'completada' && !certCode) {
      getCertificate(id)
        .then((c) => setCertCode(c.codigo))
        .catch(() => {})
    }
  }, [estado, certCode, id])

  // Avanza la cola de insignias: muestra la primera, la retira tras 2.6s.
  useEffect(() => {
    if (insigniaQueue.length === 0) return
    insigniaToastRef.current = setTimeout(() => {
      setInsigniaQueue((prev) => prev.slice(1))
    }, 2600)
    return () => {
      if (insigniaToastRef.current) clearTimeout(insigniaToastRef.current)
    }
  }, [insigniaQueue])

  // Drawer del temario (móvil): foco atrapado, cierre con Escape y scroll-lock.
  const closeOutline = useCallback(() => setOutlineOpen(false), [])
  useDialogA11y(outlineRef, { onClose: closeOutline, open: outlineOpen })

  // Al cambiar de lección, el panel de contenido conserva el scroll de la
  // anterior — si esta era más larga, la nueva lección (p.ej. un quiz corto)
  // arranca ya desplazada hacia el fondo. Lo reseteamos en cada navegación.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [currentId])

  if (loading) {
    return (
      <div data-theme={theme} className="flex h-screen items-center justify-center bg-surface-soft">
        <Spinner size={44} />
      </div>
    )
  }
  if (error || !enr) {
    return (
      <div data-theme={theme} className="flex h-screen items-center justify-center bg-surface-soft p-6">
        <EmptyState
          icon="learning"
          title="No se pudo abrir el curso"
          description="Quizá no estás inscrito o la matrícula no existe."
          action={
            <button onClick={() => navigate('/aprendizaje')} className="text-sm font-medium text-accent hover:text-accent-dark">
              ← Mi aprendizaje
            </button>
          }
        />
      </div>
    )
  }

  const idx = lessons.findIndex((x) => x.lesson.id === currentId)
  const current = idx >= 0 ? lessons[idx] : lessons[0]
  const prev = idx > 0 ? lessons[idx - 1] : null
  const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null
  const isDone = current ? completed.has(current.lesson.id) : false
  const quizNumber = current ? quizLessons.findIndex((x) => x.lesson.id === current.lesson.id) + 1 : 0
  const cursoActivo = current
    ? `${enr.curso.titulo} · ${current.moduleTitle} · ${current.lesson.titulo}`
    : enr.curso.titulo

  function applyProgress(p: number, e: string, lessonId?: number) {
    setProgreso(p)
    setEstado(e)
    if (lessonId != null) setCompleted((prevSet) => new Set(prevSet).add(lessonId))
  }

  // Refresca la racha compartida (Topbar/tarjeta) y, si creció, muestra una
  // confirmación breve de que hoy sumó el día de estudio.
  function celebrarRacha(nueva: number | null | undefined) {
    const antes = myStreak?.racha_actual ?? 0
    refreshStreak()
    if (nueva != null && nueva > antes) {
      setRachaToast(nueva)
      if (toastRef.current) clearTimeout(toastRef.current)
      toastRef.current = setTimeout(() => setRachaToast(null), 2600)
    }
  }

  // Encola las insignias recién otorgadas en esta acción (si hay) para mostrarlas
  // una por una — el efecto de abajo avanza la cola automáticamente.
  function celebrarInsignias(nuevas: NuevaInsigniaOtorgada[] | undefined) {
    if (nuevas && nuevas.length > 0) setInsigniaQueue((prev) => [...prev, ...nuevas])
  }

  async function markComplete() {
    if (!current) return
    setMarking(true)
    setMarkError(false)
    try {
      const r = await completeLesson(id, current.lesson.id)
      applyProgress(r.progreso, r.estado, current.lesson.id)
      celebrarRacha(r.racha_estudio)
      celebrarInsignias(r.nuevas_insignias)
      if (next) goTo(next.lesson.id)
    } catch {
      setMarkError(true)
    } finally {
      setMarking(false)
    }
  }

  function onQuizGraded(r: AttemptResult) {
    // El backend completa la lección del quiz al aprobar.
    applyProgress(r.progreso, r.estado, r.aprobado && current ? current.lesson.id : undefined)
    celebrarRacha(r.racha_estudio)
    celebrarInsignias(r.nuevas_insignias)
  }

  function onSubmitted(s: Submission) {
    // Reemplaza (o agrega) mi entrega de esa lección; queda "enviada" hasta que
    // el instructor la revise (la aprobación llega del servidor al recargar).
    setEntregas((prev) => [s, ...prev.filter((x) => x.lesson !== s.lesson)])
  }

  // Único punto de navegación entre lecciones (temario, anterior/siguiente,
  // auto-avance al completar, fuentes citadas por el tutor). Si la lección de
  // destino está bloqueada (freemium), abre el paywall en vez de navegar ahí.
  function goTo(lessonId: number) {
    const target = lessons.find((x) => x.lesson.id === lessonId)
    if (target?.lesson.bloqueado) {
      setPaywallModulo(target.moduleTitle)
      setOutlineOpen(false)
      return
    }
    setCurrentId(lessonId)
    setOutlineOpen(false)
  }

  return (
    <div data-theme={theme} className="flex h-screen flex-col overflow-hidden bg-surface-soft">
      {/* Confirmación al sumar el día de estudio (racha extendida). */}
      {rachaToast != null && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status" aria-live="polite">
          <div className="za-pop flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-2.5 shadow-cardHover">
            <Icon name="flame" size={18} className="text-brand za-flame" />
            <span className="text-sm font-semibold text-ink">
              ¡Racha de {rachaToast} {rachaToast === 1 ? 'día' : 'días'}! Sumaste tu día de estudio.
            </span>
          </div>
        </div>
      )}

      {/* Insignia de identidad recién otorgada — apilado sobre el toast de racha
          (bottom-24 vs bottom-6) para que ambos convivan sin solaparse. */}
      {insigniaQueue[0] && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4" role="status" aria-live="polite">
          <div className="za-pop flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-2.5 shadow-cardHover">
            <span className="text-lg leading-none">{insigniaQueue[0].icono}</span>
            <span className="text-sm font-semibold text-ink">¡Nueva insignia: {insigniaQueue[0].nombre}!</span>
          </div>
        </div>
      )}

      {/* Barra superior del reproductor */}
      <header className="flex items-center gap-2 border-b border-surface-border bg-surface px-4 py-3 sm:gap-3 sm:px-6">
        <button
          onClick={() => navigate('/aprendizaje')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
          aria-label="Salir del reproductor"
          title="Salir"
        >
          <Icon name="chevronLeft" size={20} />
        </button>
        <Wordmark size={14} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{enr.curso.titulo}</p>
        </div>
        <div className="hidden w-48 items-center sm:flex">
          <ProgressBar value={progreso} />
        </div>
        {/* Toggle del temario en móvil */}
        <button
          onClick={() => setOutlineOpen((v) => !v)}
          aria-expanded={outlineOpen}
          aria-controls="course-outline-drawer"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-surface-border px-3 text-sm text-ink-soft transition-colors hover:bg-surface-soft lg:hidden"
        >
          <Icon name="layers" size={16} /> Temario
        </button>
        {/* Tutor en móvil: vive en el header (icono) en vez del FAB flotante de
            escritorio, que en pantallas chicas tapaba demasiado contenido. */}
        <button
          onClick={() => setTutorOpen(true)}
          aria-label="Abrir el tutor de Academy"
          title="Tutor"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-border text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink lg:hidden"
        >
          <Icon name="sparkles" size={17} className="text-accent" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Temario (fijo en desktop, drawer en móvil) */}
        <aside className="hidden w-80 shrink-0 border-r border-surface-border bg-surface lg:block">
          <CourseOutline
            course={enr.curso}
            completed={completed}
            currentLessonId={current?.lesson.id ?? null}
            progreso={progreso}
            earnedBadges={earnedBadges}
            certEmitido={!!certCode || estado === 'completada'}
            onSelect={goTo}
          />
        </aside>
        {outlineOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-brand-deep/40 lg:hidden" onClick={() => setOutlineOpen(false)} aria-hidden />
            <aside
              ref={outlineRef}
              id="course-outline-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Temario del curso"
              tabIndex={-1}
              className="fixed left-0 top-0 z-50 h-full w-80 max-w-[85%] bg-surface shadow-cardHover lg:hidden"
            >
              <CourseOutline
                course={enr.curso}
                completed={completed}
                currentLessonId={current?.lesson.id ?? null}
                progreso={progreso}
                earnedBadges={earnedBadges}
                certEmitido={!!certCode || estado === 'completada'}
                onSelect={goTo}
              />
            </aside>
          </>
        )}

        {/* Contenido de la lección */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
            {/* Banner de curso completado */}
            {estado === 'completada' && (
              <>
                <CompletionBanner certCode={certCode} onVerCertificados={() => navigate('/certificados')} />
                <PromoZyfitApp variant="inline" />
              </>
            )}

            {current && (
              <>
                <p className="za-eyebrow">{current.moduleTitle}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-ink">{current.lesson.titulo}</h1>
                  {isDone && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">
                      <Icon name="check" size={13} /> Completada
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Icon name={TYPE_ICON[current.lesson.tipo]} size={14} /> {TYPE_LABEL[current.lesson.tipo]}
                  </span>
                  {current.lesson.duracion_min > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="clock" size={14} /> {current.lesson.duracion_min} min
                    </span>
                  )}
                  {current.lesson.bloqueado && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 font-medium text-brand">
                      <Icon name="lock" size={12} /> Academy Pro
                    </span>
                  )}
                </div>

                <div className="mt-6">
                  {/* `key` fuerza el remount al cambiar de lección: sin esto, el estado
                      interno del quiz (respuestas, pantalla de inicio) se filtraba de
                      una lección a la siguiente cuando ambas eran quizzes. */}
                  <LessonBody
                    key={current.lesson.id}
                    lesson={current.lesson}
                    enrollmentId={id}
                    intentos={enr.intentos}
                    entregas={entregas}
                    quizNumber={quizNumber}
                    onQuizGraded={onQuizGraded}
                    onSubmitted={onSubmitted}
                  />
                </div>

                {markError && (
                  <p role="alert" className="mt-4 text-sm text-danger">
                    No se pudo guardar tu progreso. Revisa tu conexión e inténtalo de nuevo.
                  </p>
                )}

                {/* Pie de navegación. Se oculta en quizzes: los botones Anterior/Siguiente
                    permitían fugarse de la evaluación sin aprobarla. */}
                {current.lesson.tipo !== 'quiz' && (
                  <div className="mt-10 flex flex-col gap-3 border-t border-surface-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={() => prev && goTo(prev.lesson.id)}
                      disabled={!prev}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-surface-border px-4 text-sm font-medium text-ink-soft transition-colors hover:bg-surface disabled:opacity-40"
                    >
                      <Icon name="chevronLeft" size={16} /> Anterior
                    </button>

                    <div className="flex items-center gap-3">
                      {/* Video/texto/en vivo/práctica: marcar como completada. El entregable
                          se completa cuando el instructor aprueba. */}
                      {current.lesson.tipo !== 'entregable' &&
                        !isDone && !current.lesson.bloqueado && (
                        <button
                          onClick={markComplete}
                          disabled={marking}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-ok px-5 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:flex-none"
                        >
                          <Icon name="check" size={16} /> {marking ? 'Guardando…' : 'Marcar como completada'}
                        </button>
                      )}
                      <button
                        onClick={() => next && goTo(next.lesson.id)}
                        disabled={!next}
                        className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-40 sm:flex-none"
                      >
                        Siguiente <Icon name="chevronRight" size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Tutor IA flotante (solo escritorio): en móvil vive como ícono en el
          header — el FAB de texto completo ocupaba demasiado espacio ahí. */}
      {!tutorOpen && (
        <button
          onClick={() => setTutorOpen(true)}
          className="fixed bottom-6 right-6 z-30 hidden h-14 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-cardHover transition-colors hover:bg-accent-dark lg:flex"
          aria-label="Abrir el tutor de Academy"
        >
          <Icon name="sparkles" size={20} /> Tutor
        </button>
      )}
      <TutorChat
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        courseId={enr.curso.id}
        cursoTitulo={enr.curso.titulo}
        cursoActivo={cursoActivo}
        courseLessonIds={courseLessonIds}
        onSourceClick={(lid) => goTo(lid)}
      />

      {paywallModulo && (
        <PaywallDialog
          moduloTitulo={paywallModulo}
          cursoTitulo={enr.curso.titulo}
          onClose={() => setPaywallModulo(null)}
        />
      )}
    </div>
  )
}

// ── Cuerpo de la lección según su tipo ────────────────────────────────────────

function LessonBody({
  lesson,
  enrollmentId,
  intentos,
  entregas,
  quizNumber,
  onQuizGraded,
  onSubmitted,
}: {
  lesson: Lesson
  enrollmentId: number
  intentos: EnrollmentDetail['intentos']
  entregas: Submission[]
  quizNumber: number
  onQuizGraded: (r: AttemptResult) => void
  onSubmitted: (s: Submission) => void
}) {
  // Freemium: se puede llegar aquí directo (lección inicial al abrir el curso,
  // o una fuente citada por el tutor) sin pasar por el guard de `goTo`.
  if (lesson.bloqueado) {
    return <LockedLessonBody />
  }

  if (lesson.tipo === 'en_vivo') {
    return <LiveSessionBody lesson={lesson} />
  }

  if (lesson.tipo === 'practica') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4 text-sm text-brand">
          <Icon name="pitch" size={20} className="shrink-0" />
          <p>
            Actividad presencial en cancha: aplica lo aprendido y márcala como completada al
            finalizar tu asistencia.
          </p>
        </div>
        {lesson.contenido && <TextBody text={lesson.contenido} />}
      </div>
    )
  }

  if (lesson.tipo === 'entregable') {
    const mia = entregas.find((s) => s.lesson === lesson.id) ?? null
    return (
      <DeliverableLesson enrollmentId={enrollmentId} lesson={lesson} submission={mia} onSubmitted={onSubmitted} />
    )
  }

  if (lesson.tipo === 'video') {
    const embed = toEmbedUrl(lesson.video_url)
    return (
      <div className="flex flex-col gap-5">
        {embed ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-surface-border bg-black">
            <iframe
              src={embed}
              title={lesson.titulo}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : lesson.video_url ? (
          <a
            href={lesson.video_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface p-4 text-sm text-accent hover:bg-surface-soft"
          >
            <Icon name="play" size={18} /> Abrir el video en una pestaña nueva
          </a>
        ) : (
          /* Placeholder: la lección es de video pero el instructor aún no anexó
             la URL. El alumno puede seguir con el material de apoyo y marcarla
             como completada con normalidad. */
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-brand to-brand-deep p-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
              <Icon name="play" size={24} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Video en producción</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-white/60">
                {lesson.contenido
                  ? 'Tu instructor lo publicará pronto. Mientras tanto, repasa el material de apoyo de la lección.'
                  : 'Tu instructor lo publicará pronto. Vuelve a esta lección más tarde.'}
              </p>
            </div>
          </div>
        )}
        {lesson.contenido && <TextBody text={lesson.contenido} />}
      </div>
    )
  }

  if (lesson.tipo === 'audio') {
    return (
      <div className="flex flex-col gap-5">
        {lesson.video_url ? (
          /* El campo video_url reutiliza la URL de media también para audio. */
          <audio controls preload="none" src={lesson.video_url} className="w-full">
            Tu navegador no soporta el reproductor de audio.
          </audio>
        ) : (
          /* Placeholder: la lección es de audio pero aún no se produjo el archivo.
             El alumno sigue con el guion de apoyo y la marca como completada. */
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-brand to-brand-deep p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
              <Icon name="audio" size={24} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Audio en producción</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-white/60">
                {lesson.contenido
                  ? 'Publicaremos el audio pronto. Mientras tanto, sigue el guion de apoyo de la lección.'
                  : 'Publicaremos el audio pronto. Vuelve a esta lección más tarde.'}
              </p>
            </div>
          </div>
        )}
        {lesson.contenido && <TextBody text={lesson.contenido} />}
      </div>
    )
  }

  if (lesson.tipo === 'quiz') {
    if (!lesson.quiz) {
      return <div className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-ink-muted">Este quiz aún no tiene preguntas.</div>
    }
    // Mejor intento previo de este quiz (para mostrar "Aprobado").
    const mine = intentos.filter((a) => a.quiz === lesson.quiz!.id)
    const priorBest = mine.length
      ? mine.reduce(
          (best, a) => (a.puntaje > best.puntaje ? { puntaje: a.puntaje, aprobado: a.aprobado } : best),
          { puntaje: 0, aprobado: false },
        )
      : null
    return (
      <QuizLesson
        enrollmentId={enrollmentId}
        quiz={lesson.quiz}
        quizNumber={quizNumber}
        priorBest={priorBest}
        onGraded={onQuizGraded}
      />
    )
  }

  // texto
  return lesson.contenido ? (
    <TextBody text={lesson.contenido} />
  ) : (
    <div className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-ink-muted">
      Esta lección aún no tiene contenido.
    </div>
  )
}

// Sesión virtual sincrónica (Programa 360°): fecha/hora y enlace de la reunión
// (los publica el instructor); el contenido describe la agenda.
function LiveSessionBody({ lesson }: { lesson: Lesson }) {
  const fecha = lesson.fecha_en_vivo ? new Date(lesson.fecha_en_vivo) : null
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-accent/25 bg-accent/5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Icon name="live" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Sesión sincrónica en vivo</p>
            <p className="text-sm text-ink-soft">
              {fecha
                ? fecha.toLocaleString('es', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Fecha y hora por confirmar por tu instructor.'}
            </p>
          </div>
          {lesson.video_url && (
            <a
              href={lesson.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              <Icon name="play" size={15} /> Unirse a la sesión
            </a>
          )}
        </div>
      </div>
      {lesson.contenido && <TextBody text={lesson.contenido} />}
    </div>
  )
}

// Estado inline (no modal) para cuando la lección ACTUAL está bloqueada — se
// llega aquí sin pasar por el guard de navegación (lección inicial al abrir el
// curso, o una fuente citada por el tutor). El paywall modal (PaywallDialog)
// es para cuando el usuario todavía está eligiendo a dónde navegar.
function LockedLessonBody() {
  const navigate = useNavigate()
  return (
    <EmptyState
      icon="lock"
      title="Esta lección es de Zyfit Academy Pro"
      description="Suscríbete para desbloquear el resto del curso, certificados y una cuota diaria ampliada del tutor IA."
      action={
        <button
          onClick={() => navigate('/suscripcion')}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          Ver planes de Academy Pro
        </button>
      }
    />
  )
}

function TextBody({ text }: { text: string }) {
  // El contenido es texto plano: lo dividimos en párrafos reales por dobles
  // saltos de línea para dar estructura (en lugar de un único <p>), conservando
  // los saltos simples dentro de cada párrafo. Ancho de lectura cómodo.
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-6">
      <div className="flex max-w-prose flex-col gap-4 text-[15px] leading-relaxed text-ink-soft">
        {(paragraphs.length > 0 ? paragraphs : [text]).map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}

function CompletionBanner({ certCode, onVerCertificados }: { certCode: string | null; onVerCertificados: () => void }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-deep p-6 text-white">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
          <Icon name="certificate" size={22} />
        </span>
        <div>
          <p className="text-lg font-bold">¡Curso completado!</p>
          <p className="text-sm text-white/70">
            {certCode ? `Tu certificado: ${certCode}` : 'Emitiendo tu certificado…'}
          </p>
        </div>
      </div>
      <button
        onClick={onVerCertificados}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-brand hover:bg-white/90"
      >
        Ver mis certificados <Icon name="arrowRight" size={16} />
      </button>
    </div>
  )
}
