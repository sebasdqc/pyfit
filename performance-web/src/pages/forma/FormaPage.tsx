// Módulo FORMA (fitness-fatiga / TSB, estilo Banister). Se alimenta del MISMO
// dato que Carga interna (sRPE → PerformanceMetric tipo='carga'), sin un
// segundo formulario de captura: dos EWMA de distinta ventana (fatiga 7d,
// fitness hasta 42d) sobre la misma serie diaria. TSB = fitness − fatiga.
// Encuadre honesto (igual que ACWR): es una TENDENCIA de gestión de carga,
// nunca "el día exacto" del pico de forma. Vista de EQUIPO (conteo por zona +
// lista ordenada por TSB) y POR ATLETA (TSB grande + curvas fitness/fatiga).
// Demo sin centro → mismo espejo determinista que Carga (misma demoSeries).

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { SEM } from '@/lib/tone'
import { useSquad } from '@/centers/useSquad'
import type { Athlete } from '@/lib/mockSquad'
import type { FormaMetrics, FormaTeamRow } from '@/types'
import { listFormaTeam, getFormaAthlete } from '@/api/performance'
import { demoSeries, formaFromSerie, demoFormaTeamRow, formaTone } from '@/lib/cargaDemo'
import { useActiveCenter } from '@/centers/useActiveCenter'

const tip = {
  contentStyle: { background: '#0f1525', border: '1px solid #1c2740', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: 'rgba(255,255,255,0.55)' },
  itemStyle: { color: '#fff' },
}
const axisTick = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }

export function FormaPage() {
  const { athletes: squad, loading, error, isRealRoster, centerId } = useSquad()
  const [tab, setTab] = useState<'equipo' | 'atleta'>('equipo')
  const [sel, setSel] = useState<string>('')
  const noContent = loading || error || (isRealRoster && squad.length === 0)

  useEffect(() => {
    if (squad.length && !squad.some((a) => a.id === sel)) setSel(squad[0].id)
  }, [squad, sel])

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">Forma</h1>
            <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
          </div>
          <p className="text-xs text-white/45">
            Fitness − fatiga (TSB) sobre la misma carga de sRPE · tendencia, no un día exacto de pico
          </p>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-perf-border bg-perf-surface p-0.5">
          {(['equipo', 'atleta'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              {t === 'equipo' ? 'Equipo' : 'Por atleta'}
            </button>
          ))}
        </div>
      </div>

      {noContent ? (
        <SquadState loading={loading} error={error} empty={isRealRoster && squad.length === 0} />
      ) : tab === 'equipo' ? (
        <TeamView
          squad={squad}
          isRealRoster={isRealRoster}
          centerId={centerId}
          onGoAthlete={(id) => { setSel(id); setTab('atleta') }}
        />
      ) : (
        <AthleteView squad={squad} sel={sel} onSelect={setSel} isRealRoster={isRealRoster} centerId={centerId} />
      )}
    </div>
  )
}

// ── Vista de EQUIPO ──────────────────────────────────────────────────────────
function TeamView({
  squad, isRealRoster, centerId, onGoAthlete,
}: {
  squad: Athlete[]
  isRealRoster: boolean
  centerId: number | null
  onGoAthlete: (id: string) => void
}) {
  const { termino } = useActiveCenter()
  const [rows, setRows] = useState<FormaTeamRow[] | null>(null)

  useEffect(() => {
    if (isRealRoster && centerId != null) {
      let alive = true
      listFormaTeam(centerId)
        .then((r) => { if (alive) setRows(r.atletas) })
        .catch(() => { if (alive) setRows([]) })
      return () => { alive = false }
    }
    setRows(squad.map((a, i) => demoFormaTeamRow(a.id, a.userId ?? -(i + 1))))
  }, [isRealRoster, centerId, squad])

  const byUser = useMemo(() => {
    const m = new Map<number, Athlete>()
    squad.forEach((a, i) => m.set(a.userId ?? -(i + 1), a))
    return m
  }, [squad])

  if (!rows) return <Spinner />
  const conDatos = rows.filter((r) => r.suficiente)
  const cuenta = (pred: (r: FormaTeamRow) => boolean) => conDatos.filter(pred).length
  const fresco = cuenta((r) => r.zona === 'Fresco')
  const fatigado = cuenta((r) => r.zona === 'Fatigado')
  const neutro = cuenta((r) => r.zona === 'Neutro / transición')
  const acumulando = rows.length - conDatos.length

  // Orden: primero los más fatigados (TSB más negativo).
  const ordenadas = [...rows].sort((a, b) => (a.tsb ?? Infinity) - (b.tsb ?? Infinity))

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={termino('grupo')} value={`${rows.length}`} tone="accent" />
        <Kpi label="Fresco" value={`${fresco}`} tone="ok" />
        <Kpi label="Neutro / transición" value={`${neutro}`} tone="warn" />
        <Kpi label="Fatigado" value={`${fatigado}`} tone="danger" />
      </div>
      {acumulando > 0 && (
        <p className="text-xs text-white/35">{acumulando} atleta(s) todavía acumulando datos (necesitan ≥ 7 días).</p>
      )}

      <Panel title="TSB por atleta" subtitle="Fitness − fatiga · ordenado del más fatigado al más fresco">
        {rows.length === 0 ? (
          <p className="text-sm text-white/40">
            Aún no hay registros de carga. Se alimenta de <span className="text-white/70">Carga interna</span>.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-perf-border">
            {ordenadas.map((r) => {
              const a = byUser.get(r.athlete)
              const tone = formaTone(r.zona)
              return (
                <button
                  key={r.athlete}
                  type="button"
                  onClick={() => a && onGoAthlete(a.id)}
                  className="flex w-full flex-col gap-2 py-3 text-left transition-colors hover:bg-white/[0.02] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:min-w-[180px]">
                    <Avatar name={a?.nombre ?? `#${r.athlete}`} src={a?.foto} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{a?.nombre ?? `Atleta ${r.athlete}`}</p>
                      <p className="text-xs text-white/40">{r.dias_con_datos} día(s) con registro</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-white">{r.suficiente ? (r.tsb ?? '—') : '—'}</p>
                      <p className="text-[10px] uppercase tracking-wide text-white/35">TSB</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${SEM[tone].soft} ${SEM[tone].text}`}>
                      {r.zona}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Panel>
    </>
  )
}

// ── Vista POR ATLETA ─────────────────────────────────────────────────────────
function AthleteView({
  squad, sel, onSelect, isRealRoster, centerId,
}: {
  squad: Athlete[]
  sel: string
  onSelect: (id: string) => void
  isRealRoster: boolean
  centerId: number | null
}) {
  const atleta = squad.find((a) => a.id === sel) ?? squad[0]
  const [metrics, setMetrics] = useState<FormaMetrics | null>(null)

  const load = useCallback(async () => {
    if (!atleta) return
    if (isRealRoster && centerId != null && atleta.userId != null) {
      try {
        const res = await getFormaAthlete(centerId, atleta.userId)
        setMetrics(res.forma)
      } catch {
        setMetrics(null)
      }
      return
    }
    setMetrics(formaFromSerie(demoSeries(atleta.id)))
  }, [atleta, isRealRoster, centerId])

  useEffect(() => { load() }, [load])

  const chart = useMemo(() => {
    if (!metrics) return []
    const n = metrics.tsb_serie.length
    return metrics.tsb_serie.map((tsb, i) => ({
      dia: `D${i - n + 1}`,
      fitness: metrics.fitness_serie[i],
      fatiga: metrics.fatiga_serie[i],
      tsb,
    }))
  }, [metrics])

  const tone = metrics?.suficiente ? formaTone(metrics.zona) : 'accent'

  return (
    <>
      <Panel title="Atleta" subtitle={atleta?.nombre}>
        <div className="flex flex-wrap gap-2">
          {squad.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={`flex max-w-full items-center gap-2 overflow-hidden rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
                a.id === sel ? 'border-accent bg-accent/10 text-white' : 'border-perf-border bg-perf-surface2 text-white/70 hover:text-white'
              }`}
            >
              <Avatar name={a.nombre} src={a.foto} size={22} />
              <span className="min-w-0 truncate">{a.nombre}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="TSB (Training Stress Balance)" subtitle="Fitness (EWMA 42d) − fatiga (EWMA 7d)">
        {metrics?.suficiente && metrics.tsb != null ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs text-white/45">TSB</p>
                <p className={`text-4xl font-bold ${SEM[tone].text}`}>{metrics.tsb}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${SEM[tone].soft} ${SEM[tone].text}`}>
                {metrics.zona}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Metric label="Fitness (UA)" value={metrics.fitness_ua} />
              <Metric label="Fatiga (UA)" value={metrics.fatiga_ua} />
              <Metric label="Días con datos" value={metrics.dias_con_datos} />
            </div>
            {metrics.nota && <p className="text-xs text-white/35">{metrics.nota}</p>}
          </div>
        ) : (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center">
            <p className="text-sm text-white/45">Acumulando datos: {metrics?.dias_con_datos ?? 0} día(s).</p>
            <p className="mt-1 text-xs text-white/30">La forma necesita ≥ 7 días de carga registrada en Carga interna.</p>
          </div>
        )}
      </Panel>

      <Panel title="Fitness vs. fatiga" subtitle={chart.length ? `Últimos ${chart.length} días` : undefined}>
        {chart.length > 0 ? (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#16203a" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} interval={4} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                <Line type="monotone" dataKey="fitness" name="Fitness" stroke="#14b8a6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="fatiga" name="Fatiga" stroke="#ffaa32" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="tsb" name="TSB" stroke="#32c896" dot={false} strokeWidth={2} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-white/40">Registra sesiones en Carga interna para ver la curva de forma.</p>
        )}
      </Panel>
    </>
  )
}

function Kpi({ label, value, tone = 'accent' }: { label: string; value: string; tone?: 'accent' | 'ok' | 'warn' | 'danger' }) {
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className={`mt-1 text-xl font-bold ${SEM[tone].text}`}>{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-perf-border bg-perf-surface2 p-3">
      <p className="text-[11px] text-white/45">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-white">{value ?? '—'}</p>
    </div>
  )
}
