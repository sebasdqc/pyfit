// Módulo ASESOR. v1: envuelve en una pantalla con forma de chat el mismo
// asesor de solo lectura que ya vivía como banner dentro de Planificación
// (mismo endpoint GET .../advisor/, mismo criterio de "semana más cercana a
// hoy" — ver nearestMicrocicloToToday, duplicado a propósito desde
// PlanificacionPage.tsx: es una función pura de ~10 líneas, no vale la pena
// una abstracción compartida por esto solo). "Aplicar" sigue reusando el
// mismo PATCH manual (updateMeso/updateMicro) que el formulario — no hay
// un segundo camino de escritura que auditar. No es un chat conversacional
// todavía: el input de abajo está deshabilitado ("Pronto"), mismo criterio
// que Convocatoria/Ajustes en el sidebar — no simular una IA que responde
// texto libre cuando el backend no la tiene.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { Spinner } from '@/components/ui/Spinner'
import { CreateCenterButton } from '@/components/CreateCenterModal'
import { useActiveCenter } from '@/centers/useActiveCenter'
import {
  listPlans, getPlanTree, getMicrocicloAdvisor, updateMeso, updateMicro,
} from '@/api/performance'
import type {
  TrainingPlan, TrainingPlanDetail, Mesocycle, Microcycle, AdvisorResponse, AdvisorSugerencia,
} from '@/types'

const today = () => new Date().toISOString().slice(0, 10)
const shortDate = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : null)
function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime()
  const db = new Date(`${b}T00:00:00`).getTime()
  return Math.round((db - da) / 86400000)
}
function nearestMicrocicloToToday(plan: TrainingPlanDetail): { meso: Mesocycle; micro: Microcycle } | null {
  const hoy = today()
  let best: { meso: Mesocycle; micro: Microcycle; dist: number } | null = null
  for (const meso of plan.mesociclos) {
    for (const micro of meso.microciclos) {
      if (!micro.fecha_inicio) continue
      const fin = addDaysIso(micro.fecha_inicio, 6)
      const dentro = micro.fecha_inicio <= hoy && hoy <= fin
      const dist = dentro ? 0 : Math.abs(daysBetween(micro.fecha_inicio, hoy))
      if (!best || dist < best.dist) best = { meso, micro, dist }
    }
  }
  return best ? { meso: best.meso, micro: best.micro } : null
}

function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accentLight">
        <Icon name="chat" size={17} />
      </span>
      <div className="max-w-[640px] rounded-2xl rounded-tl-sm border border-perf-border bg-perf-surface px-4 py-3 text-sm leading-relaxed text-white/80">
        {children}
      </div>
    </div>
  )
}

export function AsesorPage() {
  const { activeCenterId: centerId, centers, setActiveCenterId } = useActiveCenter()

  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tree, setTree] = useState<TrainingPlanDetail | null>(null)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [data, setData] = useState<AdvisorResponse | null>(null)
  const [loadingAdvisor, setLoadingAdvisor] = useState(false)
  const [applyingIdx, setApplyingIdx] = useState<number | null>(null)

  useEffect(() => {
    if (centerId == null) return
    setLoadingPlans(true)
    listPlans(centerId)
      .then((data) => { setPlans(data); if (!selectedId && data[0]) setSelectedId(data[0].id) })
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId])

  useEffect(() => {
    if (centerId == null || selectedId == null) { setTree(null); return }
    getPlanTree(centerId, selectedId).then(setTree).catch(() => setTree(null))
  }, [centerId, selectedId])

  const nearest = useMemo(() => (tree ? nearestMicrocicloToToday(tree) : null), [tree])

  useEffect(() => {
    if (centerId == null || selectedId == null || !nearest) { setData(null); return }
    setLoadingAdvisor(true)
    getMicrocicloAdvisor(centerId, selectedId, nearest.meso.id, nearest.micro.id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoadingAdvisor(false))
  }, [centerId, selectedId, nearest])

  async function aplicar(idx: number, s: AdvisorSugerencia) {
    if (centerId == null || selectedId == null || !nearest) return
    setApplyingIdx(idx)
    try {
      if (s.nivel === 'mesociclo') {
        await updateMeso(centerId, selectedId, nearest.meso.id, { [s.campo]: s.valor_sugerido })
      } else {
        await updateMicro(centerId, selectedId, nearest.meso.id, nearest.micro.id, { [s.campo]: s.valor_sugerido })
      }
      const fresh = await getMicrocicloAdvisor(centerId, selectedId, nearest.meso.id, nearest.micro.id)
      setData(fresh)
    } finally {
      setApplyingIdx(null)
    }
  }

  if (centerId == null) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-xl font-semibold text-white">Asesor</h1>
        <p className="mt-2 text-sm text-white/45">
          {centers.length === 0
            ? 'Tu cuenta no tiene un centro asignado todavía.'
            : 'Selecciona un centro para empezar.'}
        </p>
        {centers.length === 0 && (
          <div className="mt-4">
            <CreateCenterButton onCreated={(c) => setActiveCenterId(c.id)} />
          </div>
        )}
      </div>
    )
  }

  const selectedPlan = plans.find((p) => p.id === selectedId) ?? null

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Asesor</h1>
          <p className="text-xs text-white/45">Sugerencias de solo lectura sobre tu planificación · nunca escribe por su cuenta</p>
        </div>
        {plans.length > 1 && (
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="rounded-lg border border-perf-border bg-perf-surface px-3 py-2 text-xs text-white/80 outline-none focus:border-accent"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-perf-border bg-perf-bg p-5">
        {loadingPlans ? (
          <div className="flex items-center gap-2.5 text-sm text-white/45">
            <Spinner size={18} />
            Cargando tu planificación…
          </div>
        ) : plans.length === 0 ? (
          <BotBubble>
            Todavía no hay ningún macrociclo creado en este centro. Andá a{' '}
            <Link to="/planificacion" className="font-medium text-accentLight hover:text-accent">Planificación</Link>{' '}
            para crear el primero — en cuanto tenga semanas con fechas, voy a poder analizarlas acá.
          </BotBubble>
        ) : !nearest ? (
          <BotBubble>
            {selectedPlan?.nombre ?? 'Tu macrociclo'} todavía no tiene semanas con fecha cargada, así que no tengo
            nada que analizar por ahora.
          </BotBubble>
        ) : loadingAdvisor ? (
          <div className="flex items-center gap-2.5 text-sm text-white/45">
            <Spinner size={18} />
            Revisando la semana del {shortDate(nearest.micro.fecha_inicio)}…
          </div>
        ) : (
          <>
            <BotBubble>
              Esto es lo que veo para la semana del <strong className="text-white">{shortDate(nearest.micro.fecha_inicio)}</strong>
              {selectedPlan ? <> en <strong className="text-white">{selectedPlan.nombre}</strong></> : null}:
            </BotBubble>

            {!data?.disponible ? (
              <BotBubble>
                {data?.motivo ?? 'Todavía no hay suficientes datos cargados esta semana para generar sugerencias.'}
              </BotBubble>
            ) : data.sugerencias && data.sugerencias.length > 0 ? (
              data.sugerencias.map((s, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-perf-warn/15 text-perf-warn">
                    <Icon name="alert" size={16} />
                  </span>
                  <div className="flex max-w-[640px] flex-wrap items-center justify-between gap-3 rounded-2xl rounded-tl-sm border border-perf-warn/30 bg-perf-warn/5 px-4 py-3 text-sm">
                    <p className="text-white/80">{s.motivo}</p>
                    <button
                      type="button"
                      onClick={() => aplicar(idx, s)}
                      disabled={applyingIdx === idx}
                      className="shrink-0 rounded-md border border-accent/40 px-2.5 py-1.5 text-[11px] font-medium text-accentLight hover:bg-accent/10 disabled:opacity-50"
                    >
                      {applyingIdx === idx ? 'Aplicando…' : `Aplicar: ${s.valor_sugerido}`}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <BotBubble>Sin novedades — la carga y el bienestar de esta semana están dentro de lo esperado.</BotBubble>
            )}
          </>
        )}
      </div>

      {/* Input de texto libre — todavía no conversa: reservado para cuando haya
          un endpoint de preguntas libres, mismo criterio "Pronto" que
          Convocatoria/Ajustes en el sidebar. */}
      <div className="flex items-center gap-2 rounded-2xl border border-perf-border bg-perf-surface px-4 py-3 opacity-60">
        <input
          disabled
          placeholder="Preguntas libres — próximamente"
          className="flex-1 bg-transparent text-sm text-white/50 outline-none placeholder:text-white/30"
        />
        <span className="rounded-full border border-perf-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/35">
          Pronto
        </span>
      </div>
    </div>
  )
}
