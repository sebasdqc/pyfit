// Módulo RENDIMIENTO. Dos vistas: general del equipo e individual por atleta.
// Integra los parámetros más usados en el campo: carga interna (sRPE: aguda/
// crónica/ACWR/monotonía/strain), neuromuscular (CMJ), autonómico (HRV),
// readiness y carga externa tipo GPS (distancia/HSR/sprints/Player Load/vel.
// máx), con tendencias de las últimas 10 semanas. Datos de muestra derivados de
// la plantilla (lib/mockPerformance), respetando las ediciones guardadas.

import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { SEM, acwrTone, type Tone } from '@/lib/tone'
import { ESTADO_LABEL, ESTADO_TONE } from '@/lib/mockSquad'
import { loadSquad } from '@/lib/squadStore'
import { buildPerformance, teamAverages, teamLoadSeries, type AthletePerf } from '@/lib/mockPerformance'

// ── Tema de los gráficos (oscuro, plano) ────────────────────────────────────
const ACCENT = '#4f8cff'
const MUTED = 'rgba(255,255,255,0.32)'
const GRID = '#16203a'
const ZONE_HEX: Record<Tone, string> = { ok: '#32c896', warn: '#ffaa32', danger: '#ff4444', accent: '#4f8cff' }
const axisTick = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }
const tip = {
  contentStyle: { background: '#0f1525', border: '1px solid #1c2740', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: 'rgba(255,255,255,0.55)' },
  itemStyle: { color: '#fff' },
  cursor: { stroke: 'rgba(255,255,255,0.14)' },
}
const lastName = (n: string) => n.split(' ').slice(1).join(' ') || n

export function RendimientoPage() {
  const squad = useMemo(() => loadSquad(), [])
  const perfs = useMemo(() => buildPerformance(squad), [squad])
  const [tab, setTab] = useState<'general' | 'individual'>('general')
  const [sel, setSel] = useState<string>(squad[0]?.id ?? '')

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      {/* Encabezado + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Rendimiento</h1>
          <p className="text-xs text-white/45">Carga, neuromuscular, autonómico y carga externa</p>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-perf-border bg-perf-surface p-0.5">
          {(['general', 'individual'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              {t === 'general' ? 'Visión general' : 'Por atleta'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'general' ? (
        <GeneralView perfs={perfs} />
      ) : (
        <IndividualView perfs={perfs} sel={sel} onSelect={setSel} />
      )}
    </div>
  )
}

// ── Vista general ────────────────────────────────────────────────────────────
function GeneralView({ perfs }: { perfs: AthletePerf[] }) {
  const avgs = teamAverages(perfs)
  const teamSeries = teamLoadSeries(perfs)
  const scatter = perfs.map((p) => ({ x: p.metrics.cargaAguda, y: p.metrics.acwr, nombre: p.nombre, zone: acwrTone(p.metrics.acwr) }))
  const rankCarga = [...perfs].sort((a, b) => b.metrics.cargaAguda - a.metrics.cargaAguda).slice(0, 8)
    .map((p) => ({ nombre: lastName(p.nombre), value: p.metrics.cargaAguda, zone: acwrTone(p.metrics.acwr) }))
  const rankCmj = [...perfs].sort((a, b) => b.metrics.cmj - a.metrics.cmj).slice(0, 8)
    .map((p) => ({ nombre: lastName(p.nombre), value: p.metrics.cmj }))

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Carga aguda media" value={`${avgs.cargaAguda}`} unit="UA" tone="warn" />
        <Kpi label="ACWR medio" value={avgs.acwr.toFixed(2)} tone={acwrTone(avgs.acwr)} />
        <Kpi label="CMJ medio" value={`${avgs.cmj}`} unit="cm" tone="accent" />
        <Kpi label="HRV media" value={`${avgs.hrv}`} unit="ms" tone="ok" />
        <Kpi label="Monotonía media" value={`${avgs.monotonia}`} tone={avgs.monotonia >= 2 ? 'warn' : 'ok'} />
        <Kpi label="Readiness medio" value={`${avgs.readiness}`} unit="%" tone="ok" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Carga del equipo" subtitle="Aguda (7d) vs crónica (28d) · últimas 10 semanas" className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-5 text-xs">
            <LegendDot color={ACCENT} label="Aguda (7d)" />
            <LegendDot color={MUTED} label="Crónica (28d)" />
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={teamSeries} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="semana" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Area type="monotone" dataKey="cronica" name="Crónica" stroke={MUTED} fill={MUTED} fillOpacity={0.08} strokeWidth={2} />
                <Area type="monotone" dataKey="aguda" name="Aguda" stroke={ACCENT} fill={ACCENT} fillOpacity={0.18} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Carga aguda vs ACWR" subtitle="Cada punto, un atleta">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis type="number" dataKey="x" name="Carga aguda" unit=" UA" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis type="number" dataKey="y" name="ACWR" domain={[0.8, 2]} tick={axisTick} tickLine={false} axisLine={false} />
                <ZAxis range={[60, 60]} />
                <ReferenceLine y={1.3} stroke={ZONE_HEX.warn} strokeDasharray="4 4" />
                <ReferenceLine y={1.5} stroke={ZONE_HEX.danger} strokeDasharray="4 4" />
                <Tooltip {...tip} content={<ScatterTip />} />
                <Scatter data={scatter}>
                  {scatter.map((d, i) => (
                    <Cell key={i} fill={ZONE_HEX[d.zone]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Ranking de carga aguda" subtitle="Top 8 · color por zona ACWR">
          <RankBars data={rankCarga} unit=" UA" colored />
        </Panel>
        <Panel title="Ranking de CMJ" subtitle="Top 8 · altura de salto (cm)">
          <RankBars data={rankCmj} unit=" cm" />
        </Panel>
      </div>
    </>
  )
}

// ── Vista individual ─────────────────────────────────────────────────────────
function IndividualView({ perfs, sel, onSelect }: { perfs: AthletePerf[]; sel: string; onSelect: (id: string) => void }) {
  const p = perfs.find((x) => x.id === sel) ?? perfs[0]
  if (!p) return null
  const m = p.metrics

  return (
    <>
      {/* Selector por chips */}
      <Panel title="Atleta" subtitle={p.nombre}>
        <div className="flex flex-wrap gap-2">
          {perfs.map((a) => {
            const isSel = a.id === p.id
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a.id)}
                className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
                  isSel ? 'border-accent bg-accent/10 text-white' : 'border-perf-border bg-perf-surface2 text-white/70 hover:text-white'
                }`}
              >
                <Avatar name={a.nombre} src={a.foto} size={24} />
                <span className="whitespace-nowrap">{a.nombre}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${SEM[ESTADO_TONE[a.estado]].bg}`} />
              </button>
            )
          })}
        </div>
      </Panel>

      {/* Cabecera */}
      <div className="flex items-center gap-3 rounded-2xl border border-perf-border bg-perf-surface p-5">
        <Avatar name={p.nombre} src={p.foto} size={48} />
        <div>
          <p className="text-base font-semibold text-white">{p.nombre}</p>
          <p className="text-xs text-white/50">{p.posicion}</p>
        </div>
        <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${SEM[ESTADO_TONE[p.estado]].soft} ${SEM[ESTADO_TONE[p.estado]].text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${SEM[ESTADO_TONE[p.estado]].bg}`} />
          {ESTADO_LABEL[p.estado]}
        </span>
      </div>

      {/* KPIs del atleta */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Kpi label="Carga aguda" value={`${m.cargaAguda}`} unit="UA" tone="warn" />
        <Kpi label="Carga crónica" value={`${m.cargaCronica}`} unit="UA" tone="accent" />
        <Kpi label="ACWR" value={m.acwr.toFixed(2)} tone={acwrTone(m.acwr)} />
        <Kpi label="Monotonía" value={`${m.monotonia}`} tone={m.monotonia >= 2 ? 'warn' : 'ok'} />
        <Kpi label="CMJ" value={`${m.cmj}`} unit="cm" tone="accent" />
        <Kpi label="HRV" value={`${m.hrv}`} unit="ms" tone="ok" />
        <Kpi label="Readiness" value={`${m.readiness}`} unit="%" tone={m.readiness >= 70 ? 'ok' : m.readiness >= 50 ? 'warn' : 'danger'} />
        <Kpi label="Vel. máx" value={`${m.maxVel}`} unit="km/h" tone="accent" />
      </div>

      {/* Tendencias */}
      <Panel title="Carga interna" subtitle="Aguda vs crónica · últimas 10 semanas">
        <div className="mb-2 flex items-center gap-5 text-xs">
          <LegendDot color={ACCENT} label="Aguda" />
          <LegendDot color={MUTED} label="Crónica" />
        </div>
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={p.series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="semana" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} />
              <Tooltip {...tip} />
              <Area type="monotone" dataKey="cronica" name="Crónica" stroke={MUTED} fill={MUTED} fillOpacity={0.08} strokeWidth={2} />
              <Area type="monotone" dataKey="aguda" name="Aguda" stroke={ACCENT} fill={ACCENT} fillOpacity={0.18} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TrendCard title="CMJ" unit="cm" dataKey="cmj" data={p.series} />
        <TrendCard title="HRV" unit="ms" dataKey="hrv" data={p.series} />
        <TrendCard title="Readiness" unit="%" dataKey="readiness" data={p.series} domain={[0, 100]} />
      </div>

      {/* Carga externa (GPS) */}
      <Panel title="Carga externa (GPS)" subtitle="Promedios por sesión">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi label="Distancia" value={`${m.distancia}`} unit="km" tone="accent" />
          <Kpi label="HSR" value={`${m.hsr}`} unit="m" tone="accent" />
          <Kpi label="Sprints" value={`${m.sprints}`} tone="accent" />
          <Kpi label="Player Load" value={`${m.playerLoad}`} unit="AU" tone="warn" />
          <Kpi label="Vel. máx" value={`${m.maxVel}`} unit="km/h" tone="accent" />
        </div>
      </Panel>
    </>
  )
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function Kpi({ label, value, unit, tone = 'accent' }: { label: string; value: string; unit?: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-xs text-white/45">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-xl font-bold ${SEM[tone].text}`}>{value}</span>
        {unit && <span className="text-xs text-white/40">{unit}</span>}
      </div>
    </div>
  )
}

function TrendCard({ title, unit, dataKey, data, domain }: { title: string; unit: string; dataKey: string; data: AthletePerf['series']; domain?: [number, number] }) {
  const last = data[data.length - 1] as unknown as Record<string, number>
  return (
    <Panel title={title} subtitle={`Actual: ${last[dataKey]} ${unit}`}>
      <div className="h-[170px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="semana" tick={axisTick} tickLine={false} axisLine={false} interval={1} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} domain={domain ?? ['auto', 'auto']} />
            <Tooltip {...tip} />
            <Line type="monotone" dataKey={dataKey} stroke={ACCENT} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

function RankBars({ data, unit, colored }: { data: { nombre: string; value: number; zone?: Tone }[]; unit: string; colored?: boolean }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} unit={unit} />
          <YAxis type="category" dataKey="nombre" width={84} tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip {...tip} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={ACCENT}>
            {colored && data.map((d, i) => <Cell key={i} fill={ZONE_HEX[d.zone ?? 'accent']} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-white/65">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function ScatterTip({ active, payload }: { active?: boolean; payload?: { payload: { nombre: string; x: number; y: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-perf-border bg-perf-surface px-3 py-2 text-xs">
      <p className="font-medium text-white">{d.nombre}</p>
      <p className="text-white/55">Carga aguda {d.x} UA · ACWR {d.y.toFixed(2)}</p>
    </div>
  )
}
