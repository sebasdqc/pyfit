// Diagnóstico inicial y evaluación final de un curso. Se muestra en el
// reproductor SOLO cuando corresponde (diagnóstico: antes de empezar; final:
// al completar) y desaparece una vez hechos. Son opcionales: nunca bloquean el
// progreso ni el certificado. Ninguna revela la clave (ver assessment_service):
// por eso el resultado muestra solo el puntaje.

import { isAxiosError } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { getAssessmentQuestions, getAssessmentStatus, submitAssessment } from '@/api/academy'
import { Icon } from '@/components/Icon'
import { QuestionOptions } from '@/components/QuestionOptions'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { useT } from '@/locale/useT'
import type { AssessmentGain, AssessmentKind, AssessmentQuestion, AssessmentResult, AssessmentStatus } from '@/types'

export function AssessmentCard({ enrollmentId, estado, leccionesHechas }: {
  enrollmentId: number
  estado: string
  leccionesHechas: number
}) {
  const t = useT()
  const [status, setStatus] = useState<AssessmentStatus | null>(null)
  const [abierto, setAbierto] = useState<AssessmentKind | null>(null)

  const cargar = useCallback(() => {
    getAssessmentStatus(enrollmentId).then(setStatus).catch(() => setStatus(null))
  }, [enrollmentId])

  // El estado cambia al completar lecciones (el diagnóstico deja de estar
  // disponible) y al completar el curso (se habilita la final).
  useEffect(cargar, [cargar, estado, leccionesHechas])

  if (!status) return null
  const invitar: AssessmentKind | null = status.puede_diagnostico ? 'diagnostico' : status.puede_final ? 'final' : null

  return (
    <>
      {invitar && (
        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:flex-row sm:items-center" aria-label={t(invitar === 'diagnostico' ? 'assessment.diagTitle' : 'assessment.finalTitle')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Icon name="activity" size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-ink">{t(invitar === 'diagnostico' ? 'assessment.diagTitle' : 'assessment.finalTitle')}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              {t(invitar === 'diagnostico' ? 'assessment.diagBody' : 'assessment.finalBody', { n: status.total_preguntas })}
            </p>
          </div>
          <button onClick={() => setAbierto(invitar)} className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark">
            {t(invitar === 'diagnostico' ? 'assessment.diagCta' : 'assessment.finalCta')}
          </button>
        </section>
      )}
      {status.ganancia && <GainCard gain={status.ganancia} />}
      {abierto && (
        <AssessmentDialog
          enrollmentId={enrollmentId}
          kind={abierto}
          onClose={() => { setAbierto(null); cargar() }}
        />
      )}
    </>
  )
}

export function GainCard({ gain }: { gain: AssessmentGain }) {
  const t = useT()
  return (
    <section className="mb-6 rounded-2xl border border-ok/30 bg-ok/5 p-5" aria-label={t('assessment.gainTitle')}>
      <h2 className="text-base font-semibold text-ink">{t('assessment.gainTitle')}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {gain.puntos > 0
          ? t('assessment.gainPoints', { n: gain.puntos, pre: gain.diagnostico, post: gain.final })
          : t('assessment.gainNone')}
      </p>
      {gain.normalizada !== null && gain.normalizada > 0 && (
        <p className="mt-1 text-sm text-ink-soft">{t('assessment.gainNormalized', { n: gain.normalizada })}</p>
      )}
    </section>
  )
}

function AssessmentDialog({ enrollmentId, kind, onClose }: {
  enrollmentId: number
  kind: AssessmentKind
  onClose: () => void
}) {
  const t = useT()
  const [preguntas, setPreguntas] = useState<AssessmentQuestion[] | null>(null)
  const [respuestas, setRespuestas] = useState<Record<string, string[]>>({})
  const [resultado, setResultado] = useState<AssessmentResult | null>(null)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    getAssessmentQuestions(enrollmentId, kind)
      .then(setPreguntas)
      .catch((err) => {
        const detail = isAxiosError(err) ? (err.response?.data as { detail?: string } | undefined)?.detail : undefined
        setError(detail ?? t('assessment.errorLoad'))
      })
  }, [enrollmentId, kind, t])

  const completas = !!preguntas && preguntas.every((q) => (respuestas[String(q.id)] ?? []).length > 0)

  async function enviar() {
    if (!completas) return
    setEnviando(true)
    setError('')
    try {
      setResultado(await submitAssessment(enrollmentId, kind, respuestas))
    } catch (err) {
      const detail = isAxiosError(err) ? (err.response?.data as { detail?: string } | undefined)?.detail : undefined
      setError(detail ?? t('assessment.errorSubmit'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog onClose={onClose} labelledBy="assessment-title" className="za-card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id="assessment-title" className="text-lg font-bold text-ink">
          {t(kind === 'diagnostico' ? 'assessment.diagTitle' : 'assessment.finalTitle')}
        </h2>
        <button type="button" onClick={onClose} aria-label={t('assessment.close')} className="text-ink-muted hover:text-ink"><Icon name="close" size={20} /></button>
      </div>

      {resultado ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-5xl font-bold tabular-nums text-accent">{resultado.puntaje}%</p>
          <p className="text-base font-semibold text-ink">
            {t(resultado.kind === 'diagnostico' ? 'assessment.resultDiag' : 'assessment.resultFinal', { p: resultado.puntaje })}
          </p>
          {resultado.kind === 'diagnostico' && <p className="max-w-md text-sm text-ink-soft">{t('assessment.resultDiagBody')}</p>}
          {resultado.ganancia && <div className="w-full text-left"><GainCard gain={resultado.ganancia} /></div>}
          <button onClick={onClose} className="mt-2 inline-flex h-10 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-dark">{t('assessment.done')}</button>
        </div>
      ) : !preguntas ? (
        error
          ? <p role="alert" className="mt-6 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          : <div className="flex justify-center py-12"><Spinner size={32} /></div>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-soft">{t('assessment.noFeedbackNote')}</p>
          <div className="mt-5 flex flex-col gap-6">
            {preguntas.map((q, i) => (
              <QuestionOptions
                key={q.id}
                name={`eval-${q.id}`}
                legend={`${i + 1}. ${q.enunciado}`}
                tipo={q.tipo}
                opciones={q.opciones}
                value={respuestas[String(q.id)] ?? []}
                onChange={(next) => setRespuestas((r) => ({ ...r, [String(q.id)]: next }))}
              />
            ))}
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-xs text-ink-muted">{!completas && t('assessment.unanswered')}</span>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="h-10 rounded-xl border border-surface-border px-5 text-sm font-semibold text-ink-soft hover:text-ink">{t('assessment.cancel')}</button>
              <button type="button" onClick={enviar} disabled={!completas || enviando} className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50">{t('assessment.submit')}</button>
            </div>
          </div>
        </>
      )}
    </Dialog>
  )
}
