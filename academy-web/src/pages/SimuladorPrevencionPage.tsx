// Simulador de Return-to-Play / decisiones en partido. Escuela Readaptación
// Deportiva y Prevención de Lesiones: el estudiante decide (autorizar RTP / sacar del
// partido) y el servidor corrige con la MISMA familia de calculadoras que
// corre en Zyfit Performance (nordic-asimetria, lsi, hidratacion) — ver
// academy.simulador_prevencion. La decisión "correcta" combina las banderas
// reales del motor, nunca reinventa sus umbrales.

import { useEffect, useState } from 'react'
import { evaluarSimuladorPrevencion, listSimuladorPrevencionCasos } from '@/api/academy'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/Icon'
import { Spinner } from '@/components/ui/Spinner'
import type { SimuladorPrevencionCaso, SimuladorPrevencionResultado } from '@/types'

const CAMPO_LABEL: Record<string, string> = {
  fuerza_izquierda_n: 'Fuerza pierna izquierda (N)',
  fuerza_derecha_n: 'Fuerza pierna derecha (N)',
  lado_lesionado: 'Rendimiento pierna lesionada',
  lado_sano: 'Rendimiento pierna sana',
  peso_pre_kg: 'Peso antes de la sesión (kg)',
  peso_post_kg: 'Peso después de la sesión (kg)',
  liquido_ingerido_l: 'Líquido ingerido (L)',
}

const TEST_LABEL: Record<string, string> = {
  'nordic-asimetria': 'Nordic Hamstring',
  lsi: 'Limb Symmetry Index',
  hidratacion: 'Hidratación',
}

const OPCION_LABEL: Record<string, string> = {
  sin_restriccion: 'Autorizar sin restricciones',
  con_control: 'Autorizar con carga controlada',
  no_autorizar: 'No autorizar — seguir en rehabilitación',
  vigilar_y_continuar: 'Vigilar y que continúe',
  sacar_y_rehidratar: 'Sacar del partido y rehidratar',
}

export function SimuladorPrevencionPage() {
  const [casos, setCasos] = useState<SimuladorPrevencionCaso[]>([])
  const [loadingCasos, setLoadingCasos] = useState(true)
  const [casoId, setCasoId] = useState<string | null>(null)
  const [decision, setDecision] = useState<string | null>(null)
  const [resultado, setResultado] = useState<SimuladorPrevencionResultado | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listSimuladorPrevencionCasos()
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
    setDecision(null)
    setResultado(null)
    setError(null)
  }

  async function handleEvaluar() {
    if (!caso || !decision || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await evaluarSimuladorPrevencion({ caso_id: caso.id, decision })
      setResultado(r)
    } catch {
      setError('No se pudo evaluar tu decisión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="za-eyebrow">Simulador · Readaptación Deportiva y Prevención de Lesiones</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Return-to-play y decisiones en partido</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">
          Lee el caso y toma la decisión sobre el jugador. El servidor corrige con la misma familia de
          tests de prevención que corre en Zyfit Performance.
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

            <div className="mt-4 flex flex-col gap-3">
              {Object.entries(caso.tests).map(([slug, inputs]) => (
                <div key={slug} className="rounded-xl border border-surface-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {TEST_LABEL[slug] ?? slug}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(inputs).map(([campo, valor]) => (
                      <div key={campo}>
                        <p className="text-[10px] text-ink-muted">{CAMPO_LABEL[campo] ?? campo}</p>
                        <p className="text-sm font-semibold text-ink">{valor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decisión */}
          <div className="za-card flex flex-col gap-4 p-5">
            <p className="text-sm font-semibold text-ink">
              {caso.tipo === 'rtp' ? '¿Autorizas su vuelta al entrenamiento con el grupo?' : '¿Qué haces con el jugador?'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {caso.opciones.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setDecision(op)}
                  disabled={!!resultado}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold text-left transition-colors sm:flex-1 ${
                    decision === op
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-surface-border text-ink-soft hover:border-brand'
                  } ${resultado ? 'opacity-70' : ''}`}
                >
                  {OPCION_LABEL[op] ?? op}
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            {!resultado ? (
              <button
                type="button"
                onClick={handleEvaluar}
                disabled={!decision || submitting}
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                {submitting ? 'Evaluando…' : 'Confirmar decisión'}
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
                <Badge tone={resultado.acierto ? 'ok' : 'danger'}>
                  {resultado.acierto ? 'Decisión correcta' : 'A revisar'}
                </Badge>
              </div>
              {!resultado.acierto && (
                <p className="mt-2 text-sm text-ink-soft">
                  Lo indicado era:{' '}
                  <span className="font-semibold text-ink">{OPCION_LABEL[resultado.decision_correcta]}</span>
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                {Object.entries(resultado.resultados).map(([slug, valores]) => (
                  <ResultadoTest key={slug} slug={slug} valores={valores} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ResultadoTest({ slug, valores }: { slug: string; valores: Record<string, unknown> }) {
  const alerta = Boolean(valores.asimetria_alerta ?? valores.deshidratacion_alerta ?? false)
  const apto = valores.apto_rtp === true
  const noApto = valores.apto_rtp === false

  return (
    <div className="flex items-center justify-between rounded-xl border border-surface-border px-4 py-2.5 text-sm">
      <span className="font-medium text-ink">{TEST_LABEL[slug] ?? slug}</span>
      <span className="flex items-center gap-2 text-ink-soft">
        {'asimetria_pct' in valores && <span>{String(valores.asimetria_pct)}% asimetría</span>}
        {'lsi_pct' in valores && <span>{String(valores.lsi_pct)}% LSI</span>}
        {'deshidratacion_pct' in valores && <span>{String(valores.deshidratacion_pct)}% deshidratación</span>}
        {(alerta || noApto) && <Icon name="flag" size={14} className="text-danger" />}
        {apto && !alerta && <Icon name="check" size={14} className="text-ok" />}
      </span>
    </div>
  )
}
