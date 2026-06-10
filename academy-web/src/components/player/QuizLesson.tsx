// Quiz interactivo. Renderiza las preguntas (sin la clave de respuestas, que el
// servidor nunca envía al estudiante), recoge las selecciones y envía el intento.
// El SERVIDOR califica: la respuesta trae puntaje, aprobado y el acierto por
// pregunta (`detalle`). Permite reintentar. Al aprobar, la lección se completa
// (el backend la marca) y se notifica al reproductor vía onGraded.

import { useState } from 'react'
import { submitQuizAttempt, type AttemptResult } from '@/api/academy'
import { Icon } from '@/components/Icon'
import type { Quiz } from '@/types'

export function QuizLesson({
  enrollmentId,
  quiz,
  priorBest,
  onGraded,
}: {
  enrollmentId: number
  quiz: Quiz
  priorBest: { puntaje: number; aprobado: boolean } | null
  onGraded: (r: AttemptResult) => void
}) {
  const [answers, setAnswers] = useState<Record<number, string[]>>({})
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  const preguntas = [...quiz.preguntas].sort((a, b) => a.orden - b.orden)
  const allAnswered = preguntas.every((q) => (answers[q.id]?.length ?? 0) > 0)
  const detalle = result ? Object.fromEntries(result.detalle.map((d) => [d.question_id, d.correcta])) : null

  function toggle(questionId: number, optionId: string, multiple: boolean) {
    if (result) return // no editar tras enviar (hasta reintentar)
    setAnswers((prev) => {
      const cur = prev[questionId] ?? []
      if (multiple) {
        return { ...prev, [questionId]: cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId] }
      }
      return { ...prev, [questionId]: [optionId] }
    })
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(false)
    try {
      const r = await submitQuizAttempt(enrollmentId, quiz.id, answers)
      setResult(r)
      onGraded(r)
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  function retry() {
    setResult(null)
    setAnswers({})
    setSubmitError(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabecera del quiz */}
      <div className="rounded-xl border border-surface-border bg-surface-soft p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">
            {preguntas.length} pregunta{preguntas.length !== 1 ? 's' : ''} · aprueba con {quiz.puntaje_aprobacion}%
          </p>
          {priorBest?.aprobado && !result && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ok">
              <Icon name="check" size={15} /> Aprobado ({priorBest.puntaje}%)
            </span>
          )}
        </div>
      </div>

      {/* Preguntas */}
      {preguntas.map((q, i) => {
        const multiple = q.tipo === 'opcion_multiple'
        const sel = answers[q.id] ?? []
        const graded = detalle ? detalle[q.id] : null
        const cardBorder =
          graded === true ? 'border-ok/40 bg-ok/5' : graded === false ? 'border-danger/40 bg-danger/5' : 'border-surface-border'
        return (
          <div key={q.id} className={`rounded-xl border p-4 ${cardBorder}`}>
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-ink-muted">{i + 1}.</span>
              <p className="flex-1 text-[15px] font-medium text-ink">{q.enunciado}</p>
              {graded === true && <Icon name="check" size={18} className="shrink-0 text-ok" />}
              {graded === false && <Icon name="close" size={18} className="shrink-0 text-danger" />}
            </div>
            <p className="mb-2 mt-1 pl-5 text-xs text-ink-muted">
              {multiple ? 'Selecciona todas las correctas' : 'Selecciona una'} · {q.puntos} pt{q.puntos !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-col gap-2 pl-5">
              {q.opciones.map((opt) => {
                const checked = sel.includes(opt.id)
                return (
                  <label
                    key={opt.id}
                    className={[
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
                      checked ? 'border-accent bg-accent/5 text-ink' : 'border-surface-border text-ink-soft hover:bg-surface-soft',
                      result ? 'cursor-default' : '',
                    ].join(' ')}
                  >
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name={`q-${q.id}`}
                      checked={checked}
                      disabled={!!result}
                      onChange={() => toggle(q.id, opt.id, multiple)}
                      className="h-4 w-4 accent-accent"
                    />
                    {opt.texto}
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Resultado / acciones */}
      {result ? (
        <div
          role="status"
          className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
            result.aprobado ? 'border-ok/40 bg-ok/5' : 'border-danger/40 bg-danger/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${
                result.aprobado ? 'bg-ok' : 'bg-danger'
              }`}
            >
              <Icon name={result.aprobado ? 'check' : 'close'} size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {result.aprobado ? '¡Aprobado!' : 'No alcanzaste el mínimo'} · {result.puntaje}%
              </p>
              <p className="text-xs text-ink-muted">
                {result.aprobado
                  ? 'Lección completada. Puedes continuar con la siguiente.'
                  : `Necesitas ${quiz.puntaje_aprobacion}% para aprobar.`}
              </p>
            </div>
          </div>
          {!result.aprobado && (
            <button
              onClick={retry}
              className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              Volver a intentar
            </button>
          )}
        </div>
      ) : (
        <>
          {submitError && (
            <p role="alert" className="text-sm text-danger">
              No se pudieron enviar tus respuestas. Revisa tu conexión e inténtalo de nuevo.
            </p>
          )}
          <button
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="h-12 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {submitting ? 'Calificando…' : allAnswered ? 'Enviar respuestas' : 'Responde todas las preguntas'}
          </button>
        </>
      )}
    </div>
  )
}
