// Módulo SIMULADOR — pizarra táctica. El entrenador coloca jugadores (de la
// plantilla), rivales y balón, y dibuja supuestos de jugada con distintos trazos
// (pase, conducción, mov. sin balón, bloqueo). Coordenadas SIEMPRE normalizadas
// (0..1): la jugada se ve igual en cualquier dispositivo. Las jugadas se guardan
// en el backend (API real). Hoy es estático; el modelo ya prevé animación
// (escena = lista de frames), ver performance.TacticalPlay.
//
// Nota: los jugadores salen de la plantilla MOCK (loadSquad) como el resto del
// panel en esta fase; al haber atletas reales, basta cambiar la fuente del squad.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/auth/useAuth'
import { loadSquad } from '@/lib/squadStore'
import type { Athlete } from '@/lib/mockSquad'
import type { Escena, Ficha, Pt, TacticalPlay, Trazo, TrazoTipo } from '@/types'
import { listCenters } from '@/api/performance'
import { createPlay, deletePlay, listPlays, updatePlay } from '@/api/performance'
import { TRAZO_ORDER, TRAZO_STYLES, newId } from '@/lib/simulador'
import { TacticalBoard, type Tool } from './TacticalBoard'
import { StrokePreview } from './StrokePreview'

type Scene = { fichas: Ficha[]; trazos: Trazo[] }

export function SimuladorPage() {
  const { user } = useAuth()
  const squad = useMemo(() => loadSquad(), [])

  // Resolución del centro (igual que Planificación).
  const [centers, setCenters] = useState<{ id: number; nombre: string }[]>(
    () => (user?.centros ?? []).map((c) => ({ id: c.center_id, nombre: c.center_nombre })),
  )
  const [centerId, setCenterId] = useState<number | null>(user?.centros?.[0]?.center_id ?? null)
  useEffect(() => {
    if (centers.length === 0) {
      listCenters()
        .then((cs) => {
          const mapped = cs.map((c) => ({ id: c.id, nombre: c.nombre }))
          setCenters(mapped)
          setCenterId((prev) => prev ?? mapped[0]?.id ?? null)
        })
        .catch(() => {})
    }
  }, [centers.length])

  // Escena de trabajo + herramienta + selección + historial (deshacer).
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [trazos, setTrazos] = useState<Trazo[]>([])
  const [tool, setTool] = useState<Tool>('mover')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [past, setPast] = useState<Scene[]>([])

  // Metadatos de la jugada + jugadas guardadas (API real).
  const [nombre, setNombre] = useState('')
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [plays, setPlays] = useState<TacticalPlay[]>([])
  const [loadingPlays, setLoadingPlays] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (centerId == null) return
    setLoadingPlays(true)
    listPlays(centerId)
      .then(setPlays)
      .catch(() => setPlays([]))
      .finally(() => setLoadingPlays(false))
  }, [centerId])

  // ── Historial / mutaciones ────────────────────────────────────────────────
  const snapshot = () => setPast((p) => [...p.slice(-49), { fichas, trazos }])
  function undo() {
    setPast((p) => {
      if (!p.length) return p
      const prev = p[p.length - 1]
      setFichas(prev.fichas)
      setTrazos(prev.trazos)
      setSelectedId(null)
      return p.slice(0, -1)
    })
  }

  const usedRefs = useMemo(() => new Set(fichas.filter((f) => f.tipo === 'jugador').map((f) => String(f.ref))), [fichas])

  function addJugador(a: Athlete) {
    snapshot()
    const n = fichas.filter((f) => f.tipo === 'jugador').length
    setFichas((prev) => [
      ...prev,
      { id: newId('j'), tipo: 'jugador', ref: a.id, etiqueta: String(a.dorsal), ...spot('jugador', n) },
    ])
  }
  function addRival() {
    snapshot()
    const n = fichas.filter((f) => f.tipo === 'rival').length
    setFichas((prev) => [...prev, { id: newId('r'), tipo: 'rival', etiqueta: String(n + 1), ...spot('rival', n) }])
  }
  function addBalon() {
    if (fichas.some((f) => f.tipo === 'balon')) return
    snapshot()
    setFichas((prev) => [...prev, { id: newId('b'), tipo: 'balon', etiqueta: '', x: 0.5, y: 0.5 }])
  }
  function moveFicha(id: string, x: number, y: number) {
    setFichas((prev) => prev.map((f) => (f.id === id ? { ...f, x, y } : f)))
  }
  function erase(id: string) {
    snapshot()
    setFichas((prev) => prev.filter((f) => f.id !== id))
    setTrazos((prev) => prev.filter((t) => t.id !== id))
    setSelectedId(null)
  }
  function commitTrazo(tipo: TrazoTipo, puntos: Pt[]) {
    snapshot()
    setTrazos((prev) => [...prev, { id: newId('t'), tipo, puntos }])
  }
  function clearTrazos() {
    if (!trazos.length) return
    snapshot()
    setTrazos([])
    setSelectedId(null)
  }
  function clearAll() {
    if (!fichas.length && !trazos.length) return
    snapshot()
    setFichas([])
    setTrazos([])
    setSelectedId(null)
  }

  function getAthlete(ref: Ficha['ref']) {
    const a = squad.find((s) => s.id === String(ref))
    return a ? { nombre: a.nombre, foto: a.foto, dorsal: a.dorsal } : undefined
  }

  // ── Guardar / cargar / nueva ──────────────────────────────────────────────
  function buildEscena(): Escena {
    return { version: 1, frames: [{ fichas, trazos }] }
  }

  async function save() {
    if (centerId == null) return
    const name = nombre.trim() || 'Jugada sin título'
    setSaving(true)
    setMsg('')
    try {
      const payload = { nombre: name, escena: buildEscena() }
      const saved = currentId
        ? await updatePlay(centerId, currentId, payload)
        : await createPlay(centerId, payload)
      setCurrentId(saved.id)
      setNombre(saved.nombre)
      setPlays((prev) => {
        const rest = prev.filter((p) => p.id !== saved.id)
        return [saved, ...rest]
      })
      setMsg('Jugada guardada.')
    } catch {
      setMsg('No se pudo guardar. Revisa tu sesión y el centro.')
    } finally {
      setSaving(false)
    }
  }

  function loadPlay(p: TacticalPlay) {
    const frame = p.escena?.frames?.[0]
    setFichas(frame?.fichas ?? [])
    setTrazos(frame?.trazos ?? [])
    setCurrentId(p.id)
    setNombre(p.nombre)
    setSelectedId(null)
    setPast([])
    setMsg('')
  }
  function nuevaJugada() {
    setFichas([])
    setTrazos([])
    setCurrentId(null)
    setNombre('')
    setSelectedId(null)
    setPast([])
    setMsg('')
  }
  async function removePlay(p: TacticalPlay) {
    if (centerId == null) return
    if (!confirm(`¿Eliminar la jugada "${p.nombre}"?`)) return
    try {
      await deletePlay(centerId, p.id)
      setPlays((prev) => prev.filter((x) => x.id !== p.id))
      if (currentId === p.id) nuevaJugada()
    } catch {
      setMsg('No se pudo eliminar.')
    }
  }

  if (centerId == null) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-xl font-semibold text-white">Simulador</h1>
        <p className="mt-2 text-sm text-white/45">
          {centers.length === 0
            ? 'Tu cuenta no tiene un centro asignado todavía.'
            : 'Selecciona un centro para empezar.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Simulador</h1>
          <p className="text-xs text-white/45">Pizarra táctica · coloca fichas y dibuja la jugada</p>
        </div>
        {centers.length > 1 && (
          <select
            value={centerId}
            onChange={(e) => {
              setCenterId(Number(e.target.value))
              nuevaJugada()
            }}
            className="rounded-lg border border-perf-border bg-perf-surface px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
          >
            {centers.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* Columna principal: herramientas + tablero + leyenda */}
        <div className="flex flex-col gap-3">
          {/* Herramientas */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-perf-border bg-perf-surface p-2.5">
            <ToolBtn active={tool === 'mover'} onClick={() => setTool('mover')} label="Mover" />
            {TRAZO_ORDER.map((t) => (
              <ToolBtn
                key={t}
                active={tool === t}
                onClick={() => setTool(t)}
                label={TRAZO_STYLES[t].label}
                preview={<StrokePreview tipo={t} />}
              />
            ))}
            <ToolBtn active={tool === 'borrar'} onClick={() => setTool('borrar')} label="Borrar" danger />

            <div className="mx-1 h-6 w-px bg-perf-border" />

            {/* Añadir fichas */}
            <div className="relative">
              <AddBtn onClick={() => setPickerOpen((o) => !o)} color="#32c896" label="Jugador" />
              {pickerOpen && (
                <SquadPicker
                  squad={squad}
                  used={usedRefs}
                  onPick={(a) => addJugador(a)}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
            <AddBtn onClick={addRival} color="#ff4444" label="Rival" />
            <AddBtn onClick={addBalon} color="#f4f7ff" label="Balón" />

            <div className="mx-1 h-6 w-px bg-perf-border" />

            <SmallBtn onClick={undo} disabled={!past.length} label="Deshacer" />
            <SmallBtn onClick={clearTrazos} disabled={!trazos.length} label="Borrar trazos" />
            <SmallBtn onClick={clearAll} disabled={!fichas.length && !trazos.length} label="Limpiar" />
          </div>

          <TacticalBoard
            fichas={fichas}
            trazos={trazos}
            tool={tool}
            selectedId={selectedId}
            getAthlete={getAthlete}
            onFichaMove={moveFicha}
            onSelect={setSelectedId}
            onErase={erase}
            onTrazoCommit={commitTrazo}
            onDragStart={snapshot}
          />

          {/* Leyenda + ayuda */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-perf-border bg-perf-surface px-4 py-3 text-xs text-white/55">
            {TRAZO_ORDER.map((t) => (
              <span key={t} className="flex items-center gap-2">
                <StrokePreview tipo={t} />
                {TRAZO_STYLES[t].label}
              </span>
            ))}
            <span className="text-white/35">· Arrastra las fichas (mouse o touch). Toca un trazo para seleccionarlo.</span>
          </div>
        </div>

        {/* Columna lateral: jugada + guardadas */}
        <div className="flex flex-col gap-4">
          <Panel title="Jugada">
            <label className="block">
              <span className="text-xs text-white/45">Nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="p. ej. Salida de balón"
                className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent"
              />
            </label>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-50"
              >
                {saving ? 'Guardando…' : currentId ? 'Guardar cambios' : 'Guardar jugada'}
              </button>
              <button
                type="button"
                onClick={nuevaJugada}
                className="rounded-lg border border-perf-border px-3 py-2 text-sm font-medium text-white/75 hover:bg-perf-surface2 hover:text-white"
              >
                Nueva
              </button>
            </div>
            {msg && <p className="mt-2 text-xs text-white/55">{msg}</p>}
            <p className="mt-3 border-t border-perf-border pt-3 text-[11px] text-white/35">
              {fichas.filter((f) => f.tipo === 'jugador').length} jugadores ·{' '}
              {fichas.filter((f) => f.tipo === 'rival').length} rivales · {trazos.length} trazos
            </p>
          </Panel>

          <Panel title="Jugadas guardadas" subtitle={loadingPlays ? 'Cargando…' : `${plays.length} en el centro`}>
            {loadingPlays ? (
              <div className="flex items-center gap-2.5 py-4 text-sm text-white/45">
                <Spinner size={18} />
                Cargando…
              </div>
            ) : plays.length === 0 ? (
              <p className="text-sm text-white/40">Aún no hay jugadas. Crea la primera.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {plays.map((p) => (
                  <li key={p.id}>
                    <div
                      className={`flex items-center gap-2 rounded-xl border p-2.5 transition-colors ${
                        p.id === currentId
                          ? 'border-accent bg-accent/10'
                          : 'border-perf-border bg-perf-surface2 hover:border-accent/40'
                      }`}
                    >
                      <button type="button" onClick={() => loadPlay(p)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium text-white">{p.nombre}</p>
                        <p className="truncate text-[11px] text-white/40">
                          {(p.escena?.frames?.[0]?.fichas?.length ?? 0)} fichas ·{' '}
                          {(p.escena?.frames?.[0]?.trazos?.length ?? 0)} trazos
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removePlay(p)}
                        className="shrink-0 rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-perf-danger"
                        aria-label="Eliminar jugada"
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

// Posición por defecto al añadir una ficha (escalonada para no apilarlas).
// Jugadores en la mitad inferior; rivales en la superior. Valores normalizados.
function spot(tipo: 'jugador' | 'rival', n: number): { x: number; y: number } {
  const col = n % 5
  const row = Math.floor(n / 5)
  const x = 0.2 + col * 0.15
  const baseY = tipo === 'jugador' ? 0.66 : 0.34
  const y = tipo === 'jugador' ? baseY - row * 0.1 : baseY + row * 0.1
  return { x: Math.min(0.95, x), y: Math.max(0.05, Math.min(0.95, y)) }
}

// ── Piezas de UI ─────────────────────────────────────────────────────────────
function ToolBtn({
  active, onClick, label, preview, danger,
}: {
  active: boolean; onClick: () => void; label: string; preview?: ReactNode; danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? danger
            ? 'border-perf-danger bg-perf-danger/15 text-perf-danger'
            : 'border-accent bg-accent/15 text-white'
          : 'border-perf-border bg-perf-surface2 text-white/70 hover:text-white'
      }`}
    >
      {preview}
      {label}
    </button>
  )
}

function AddBtn({ onClick, color, label }: { onClick: () => void; color: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-perf-border bg-perf-surface2 px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white"
    >
      <span className="grid h-4 w-4 place-items-center rounded-full border-2 text-[10px]" style={{ borderColor: color }}>
        +
      </span>
      {label}
    </button>
  )
}

function SmallBtn({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
    >
      {label}
    </button>
  )
}

// Selector de jugadores de la plantilla (popover).
function SquadPicker({
  squad, used, onPick, onClose,
}: {
  squad: Athlete[]; used: Set<string>; onPick: (a: Athlete) => void; onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute left-0 top-full z-40 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-perf-border bg-perf-surface p-2 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
        <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-white/40">Plantilla</p>
        {squad.map((a) => {
          const added = used.has(a.id)
          return (
            <button
              key={a.id}
              type="button"
              disabled={added}
              onClick={() => onPick(a)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/85 transition-colors hover:bg-perf-surface2 disabled:opacity-35"
            >
              <Avatar name={a.nombre} src={a.foto} size={26} />
              <span className="min-w-0 flex-1 truncate">{a.nombre}</span>
              <span className="text-xs text-white/40">#{a.dorsal}</span>
              {added && <span className="text-[10px] text-perf-ok">✓</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}
