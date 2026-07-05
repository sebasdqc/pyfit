// Simulador de planificación de sesión. Escuela Entrenamiento y Rendimiento Deportivo: el
// estudiante resuelve un caso (calcula fatiga y RPE objetivo, elige ejercicios
// seguros) y el servidor corrige con las MISMAS funciones del motor de
// generación real (ai_workout.views.calcular_fatiga/calcular_rpe_target) — ver
// academy.simulador_sesion. Nunca una aproximación calculada en el cliente.

import { useEffect, useState } from 'react'
import { evaluarSimuladorSesion, listSimuladorSesionCasos } from '@/api/academy'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/Icon'
import { Spinner } from '@/components/ui/Spinner'
import type { SimuladorSesionCaso, SimuladorSesionResultado } from '@/types'

const FATIGAS: Array<'bajo' | 'medio' | 'alto'> = ['bajo', 'medio', 'alto']
const RPE_OPCIONES = Array.from({ length: 10 }, (_, i) => i + 1)
const ANIMO_EMOJI: Record<number, string> = { 1: '😞', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' }

export function SimuladorSesionPage() {
  const [casos, setCasos] = useState<SimuladorSesionCaso[]>([])
  const [loadingCasos, setLoadingCasos] = useState(true)
  const [casoId, setCasoId] = useState<string | null>(null)

  const [fatiga, setFatiga] = useState<'bajo' | 'medio' | 'alto' | null>(null)
  const [rpe, setRpe] = useState<number | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [resultado, setResultado] = useState<SimuladorSesionResultado | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listSimuladorSesionCasos()
      .then((d) => active && setCasos(d))
      .catch(() => active && setError('No se pudo cargar los casos.'))
      .finally(() => active && setLoadingCasos(false))
    return () => {
      active = false
    }
  }, [])

  const caso = casos.find((c) => c.id === casoId) ?? null

  function elegirCaso(id: string) {
    setCasoId(id)
    setFatiga(null)
    setRpe(null)
    setSeleccionados(new Set())
    setResultado(null)
    setError(null)
  }

  function toggleEjercicio(nombre: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(nombre)) next.delete(nombre)
      else next.add(nombre)
      return next
    })
  }

  async function handleEvaluar() {
    if (!caso || !fatiga || rpe === null || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await evaluarSimuladorSesion({
        caso_id: caso.id,
        fatiga,
        rpe_target: rpe,
        ejercicios_seleccionados: Array.from(seleccionados),
      })
      setResultado(r)
    } catch {
      setError('No se pudo evaluar tu respuesta. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="za-eyebrow">Simulador · Entrenamiento y Rendimiento Deportivo</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Planificación de sesión</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">
          Lee el caso, calcula la fatiga y el RPE objetivo, y elige qué ejercicios incluirías hoy. El
          servidor corrige con el mismo motor que genera las sesiones reales.
        </p>
      </header>

      {/* Selector de caso */}
      <div className="flex flex-wrap gap-2">
        {loadingCasos ? (
          <Spinner size={24} />
        ) : (
          casos.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => elegirCaso(c.id)}
              className={`rounded-full border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                casoId === c.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-surface-border bg-surface text-ink-soft hover:border-accent hover:text-accent'
              }`}
            >
              {c.titulo}
            </button>
          ))
        )}
      </div>

      {caso && (
        <>
          {/* Brief del caso */}
          <div className="za-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{caso.atleta}</p>
            <p className="mt-2 text-sm text-ink-soft">{caso.narrativa}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato label="Sesiones en 72h" value={String(caso.sesiones_72h)} />
              <Dato label="Ánimo" value={`${ANIMO_EMOJI[caso.estado_animo] ?? ''} ${caso.estado_animo}/5`} />
              <Dato label="HRV" value={caso.hrv != null ? `${caso.hrv} ms` : 'sin dato'} />
              <Dato label="Implementos" value={caso.implementos_disponibles.join(', ') || 'ninguno'} />
            </div>
            {caso.ejercicios_evitar.length > 0 && (
              <p className="mt-3 text-xs text-ink-muted">
                <span className="font-semibold text-ink-soft">Evitar siempre:</span>{' '}
                {caso.ejercicios_evitar.join(', ')}
              </p>
            )}
          </div>

          {/* Formulario de respuesta */}
          <div className="za-card flex flex-col gap-5 p-5">
            <div>
              <p className="text-sm font-semibold text-ink">¿Cuál es la fatiga del atleta?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FATIGAS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFatiga(f)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                      fatiga === f
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-surface-border text-ink-soft hover:border-brand'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-ink">¿Cuál es el RPE objetivo de la sesión?</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RPE_OPCIONES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRpe(v)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
                      rpe === v
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-surface-border text-ink-soft hover:border-brand'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-ink">¿Qué ejercicios incluirías hoy?</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {caso.ejercicios_candidatos.map((ex) => {
                  const feedback = resultado?.ejercicios.find((f) => f.nombre === ex.nombre) ?? null
                  return (
                    <label
                      key={ex.nombre}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        feedback
                          ? feedback.acierto
                            ? 'border-ok/30 bg-ok/5'
                            : 'border-danger/30 bg-danger/5'
                          : 'border-surface-border hover:bg-surface-soft'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={seleccionados.has(ex.nombre)}
                        onChange={() => toggleEjercicio(ex.nombre)}
                        disabled={!!resultado}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-surface-border text-brand"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-ink">{ex.nombre}</span>
                        <span className="mt-0.5 block text-xs text-ink-muted">
                          {ex.patron.replace(/_/g, ' ')} · {ex.equipo.length ? ex.equipo.join(', ') : 'peso corporal'}
                        </span>
                        {feedback && !feedback.acierto && (
                          <span className="mt-1 block text-xs font-medium text-danger">
                            {feedback.valido
                              ? 'Era válido para hoy — te lo perdiste.'
                              : feedback.motivo_invalido}
                          </span>
                        )}
                      </span>
                      {feedback && (
                        <Icon
                          name={feedback.acierto ? 'check' : 'close'}
                          size={16}
                          className={feedback.acierto ? 'text-ok' : 'text-danger'}
                        />
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            {!resultado ? (
              <button
                type="button"
                onClick={handleEvaluar}
                disabled={!fatiga || rpe === null || submitting}
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                {submitting ? 'Evaluando…' : 'Evaluar mi respuesta'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => elegirCaso(caso.id)}
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-surface-border px-5 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
              >
                Reintentar este caso
              </button>
            )}
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="za-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Resultado</p>
                <p className="text-2xl font-bold text-brand">{resultado.puntaje}/100</p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Veredicto
                  label="Fatiga"
                  ok={resultado.fatiga_ok}
                  tuRespuesta={fatiga ?? '—'}
                  correcta={resultado.fatiga_correcta}
                />
                <Veredicto
                  label="RPE objetivo"
                  ok={resultado.rpe_ok}
                  tuRespuesta={String(rpe)}
                  correcta={String(resultado.rpe_correcto)}
                />
              </div>
              <p className="mt-4 text-xs text-ink-muted">
                Ejercicios: {resultado.aciertos_ejercicios} de {resultado.total_ejercicios} correctos (revisa el
                detalle en cada ejercicio arriba).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  )
}

function Veredicto({
  label,
  ok,
  tuRespuesta,
  correcta,
}: {
  label: string
  ok: boolean
  tuRespuesta: string
  correcta: string
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-surface-border px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          Tu respuesta: <span className="font-semibold capitalize text-ink">{tuRespuesta}</span>
          {!ok && (
            <>
              {' '}
              · Correcta: <span className="font-semibold capitalize text-ink">{correcta}</span>
            </>
          )}
        </p>
      </div>
      <Badge tone={ok ? 'ok' : 'danger'}>{ok ? 'Correcto' : 'A revisar'}</Badge>
    </div>
  )
}
