// Bandeja de entregas de un curso (instructor/admin) — Programa Evolución 360°.
// Lista las entregas de los entregables por estado y permite aprobarlas (completa
// la lección del estudiante y otorga su insignia, lado servidor) o rechazarlas
// con feedback para que el estudiante corrija y reenvíe.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCourse, listCourseSubmissions, reviewSubmission } from '@/api/academy'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import type { CourseDetail, Submission, SubmissionEstado } from '@/types'

const TABS: { id: SubmissionEstado; label: string }[] = [
  { id: 'enviada', label: 'Por revisar' },
  { id: 'aprobada', label: 'Aprobadas' },
  { id: 'rechazada', label: 'Rechazadas' },
]

export function SubmissionsPage() {
  const { courseId } = useParams()
  const id = Number(courseId)

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [subs, setSubs] = useState<Submission[]>([])
  const [tab, setTab] = useState<SubmissionEstado>('enviada')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    Promise.all([getCourse(id), listCourseSubmissions(id)])
      .then(([c, s]) => {
        if (!active) return
        setCourse(c)
        setSubs(s)
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  function onReviewed(updated: Submission) {
    setSubs((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={40} />
      </div>
    )
  }
  if (error || !course) {
    return (
      <EmptyState
        icon="instructor"
        title="No se pudo cargar la bandeja de entregas"
        description="Verifica que el curso exista y que tengas permisos de instructor sobre él."
        action={
          <Link to="/instructor" className="text-sm font-medium text-accent hover:text-accent-dark">
            ← Mis cursos
          </Link>
        }
      />
    )
  }

  const visibles = subs.filter((s) => s.estado === tab)
  const pendientes = subs.filter((s) => s.estado === 'enviada').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/instructor"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent"
        >
          <Icon name="chevronLeft" size={16} /> Mis cursos
        </Link>
        <p className="za-eyebrow mt-4">Entregas · {course.titulo}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Bandeja de revisión</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {pendientes === 0
            ? 'No hay entregas pendientes de revisión.'
            : `${pendientes} entrega${pendientes !== 1 ? 's' : ''} esperando tu revisión.`}
        </p>
      </div>

      {/* Tabs por estado */}
      <div role="tablist" aria-label="Estado de las entregas" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = subs.filter((s) => s.estado === t.id).length
          const active = tab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={[
                'h-10 rounded-xl px-4 text-sm font-medium transition-colors',
                active ? 'bg-brand text-white' : 'border border-surface-border text-ink-soft hover:bg-surface-soft',
              ].join(' ')}
            >
              {t.label} ({count})
            </button>
          )
        })}
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          icon="upload"
          title={tab === 'enviada' ? 'Nada por revisar' : 'Sin entregas en este estado'}
          description={
            tab === 'enviada'
              ? 'Cuando un estudiante envíe un entregable aparecerá aquí.'
              : 'Las entregas que pasen a este estado aparecerán aquí.'
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {visibles.map((s) => (
            <SubmissionCard key={s.id} submission={s} onReviewed={onReviewed} />
          ))}
        </div>
      )}
    </div>
  )
}

function SubmissionCard({
  submission,
  onReviewed,
}: {
  submission: Submission
  onReviewed: (s: Submission) => void
}) {
  const [feedback, setFeedback] = useState(submission.feedback)
  const [working, setWorking] = useState<'aprobada' | 'rechazada' | null>(null)
  const [error, setError] = useState(false)
  const esVideo = submission.entregable_tipo === 'video'

  async function review(estado: 'aprobada' | 'rechazada') {
    if (working) return
    setWorking(estado)
    setError(false)
    try {
      const updated = await reviewSubmission(submission.id, { estado, feedback: feedback.trim() })
      onReviewed(updated)
    } catch {
      setError(true)
    } finally {
      setWorking(null)
    }
  }

  return (
    <article className="za-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{submission.leccion_titulo}</p>
          <p className="truncate text-xs text-ink-muted">
            {submission.estudiante_nombre} ·{' '}
            {new Date(submission.updated_at).toLocaleString('es', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        {submission.estado !== 'enviada' && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              submission.estado === 'aprobada' ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger'
            }`}
          >
            {submission.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
          </span>
        )}
      </div>

      {/* Contenido entregado */}
      <div className="mt-3">
        {esVideo ? (
          <a
            href={submission.video_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-dark"
          >
            <Icon name="play" size={16} /> Ver el video entregado
          </a>
        ) : (
          <p className="max-w-prose whitespace-pre-line break-words rounded-lg border border-surface-border bg-surface-soft p-3.5 text-sm text-ink-soft">
            {submission.texto}
          </p>
        )}
      </div>

      {/* Revisión */}
      <div className="mt-4 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
            Feedback para el estudiante {submission.estado === 'enviada' ? '(opcional al aprobar)' : ''}
          </span>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            placeholder="Qué está bien y qué debe ajustar…"
            className="input min-h-[60px] resize-y"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            No se pudo guardar la revisión. Inténtalo de nuevo.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {submission.estado !== 'aprobada' && (
            <button
              onClick={() => review('aprobada')}
              disabled={!!working}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-ok px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              <Icon name="check" size={16} /> {working === 'aprobada' ? 'Aprobando…' : 'Aprobar'}
            </button>
          )}
          {submission.estado !== 'rechazada' && (
            <button
              onClick={() => review('rechazada')}
              disabled={!!working}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-danger/40 px-4 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-60"
            >
              <Icon name="close" size={16} /> {working === 'rechazada' ? 'Guardando…' : 'Pedir ajustes'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
