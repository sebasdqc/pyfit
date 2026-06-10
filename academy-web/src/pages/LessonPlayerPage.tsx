// Reproductor de lecciones a pantalla completa (modo enfoque). Carga la matrícula
// (árbol del curso + lecciones completadas + intentos), reproduce cada lección
// según su tipo (video / texto / quiz), marca el progreso contra el servidor,
// permite navegar entre lecciones y muestra el certificado al completar.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { completeLesson, getCertificate, getEnrollment, type AttemptResult } from '@/api/academy'
import { useDialogA11y } from '@/lib/useDialogA11y'
import { Emblem } from '@/components/Emblem'
import { Icon, type IconName } from '@/components/Icon'
import { Spinner } from '@/components/ui/Spinner'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { CourseOutline } from '@/components/player/CourseOutline'
import { QuizLesson } from '@/components/player/QuizLesson'
import { toEmbedUrl } from '@/lib/videoEmbed'
import type { EnrollmentDetail, Lesson, LessonTipo } from '@/types'

const TYPE_LABEL: Record<LessonTipo, string> = { video: 'Video', texto: 'Lectura', quiz: 'Evaluación' }
const TYPE_ICON: Record<LessonTipo, IconName> = { video: 'play', texto: 'doc', quiz: 'quiz' }

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
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const [markError, setMarkError] = useState(false)
  const outlineRef = useRef<HTMLElement>(null)

  // Lecciones aplanadas en orden (con el título de su módulo para el encabezado).
  const lessons = useMemo(
    () =>
      enr
        ? enr.curso.modulos.flatMap((m) => m.lecciones.map((l) => ({ lesson: l, moduleTitle: m.titulo })))
        : [],
    [enr],
  )

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

  // Drawer del temario (móvil): foco atrapado, cierre con Escape y scroll-lock.
  const closeOutline = useCallback(() => setOutlineOpen(false), [])
  useDialogA11y(outlineRef, { onClose: closeOutline, open: outlineOpen })

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-soft">
        <Spinner size={44} />
      </div>
    )
  }
  if (error || !enr) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-soft p-6">
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

  function applyProgress(p: number, e: string, lessonId?: number) {
    setProgreso(p)
    setEstado(e)
    if (lessonId != null) setCompleted((prevSet) => new Set(prevSet).add(lessonId))
  }

  async function markComplete() {
    if (!current) return
    setMarking(true)
    setMarkError(false)
    try {
      const r = await completeLesson(id, current.lesson.id)
      applyProgress(r.progreso, r.estado, current.lesson.id)
      if (next) setCurrentId(next.lesson.id)
    } catch {
      setMarkError(true)
    } finally {
      setMarking(false)
    }
  }

  function onQuizGraded(r: AttemptResult) {
    // El backend completa la lección del quiz al aprobar.
    applyProgress(r.progreso, r.estado, r.aprobado && current ? current.lesson.id : undefined)
  }

  function goTo(lessonId: number) {
    setCurrentId(lessonId)
    setOutlineOpen(false)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-soft">
      {/* Barra superior del reproductor */}
      <header className="flex items-center gap-3 border-b border-surface-border bg-white px-4 py-3">
        <button
          onClick={() => navigate('/aprendizaje')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-soft hover:text-ink"
          aria-label="Salir del reproductor"
          title="Salir"
        >
          <Icon name="chevronLeft" size={20} />
        </button>
        <Emblem size={26} />
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
          className="flex h-9 items-center gap-1.5 rounded-lg border border-surface-border px-3 text-sm text-ink-soft hover:bg-surface-soft lg:hidden"
        >
          <Icon name="layers" size={16} /> Temario
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Temario (fijo en desktop, drawer en móvil) */}
        <aside className="hidden w-80 shrink-0 border-r border-surface-border bg-white lg:block">
          <CourseOutline course={enr.curso} completed={completed} currentLessonId={current?.lesson.id ?? null} progreso={progreso} onSelect={goTo} />
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
              className="fixed left-0 top-0 z-50 h-full w-80 max-w-[85%] bg-white shadow-cardHover lg:hidden"
            >
              <CourseOutline course={enr.curso} completed={completed} currentLessonId={current?.lesson.id ?? null} progreso={progreso} onSelect={goTo} />
            </aside>
          </>
        )}

        {/* Contenido de la lección */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
            {/* Banner de curso completado */}
            {estado === 'completada' && (
              <CompletionBanner certCode={certCode} onVerCertificados={() => navigate('/certificados')} />
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
                </div>

                <div className="mt-6">
                  <LessonBody lesson={current.lesson} enrollmentId={id} intentos={enr.intentos} onQuizGraded={onQuizGraded} />
                </div>

                {markError && (
                  <p role="alert" className="mt-4 text-sm text-danger">
                    No se pudo guardar tu progreso. Revisa tu conexión e inténtalo de nuevo.
                  </p>
                )}

                {/* Pie de navegación */}
                <div className="mt-10 flex flex-col gap-3 border-t border-surface-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => prev && goTo(prev.lesson.id)}
                    disabled={!prev}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-surface-border px-4 text-sm font-medium text-ink-soft hover:bg-white disabled:opacity-40"
                  >
                    <Icon name="chevronLeft" size={16} /> Anterior
                  </button>

                  <div className="flex items-center gap-3">
                    {/* Video / texto: marcar como completada. Quiz: se completa al aprobar. */}
                    {current.lesson.tipo !== 'quiz' && !isDone && (
                      <button
                        onClick={markComplete}
                        disabled={marking}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ok px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        <Icon name="check" size={16} /> {marking ? 'Guardando…' : 'Marcar como completada'}
                      </button>
                    )}
                    <button
                      onClick={() => next && goTo(next.lesson.id)}
                      disabled={!next}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-40"
                    >
                      Siguiente <Icon name="chevronRight" size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Cuerpo de la lección según su tipo ────────────────────────────────────────

function LessonBody({
  lesson,
  enrollmentId,
  intentos,
  onQuizGraded,
}: {
  lesson: Lesson
  enrollmentId: number
  intentos: EnrollmentDetail['intentos']
  onQuizGraded: (r: AttemptResult) => void
}) {
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
            className="flex items-center gap-3 rounded-xl border border-surface-border bg-white p-4 text-sm text-accent hover:bg-surface-soft"
          >
            <Icon name="play" size={18} /> Abrir el video en una pestaña nueva
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-ink-muted">
            Esta lección de video aún no tiene URL.
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
    return <QuizLesson enrollmentId={enrollmentId} quiz={lesson.quiz} priorBest={priorBest} onGraded={onQuizGraded} />
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

function TextBody({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-6">
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">{text}</p>
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
