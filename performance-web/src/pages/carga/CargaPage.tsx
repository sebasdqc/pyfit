// Módulo CARGA INTERNA (sRPE → ACWR). La métrica que el documento marca como la
// "columna vertebral" del monitoreo. Vista de EQUIPO (semáforo de ACWR/monotonía por
// atleta + alertas) y POR ATLETA (registro diario de sRPE, barra de zona ACWR,
// monotonía/strain y gráfico de carga diaria). El cálculo lo hace el SERVIDOR
// (performance.carga_service); el cliente solo captura RPE × duración. Demo sin
// centro → espejo determinista en lib/cargaDemo (como el módulo GPS).

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { SEM, type Tone } from '@/lib/tone'
import { useSquad } from '@/centers/useSquad'
import type { Athlete } from '@/lib/mockSquad'
import type { CargaMetrics, CargaRecord, CargaTeamRow } from '@/types'
import { listCargaTeam, getCargaAthlete, createCarga, deleteCarga } from '@/api/performance'
import {
  demoSeries, demoRecords, demoTeamRow, metricsFromSerie, zonaTone,
} from '@/lib/cargaDemo'
import { useActiveCenter } from '@/centers/useActiveCenter'

const today = () => new Date().toISOString().slice(0, 10)

const tip = {
  contentStyle: { background: '#0f1525', border: '1px solid #1c2740', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: 'rgba(255,255,255,0.55)' },
  itemStyle: { color: '#fff' },
}
const axisTick = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }

export function CargaPage() {
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
            <h1 className="text-xl font-semibold tracking-tight text-white">Carga interna</h1>
            <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
          </div>
          <p className="text-xs text-white/45">
            sRPE · ACWR (aguda 7d : crónica 28d) · monotonía y strain · cálculo en el servidor
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
  const [rows, setRows] = useState<CargaTeamRow[] | null>(null)

  useEffect(() => {
    if (isRealRoster && centerId != null) {
      let alive = true
      listCargaTeam(centerId).then((r) => { if (alive) setRows(r) }).catch(() => { if (alive) setRows([]) })
      return () => { alive = false }
    }
    // Demo: una fila determinista por atleta de la plantilla de muestra.
    setRows(squad.map((a, i) => demoTeamRow(a.id, a.userId ?? -(i + 1))))
  }, [isRealRoster, centerId, squad])

  // Une la fila (por id de usuario) con el atleta de la plantilla para el nombre/foto.
  const byUser = useMemo(() => {
    const m = new Map<number, Athlete>()
    squad.forEach((a, i) => m.set(a.userId ?? -(i + 1), a))
    return m
  }, [squad])

  if (!rows) return <Spinner />
  const conDatos = rows.filter((r) => r.suficiente)
  const cuenta = (pred: (r: CargaTeamRow) => boolean) => conDatos.filter(pred).length
  const sweet = cuenta((r) => r.zona.startsWith('Óptima'))
  const peligro = cuenta((r) => r.riesgo_alerta)
  const monoAlta = cuenta((r) => !!r.monotonia_alerta)
  const acumulando = rows.length - conDatos.length

  // Orden: primero los de mayor riesgo (ACWR más alto), luego el resto.
  const ordenadas = [...rows].sort((a, b) => (b.acwr_ewma ?? -1) - (a.acwr_ewma ?? -1))

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <Kpi label={termino('grupo')} value={`${rows.length}`} tone="accent" />
        <Kpi label="En sweet spot" value={`${sweet}`} tone="ok" />
        <Kpi label="En peligro (ACWR)" value={`${peligro}`} tone="danger" />
        <Kpi label="Monotonía alta" value={`${monoAlta}`} tone="warn" />
        <Kpi label="Acumulando datos" value={`${acumulando}`} tone="accent" />
      </div>

      <Panel
        title="ACWR por atleta"
        subtitle="Aguda 7d : crónica 28d (EWMA) · sweet spot 0.8–1.3 · ordenado por riesgo"
      >
        {rows.length === 0 ? (
          <p className="text-sm text-white/40">
            Aún no hay registros de carga. Ve a <span className="text-white/70">Por atleta</span> y registra el primer sRPE.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-perf-border">
            {ordenadas.map((r) => {
              const a = byUser.get(r.athlete)
              const tone = zonaTone(r.zona)
              return (
                <button
                  key={r.athlete}
                  type="button"
                  onClick={() => a && onGoAthlete(a.id)}
                  className="flex w-full flex-col gap-2 py-3 text-left transition-colors hover:bg-white/[0.02] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"
                >
                  {/* Identidad: avatar + nombre */}
                  <div className="flex min-w-0 items-center gap-2.5 sm:min-w-[180px]">
                    <Avatar name={a?.nombre ?? `#${r.athlete}`} src={a?.foto} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{a?.nombre ?? `Atleta ${r.athlete}`}</p>
                      <p className="text-xs text-white/40">{r.dias_con_datos} día(s) con registro</p>
                    </div>
                  </div>
                  {/* Barra ACWR + valor + zona (agrupados en móvil) */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      {r.suficiente && r.acwr_ewma != null
                        ? <AcwrBar acwr={r.acwr_ewma} />
                        : <span className="text-xs text-white/35">Necesita ≥ 7 días</span>}
                    </div>
                    <div className="shrink-0 w-12 text-right">
                      <p className="text-base font-bold text-white">{r.acwr_ewma ?? '—'}</p>
                      <p className="text-[10px] uppercase tracking-wide text-white/35">ACWR</p>
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
  const [metrics, setMetrics] = useState<CargaMetrics | null>(null)
  const [registros, setRegistros] = useState<CargaRecord[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!atleta) return
    if (isRealRoster && centerId != null && atleta.userId != null) {
      try {
        const res = await getCargaAthlete(centerId, atleta.userId)
        setMetrics(res.metricas)
        setRegistros(res.registros)
      } catch {
        setMetrics(null); setRegistros([])
      }
      return
    }
    // Demo determinista.
    const serie = demoSeries(atleta.id)
    setMetrics(metricsFromSerie(serie))
    setRegistros(demoRecords(serie))
  }, [atleta, isRealRoster, centerId])

  useEffect(() => { load() }, [load])

  async function onRegister(rpe: number, dur: number, fecha: string) {
    if (!atleta) return
    setBusy(true)
    try {
      if (isRealRoster && centerId != null && atleta.userId != null) {
        await createCarga(centerId, { athlete: atleta.userId, fecha, rpe, duracion_min: dur })
        await load()
      } else {
        // Demo: agrega la sesión de hoy a la serie y recalcula (espejo cliente).
        const serie = [...(metrics?.carga_serie ?? demoSeries(atleta.id))]
        serie[serie.length - 1] = Math.round(rpe * dur)
        setMetrics(metricsFromSerie(serie))
        setRegistros((prev) => [
          { id: Date.now(), athlete: 0, fecha, carga_ua: Math.round(rpe * dur), metrica: `sRPE ${rpe}×${dur}min`, notas: '' },
          ...prev,
        ])
      }
    } finally { setBusy(false) }
  }

  async function onDelete(id: number) {
    if (isRealRoster && centerId != null) {
      try { await deleteCarga(centerId, id); await load() } catch { /* sin red */ }
      return
    }
    setRegistros((prev) => prev.filter((r) => r.id !== id))
  }

  const serie = metrics?.carga_serie ?? []
  const chart = serie.map((v, i) => ({ dia: `D${i - serie.length + 1}`, carga: v }))

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Registro de sRPE */}
        <SrpeForm busy={busy} onRegister={onRegister} />

        {/* ACWR + zona (lo protagonista) */}
        <Panel title="ACWR · gestión de carga" subtitle="Aguda 7d : crónica 28d" className="lg:col-span-2">
          {metrics?.suficiente && metrics.acwr_ewma != null ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-white/45">ACWR (EWMA)</p>
                  <p className={`text-4xl font-bold ${SEM[zonaTone(metrics.zona)].text}`}>{metrics.acwr_ewma}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${SEM[zonaTone(metrics.zona)].soft} ${SEM[zonaTone(metrics.zona)].text}`}>
                  {metrics.zona}
                </span>
              </div>
              <AcwrBar acwr={metrics.acwr_ewma} large />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="ACWR (media móvil)" value={metrics.acwr_ra} />
                <Metric label="Monotonía" value={metrics.monotonia} alerta={metrics.monotonia_alerta} />
                <Metric label="Strain (UA)" value={metrics.strain_ua} />
                <Metric label="Carga semanal (UA)" value={metrics.carga_semanal_ua} />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center">
              <p className="text-sm text-white/45">Acumulando datos: {metrics?.dias_con_datos ?? 0} día(s).</p>
              <p className="mt-1 text-xs text-white/30">El ACWR necesita ≥ 7 días de registro para tener sentido.</p>
            </div>
          )}
        </Panel>
      </div>

      {/* Carga diaria */}
      <Panel title="Carga diaria" subtitle={`Últimos ${serie.length} días (UA) · días de descanso = 0`}>
        {serie.length > 0 ? (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#16203a" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} interval={2} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="carga" radius={[3, 3, 0, 0]}>
                  {chart.map((_, i) => (
                    <Cell key={i} fill={i >= chart.length - 7 ? '#14b8a6' : 'rgba(20,184,166,0.4)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-white/40">Registra una sesión para ver la carga diaria.</p>
        )}
      </Panel>

      {/* Registros */}
      {registros.length > 0 && (
        <Panel title="Sesiones registradas" subtitle={`${registros.length} · ${atleta?.nombre ?? ''}`}>
          <div className="flex flex-col divide-y divide-perf-border">
            {registros.slice(0, 20).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="w-24 text-sm text-white/70">{r.fecha}</span>
                <span className="flex-1 text-xs text-white/45">{r.metrica}</span>
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accentLight">{r.carga_ua} UA</span>
                <button type="button" onClick={() => onDelete(r.id)} className="text-xs text-white/35 hover:text-perf-danger">Eliminar</button>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  )
}

// ── Formulario de sRPE ───────────────────────────────────────────────────────
function SrpeForm({ busy, onRegister }: { busy: boolean; onRegister: (rpe: number, dur: number, fecha: string) => void }) {
  const [rpe, setRpe] = useState(6)
  const [dur, setDur] = useState('60')
  const [fecha, setFecha] = useState(today())
  const [saved, setSaved] = useState(false)
  const carga = rpe * (Number(dur) || 0)

  return (
    <Panel title="Registrar sesión (sRPE)" subtitle="RPE × duración = carga interna (UA)">
      <div className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/55">Fecha</span>
          <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setSaved(false) }}
            className="w-full rounded-lg border border-perf-border bg-perf-surface2 px-3 py-2 text-sm text-white outline-none focus:border-accent [color-scheme:dark]" />
        </label>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-white/55">RPE (0–10)</span>
            <span className="font-bold text-white">{rpe}</span>
          </div>
          <input type="range" min={0} max={10} step={1} value={rpe}
            onChange={(e) => { setRpe(Number(e.target.value)); setSaved(false) }} className="w-full accent-accent" />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/55">Duración (min)</span>
          <input type="number" inputMode="numeric" min={1} value={dur}
            onChange={(e) => { setDur(e.target.value); setSaved(false) }}
            className="w-full rounded-lg border border-perf-border bg-perf-surface2 px-3 py-2 text-sm text-white outline-none focus:border-accent" />
        </label>
        <div className="flex items-center justify-between rounded-xl border border-perf-border bg-perf-surface2 px-4 py-3">
          <span className="text-xs text-white/45">Carga de la sesión</span>
          <span className="text-2xl font-bold text-accentLight">{carga} <span className="text-sm text-white/40">UA</span></span>
        </div>
        <button
          type="button"
          disabled={busy || carga <= 0}
          onClick={() => { onRegister(rpe, Number(dur), fecha); setSaved(true) }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accentDark disabled:opacity-50"
        >
          {busy ? 'Registrando…' : 'Registrar sesión'}
        </button>
        {saved && !busy && <span className="text-xs text-perf-ok">✓ Registrado (recalculado por el servidor)</span>}
      </div>
    </Panel>
  )
}

// ── Barra de zona ACWR (0.5–2.0): segmentos de color + marcador ──────────────
function AcwrBar({ acwr, large }: { acwr: number; large?: boolean }) {
  const pct = Math.max(0, Math.min(100, ((acwr - 0.5) / (2.0 - 0.5)) * 100))
  return (
    <div className={large ? 'pt-2' : ''}>
      <div className={`relative w-full overflow-hidden rounded-full ${large ? 'h-3' : 'h-2'}`}>
        {/* Segmentos: infracarga (0.5–0.8) · óptima (0.8–1.3) · precaución (1.3–1.5) · peligro (1.5–2.0) */}
        <div className="absolute inset-0 flex">
          <div style={{ width: '20%' }} className="bg-perf-warn/40" />
          <div style={{ width: '33.33%' }} className="bg-perf-ok/55" />
          <div style={{ width: '13.33%' }} className="bg-perf-warn/50" />
          <div style={{ width: '33.33%' }} className="bg-perf-danger/55" />
        </div>
        <div className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `calc(${pct}% - 2px)` }} />
      </div>
      {large && (
        <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wide text-white/30">
          <span>0.5</span><span>0.8</span><span className="text-perf-ok/70">sweet spot</span><span>1.5</span><span>2.0</span>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, tone = 'accent' }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className={`mt-1 text-xl font-bold ${SEM[tone].text}`}>{value}</p>
    </div>
  )
}

function Metric({ label, value, alerta }: { label: string; value: number | null; alerta?: boolean }) {
  return (
    <div className="rounded-xl border border-perf-border bg-perf-surface2 p-3">
      <p className="text-[11px] text-white/45">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${alerta ? 'text-perf-danger' : 'text-white'}`}>{value ?? '—'}</p>
    </div>
  )
}
