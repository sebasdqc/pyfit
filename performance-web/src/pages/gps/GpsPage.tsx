// Módulo GPS Y TECNOLOGÍA (dentro de Monitoreo). Reproduce el flujo de trabajo de
// un sistema profesional de seguimiento por GPS en campo (Catapult / STATSports):
// se elige una sesión del microciclo y se analiza la carga externa del plantel y
// de cada atleta — distancia, intensidad (m/min), zonas de velocidad, alta
// velocidad/sprints, Player Load y su reparto por planos, aceleraciones y
// deceleraciones, métricas metabólicas, la traza de velocidad de la sesión y un
// mapa de calor posicional sobre el campo. Datos de muestra deterministas
// derivados de la plantilla (lib/mockGps), respetando las ediciones guardadas.

import { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { Icon } from '@/components/Icon'
import { SEM, type Tone } from '@/lib/tone'
import { ESTADO_LABEL, ESTADO_TONE } from '@/lib/mockSquad'
import { useSquad } from '@/centers/useSquad'
import {
  buildGps, teamGpsSummary, teamZoneAverages, GPS_SESSIONS, ZONE_META,
  type GpsSample, type GpsSessionDef,
} from '@/lib/mockGps'

// ── Tema de gráficos (oscuro, plano) ─────────────────────────────────────────
const ACCENT = '#14b8a6'
const GRID = '#16203a'
const axisTick = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }
const tip = {
  contentStyle: { background: '#0f1525', border: '1px solid #1c2740', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: 'rgba(255,255,255,0.55)' },
  itemStyle: { color: '#fff' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
}

const lastName = (n: string) => n.split(' ').slice(1).join(' ') || n
const fmt = (n: number) => n.toLocaleString('es-ES')
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

export function GpsPage() {
  const { athletes: squad, loading, error, isRealRoster } = useSquad()
  const [sessionId, setSessionId] = useState<string>(GPS_SESSIONS[0].id)
  const [tab, setTab] = useState<'equipo' | 'atleta'>('equipo')
  const [sel, setSel] = useState<string>('')

  const session = GPS_SESSIONS.find((s) => s.id === sessionId) ?? GPS_SESSIONS[0]
  const samples = useMemo(() => buildGps(squad, session), [squad, session])

  useEffect(() => {
    if (!samples.length) return
    setSel((prev) => (samples.some((s) => s.id === prev) ? prev : samples[0].id))
  }, [samples])

  const noContent = loading || error || (isRealRoster && squad.length === 0)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">GPS y Tecnología</h1>
            <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
          </div>
          <p className="text-xs text-white/45">Carga externa en campo · análisis por sesión con seguimiento GPS</p>
        </div>
        {!noContent && (
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
                {t === 'equipo' ? 'Reporte de equipo' : 'Por atleta'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selector de sesión (microciclo) */}
      {!noContent && <SessionPicker session={session} onSelect={setSessionId} />}

      {noContent ? (
        <SquadState loading={loading} error={error} empty={isRealRoster && squad.length === 0} />
      ) : tab === 'equipo' ? (
        <TeamView samples={samples} session={session} />
      ) : (
        <AthleteView samples={samples} session={session} sel={sel} onSelect={setSel} />
      )}
    </div>
  )
}

// ── Selector de sesión ───────────────────────────────────────────────────────
function SessionPicker({ session, onSelect }: { session: GpsSessionDef; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {GPS_SESSIONS.map((s) => {
        const active = s.id === session.id
        const partido = s.tipo === 'partido'
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`flex shrink-0 flex-col items-start rounded-xl border px-3.5 py-2 text-left transition-colors ${
              active ? 'border-accent bg-accent/10' : 'border-perf-border bg-perf-surface hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  partido ? 'bg-accent/20 text-accent' : 'bg-white/10 text-white/60'
                }`}
              >
                {s.fase}
              </span>
              <span className={`text-[11px] ${active ? 'text-white' : 'text-white/55'}`}>{s.fecha}</span>
            </div>
            <span className={`mt-1 whitespace-nowrap text-xs font-medium ${active ? 'text-white' : 'text-white/70'}`}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Vista de equipo (reporte de sesión) ──────────────────────────────────────
type SortKey = 'distancia' | 'distMin' | 'hsr' | 'sprints' | 'maxVel' | 'playerLoad' | 'accdec' | 'duracion'

function TeamView({ samples, session }: { samples: GpsSample[]; session: GpsSessionDef }) {
  const sum = useMemo(() => teamGpsSummary(samples), [samples])
  const zoneAvg = useMemo(() => teamZoneAverages(samples), [samples])
  const [sortKey, setSortKey] = useState<SortKey>('distancia')
  const [desc, setDesc] = useState(true)

  const accDec = (s: GpsSample) => s.accAlta + s.accMedia + s.accBaja + s.decAlta + s.decMedia + s.decBaja
  const sortVal: Record<SortKey, (s: GpsSample) => number> = {
    distancia: (s) => s.distancia,
    distMin: (s) => s.distMin,
    hsr: (s) => s.hsr,
    sprints: (s) => s.sprints,
    maxVel: (s) => s.maxVel,
    playerLoad: (s) => s.playerLoad,
    accdec: accDec,
    duracion: (s) => s.duracion,
  }
  const rows = useMemo(() => {
    const r = [...samples].sort((a, b) => sortVal[sortKey](b) - sortVal[sortKey](a))
    return desc ? r : r.reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples, sortKey, desc])

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setDesc((d) => !d)
    else {
      setSortKey(k)
      setDesc(true)
    }
  }

  const zoneStack = [
    ZONE_META.reduce(
      (acc, z) => ({ ...acc, [z.key]: zoneAvg[z.key] }),
      { name: 'Equipo' } as Record<string, number | string>,
    ),
  ]
  const plRank = [...samples]
    .sort((a, b) => b.playerLoad - a.playerLoad)
    .slice(0, 10)
    .map((s) => ({ nombre: lastName(s.nombre), value: s.playerLoad }))

  return (
    <>
      {/* KPIs de la sesión */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Kpi label="Distancia media" value={fmt(sum.distMedia)} unit="m" tone="accent" />
        <Kpi label="Intensidad" value={`${sum.distMinMedia}`} unit="m/min" tone="warn" />
        <Kpi label="HSR media" value={fmt(sum.hsrMedia)} unit="m" tone="warn" />
        <Kpi label="Player Load" value={fmt(sum.plMedio)} unit="AU" tone="accent" />
        <Kpi label="Sprints equipo" value={`${sum.sprintsTotal}`} tone="danger" />
        <Kpi label="Vel. máx" value={`${sum.velMax}`} unit="km/h" tone="danger" />
        <Kpi label="Acc+Dec media" value={`${sum.accDecMedia}`} tone="accent" />
        <Kpi label="Dist. acumulada" value={`${(sum.distancia / 1000).toFixed(1)}`} unit="km" tone="ok" />
      </div>

      {/* Reporte por jugador (tabla) */}
      <Panel
        title="Reporte por jugador"
        subtitle={`${session.label} · ${samples.length} atletas · ordena por columna`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-perf-border text-left text-[11px] uppercase tracking-wide text-white/40">
                <th className="px-4 py-2.5 font-medium">Jugador</th>
                <th className="px-2 py-2.5 font-medium">Pos</th>
                <Th label="Min" k="duracion" sortKey={sortKey} desc={desc} onSort={toggleSort} />
                <Th label="Dist (m)" k="distancia" sortKey={sortKey} desc={desc} onSort={toggleSort} />
                <Th label="m/min" k="distMin" sortKey={sortKey} desc={desc} onSort={toggleSort} />
                <Th label="HSR (m)" k="hsr" sortKey={sortKey} desc={desc} onSort={toggleSort} />
                <Th label="Sprints" k="sprints" sortKey={sortKey} desc={desc} onSort={toggleSort} />
                <Th label="Vel máx" k="maxVel" sortKey={sortKey} desc={desc} onSort={toggleSort} />
                <Th label="P. Load" k="playerLoad" sortKey={sortKey} desc={desc} onSort={toggleSort} />
                <Th label="Acc+Dec" k="accdec" sortKey={sortKey} desc={desc} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-perf-border/60 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.nombre} src={s.foto} size={28} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white/90">{s.nombre}</p>
                        <p className="text-[11px] text-white/40">#{s.dorsal}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-white/55">{s.posicion}</td>
                  <td className="px-2 py-2.5 tabular-nums text-white/70">{s.duracion}'</td>
                  <td className="px-2 py-2.5 tabular-nums font-medium text-white">{fmt(s.distancia)}</td>
                  <td className="px-2 py-2.5 tabular-nums text-perf-warn">{s.distMin}</td>
                  <td className="px-2 py-2.5 tabular-nums text-white/70">{fmt(s.hsr)}</td>
                  <td className="px-2 py-2.5 tabular-nums text-white/70">{s.sprints}</td>
                  <td className="px-2 py-2.5 tabular-nums text-perf-danger">{s.maxVel}</td>
                  <td className="px-2 py-2.5 tabular-nums text-accent">{fmt(s.playerLoad)}</td>
                  <td className="px-2 py-2.5 tabular-nums text-white/70">{accDec(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Reparto de zonas de velocidad del equipo */}
        <Panel title="Zonas de velocidad" subtitle="Distancia media por banda (m)" className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {ZONE_META.map((z) => (
              <span key={z.key} className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: z.color }} />
                {z.label} <span className="text-white/35">{z.rango}</span>
              </span>
            ))}
          </div>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={zoneStack} margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap={8}>
                <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} unit=" m" />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip {...tip} />
                {ZONE_META.map((z, i) => (
                  <Bar
                    key={z.key}
                    dataKey={z.key}
                    name={z.label}
                    stackId="z"
                    fill={z.color}
                    radius={i === 0 ? [6, 0, 0, 6] : i === ZONE_META.length - 1 ? [0, 6, 6, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            HSR = zonas de alta velocidad + sprint (&gt; 20 km/h). El sprint (&gt; 25 km/h) es el principal marcador de
            riesgo de lesión muscular.
          </p>
        </Panel>

        {/* Ranking de Player Load */}
        <Panel title="Carga mecánica" subtitle="Top 10 · Player Load (AU)">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={plRank} margin={{ top: 0, right: 14, left: 8, bottom: 0 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="nombre" width={78} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={ACCENT} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  )
}

function Th({
  label,
  k,
  sortKey,
  desc,
  onSort,
}: {
  label: string
  k: SortKey
  sortKey: SortKey
  desc: boolean
  onSort: (k: SortKey) => void
}) {
  const active = k === sortKey
  return (
    <th className="px-2 py-2.5 font-medium">
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-white/80 ${active ? 'text-accent' : ''}`}
      >
        {label}
        <span className={`text-[8px] ${active ? 'opacity-100' : 'opacity-0'}`}>{desc ? '▼' : '▲'}</span>
      </button>
    </th>
  )
}

// ── Vista por atleta (deep-dive) ─────────────────────────────────────────────
function AthleteView({
  samples,
  session,
  sel,
  onSelect,
}: {
  samples: GpsSample[]
  session: GpsSessionDef
  sel: string
  onSelect: (id: string) => void
}) {
  const s = samples.find((x) => x.id === sel) ?? samples[0]
  if (!s) return null

  const teamDistMin = Math.round(samples.reduce((a, x) => a + x.distMin, 0) / samples.length)
  const vsTeam = Math.round(((s.distMin - teamDistMin) / teamDistMin) * 100)
  const accTotal = s.accAlta + s.accMedia + s.accBaja
  const decTotal = s.decAlta + s.decMedia + s.decBaja

  const planeData = [
    { name: 'Anterior', value: s.planes.anterior, color: '#14b8a6' },
    { name: 'Lateral', value: s.planes.lateral, color: '#6ce5ff' },
    { name: 'Vertical', value: s.planes.vertical, color: '#32c896' },
  ]
  const accDecData = [
    { zona: 'Alta', acc: s.accAlta, dec: s.decAlta },
    { zona: 'Media', acc: s.accMedia, dec: s.decMedia },
    { zona: 'Baja', acc: s.accBaja, dec: s.decBaja },
  ]
  const totalZoneDist = s.zonas.reduce((a, z) => a + z.dist, 0) || 1

  return (
    <>
      {/* Selector de atleta */}
      <Panel title="Atleta" subtitle={s.nombre}>
        <div className="flex flex-wrap gap-2">
          {samples.map((a) => {
            const isSel = a.id === s.id
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a.id)}
                className={`flex max-w-full items-center gap-2 overflow-hidden rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
                  isSel ? 'border-accent bg-accent/10 text-white' : 'border-perf-border bg-perf-surface2 text-white/70 hover:text-white'
                }`}
              >
                <Avatar name={a.nombre} src={a.foto} size={24} />
                <span className="min-w-0 truncate">{a.nombre}</span>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEM[ESTADO_TONE[a.estado]].bg}`} />
              </button>
            )
          })}
        </div>
      </Panel>

      {/* Cabecera del atleta */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-perf-border bg-perf-surface p-5">
        <Avatar name={s.nombre} src={s.foto} size={48} />
        <div>
          <p className="text-base font-semibold text-white">
            {s.nombre} <span className="text-white/40">#{s.dorsal}</span>
          </p>
          <p className="text-xs text-white/50">{s.posicion}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-lg border border-perf-border bg-perf-surface2 px-2.5 py-1 text-[11px] text-white/60">
            {session.fase} · {s.duracion}' jugados
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${SEM[ESTADO_TONE[s.estado]].soft} ${SEM[ESTADO_TONE[s.estado]].text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${SEM[ESTADO_TONE[s.estado]].bg}`} />
            {ESTADO_LABEL[s.estado]}
          </span>
        </div>
      </div>

      {/* KPIs del atleta */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Kpi label="Distancia" value={fmt(s.distancia)} unit="m" tone="accent" />
        <Kpi label="Intensidad" value={`${s.distMin}`} unit="m/min" tone="warn" />
        <Kpi label="HSR (>20)" value={fmt(s.hsr)} unit="m" tone="warn" />
        <Kpi label="Dist. sprint" value={fmt(s.sprintDist)} unit="m" tone="danger" />
        <Kpi label="Sprints" value={`${s.sprints}`} tone="danger" />
        <Kpi label="Vel. máx" value={`${s.maxVel}`} unit="km/h" tone="danger" />
        <Kpi label="Player Load" value={fmt(s.playerLoad)} unit="AU" tone="accent" />
        <Kpi label="PL / min" value={`${s.plMin}`} unit="AU/min" tone="accent" />
        <Kpi label="Acc / Dec" value={`${accTotal}/${decTotal}`} tone="ok" />
        <Kpi label="HMLD" value={fmt(s.hmld)} unit="m" tone="warn" />
        <Kpi label="Pot. metab." value={`${s.metaPower}`} unit="W/kg" tone="ok" />
        <Kpi label="Energía" value={fmt(s.energia)} unit="kcal" tone="ok" />
      </div>

      {/* Benchmark de la sesión */}
      <Panel title="Exigencia de la sesión" subtitle="Relativa a un partido tipo de su demarcación">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Gauge label="% de exigencia de partido" pct={s.pctPartido} />
          <div className="flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Intensidad del atleta</span>
              <span className="font-semibold text-white">{s.distMin} m/min</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Media del equipo</span>
              <span className="text-white/70">{teamDistMin} m/min</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <Icon name={vsTeam >= 0 ? 'trendUp' : 'trendDown'} size={15} className={vsTeam >= 0 ? 'text-perf-ok' : 'text-perf-warn'} />
              <span className={vsTeam >= 0 ? 'text-perf-ok' : 'text-perf-warn'}>
                {vsTeam >= 0 ? '+' : ''}{vsTeam}% vs media del equipo
              </span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Zonas de velocidad (detalle) */}
        <Panel title="Zonas de velocidad" subtitle="Distancia y tiempo por banda" className="lg:col-span-2">
          <div className="flex flex-col gap-3">
            {s.zonas.map((z) => {
              const meta = ZONE_META.find((m) => m.key === z.key)!
              const pct = Math.round((z.dist / totalZoneDist) * 100)
              return (
                <div key={z.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
                      <span className="font-medium text-white/80">{meta.label}</span>
                      <span className="text-white/35">{meta.rango}</span>
                    </span>
                    <span className="tabular-nums text-white/55">
                      {fmt(z.dist)} m · {mmss(z.tiempo)} · {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        {/* Player Load por planos */}
        <Panel title="Player Load por planos" subtitle="Reparto del vector de carga (%)">
          <div className="relative h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planeData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none">
                  {planeData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip {...tip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-white">{fmt(s.playerLoad)}</span>
              <span className="text-[10px] uppercase tracking-wide text-white/40">AU total</span>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {planeData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-white/65">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="tabular-nums text-white/70">{d.value}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Traza de velocidad */}
        <Panel title="Perfil de velocidad" subtitle="Velocidad a lo largo de la sesión (km/h)" className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-4 text-[11px] text-white/55">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4" style={{ background: '#ffaa32' }} /> Umbral HSR (20)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4" style={{ background: '#ff4444' }} /> Umbral sprint (25)
            </span>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.trace} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="vgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="t" tick={axisTick} tickLine={false} axisLine={false} unit="'" interval={9} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={[0, Math.ceil(s.maxVel / 5) * 5]} />
                <Tooltip {...tip} formatter={(v: number) => [`${v} km/h`, 'Velocidad']} labelFormatter={(l) => `min ${l}`} />
                <ReferenceLine y={20} stroke="#ffaa32" strokeDasharray="4 4" />
                <ReferenceLine y={25} stroke="#ff4444" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={2} fill="url(#vgrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Aceleraciones / deceleraciones */}
        <Panel title="Acel / Decel" subtitle="Recuento de esfuerzos por intensidad">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accDecData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }} barGap={4}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="zona" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Bar dataKey="acc" name="Aceleraciones" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dec" name="Deceleraciones" fill="#ffaa32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-white/55">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Acc {accTotal}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-perf-warn" /> Dec {decTotal}
            </span>
          </div>
        </Panel>
      </div>

      {/* Mapa de calor posicional */}
      <Panel title="Mapa de calor" subtitle="Densidad de posicionamiento en el campo durante la sesión">
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
          <PitchHeatmap heat={s.heat} />
          <div className="flex flex-col gap-3 text-xs text-white/55">
            <p className="max-w-xs leading-relaxed">
              Reconstrucción de la ocupación del terreno a partir de las coordenadas GPS del atleta. Las zonas más cálidas
              concentran más tiempo de permanencia.
            </p>
            <div className="flex items-center gap-2">
              <span>Menor</span>
              <div className="h-2.5 w-32 rounded-full" style={{ background: 'linear-gradient(90deg,#16203a,#2b4cf0,#32c896,#ffd23f,#ffaa32,#ff4444)' }} />
              <span>Mayor</span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1.5">
              <Stat label="Distancia" value={`${fmt(s.distancia)} m`} />
              <Stat label="Carril" value={s.posicion} />
              <Stat label="HMLD" value={`${fmt(s.hmld)} m`} />
              <Stat label="Vel. máx" value={`${s.maxVel} km/h`} />
            </div>
          </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-white/35">{label}</p>
      <p className="text-sm text-white/80">{value}</p>
    </div>
  )
}

// Indicador circular de porcentaje (reutiliza el patrón SVG del panel).
function Gauge({ label, pct }: { label: string; pct: number }) {
  const size = 132
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const v = Math.min(pct, 120)
  const offset = circ - (Math.min(v, 100) / 100) * circ
  const tone: Tone = pct >= 95 ? 'danger' : pct >= 75 ? 'warn' : 'ok'
  const hex = tone === 'danger' ? '#ff4444' : tone === 'warn' ? '#ffaa32' : '#32c896'
  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={hex}
            strokeWidth={stroke}
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{pct}%</span>
        </div>
      </div>
      <p className="max-w-[140px] text-sm text-white/60">{label}</p>
    </div>
  )
}

// Mapa de calor sobre un campo de fútbol (SVG). El campo se dibuja en vertical
// (defensa abajo, ataque arriba) y las celdas de densidad se difuminan para dar
// el aspecto clásico de heatmap de los sistemas de seguimiento.
function PitchHeatmap({ heat }: { heat: number[][] }) {
  const W = 200
  const H = 300
  const rows = heat.length
  const cols = heat[0]?.length ?? 0
  const cw = W / cols
  const ch = H / rows

  return (
    <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} className="w-full max-w-[280px]" role="img" aria-label="Mapa de calor de posicionamiento">
      <defs>
        <filter id="heatblur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
      </defs>
      {/* Césped */}
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#0b1220" stroke="#1c2740" />

      {/* Celdas de calor (difuminadas). Fila 0 = defensa (abajo). */}
      <g filter="url(#heatblur)" opacity={0.92}>
        {heat.map((row, r) =>
          row.map((v, c) => {
            if (v < 0.06) return null
            const y = (rows - 1 - r) * ch
            return <rect key={`${r}-${c}`} x={c * cw} y={y} width={cw} height={ch} fill={heatColor(v)} opacity={Math.min(1, 0.25 + v * 0.85)} />
          }),
        )}
      </g>

      {/* Líneas del campo por encima del calor */}
      <g fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={1.4}>
        <rect x={3} y={3} width={W - 6} height={H - 6} rx={4} />
        <line x1={3} y1={H / 2} x2={W - 3} y2={H / 2} />
        <circle cx={W / 2} cy={H / 2} r={26} />
        <circle cx={W / 2} cy={H / 2} r={1.6} fill="rgba(255,255,255,0.32)" />
        {/* Áreas */}
        <rect x={W / 2 - 40} y={3} width={80} height={42} />
        <rect x={W / 2 - 18} y={3} width={36} height={16} />
        <rect x={W / 2 - 40} y={H - 45} width={80} height={42} />
        <rect x={W / 2 - 18} y={H - 19} width={36} height={16} />
      </g>

      {/* Rótulos de orientación */}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.35)">DEFENSA</text>
      <text x={W / 2} y={12} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.35)">ATAQUE</text>
    </svg>
  )
}

// Rampa de color del heatmap: frío (azul) → caliente (rojo).
function heatColor(v: number): string {
  const stops: [number, [number, number, number]][] = [
    [0.0, [43, 76, 240]], // azul
    [0.4, [50, 200, 150]], // verde
    [0.65, [255, 210, 63]], // amarillo
    [0.83, [255, 170, 50]], // naranja
    [1.0, [255, 68, 68]], // rojo
  ]
  let lo = stops[0]
  let hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i][0] && v <= stops[i + 1][0]) {
      lo = stops[i]
      hi = stops[i + 1]
      break
    }
  }
  const span = hi[0] - lo[0] || 1
  const t = (v - lo[0]) / span
  const ch = (i: number) => Math.round(lo[1][i] + (hi[1][i] - lo[1][i]) * t)
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`
}
