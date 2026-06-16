// Módulo LESIONES. Gestión de partes médicos con modelo corporal interactivo:
// el mapa (frente/espalda) ubica cada lesión por severidad; la lista muestra el
// detalle. Con roster real las lesiones viven en el servidor (GET/POST/PATCH/
// DELETE /centers/<id>/lesiones/); en demo (sin centro) se guardan en localStorage.
// El alta del parte usa el mismo maniquí: se pulsa el sitio para fijar x/y.

import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { BodyMap } from '@/components/BodyMap'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { SEM, type Tone } from '@/lib/tone'
import { useSquad } from '@/centers/useSquad'
import type { Athlete } from '@/lib/mockSquad'
import {
  ESTADO_LESION, SEV_LABEL, SEV_TONE, TIPO_LABEL,
  type EstadoLesion, type Injury, type Severidad, type TipoLesion, type Vista,
} from '@/lib/mockInjuries'
import { loadInjuries, saveInjuryLocal, updateInjuryLocal, deleteInjuryLocal } from '@/lib/injuryStore'
import { listInjuries, createInjury, updateInjury, deleteInjury } from '@/api/performance'
import type { InjuryReport } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)
function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

// Estimación de vuelta a competición a partir del estado y la fecha de alta.
function rtpFrom(estado: EstadoLesion, fechaAlta: string | null): string {
  if (estado === 'alta') return 'Disponible'
  if (!fechaAlta) return '—'
  const d = Math.ceil((new Date(fechaAlta).getTime() - Date.now()) / 86400000)
  return d > 0 ? `~${d}d` : 'Por revisar'
}

// Parte del servidor → forma de la UI (reusa el modelo `Injury`). `athlete` (id de
// usuario) se traduce al id del vínculo con el que trabaja la UI.
function fromServerInjury(r: InjuryReport, userToLink: Map<number, string>): Injury | null {
  const athleteId = userToLink.get(r.athlete)
  if (!athleteId) return null
  return {
    id: String(r.id),
    athleteId,
    zona: r.zona,
    vista: r.vista,
    x: r.zona_x,
    y: r.zona_y,
    tipo: r.tipo,
    severidad: r.severidad,
    estado: r.estado,
    fecha: r.fecha,
    diasBaja: r.dias_baja,
    rtp: rtpFrom(r.estado, r.fecha_alta_estimada),
    mecanismo: r.mecanismo,
  }
}

export function LesionesPage() {
  const { athletes: squad, loading, error, isRealRoster, centerId } = useSquad()
  const noContent = loading || error || (isRealRoster && squad.length === 0)

  // Roster real → partes del servidor; demo → localStorage (sembrado de la muestra).
  const [injuries, setInjuries] = useState<Injury[]>(() => (isRealRoster ? [] : loadInjuries()))
  const [vista, setVista] = useState<Vista>('frente')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!isRealRoster || centerId == null) return
    let alive = true
    const userToLink = new Map<number, string>()
    for (const a of squad) if (a.userId != null) userToLink.set(a.userId, a.id)
    listInjuries(centerId)
      .then((recs) => {
        if (!alive) return
        setInjuries(recs.map((r) => fromServerInjury(r, userToLink)).filter(Boolean) as Injury[])
      })
      .catch(() => { if (alive) setInjuries([]) })
    return () => { alive = false }
  }, [isRealRoster, centerId, squad])

  const squadById = useMemo(() => {
    const m = new Map<string, Athlete>()
    for (const a of squad) m.set(a.id, a)
    return m
  }, [squad])
  const nameOf = (id: string) => squadById.get(id)?.nombre ?? id
  const posOf = (id: string) => squadById.get(id)?.posicion ?? ''
  const fotoOf = (id: string) => squadById.get(id)?.foto

  const activas = injuries.filter((i) => i.estado !== 'alta')
  const altas = injuries.filter((i) => i.estado === 'alta')
  const kpi = {
    activas: activas.length,
    baja: injuries.filter((i) => i.estado === 'activa').length,
    recup: injuries.filter((i) => i.estado === 'recuperacion').length,
    dias: injuries.reduce((s, i) => s + i.diasBaja, 0),
    nuevas: injuries.filter((i) => daysSince(i.fecha) <= 7 && i.estado !== 'alta').length,
  }
  const porVista = (v: Vista) => activas.filter((i) => i.vista === v).length

  function select(inj: Injury) {
    setSelectedId(inj.id)
    setVista(inj.vista)
  }

  // ── Mutaciones (real → API · demo → localStorage) ──────────────────────────
  async function handleCreate(form: InjuryForm): Promise<boolean> {
    if (isRealRoster && centerId != null) {
      const athlete = squadById.get(form.athleteId)
      if (!athlete?.userId) return false
      try {
        const r = await createInjury(centerId, {
          athlete: athlete.userId,
          fecha: form.fecha,
          zona: form.zona,
          tipo: form.tipo,
          severidad: form.severidad,
          estado: form.estado,
          mecanismo: form.mecanismo,
          vista: form.vista,
          zona_x: form.x,
          zona_y: form.y,
          fecha_alta_estimada: form.fechaAlta || null,
        })
        const vm = fromServerInjury(r, new Map([[r.athlete, athlete.id]]))
        if (vm) setInjuries((prev) => [vm, ...prev])
        return true
      } catch {
        return false
      }
    }
    // Demo
    const next = saveInjuryLocal({
      athleteId: form.athleteId, zona: form.zona, vista: form.vista, x: form.x, y: form.y,
      tipo: form.tipo, severidad: form.severidad, estado: form.estado, fecha: form.fecha,
      diasBaja: daysSince(form.fecha), rtp: rtpFrom(form.estado, form.fechaAlta || null),
      mecanismo: form.mecanismo,
    })
    setInjuries(next)
    return true
  }

  async function darDeAlta(id: string) {
    if (isRealRoster && centerId != null) {
      try {
        await updateInjury(centerId, Number(id), { estado: 'alta' })
        setInjuries((prev) => prev.map((i) => (i.id === id ? { ...i, estado: 'alta', diasBaja: 0, rtp: 'Disponible' } : i)))
      } catch { /* sin red: se deja como está */ }
      return
    }
    setInjuries(updateInjuryLocal(id, { estado: 'alta', diasBaja: 0, rtp: 'Disponible' }))
  }

  async function eliminar(id: string) {
    if (selectedId === id) setSelectedId(null)
    if (isRealRoster && centerId != null) {
      try {
        await deleteInjury(centerId, Number(id))
        setInjuries((prev) => prev.filter((i) => i.id !== id))
      } catch { /* sin red */ }
      return
    }
    setInjuries(deleteInjuryLocal(id))
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">Lesiones</h1>
            <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
          </div>
          <p className="text-xs text-white/45">{activas.length} partes activos · seguimiento y vuelta a competición</p>
        </div>
        {!noContent && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accentDark"
          >
            + Registrar lesión
          </button>
        )}
      </div>

      {noContent ? (
        <SquadState loading={loading} error={error} empty={isRealRoster && squad.length === 0} />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Kpi label="Lesiones activas" value={`${kpi.activas}`} tone="warn" />
            <Kpi label="Jugadores de baja" value={`${kpi.baja}`} tone="danger" />
            <Kpi label="En recuperación" value={`${kpi.recup}`} tone="warn" />
            <Kpi label="Días perdidos" value={`${kpi.dias}`} tone="accent" />
            <Kpi label="Nuevas (7 días)" value={`${kpi.nuevas}`} tone="warn" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Modelo corporal */}
            <Panel
              title="Mapa de lesiones"
              subtitle="Severidad por zona"
              className="lg:col-span-2"
              action={
                <div className="flex items-center gap-0.5 rounded-lg border border-perf-border bg-perf-bg p-0.5">
                  {(['frente', 'espalda'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVista(v)}
                      className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        vista === v ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
                      }`}
                    >
                      {v} ({porVista(v)})
                    </button>
                  ))}
                </div>
              }
            >
              <BodyMap vista={vista} injuries={injuries} selectedId={selectedId} onSelect={(id) => select(injuries.find((i) => i.id === id)!)} />
              <div className="mt-3 flex items-center justify-center gap-5 border-t border-perf-border pt-3 text-xs">
                {(['leve', 'moderada', 'grave'] as Severidad[]).map((s) => (
                  <span key={s} className="flex items-center gap-1.5 text-white/60">
                    <span className={`h-2.5 w-2.5 rounded-full ${SEM[SEV_TONE[s]].bg}`} />
                    {SEV_LABEL[s]}
                  </span>
                ))}
              </div>
            </Panel>

            {/* Lista de partes */}
            <div className="flex flex-col gap-3 lg:col-span-3">
              {activas.length === 0 && (
                <Panel title="Sin partes activos">
                  <p className="text-sm text-white/40">
                    No hay lesiones activas. Pulsa <span className="text-white/70">Registrar lesión</span> para añadir un parte.
                  </p>
                </Panel>
              )}
              {activas.map((inj) => (
                <InjuryCard
                  key={inj.id}
                  inj={inj}
                  nombre={nameOf(inj.athleteId)}
                  posicion={posOf(inj.athleteId)}
                  foto={fotoOf(inj.athleteId)}
                  selected={selectedId === inj.id}
                  onClick={() => select(inj)}
                  onAlta={() => darDeAlta(inj.id)}
                  onDelete={() => eliminar(inj.id)}
                />
              ))}

              {altas.length > 0 && (
                <Panel title="Altas recientes" subtitle="Jugadores reincorporados">
                  <ul className="flex flex-col divide-y divide-perf-border">
                    {altas.map((inj) => (
                      <li key={inj.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <Avatar name={nameOf(inj.athleteId)} src={fotoOf(inj.athleteId)} size={32} />
                        <span className="flex-1 truncate text-sm text-white/80">{nameOf(inj.athleteId)}</span>
                        <span className="truncate text-xs text-white/45">{inj.zona}</span>
                        <Badge tone="ok" label="Alta médica" />
                        <button type="button" onClick={() => eliminar(inj.id)} className="shrink-0 rounded-md px-2 py-1 text-xs text-white/30 hover:text-perf-danger" title="Eliminar">✕</button>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <InjuryModal
          squad={squad}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

// ── Modal de alta de lesión ──────────────────────────────────────────────────
// Al registrar, el parte solo puede nacer "de baja" o "en recuperación" (el alta
// se da después con "Dar de alta").
type EstadoNuevo = 'activa' | 'recuperacion'

interface InjuryForm {
  athleteId: string
  zona: string
  tipo: TipoLesion
  severidad: Severidad
  estado: EstadoNuevo
  mecanismo: string
  fecha: string
  fechaAlta: string
  vista: Vista
  x: number
  y: number
}

const TIPOS: TipoLesion[] = ['muscular', 'articular', 'ligamentosa', 'tendinosa', 'osea']
const SEVERIDADES: Severidad[] = ['leve', 'moderada', 'grave']
const ESTADOS_ALTA: { id: EstadoNuevo; label: string }[] = [
  { id: 'activa', label: 'De baja' },
  { id: 'recuperacion', label: 'En recuperación' },
]

function InjuryModal({
  squad, onClose, onSubmit,
}: {
  squad: Athlete[]
  onClose: () => void
  onSubmit: (form: InjuryForm) => Promise<boolean>
}) {
  const [athleteId, setAthleteId] = useState(squad[0]?.id ?? '')
  const [zona, setZona] = useState('')
  const [tipo, setTipo] = useState<TipoLesion>('muscular')
  const [severidad, setSeveridad] = useState<Severidad>('moderada')
  const [estado, setEstado] = useState<EstadoNuevo>('activa')
  const [mecanismo, setMecanismo] = useState('')
  const [fecha, setFecha] = useState(today())
  const [fechaAlta, setFechaAlta] = useState('')
  const [vista, setVista] = useState<Vista>('frente')
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const valido = athleteId && zona.trim() !== '' && punto !== null

  async function submit() {
    if (!valido || !punto) {
      setErr('Indica atleta, zona y marca el sitio en el maniquí.')
      return
    }
    setBusy(true); setErr('')
    const ok = await onSubmit({
      athleteId, zona: zona.trim(), tipo, severidad, estado, mecanismo: mecanismo.trim(),
      fecha, fechaAlta, vista, x: punto.x, y: punto.y,
    })
    setBusy(false)
    if (ok) onClose()
    else setErr('No se pudo guardar el parte. Revisa tu conexión.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-perf-border bg-perf-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Registrar lesión</h2>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-white/40 hover:text-white">✕</button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Datos */}
          <div className="flex flex-col gap-3">
            <div>
              <FieldLabel>Atleta</FieldLabel>
              {squad.length === 0 ? (
                <p className="text-sm text-white/40">No hay atletas en la plantilla.</p>
              ) : (
                <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                  {squad.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAthleteId(a.id)}
                      className={`flex max-w-full items-center gap-2 overflow-hidden rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
                        a.id === athleteId ? 'border-accent bg-accent/10 text-white' : 'border-perf-border bg-perf-surface2 text-white/70 hover:text-white'
                      }`}
                    >
                      <Avatar name={a.nombre} src={a.foto} size={20} />
                      <span className="min-w-0 truncate">{a.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="block">
              <FieldLabel>Zona</FieldLabel>
              <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="p. ej. Isquiotibial izq." className={inputCls} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <FieldLabel>Tipo</FieldLabel>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoLesion)} className={inputCls}>
                  {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Severidad</FieldLabel>
                <select value={severidad} onChange={(e) => setSeveridad(e.target.value as Severidad)} className={inputCls}>
                  {SEVERIDADES.map((s) => <option key={s} value={s}>{SEV_LABEL[s]}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <FieldLabel>Estado</FieldLabel>
                <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoNuevo)} className={inputCls}>
                  {ESTADOS_ALTA.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Mecanismo</FieldLabel>
                <input value={mecanismo} onChange={(e) => setMecanismo(e.target.value)} placeholder="Sprint, contacto…" className={inputCls} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <FieldLabel>Fecha</FieldLabel>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
              </label>
              <label className="block">
                <FieldLabel optional>Alta estimada</FieldLabel>
                <input type="date" value={fechaAlta} onChange={(e) => setFechaAlta(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
              </label>
            </div>
          </div>

          {/* Ubicación en el maniquí */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <FieldLabel>Ubicación {punto ? '' : '— pulsa el maniquí'}</FieldLabel>
              <div className="flex items-center gap-0.5 rounded-lg border border-perf-border bg-perf-bg p-0.5">
                {(['frente', 'espalda'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVista(v)}
                    className={`rounded-md px-2.5 py-0.5 text-xs font-medium capitalize transition-colors ${
                      vista === v ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-perf-border bg-perf-bg py-2">
              <BodyMap vista={vista} injuries={[]} selectedId={null} onSelect={() => {}} onPlace={(x, y) => setPunto({ x, y })} pending={punto} />
            </div>
          </div>
        </div>

        {err && <p className="mt-3 rounded-lg border border-perf-danger/30 bg-perf-danger/10 px-3 py-2 text-xs text-perf-danger">{err}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-perf-border bg-perf-surface2 px-4 py-2 text-sm font-medium text-white/70 hover:text-white">
            Cancelar
          </button>
          <button type="button" onClick={submit} disabled={busy || !valido} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accentDark disabled:opacity-50">
            {busy ? 'Guardando…' : 'Registrar parte'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function Kpi({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${SEM[tone].text}`}>{value}</p>
    </div>
  )
}

function InjuryCard({
  inj, nombre, posicion, foto, selected, onClick, onAlta, onDelete,
}: {
  inj: Injury; nombre: string; posicion: string; foto?: string; selected: boolean
  onClick: () => void; onAlta: () => void; onDelete: () => void
}) {
  const est = ESTADO_LESION[inj.estado]
  return (
    <div
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        selected ? 'border-accent bg-accent/5' : 'border-perf-border bg-perf-surface hover:bg-perf-surface2'
      }`}
    >
      <button type="button" onClick={onClick} className="flex w-full items-start gap-3 text-left">
        <Avatar name={nombre} src={foto} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{nombre}</p>
            <Badge tone={SEV_TONE[inj.severidad]} label={SEV_LABEL[inj.severidad]} />
          </div>
          <p className="text-xs text-white/45">{posicion}</p>
          <p className="mt-1.5 text-sm font-medium text-white/90">
            {inj.zona} <span className="font-normal text-white/45">· {TIPO_LABEL[inj.tipo]}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-white/45">
            <Badge tone={est.tone} label={est.label} />
            <span>Baja: <span className="text-white/70">{inj.diasBaja}d</span></span>
            <span>RTP: <span className="text-white/70">{inj.rtp}</span></span>
            {inj.mecanismo && <span className="text-white/35">{inj.mecanismo}</span>}
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-perf-border pt-3">
        <button type="button" onClick={onAlta} className="rounded-md border border-perf-border bg-perf-surface2 px-3 py-1 text-xs font-medium text-perf-ok hover:bg-perf-ok/10">
          Dar de alta
        </button>
        <button type="button" onClick={onDelete} className="rounded-md px-3 py-1 text-xs text-white/40 hover:text-perf-danger">
          Eliminar
        </button>
      </div>
    </div>
  )
}

function Badge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${SEM[tone].soft} ${SEM[tone].text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${SEM[tone].bg}`} />
      {label}
    </span>
  )
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="mb-1.5 block text-xs font-medium text-white/55">
      {children}{optional && <span className="ml-1 text-white/30">(opcional)</span>}
    </span>
  )
}

const inputCls =
  'w-full rounded-lg border border-perf-border bg-perf-surface2 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-accent'
