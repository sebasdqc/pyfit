// Módulo PSICOLÓGICO. Fase A: monitoreo de bienestar (wellness). Check-ins de
// autopercepción (5 subescalas 1–7, mayor = mejor); el índice de bienestar (0–100)
// lo calcula el SERVIDOR (POST /psicologico/wellness/compute/). Vista de equipo
// (semáforo + ranking + alertas) y por atleta (registro + tendencia). La selección
// de atleta usa la plantilla de muestra y el historial se guarda en localStorage
// (como el módulo Test) hasta que el backend exponga atletas reales.

import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { SEM, type Tone } from '@/lib/tone'
import { loadSquad } from '@/lib/squadStore'
import { computeWellness } from '@/api/performance'
import {
  loadWellness, saveWellness, deleteWellness,
  type SavedWellness, type WellnessEstado,
} from '@/lib/wellnessStore'

// Las 5 subescalas (label espeja performance/wellness.py).
const ITEMS: { name: keyof Pick<SavedWellness, 'sueno' | 'fatiga' | 'estres' | 'dolor_muscular' | 'animo'>; label: string }[] = [
  { name: 'sueno', label: 'Calidad del sueño' },
  { name: 'fatiga', label: 'Energía (vs. fatiga)' },
  { name: 'estres', label: 'Calma (vs. estrés)' },
  { name: 'dolor_muscular', label: 'Ausencia de dolor muscular' },
  { name: 'animo', label: 'Estado de ánimo' },
]
const ESTADO_TONE: Record<WellnessEstado, Tone> = { ok: 'ok', duda: 'warn', alerta: 'danger' }
const ESTADO_LABEL: Record<WellnessEstado, string> = { ok: 'Óptimo', duda: 'Monitorear', alerta: 'Alerta' }
const ZONE_HEX: Record<Tone, string> = { ok: '#32c896', warn: '#ffaa32', danger: '#ff4444', accent: '#4f8cff' }
const DROP_ALERTA = 15 // caída de índice (pts) vs. check-in anterior que dispara alerta

const today = () => new Date().toISOString().slice(0, 10)
const clientIndex = (v: Record<string, number>) =>
  Math.round((ITEMS.reduce((s, it) => s + (v[it.name] || 0), 0) - 5) / 30 * 100)
const clientEstado = (i: number): WellnessEstado => (i >= 70 ? 'ok' : i >= 50 ? 'duda' : 'alerta')
const lastName = (n: string) => n.split(' ').slice(1).join(' ') || n

const tip = {
  contentStyle: { background: '#0f1525', border: '1px solid #1c2740', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: 'rgba(255,255,255,0.55)' },
  itemStyle: { color: '#fff' },
}
const axisTick = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }

export function PsicologicoPage() {
  const squad = useMemo(() => loadSquad(), [])
  const [all, setAll] = useState<SavedWellness[]>(() => loadWellness())
  const [tab, setTab] = useState<'equipo' | 'atleta'>('equipo')
  const [sel, setSel] = useState<string>(squad[0]?.id ?? '')

  // Último check-in por atleta (para el semáforo y el ranking del equipo).
  const latestByAthlete = useMemo(() => {
    const map = new Map<string, SavedWellness>()
    for (const w of all) {
      const prev = map.get(w.athleteId)
      if (!prev || w.fecha > prev.fecha) map.set(w.athleteId, w)
    }
    return map
  }, [all])

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Psicológico</h1>
          <p className="text-xs text-white/45">Monitoreo de bienestar · índice calculado en el servidor</p>
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

      {tab === 'equipo' ? (
        <TeamView squad={squad} latest={latestByAthlete} all={all} onGoAthlete={(id) => { setSel(id); setTab('atleta') }} />
      ) : (
        <AthleteView squad={squad} sel={sel} onSelect={setSel} all={all} setAll={setAll} />
      )}
    </div>
  )
}

// ── Vista de equipo ──────────────────────────────────────────────────────────
function TeamView({
  squad, latest, all, onGoAthlete,
}: {
  squad: ReturnType<typeof loadSquad>
  latest: Map<string, SavedWellness>
  all: SavedWellness[]
  onGoAthlete: (id: string) => void
}) {
  const conDato = squad.filter((a) => latest.has(a.id))
  const indices = conDato.map((a) => latest.get(a.id)!.indice_bienestar)
  const media = indices.length ? Math.round(indices.reduce((s, n) => s + n, 0) / indices.length) : 0
  const cuenta = (e: WellnessEstado) => conDato.filter((a) => latest.get(a.id)!.estado === e).length

  const ranking = [...conDato]
    .map((a) => ({ id: a.id, nombre: lastName(a.nombre), value: latest.get(a.id)!.indice_bienestar, estado: latest.get(a.id)!.estado }))
    .sort((x, y) => x.value - y.value)

  // Alertas: estado alerta, o caída ≥ DROP_ALERTA vs. el check-in anterior del atleta.
  const alertas = conDato.map((a) => {
    const serie = all.filter((w) => w.athleteId === a.id).sort((x, y) => x.fecha.localeCompare(y.fecha))
    const ult = serie[serie.length - 1]
    const prev = serie[serie.length - 2]
    const caida = prev ? prev.indice_bienestar - ult.indice_bienestar : 0
    let motivo = ''
    if (ult.estado === 'alerta') motivo = `Bienestar bajo (${ult.indice_bienestar})`
    else if (caida >= DROP_ALERTA) motivo = `Caída de ${caida} pts (${prev!.indice_bienestar}→${ult.indice_bienestar})`
    return motivo ? { id: a.id, nombre: a.nombre, motivo, estado: ult.estado } : null
  }).filter(Boolean) as { id: string; nombre: string; motivo: string; estado: WellnessEstado }[]

  if (conDato.length === 0) {
    return (
      <Panel title="Bienestar del equipo">
        <p className="text-sm text-white/40">Aún no hay check-ins. Ve a <span className="text-white/70">Por atleta</span> y registra el primero.</p>
      </Panel>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Índice medio" value={`${media}`} tone={clientEstado(media) === 'ok' ? 'ok' : clientEstado(media) === 'duda' ? 'warn' : 'danger'} />
        <Kpi label="Óptimos" value={`${cuenta('ok')}`} tone="ok" />
        <Kpi label="A monitorear" value={`${cuenta('duda')}`} tone="warn" />
        <Kpi label="En alerta" value={`${cuenta('alerta')}`} tone="danger" />
        <Kpi label="Con check-in" value={`${conDato.length}/${squad.length}`} tone="accent" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Ranking de bienestar" subtitle="Último check-in por atleta · color por estado">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={ranking} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#16203a" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="nombre" width={88} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {ranking.map((d) => <Cell key={d.id} fill={ZONE_HEX[ESTADO_TONE[d.estado]]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Alertas" subtitle={`${alertas.length} atleta(s) requieren atención`}>
          {alertas.length === 0 ? (
            <p className="text-sm text-white/40">Sin alertas. Todo el equipo en rango.</p>
          ) : (
            <div className="flex flex-col divide-y divide-perf-border">
              {alertas.map((a) => (
                <button key={a.id} type="button" onClick={() => onGoAthlete(a.id)} className="flex items-center gap-3 py-3 text-left hover:opacity-80">
                  <Avatar name={a.nombre} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{a.nombre}</p>
                    <p className="truncate text-xs text-white/45">{a.motivo}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${SEM[ESTADO_TONE[a.estado]].soft} ${SEM[ESTADO_TONE[a.estado]].text}`}>
                    {ESTADO_LABEL[a.estado]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}

// ── Vista por atleta ─────────────────────────────────────────────────────────
function AthleteView({
  squad, sel, onSelect, all, setAll,
}: {
  squad: ReturnType<typeof loadSquad>
  sel: string
  onSelect: (id: string) => void
  all: SavedWellness[]
  setAll: (w: SavedWellness[]) => void
}) {
  const atleta = squad.find((a) => a.id === sel) ?? squad[0]
  const serie = useMemo(
    () => all.filter((w) => w.athleteId === sel).sort((x, y) => x.fecha.localeCompare(y.fecha)),
    [all, sel],
  )
  const chart = serie.map((w) => ({ fecha: w.fecha.slice(5), indice: w.indice_bienestar }))

  return (
    <>
      <Panel title="Atleta" subtitle={atleta?.nombre}>
        <div className="flex flex-wrap gap-2">
          {squad.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
                a.id === sel ? 'border-accent bg-accent/10 text-white' : 'border-perf-border bg-perf-surface2 text-white/70 hover:text-white'
              }`}
            >
              <Avatar name={a.nombre} size={22} />
              <span className="whitespace-nowrap">{a.nombre}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CheckinForm athleteId={sel} onSaved={setAll} />

        <Panel title="Tendencia de bienestar" subtitle={serie.length ? `${serie.length} check-in(s)` : 'Sin datos aún'}>
          {chart.length > 0 ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#16203a" vertical={false} />
                  <XAxis dataKey="fecha" tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} />
                  <Tooltip {...tip} />
                  <Line type="monotone" dataKey="indice" name="Índice" stroke="#4f8cff" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-white/40">Registra un check-in para ver la tendencia.</p>
          )}
        </Panel>
      </div>

      {serie.length > 0 && (
        <Panel title="Check-ins recientes">
          <div className="flex flex-col divide-y divide-perf-border">
            {[...serie].reverse().map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="w-20 text-sm text-white/70">{w.fecha}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${SEM[ESTADO_TONE[w.estado]].soft} ${SEM[ESTADO_TONE[w.estado]].text}`}>{w.indice_bienestar}</span>
                <span className="flex-1 text-xs text-white/45">
                  Sueño {w.sueno} · Energía {w.fatiga} · Calma {w.estres} · Dolor {w.dolor_muscular} · Ánimo {w.animo}
                </span>
                <button type="button" onClick={() => setAll(deleteWellness(w.id))} className="text-xs text-white/35 hover:text-perf-danger">Eliminar</button>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  )
}

// ── Formulario de check-in (5 sliders + fecha) ───────────────────────────────
function CheckinForm({ athleteId, onSaved }: { athleteId: string; onSaved: (w: SavedWellness[]) => void }) {
  const [vals, setVals] = useState<Record<string, number>>({ sueno: 5, fatiga: 5, estres: 5, dolor_muscular: 5, animo: 5 })
  const [fecha, setFecha] = useState(today())
  const [busy, setBusy] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const preview = clientIndex(vals)
  const previewEstado = clientEstado(preview)

  async function onSave() {
    setBusy(true); setSavedMsg(false)
    const values = {
      sueno: vals.sueno, fatiga: vals.fatiga, estres: vals.estres,
      dolor_muscular: vals.dolor_muscular, animo: vals.animo,
    }
    let indice = preview
    let estado: WellnessEstado = previewEstado
    try {
      const r = await computeWellness(values)   // servidor = fuente autoritativa
      indice = r.indice_bienestar; estado = r.estado
    } catch { /* sin red: se usa el cálculo cliente (misma fórmula) */ }
    onSaved(saveWellness({ athleteId, fecha, ...values, indice_bienestar: indice, estado }))
    setBusy(false); setSavedMsg(true)
  }

  return (
    <Panel title="Nuevo check-in" subtitle="Autopercepción 1–7 (mayor = mejor)">
      <div className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-white/55">Fecha</span>
          <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setSavedMsg(false) }} className="w-full rounded-lg border border-perf-border bg-perf-surface2 px-3 py-2 text-sm text-white outline-none focus:border-accent [color-scheme:dark]" />
        </label>

        {ITEMS.map((it) => (
          <div key={it.name}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-white/55">{it.label}</span>
              <span className="font-bold text-white">{vals[it.name]}</span>
            </div>
            <input
              type="range" min={1} max={7} step={1} value={vals[it.name]}
              onChange={(e) => { setVals((v) => ({ ...v, [it.name]: Number(e.target.value) })); setSavedMsg(false) }}
              className="w-full accent-accent"
            />
          </div>
        ))}

        <div className="mt-1 flex items-center justify-between rounded-xl border border-perf-border bg-perf-surface2 px-4 py-3">
          <div>
            <p className="text-xs text-white/45">Índice de bienestar</p>
            <p className={`text-2xl font-bold ${SEM[ESTADO_TONE[previewEstado]].text}`}>{preview}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${SEM[ESTADO_TONE[previewEstado]].soft} ${SEM[ESTADO_TONE[previewEstado]].text}`}>
            {ESTADO_LABEL[previewEstado]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onSave} disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accentDark disabled:opacity-50">
            {busy ? 'Guardando…' : 'Guardar check-in'}
          </button>
          {savedMsg && <span className="text-xs text-perf-ok">✓ Guardado (índice confirmado por el servidor)</span>}
        </div>
      </div>
    </Panel>
  )
}

// ── Pieza KPI ────────────────────────────────────────────────────────────────
function Kpi({ label, value, tone = 'accent' }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className={`mt-1 text-xl font-bold ${SEM[tone].text}`}>{value}</p>
    </div>
  )
}
