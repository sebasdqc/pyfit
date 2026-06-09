// Módulo PSICOLÓGICO. Fase A: monitoreo de bienestar (wellness). Check-ins de
// autopercepción (5 subescalas 1–7, mayor = mejor); el índice de bienestar (0–100)
// lo calcula el SERVIDOR (POST /psicologico/wellness/compute/). Vista de equipo
// (semáforo + ranking + alertas) y por atleta (registro + tendencia). La selección
// de atleta usa la plantilla de muestra y el historial se guarda en localStorage
// (como el módulo Test) hasta que el backend exponga atletas reales.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { AxiosError } from 'axios'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { SEM, type Tone } from '@/lib/tone'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { useSquad } from '@/centers/useSquad'
import type { Athlete } from '@/lib/mockSquad'
import type { PsychRecord, WellnessRecord } from '@/types'
import {
  computeWellness, fetchInstruments, scoreInstrument, listWellness, createWellness,
  listPsych, savePsychRecord, deletePsychRecord,
  type PsychInstrument,
} from '@/api/performance'
import {
  loadWellness, saveWellness, deleteWellness,
  type SavedWellness, type WellnessEstado,
} from '@/lib/wellnessStore'
import { loadPsych, savePsych, deletePsych, type SavedPsych } from '@/lib/psychStore'

// Evaluación del servidor → forma del historial. `athlete` (id de usuario) se
// traduce al id del vínculo; `nameBySlug` resuelve el nombre legible del
// cuestionario (el servidor solo guarda el slug). Descarta atletas fuera del roster.
function fromServerPsych(
  r: PsychRecord, userToLink: Map<number, string>, nameBySlug: Map<string, string>,
): SavedPsych | null {
  const athleteId = userToLink.get(r.athlete)
  if (!athleteId) return null
  return {
    id: String(r.id),
    athleteId,
    instrument: r.instrument,
    nombre: nameBySlug.get(r.instrument) ?? r.instrument,
    fecha: r.fecha,
    subescalas: r.subescalas,
    resultados: r.resultados,
    guardadoEn: r.created_at,
  }
}

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

type Squad = Athlete[]

// Check-in del servidor → forma de la UI. `athlete` (id de usuario) se traduce al
// id del vínculo (athleteId) con el que trabaja toda la UI; descarta los que no
// estén en la plantilla actual.
function fromServerWellness(r: WellnessRecord, userToLink: Map<number, string>): SavedWellness | null {
  const athleteId = userToLink.get(r.athlete)
  if (!athleteId) return null
  return {
    id: String(r.id),
    athleteId,
    fecha: r.fecha,
    sueno: r.sueno,
    fatiga: r.fatiga,
    estres: r.estres,
    dolor_muscular: r.dolor_muscular,
    animo: r.animo,
    indice_bienestar: r.indice_bienestar,
    estado: r.estado,
    guardadoEn: r.created_at,
  }
}

export function PsicologicoPage() {
  const { athletes: squad, loading, error, isRealRoster, centerId } = useSquad()
  const [section, setSection] = useState<'bienestar' | 'cuestionarios'>('bienestar')
  const noContent = loading || error || (isRealRoster && squad.length === 0)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">Psicológico</h1>
            <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
          </div>
          <p className="text-xs text-white/45">
            {section === 'bienestar'
              ? 'Monitoreo de bienestar · índice calculado en el servidor'
              : 'Cuestionarios validados · scoring en el servidor'}
          </p>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-perf-border bg-perf-surface p-0.5">
          {(['bienestar', 'cuestionarios'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                section === s ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {noContent ? (
        <SquadState loading={loading} error={error} empty={isRealRoster && squad.length === 0} />
      ) : section === 'bienestar' ? (
        <BienestarSection squad={squad} isRealRoster={isRealRoster} centerId={centerId} />
      ) : (
        <CuestionariosSection squad={squad} isRealRoster={isRealRoster} centerId={centerId} />
      )}
    </div>
  )
}

// ── Sección BIENESTAR (Fase A) ───────────────────────────────────────────────
function BienestarSection({
  squad, isRealRoster, centerId,
}: {
  squad: Squad
  isRealRoster: boolean
  centerId: number | null
}) {
  const [all, setAll] = useState<SavedWellness[]>(() => (isRealRoster ? [] : loadWellness()))
  const [tab, setTab] = useState<'equipo' | 'atleta'>('equipo')
  const [sel, setSel] = useState<string>(squad[0]?.id ?? '')

  // Roster real → check-ins del servidor (compartidos entre dispositivos).
  // Demo (mock) → localStorage, como antes.
  useEffect(() => {
    if (!isRealRoster || centerId == null) return
    let alive = true
    const userToLink = new Map<number, string>()
    for (const a of squad) if (a.userId != null) userToLink.set(a.userId, a.id)
    listWellness(centerId)
      .then((recs) => {
        if (!alive) return
        setAll(recs.map((r) => fromServerWellness(r, userToLink)).filter(Boolean) as SavedWellness[])
      })
      .catch(() => { if (alive) setAll([]) })
    return () => { alive = false }
  }, [isRealRoster, centerId, squad])

  // Upsert en memoria (un check-in por atleta y fecha) tras guardar.
  const upsert = useCallback((rec: SavedWellness) => {
    setAll((prev) => [rec, ...prev.filter((w) => !(w.athleteId === rec.athleteId && w.fecha === rec.fecha))])
  }, [])

  // El borrado solo aplica a la demo local (el servidor no expone DELETE de wellness).
  const removeLocal = useCallback((id: string) => {
    setAll(deleteWellness(id))
  }, [])

  const latestByAthlete = useMemo(() => {
    const map = new Map<string, SavedWellness>()
    for (const w of all) {
      const prev = map.get(w.athleteId)
      if (!prev || w.fecha > prev.fecha) map.set(w.athleteId, w)
    }
    return map
  }, [all])

  return (
    <>
      <div className="flex items-center gap-0.5 self-start rounded-lg border border-perf-border bg-perf-surface p-0.5">
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

      {tab === 'equipo' ? (
        <TeamView squad={squad} latest={latestByAthlete} all={all} onGoAthlete={(id) => { setSel(id); setTab('atleta') }} />
      ) : (
        <AthleteView
          squad={squad}
          sel={sel}
          onSelect={setSel}
          all={all}
          isRealRoster={isRealRoster}
          centerId={centerId}
          onUpsert={upsert}
          onDelete={removeLocal}
        />
      )}
    </>
  )
}

// ── Vista de equipo ──────────────────────────────────────────────────────────
function TeamView({
  squad, latest, all, onGoAthlete,
}: {
  squad: Squad
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
  squad, sel, onSelect, all, isRealRoster, centerId, onUpsert, onDelete,
}: {
  squad: Squad
  sel: string
  onSelect: (id: string) => void
  all: SavedWellness[]
  isRealRoster: boolean
  centerId: number | null
  onUpsert: (rec: SavedWellness) => void
  onDelete: (id: string) => void
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
              <Avatar name={a.nombre} src={a.foto} size={22} />
              <span className="whitespace-nowrap">{a.nombre}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CheckinForm
          athleteId={sel}
          athleteUserId={atleta?.userId}
          isRealRoster={isRealRoster}
          centerId={centerId}
          onSaved={onUpsert}
        />

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
                {!isRealRoster && (
                  <button type="button" onClick={() => onDelete(w.id)} className="text-xs text-white/35 hover:text-perf-danger">Eliminar</button>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  )
}

// ── Formulario de check-in (5 sliders + fecha) ───────────────────────────────
function CheckinForm({
  athleteId, athleteUserId, isRealRoster, centerId, onSaved,
}: {
  athleteId: string
  athleteUserId?: number
  isRealRoster: boolean
  centerId: number | null
  onSaved: (rec: SavedWellness) => void
}) {
  const [vals, setVals] = useState<Record<string, number>>({ sueno: 5, fatiga: 5, estres: 5, dolor_muscular: 5, animo: 5 })
  const [fecha, setFecha] = useState(today())
  const [busy, setBusy] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [error, setError] = useState('')

  const preview = clientIndex(vals)
  const previewEstado = clientEstado(preview)

  async function onSave() {
    setBusy(true); setSavedMsg(false); setError('')
    const values = {
      sueno: vals.sueno, fatiga: vals.fatiga, estres: vals.estres,
      dolor_muscular: vals.dolor_muscular, animo: vals.animo,
    }
    try {
      if (isRealRoster && centerId != null && athleteUserId != null) {
        // Persistencia REAL en el servidor (compartida, alimenta el panel).
        const r = await createWellness(centerId, { athlete: athleteUserId, fecha, ...values })
        onSaved({
          id: String(r.id), athleteId, fecha, ...values,
          indice_bienestar: r.indice_bienestar, estado: r.estado, guardadoEn: r.created_at,
        })
      } else {
        // Demo: índice confirmado por el servidor (misma fórmula), guardado local.
        let indice = preview
        let estado: WellnessEstado = previewEstado
        try {
          const r = await computeWellness(values)
          indice = r.indice_bienestar; estado = r.estado
        } catch { /* sin red: cálculo cliente */ }
        const list = saveWellness({ athleteId, fecha, ...values, indice_bienestar: indice, estado })
        onSaved(list[0])
      }
      setSavedMsg(true)
    } catch {
      setError('No se pudo guardar el check-in. Revisa tu conexión.')
    } finally {
      setBusy(false)
    }
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
          {error && <span className="text-xs text-perf-danger">{error}</span>}
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

// ── Sección CUESTIONARIOS (Fase B) ───────────────────────────────────────────
const qInput = 'w-full rounded-lg border bg-perf-surface2 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-accent'

function CuestionariosSection({
  squad, isRealRoster, centerId,
}: {
  squad: Squad
  isRealRoster: boolean
  centerId: number | null
}) {
  const [instruments, setInstruments] = useState<PsychInstrument[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [sel, setSel] = useState(squad[0]?.id ?? '')
  const [slug, setSlug] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [fecha, setFecha] = useState(today())
  const [computed, setComputed] = useState<SavedPsych['resultados'] | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [busy, setBusy] = useState(false)
  // Roster real → historial del servidor (compartido); demo → localStorage.
  const [saved, setSaved] = useState<SavedPsych[]>(() => (isRealRoster ? [] : loadPsych()))
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    let alive = true
    fetchInstruments()
      .then((d) => { if (alive) { setInstruments(d); setLoadErr('') } })
      .catch(() => { if (alive) setLoadErr('No se pudo cargar el catálogo de cuestionarios. Revisa tu sesión.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Historial real del servidor (solo evaluaciones con instrumento; el nombre se
  // resuelve del catálogo). Depende de `instruments` para etiquetar bien las filas.
  useEffect(() => {
    if (!isRealRoster || centerId == null) return
    let alive = true
    const userToLink = new Map<number, string>()
    for (const a of squad) if (a.userId != null) userToLink.set(a.userId, a.id)
    const nameBySlug = new Map(instruments.map((i) => [i.slug, i.nombre]))
    listPsych(centerId)
      .then((recs) => {
        if (!alive) return
        setSaved(
          recs
            .filter((r) => r.instrument)
            .map((r) => fromServerPsych(r, userToLink, nameBySlug))
            .filter(Boolean) as SavedPsych[],
        )
      })
      .catch(() => { if (alive) setSaved([]) })
    return () => { alive = false }
  }, [isRealRoster, centerId, squad, instruments])

  const instrument = instruments.find((i) => i.slug === slug) ?? null
  const atleta = squad.find((a) => a.id === sel) ?? squad[0]
  const histAthlete = saved.filter((p) => p.athleteId === sel)

  function buildSubescalas(): Record<string, number> {
    const out: Record<string, number> = {}
    if (!instrument) return out
    for (const s of instrument.subescalas) {
      const v = (values[s.key] ?? '').trim()
      if (v !== '') out[s.key] = Number(v)
    }
    return out
  }

  function selectInstrument(i: PsychInstrument) {
    setSlug(i.slug)
    const init: Record<string, string> = {}
    for (const s of i.subescalas) init[s.key] = ''
    setValues(init); setComputed(null); setFieldErrors({}); setGeneralError(''); setJustSaved(false)
  }

  async function onCalcular() {
    if (!instrument) return
    setBusy(true); setFieldErrors({}); setGeneralError(''); setJustSaved(false)
    try {
      const r = await scoreInstrument(instrument.slug, buildSubescalas())
      setComputed(r.resultados)
    } catch (e) {
      const data = (e as AxiosError<{ errors?: Record<string, string> }>).response?.data
      setComputed(null)
      if (data?.errors) {
        const { __all__, ...fields } = data.errors
        setFieldErrors(fields)
        setGeneralError(__all__ ?? (Object.keys(fields).length ? '' : 'Revisa los datos.'))
      } else {
        setGeneralError('No se pudo calcular. Revisa tu conexión o tu sesión.')
      }
    } finally { setBusy(false) }
  }

  async function onGuardar() {
    if (!instrument || !computed) return
    // Roster real → persistir en el servidor (recalcula el scoring desde subescalas).
    if (isRealRoster && centerId != null && atleta?.userId != null) {
      try {
        const r = await savePsychRecord(centerId, {
          athlete: atleta.userId, fecha, instrument: instrument.slug, subescalas: buildSubescalas(),
        })
        const vm = fromServerPsych(
          r, new Map([[r.athlete, atleta.id]]), new Map([[instrument.slug, instrument.nombre]]),
        )
        if (vm) setSaved((prev) => [vm, ...prev])
        setJustSaved(true)
      } catch {
        setGeneralError('No se pudo guardar la evaluación. Revisa tu conexión.')
      }
      return
    }
    // Demo → localStorage.
    setSaved(savePsych({
      athleteId: sel, instrument: instrument.slug, nombre: instrument.nombre,
      fecha, subescalas: buildSubescalas(), resultados: computed,
    }))
    setJustSaved(true)
  }

  async function onDelete(id: string) {
    if (isRealRoster && centerId != null) {
      try {
        await deletePsychRecord(centerId, Number(id))
        setSaved((prev) => prev.filter((p) => p.id !== id))
      } catch { /* sin red: se deja el registro */ }
      return
    }
    setSaved(deletePsych(id))
  }

  return (
    <>
      {/* Atleta */}
      <Panel title="Atleta" subtitle={atleta?.nombre}>
        <div className="flex flex-wrap gap-2">
          {squad.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSel(a.id)}
              className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
                a.id === sel ? 'border-accent bg-accent/10 text-white' : 'border-perf-border bg-perf-surface2 text-white/70 hover:text-white'
              }`}
            >
              <Avatar name={a.nombre} src={a.foto} size={22} />
              <span className="whitespace-nowrap">{a.nombre}</span>
            </button>
          ))}
        </div>
      </Panel>

      {/* Catálogo de instrumentos */}
      <Panel title="Cuestionario" subtitle={loading ? 'Cargando…' : `${instruments.length} instrumentos`}>
        {loadErr ? (
          <p className="text-sm text-perf-danger">{loadErr}</p>
        ) : loading ? (
          <div className="flex items-center gap-2.5 py-6 text-sm text-white/45">
            <Spinner size={18} />
            Cargando instrumentos…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {instruments.map((i) => {
              const s = i.slug === slug
              return (
                <button
                  key={i.slug}
                  type="button"
                  onClick={() => selectInstrument(i)}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    s ? 'border-accent bg-accent/10' : 'border-perf-border bg-perf-surface2 hover:border-accent/40'
                  }`}
                >
                  <p className="text-sm font-medium text-white">{i.nombre}</p>
                  <p className="mt-1 text-xs leading-snug text-white/45">{i.descripcion}</p>
                </button>
              )
            })}
          </div>
        )}
      </Panel>

      {/* Subescalas + resultados */}
      {instrument && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title={instrument.nombre} subtitle="Puntuaciones por subescala">
            <div className="flex flex-col gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-white/55">Fecha</span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${qInput} border-perf-border [color-scheme:dark]`} />
              </label>

              {instrument.subescalas.map((s) => (
                <label key={s.key} className="block">
                  <span className="mb-1.5 block text-xs font-medium text-white/55">
                    {s.label} <span className="text-white/30">({s.min}–{s.max})</span>
                  </span>
                  <input
                    type="number" inputMode="decimal" min={s.min} max={s.max}
                    value={values[s.key] ?? ''}
                    onChange={(e) => { setValues((v) => ({ ...v, [s.key]: e.target.value })); setJustSaved(false) }}
                    className={`${qInput} ${fieldErrors[s.key] ? 'border-perf-danger' : 'border-perf-border'}`}
                  />
                  {fieldErrors[s.key] && <span className="mt-1 block text-xs text-perf-danger">{fieldErrors[s.key]}</span>}
                </label>
              ))}

              {generalError && (
                <p className="rounded-lg border border-perf-danger/30 bg-perf-danger/10 px-3 py-2 text-xs text-perf-danger">{generalError}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={onCalcular} disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accentDark disabled:opacity-50">
                  {busy ? 'Calculando…' : 'Calcular'}
                </button>
                <button type="button" onClick={onGuardar} disabled={!computed} className="rounded-lg border border-perf-border bg-perf-surface2 px-4 py-2 text-sm font-medium text-white/80 hover:text-white disabled:opacity-40">
                  Guardar evaluación
                </button>
                {justSaved && <span className="text-xs text-perf-ok">✓ Guardado</span>}
              </div>
            </div>
          </Panel>

          <Panel
            title="Resultado"
            subtitle="Calculado en el servidor"
            action={<span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accentLight">Servidor</span>}
          >
            {computed ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-perf-border bg-perf-surface2 p-4">
                  <p className="text-xs text-white/45">{computed.indice_label}</p>
                  <p className="mt-1 text-3xl font-bold text-accent">{computed.indice}</p>
                  <p className="mt-1 text-sm text-white/65">{computed.interpretacion}</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center">
                <p className="text-sm text-white/40">Completa las subescalas y pulsa <span className="text-white/70">Calcular</span>.</p>
                <p className="mt-1 text-xs text-white/30">{instrument.descripcion}</p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Historial del atleta */}
      <Panel title="Historial" subtitle={`${histAthlete.length} evaluación(es) · ${atleta?.nombre ?? ''}`}>
        {histAthlete.length === 0 ? (
          <p className="text-sm text-white/40">Aún no hay evaluaciones guardadas para este atleta.</p>
        ) : (
          <div className="flex flex-col divide-y divide-perf-border">
            {histAthlete.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <div className="min-w-[180px]">
                  <p className="text-sm font-medium text-white">{p.nombre}</p>
                  <p className="text-xs text-white/40">{p.fecha}</p>
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">{p.resultados.indice}</span>
                  <span className="text-xs text-white/55">{p.resultados.indice_label} · {p.resultados.interpretacion}</span>
                </div>
                <button type="button" onClick={() => onDelete(p.id)} className="text-xs text-white/35 hover:text-perf-danger">Eliminar</button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
