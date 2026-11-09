// Repaso espaciado — /repaso. Una pregunta a la vez: el alumno responde, el
// servidor califica y le muestra cuál era la correcta, la explicación y cuándo
// volverá a verla. La clave nunca viaja con la pregunta (ver review_service).

import { isAxiosError } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRepaso, responderRepaso } from '@/api/academy'
import { QuestionOptions } from '@/components/QuestionOptions'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useLocale } from '@/locale/useLocale'
import { useT } from '@/locale/useT'
import type { RepasoResultado, ReviewQueue, ReviewSummary } from '@/types'

function fechaLarga(iso: string, locale: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale === 'en' ? 'en' : 'es', {
    day: 'numeric', month: 'long',
  })
}

export function ReviewPage() {
  const t = useT()
  const { locale } = useLocale()
  const [queue, setQueue] = useState<ReviewQueue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [resultado, setResultado] = useState<RepasoResultado | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [errorRespuesta, setErrorRespuesta] = useState('')
  const [hechas, setHechas] = useState({ total: 0, ok: 0 })
  const [resumenFinal, setResumenFinal] = useState<ReviewSummary | null>(null)

  const cargar = useCallback(() => {
    setLoading(true)
    setError(false)
    getRepaso()
      .then(setQueue)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(cargar, [cargar])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={40} /></div>
  if (error || !queue) {
    return (
      <EmptyState
        icon="activity"
        title={t('review.errorLoad')}
        action={<button onClick={cargar} className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark">{t('review.retry')}</button>}
      />
    )
  }

  const { resumen, preguntas } = queue
  const actual = preguntas[index]
  const terminado = started && index >= preguntas.length

  // Pantalla de cierre de la sesión.
  if (terminado) {
    const r = resumenFinal ?? resumen
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ok/10 text-3xl text-ok" aria-hidden="true">✓</span>
        <h1 className="text-2xl font-bold text-ink">{t('review.doneTitle')}</h1>
        <p className="text-ink-soft">{t('review.doneBody', { n: hechas.total, ok: hechas.ok })}</p>
        {r.pendientes > 0
          ? <button onClick={() => { setStarted(false); setIndex(0); cargar() }} className="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-dark">{t('review.start')}</button>
          : r.proxima_fecha && <p className="text-sm text-ink-muted">{t('review.doneNext', { fecha: fechaLarga(r.proxima_fecha, locale) })}</p>}
        <Link to="/inicio" className="text-sm font-semibold text-accent hover:text-accent-dark">{t('review.goToCourses')}</Link>
      </div>
    )
  }

  // Resumen + botón de empezar.
  if (!started || !actual) {
    if (resumen.total === 0) {
      return <EmptyState icon="layers" title={t('review.emptyTitle')} description={t('review.emptyBody')} action={<Link to="/aprendizaje" className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark">{t('review.goToCourses')}</Link>} />
    }
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{t('review.title')}</h1>
          <p className="mt-1 text-sm leading-6 text-ink-soft">{t('review.subtitle')}</p>
        </header>
        <div className="grid grid-cols-3 gap-3">
          {[
            [t('review.pendingStat'), resumen.pendientes],
            [t('review.masteredStat'), resumen.dominadas],
            [t('review.deckStat'), resumen.total],
          ].map(([label, value]) => (
            <div key={label} className="za-card px-4 py-5 text-center">
              <p className="text-3xl font-bold tabular-nums text-ink">{value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
            </div>
          ))}
        </div>
        {resumen.pendientes > 0 ? (
          <button onClick={() => setStarted(true)} className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-semibold text-white hover:bg-accent-dark">
            {t('review.start')}
          </button>
        ) : (
          <div className="za-card px-6 py-8 text-center">
            <h2 className="text-lg font-semibold text-ink">{t('review.caughtUpTitle')}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t('review.caughtUpBody')}</p>
            {resumen.proxima_fecha && <p className="mt-3 text-sm text-ink-muted">{t('review.doneNext', { fecha: fechaLarga(resumen.proxima_fecha, locale) })}</p>}
          </div>
        )}
      </div>
    )
  }

  async function responder() {
    if (!actual || seleccion.length === 0) return
    setEnviando(true)
    setErrorRespuesta('')
    try {
      const r = await responderRepaso(actual.question_id, seleccion)
      setResultado(r)
      setHechas((h) => ({ total: h.total + 1, ok: h.ok + (r.correcta ? 1 : 0) }))
      setResumenFinal(r.resumen)
    } catch (err) {
      const code = isAxiosError(err) ? (err.response?.data as { code?: string } | undefined)?.code : undefined
      setErrorRespuesta(code === 'no_toca' ? t('review.errorNotDue') : t('review.errorAnswer'))
    } finally {
      setEnviando(false)
    }
  }

  function siguiente() {
    setResultado(null)
    setSeleccion([])
    setIndex((i) => i + 1)
  }

  const ultima = index === preguntas.length - 1
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>{t('review.questionOf', { i: index + 1, n: preguntas.length })}</span>
        <span className="truncate pl-4">{actual.curso} · {actual.leccion}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-border" aria-hidden="true">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${((index + (resultado ? 1 : 0)) / preguntas.length) * 100}%` }} />
      </div>

      <div className="za-card p-6">
        <QuestionOptions
          key={actual.question_id}
          name={`repaso-${actual.question_id}`}
          legend={actual.enunciado}
          tipo={actual.tipo}
          opciones={actual.opciones}
          value={seleccion}
          onChange={setSeleccion}
          disabled={!!resultado}
          correctas={resultado ? resultado.correctas : undefined}
        />
        <p className="mt-3 text-xs text-ink-muted">{actual.tipo === 'opcion_multiple' ? t('review.chooseMany') : t('review.chooseOne')}</p>
      </div>

      {resultado && (
        <div role="status" className={`rounded-2xl border p-5 ${resultado.correcta ? 'border-ok/30 bg-ok/5' : 'border-danger/30 bg-danger/5'}`}>
          <p className={`text-base font-semibold ${resultado.correcta ? 'text-ok' : 'text-danger'}`}>
            {resultado.correcta ? t('review.correct') : t('review.incorrect')}
          </p>
          {resultado.feedback && <p className="mt-2 text-sm leading-6 text-ink-soft">{resultado.feedback}</p>}
          <p className="mt-3 text-xs text-ink-muted">
            {resultado.dominada ? t('review.masteredNow') : t('review.comesBack', { n: resultado.dias })}
          </p>
        </div>
      )}
      {errorRespuesta && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{errorRespuesta}</p>}

      <div className="flex justify-end">
        {resultado ? (
          <button onClick={siguiente} className="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-dark">
            {ultima ? t('review.finish') : t('review.next')}
          </button>
        ) : (
          <button onClick={responder} disabled={enviando || seleccion.length === 0} className="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50">
            {t('review.submit')}
          </button>
        )}
      </div>
    </div>
  )
}
