// Lección "entregable" del Programa Evolución 360°: el estudiante sube su
// análisis/planificación (texto) o la URL de su video; el INSTRUCTOR la revisa.
// La lección solo se completa cuando la entrega queda aprobada (lado servidor),
// así que aquí no hay botón de "marcar como completada": el estado de la entrega
// (enviada / aprobada / rechazada + feedback) es la fuente de verdad.

import { useEffect, useState, type FormEvent } from 'react'
import { submitDeliverable } from '@/api/academy'
import { Icon } from '@/components/Icon'
import type { Lesson, Submission } from '@/types'

const ESTADO_UI = {
  enviada: { label: 'Enviada · en revisión', cls: 'bg-accent/10 text-accent-dark' },
  aprobada: { label: 'Aprobada', cls: 'bg-ok/10 text-ok' },
  rechazada: { label: 'Requiere ajustes', cls: 'bg-danger/10 text-danger' },
} as const

export function DeliverableLesson({
  enrollmentId,
  lesson,
  submission,
  onSubmitted,
}: {
  enrollmentId: number
  lesson: Lesson
  submission: Submission | null
  onSubmitted: (s: Submission) => void
}) {
  const esVideo = lesson.entregable_tipo === 'video'
  const [texto, setTexto] = useState(submission?.texto ?? '')
  const [videoUrl, setVideoUrl] = useState(submission?.video_url ?? '')
  const [editing, setEditing] = useState(!submission)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al navegar a otra lección entregable se remonta el formulario con su entrega.
  useEffect(() => {
    setTexto(submission?.texto ?? '')
    setVideoUrl(submission?.video_url ?? '')
    setEditing(!submission)
    setError(null)
  }, [lesson.id, submission])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    setError(null)
    try {
      const s = await submitDeliverable(enrollmentId, lesson.id, {
        texto: texto.trim(),
        video_url: videoUrl.trim(),
      })
      onSubmitted(s)
      setEditing(false)
    } catch {
      setError(
        esVideo
          ? 'No se pudo enviar. Verifica que la URL de tu video sea válida (http/https).'
          : 'No se pudo enviar tu entrega. Revisa el contenido e inténtalo de nuevo.',
      )
    } finally {
      setSending(false)
    }
  }

  const estado = submission ? ESTADO_UI[submission.estado] : null

  return (
    <div className="flex flex-col gap-5">
      {/* Consigna del entregable */}
      {lesson.contenido && <TextBlock text={lesson.contenido} />}

      {/* Estado de la entrega */}
      <div className="rounded-xl border border-surface-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <Icon name="upload" size={17} className="text-accent" /> Tu entrega
          </h2>
          {estado && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estado.cls}`} role="status">
              {estado.label}
            </span>
          )}
        </div>

        {/* Feedback del instructor (rechazo o aprobación con comentario) */}
        {submission?.feedback && (
          <div className="mt-3 rounded-lg bg-surface-soft p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Feedback de {submission.revisado_por_nombre || 'tu instructor'}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm text-ink-soft">{submission.feedback}</p>
          </div>
        )}

        {submission && !editing ? (
          <div className="mt-4">
            {esVideo ? (
              <a
                href={submission.video_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-dark"
              >
                <Icon name="play" size={16} /> Ver mi video entregado
              </a>
            ) : (
              <p className="max-w-prose whitespace-pre-line rounded-lg border border-surface-border bg-surface-soft p-3.5 text-sm text-ink-soft">
                {submission.texto}
              </p>
            )}
            {submission.estado !== 'aprobada' && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border px-4 text-sm font-medium text-ink-soft hover:bg-surface-soft"
              >
                {submission.estado === 'rechazada' ? 'Corregir y reenviar' : 'Editar mi entrega'}
              </button>
            )}
            {submission.estado === 'enviada' && (
              <p className="mt-3 text-xs text-ink-muted">
                Tu instructor revisará la entrega; al aprobarla, la lección quedará completada.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            {esVideo ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  URL de tu video (YouTube oculto, Vimeo o Drive)
                </span>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://…"
                  required
                  className="input"
                />
              </label>
            ) : (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {lesson.entregable_tipo === 'planificacion' ? 'Tu planificación' : 'Tu análisis'}
                </span>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={10}
                  required
                  placeholder="Escribe aquí siguiendo la estructura de la consigna…"
                  className="input min-h-[200px] resize-y leading-relaxed"
                />
              </label>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
              >
                <Icon name="upload" size={16} />
                {sending ? 'Enviando…' : submission ? 'Reenviar entrega' : 'Enviar entrega'}
              </button>
              {submission && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-11 rounded-xl px-4 text-sm font-medium text-ink-soft hover:bg-surface-soft"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function TextBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="rounded-xl border border-surface-border bg-white p-6">
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
