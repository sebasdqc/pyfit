// Modal de reporte de contenido (post o respuesta). Botón de acceso discreto
// desde donde se invoca — nunca prominente en la UI.

import { useState, type FormEvent } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { reportCommunityContent } from '@/api/community'
import type { CommunityReportMotivo } from '@/types'

const MOTIVOS: { value: CommunityReportMotivo; label: string }[] = [
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'ofensivo', label: 'Ofensivo o irrespetuoso' },
  { value: 'fuera_de_tema', label: 'Fuera de tema' },
  { value: 'otro', label: 'Otro' },
]

export function ReportDialog({
  postId,
  replyId,
  onClose,
  onReported,
}: {
  postId?: number
  replyId?: number
  onClose: () => void
  onReported: () => void
}) {
  const [motivo, setMotivo] = useState<CommunityReportMotivo>('spam')
  const [detalle, setDetalle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await reportCommunityContent({ postId, replyId, motivo, detalle: detalle.trim() || undefined })
      onReported()
    } catch {
      setError('No se pudo enviar el reporte. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog onClose={onClose} labelledBy="reportar-titulo" className="za-card w-full max-w-sm p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 id="reportar-titulo" className="text-base font-bold text-ink">Reportar contenido</h2>
        <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
          Motivo
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as CommunityReportMotivo)}
            className="input"
          >
            {MOTIVOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
          Detalle (opcional)
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={3}
            className="input !h-auto py-3"
          />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-ink-soft hover:bg-surface-soft"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : 'Reportar'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
