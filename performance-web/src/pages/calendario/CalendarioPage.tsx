// Módulo CALENDARIO del centro. Vista de mes (cuadrícula en JS puro, sin
// librerías de calendario) con la línea de tiempo de la temporada: temporadas,
// torneos y concentraciones como bandas de rango, y partidos, entrenamientos,
// evaluaciones y descansos como eventos puntuales. API real por centro activo
// (GET/POST/PATCH/DELETE /performance/centers/<id>/calendario/).

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { useActiveCenter } from '@/centers/useActiveCenter'
import { createEvent, deleteEvent, listEvents, updateEvent, type EventPayload } from '@/api/performance'
import type { CalendarEvent, EventTipo, LocaliaTipo } from '@/types'
import {
  TIPO_META, TIPO_ORDER, RANGE_TIPOS, monthMatrix, monthLabel, weekdayLabels,
  todayStr, formatDay, formatEventRange, formatHora, eventCoversDay, eventEstado,
  type EventEstado,
} from '@/lib/calendar'

const ESTADO_LABEL: Record<EventEstado, string> = {
  curso: 'En curso',
  proxima: 'Próxima',
  finalizada: 'Finalizada',
}
const LOCALIA_LABEL: Record<Exclude<LocaliaTipo, ''>, string> = {
  local: 'Local',
  visita: 'Visitante',
  neutral: 'Neutral',
}

const MAX_BARS = 3 // bandas de rango visibles por día
const MAX_CHIPS = 2 // chips de evento puntual visibles por día

export function CalendarioPage() {
  const { activeCenterId, activeCenter } = useActiveCenter()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-11

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; event?: CalendarEvent; day?: string } | null>(null)
  const [dayPanel, setDayPanel] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (activeCenterId == null) {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    listEvents(activeCenterId)
      .then((data) => setEvents(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [activeCenterId])

  useEffect(() => {
    reload()
  }, [reload])

  const weeks = useMemo(() => monthMatrix(year, month), [year, month])
  const rangeEvents = useMemo(() => events.filter((e) => TIPO_META[e.tipo].range), [events])
  const pointEvents = useMemo(() => events.filter((e) => !TIPO_META[e.tipo].range), [events])

  function goMonth(delta: number) {
    const m = month + delta
    setYear((y) => y + Math.floor(m / 12))
    setMonth(((m % 12) + 12) % 12)
  }
  function goToday() {
    const d = new Date()
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  // ── Mutaciones ──────────────────────────────────────────────────────────────
  async function saveEvent(payload: EventPayload, id?: number) {
    if (activeCenterId == null) return
    if (id != null) await updateEvent(activeCenterId, id, payload)
    else await createEvent(activeCenterId, payload)
    setModal(null)
    reload()
  }
  async function removeEvent(id: number) {
    if (activeCenterId == null) return
    await deleteEvent(activeCenterId, id)
    setModal(null)
    reload()
  }

  const hoy = todayStr()

  // Sin centro activo: estado vacío con guía.
  if (activeCenterId == null) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <Header
          year={year} month={month}
          onPrev={() => goMonth(-1)} onNext={() => goMonth(1)} onToday={goToday}
          onNew={() => undefined} disabled
        />
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-perf-border bg-perf-surface/50 px-6 py-16 text-center">
          <Icon name="calendario" size={28} className="text-white/30" />
          <p className="text-sm font-medium text-white/80">Selecciona o crea un centro</p>
          <p className="max-w-sm text-sm text-white/45">
            El calendario organiza la temporada de un centro. Elige uno en la barra superior o crea el tuyo desde el perfil.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <Header
        year={year} month={month} centerName={activeCenter?.center_nombre}
        onPrev={() => goMonth(-1)} onNext={() => goMonth(1)} onToday={goToday}
        onNew={() => setModal({ mode: 'create', day: hoy })}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-perf-border bg-perf-surface py-20">
          <Spinner size={22} />
          <p className="text-sm text-white/45">Cargando calendario…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-perf-danger/30 bg-perf-danger/10 px-6 py-16 text-center">
          <p className="text-sm font-medium text-perf-danger">No se pudo cargar el calendario.</p>
          <p className="mt-1 text-sm text-white/45">Revisa tu conexión o tu sesión e inténtalo de nuevo.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Cuadrícula del mes */}
          <div className="overflow-hidden rounded-2xl border border-perf-border bg-perf-surface">
            <div className="grid grid-cols-7 border-b border-perf-border">
              {weekdayLabels.map((d) => (
                <div key={d} className="px-0.5 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-white/40 sm:px-2 sm:text-[11px]">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {weeks.flat().map((cell) => {
                const bars = rangeEvents.filter((e) => eventCoversDay(e, cell.iso)).slice(0, MAX_BARS)
                const chips = pointEvents.filter((e) => eventCoversDay(e, cell.iso))
                return (
                  <button
                    type="button"
                    key={cell.iso}
                    onClick={() => setDayPanel(cell.iso)}
                    className={[
                      'flex min-h-[66px] flex-col gap-0.5 border-b border-r border-perf-border p-1 text-left transition-colors hover:bg-white/[0.03] sm:min-h-[88px] sm:gap-1 sm:p-1.5 lg:min-h-[96px]',
                      cell.inMonth ? '' : 'bg-black/20',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={[
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                          cell.isToday ? 'bg-accent font-semibold text-white' : cell.inMonth ? 'text-white/75' : 'text-white/30',
                        ].join(' ')}
                      >
                        {cell.day}
                      </span>
                    </div>
                    {/* Bandas de rango (temporada / torneo / concentración) */}
                    {bars.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        title={`${TIPO_META[e.tipo].label}: ${e.titulo}`}
                        className="truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white/90"
                        style={{ backgroundColor: TIPO_META[e.tipo].hex + '33', borderLeft: `2px solid ${TIPO_META[e.tipo].hex}` }}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          setModal({ mode: 'edit', event: e })
                        }}
                      >
                        {e.titulo}
                      </button>
                    ))}
                    {/* Eventos puntuales */}
                    {chips.slice(0, MAX_CHIPS).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        title={e.titulo}
                        className="flex w-full items-center gap-1 truncate text-left text-[10px] text-white/80"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          setModal({ mode: 'edit', event: e })
                        }}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TIPO_META[e.tipo].hex }} />
                        <span className="truncate">{formatHora(e) && `${formatHora(e)} `}{e.titulo}</span>
                      </button>
                    ))}
                    {chips.length > MAX_CHIPS && (
                      <span className="text-[10px] text-white/40">+{chips.length - MAX_CHIPS} más</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Panel lateral */}
          <div className="flex flex-col gap-4">
            <SeasonsPanel
              events={rangeEvents}
              onPick={(e) => setModal({ mode: 'edit', event: e })}
              onNew={() => setModal({ mode: 'create', day: hoy })}
            />
            <UpcomingPanel
              events={pointEvents}
              hoy={hoy}
              onPick={(e) => setModal({ mode: 'edit', event: e })}
            />
            <Legend />
          </div>
        </div>
      )}

      {/* Modal de día: lista de eventos + añadir */}
      {dayPanel && (
        <DayModal
          iso={dayPanel}
          events={events.filter((e) => eventCoversDay(e, dayPanel))}
          onClose={() => setDayPanel(null)}
          onPick={(e) => {
            setDayPanel(null)
            setModal({ mode: 'edit', event: e })
          }}
          onAdd={() => {
            const d = dayPanel
            setDayPanel(null)
            setModal({ mode: 'create', day: d })
          }}
        />
      )}

      {/* Modal de crear / editar */}
      {modal && (
        <EventModal
          mode={modal.mode}
          event={modal.event}
          defaultDay={modal.day ?? hoy}
          onClose={() => setModal(null)}
          onSave={saveEvent}
          onDelete={removeEvent}
        />
      )}
    </div>
  )
}

// ── Encabezado con navegación de mes ─────────────────────────────────────────
function Header({
  year, month, centerName, onPrev, onNext, onToday, onNew, disabled,
}: {
  year: number; month: number; centerName?: string
  onPrev: () => void; onNext: () => void; onToday: () => void; onNew: () => void; disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Calendario</h1>
        <p className="text-xs text-white/45">
          Temporadas, torneos, partidos y eventos{centerName ? ` · ${centerName}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-perf-border bg-perf-surface p-0.5">
          <button type="button" onClick={onPrev} className="rounded-md p-1.5 text-white/60 hover:bg-white/[0.06] hover:text-white" aria-label="Mes anterior">
            <Icon name="chevronDown" size={16} className="rotate-90" />
          </button>
          <span className="min-w-[118px] select-none text-center text-sm font-medium capitalize text-white sm:min-w-[150px]">
            {monthLabel(year, month)}
          </span>
          <button type="button" onClick={onNext} className="rounded-md p-1.5 text-white/60 hover:bg-white/[0.06] hover:text-white" aria-label="Mes siguiente">
            <Icon name="chevronDown" size={16} className="-rotate-90" />
          </button>
        </div>
        <button type="button" onClick={onToday} className="rounded-lg border border-perf-border bg-perf-surface px-3 py-2 text-xs font-medium text-white/80 hover:bg-perf-surface2 hover:text-white">
          Hoy
        </button>
        <button
          type="button"
          onClick={onNew}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden className="text-base leading-none">+</span>
          Nuevo<span className="hidden sm:inline">&nbsp;evento</span>
        </button>
      </div>
    </div>
  )
}

// ── Panel: temporadas, torneos y concentraciones (eventos de rango) ──────────
function SeasonsPanel({
  events, onPick, onNew,
}: { events: CalendarEvent[]; onPick: (e: CalendarEvent) => void; onNew: () => void }) {
  const hoy = todayStr()
  const orden: Record<EventEstado, number> = { curso: 0, proxima: 1, finalizada: 2 }
  const sorted = [...events].sort((a, b) => {
    const ea = orden[eventEstado(a, hoy)]
    const eb = orden[eventEstado(b, hoy)]
    return ea !== eb ? ea - eb : a.fecha_inicio.localeCompare(b.fecha_inicio)
  })
  return (
    <Panel title="Temporadas y torneos" subtitle="Marcos de la temporada" bodyClassName="p-3">
      {sorted.length === 0 ? (
        <div className="px-2 py-6 text-center">
          <p className="text-sm text-white/55">Aún no hay temporadas ni torneos.</p>
          <button type="button" onClick={onNew} className="mt-2 text-xs font-semibold text-accent hover:underline">
            Crear el primero
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((e) => {
            const est = eventEstado(e, hoy)
            const meta = TIPO_META[e.tipo]
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onPick(e)}
                  className="flex w-full items-start gap-2.5 rounded-lg border border-perf-border bg-perf-surface2/40 p-2.5 text-left transition-colors hover:bg-perf-surface2"
                >
                  <span className="mt-0.5 h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: meta.hex }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-white/90">{e.titulo}</p>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                        style={{
                          color: est === 'curso' ? '#32c896' : est === 'proxima' ? '#5eead4' : 'rgba(255,255,255,0.4)',
                          backgroundColor: est === 'curso' ? 'rgba(50,200,150,0.12)' : est === 'proxima' ? 'rgba(122,182,255,0.12)' : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        {ESTADO_LABEL[est]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/45">
                      {meta.icon} {meta.label} · {formatEventRange(e)}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

// ── Panel: próximos eventos puntuales ────────────────────────────────────────
function UpcomingPanel({
  events, hoy, onPick,
}: { events: CalendarEvent[]; hoy: string; onPick: (e: CalendarEvent) => void }) {
  const upcoming = [...events]
    .filter((e) => (e.fecha_fin || e.fecha_inicio) >= hoy)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''))
    .slice(0, 6)
  return (
    <Panel title="Próximos eventos" subtitle="Partidos, tests y sesiones" bodyClassName="p-3">
      {upcoming.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-white/55">Sin eventos próximos.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {upcoming.map((e) => {
            const meta = TIPO_META[e.tipo]
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onPick(e)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-semibold leading-none"
                    style={{ backgroundColor: meta.hex + '1f', color: meta.hex }}
                  >
                    {e.fecha_inicio.slice(8, 10)}
                    <span className="mt-0.5 text-[8px] uppercase opacity-80">{monthAbbr(e.fecha_inicio)}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/90">
                      {e.titulo}
                      {e.tipo === 'partido' && e.rival ? <span className="text-white/50"> · {e.rival}</span> : null}
                    </p>
                    <p className="truncate text-[11px] text-white/45">
                      {meta.icon} {meta.label}{formatHora(e) ? ` · ${formatHora(e)}` : ''}{e.ubicacion ? ` · ${e.ubicacion}` : ''}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

function Legend() {
  return (
    <Panel title="Leyenda" bodyClassName="p-3">
      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {TIPO_ORDER.map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-[11px] text-white/60">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TIPO_META[t].hex }} />
            {TIPO_META[t].label}
          </span>
        ))}
      </div>
    </Panel>
  )
}

// ── Modal: eventos de un día ──────────────────────────────────────────────────
function DayModal({
  iso, events, onClose, onPick, onAdd,
}: {
  iso: string; events: CalendarEvent[]
  onClose: () => void; onPick: (e: CalendarEvent) => void; onAdd: () => void
}) {
  return (
    <Backdrop onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-perf-border bg-perf-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold capitalize text-white">{formatDay(iso)}</h3>
          <button type="button" onClick={onClose} className="text-white/45 hover:text-white"><Icon name="close" size={18} /></button>
        </div>
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/50">No hay eventos este día.</p>
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
            {events.map((e) => {
              const meta = TIPO_META[e.tipo]
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => onPick(e)} className="flex w-full items-center gap-2.5 rounded-lg border border-perf-border p-2.5 text-left hover:bg-white/[0.04]">
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: meta.hex }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white/90">{e.titulo}</p>
                      <p className="truncate text-[11px] text-white/45">
                        {meta.icon} {meta.label}{formatHora(e) ? ` · ${formatHora(e)}` : ''}{e.fecha_fin && e.fecha_fin !== e.fecha_inicio ? ` · ${formatEventRange(e)}` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accentDark"
        >
          + Añadir evento este día
        </button>
      </div>
    </Backdrop>
  )
}

// ── Modal: crear / editar evento ─────────────────────────────────────────────
interface EventForm {
  tipo: EventTipo
  titulo: string
  fecha_inicio: string
  fecha_fin: string
  todo_el_dia: boolean
  hora_inicio: string
  ubicacion: string
  grupo: string
  rival: string
  localia: LocaliaTipo
  descripcion: string
}

function toForm(e: CalendarEvent | undefined, defaultDay: string): EventForm {
  if (!e) {
    return {
      tipo: 'partido', titulo: '', fecha_inicio: defaultDay, fecha_fin: '',
      todo_el_dia: true, hora_inicio: '', ubicacion: '', grupo: '', rival: '', localia: '', descripcion: '',
    }
  }
  return {
    tipo: e.tipo,
    titulo: e.titulo,
    fecha_inicio: e.fecha_inicio,
    fecha_fin: e.fecha_fin ?? '',
    todo_el_dia: e.todo_el_dia,
    hora_inicio: e.hora_inicio ? e.hora_inicio.slice(0, 5) : '',
    ubicacion: e.ubicacion,
    grupo: e.grupo,
    rival: e.rival,
    localia: e.localia,
    descripcion: e.descripcion,
  }
}

function EventModal({
  mode, event, defaultDay, onClose, onSave, onDelete,
}: {
  mode: 'create' | 'edit'
  event?: CalendarEvent
  defaultDay: string
  onClose: () => void
  onSave: (payload: EventPayload, id?: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [form, setForm] = useState<EventForm>(() => toForm(event, defaultDay))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const valido = form.titulo.trim() !== '' && form.fecha_inicio !== '' &&
    (!form.fecha_fin || form.fecha_fin >= form.fecha_inicio)

  async function submit() {
    if (!valido) {
      setErr(form.fecha_fin && form.fecha_fin < form.fecha_inicio
        ? 'La fecha de fin no puede ser anterior a la de inicio.'
        : 'Completa el título y la fecha de inicio.')
      return
    }
    setBusy(true)
    setErr(null)
    const payload: EventPayload = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      todo_el_dia: form.todo_el_dia,
      hora_inicio: form.todo_el_dia ? null : (form.hora_inicio || null),
      ubicacion: form.ubicacion.trim(),
      grupo: form.grupo.trim(),
      rival: form.tipo === 'partido' ? form.rival.trim() : '',
      localia: form.tipo === 'partido' ? form.localia : '',
      descripcion: form.descripcion.trim(),
    }
    try {
      await onSave(payload, event?.id)
    } catch {
      setErr('No se pudo guardar. Inténtalo de nuevo.')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!event) return
    setBusy(true)
    setErr(null)
    try {
      await onDelete(event.id)
    } catch {
      setErr('No se pudo eliminar.')
      setBusy(false)
    }
  }

  return (
    <Backdrop onClose={busy ? () => undefined : onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-perf-border bg-perf-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{mode === 'create' ? 'Nuevo evento' : 'Editar evento'}</h3>
          <button type="button" onClick={onClose} className="text-white/45 hover:text-white"><Icon name="close" size={18} /></button>
        </div>

        {err && (
          <p className="mb-3 rounded-lg border border-perf-danger/30 bg-perf-danger/10 px-3 py-2 text-xs text-perf-danger">{err}</p>
        )}

        <div className="flex flex-col gap-3">
          {/* Tipo */}
          <L label="Tipo">
            <div className="flex flex-wrap gap-1.5">
              {TIPO_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('tipo', t)}
                  className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={
                    form.tipo === t
                      ? { borderColor: TIPO_META[t].hex, backgroundColor: TIPO_META[t].hex + '22', color: '#fff' }
                      : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                  }
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIPO_META[t].hex }} />
                  {TIPO_META[t].label}
                </button>
              ))}
            </div>
          </L>

          <L label="Título">
            <input
              value={form.titulo}
              autoFocus
              onChange={(e) => set('titulo', e.target.value)}
              placeholder={form.tipo === 'partido' ? 'p. ej. Jornada 5' : 'Nombre del evento'}
              className={INPUT}
            />
          </L>

          <div className="grid grid-cols-2 gap-3">
            <L label="Inicio">
              <input type="date" value={form.fecha_inicio} onChange={(e) => set('fecha_inicio', e.target.value)} className={INPUT} />
            </L>
            <L label={RANGE_TIPOS.includes(form.tipo) ? 'Fin' : 'Fin (opcional)'}>
              <input type="date" value={form.fecha_fin} min={form.fecha_inicio} onChange={(e) => set('fecha_fin', e.target.value)} className={INPUT} />
            </L>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/75">
              <input type="checkbox" checked={form.todo_el_dia} onChange={(e) => set('todo_el_dia', e.target.checked)} className="h-4 w-4 accent-[#14b8a6]" />
              Todo el día
            </label>
            {!form.todo_el_dia && (
              <input type="time" value={form.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)} className={`${INPUT} max-w-[140px]`} />
            )}
          </div>

          {form.tipo === 'partido' && (
            <div className="grid grid-cols-2 gap-3">
              <L label="Rival">
                <input value={form.rival} onChange={(e) => set('rival', e.target.value)} placeholder="Equipo rival" className={INPUT} />
              </L>
              <L label="Localía">
                <select value={form.localia} onChange={(e) => set('localia', e.target.value as LocaliaTipo)} className={INPUT}>
                  <option value="">—</option>
                  {(Object.keys(LOCALIA_LABEL) as Array<keyof typeof LOCALIA_LABEL>).map((k) => (
                    <option key={k} value={k}>{LOCALIA_LABEL[k]}</option>
                  ))}
                </select>
              </L>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <L label="Ubicación">
              <input value={form.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} placeholder="Estadio, sede…" className={INPUT} />
            </L>
            <L label="Grupo / categoría">
              <input value={form.grupo} onChange={(e) => set('grupo', e.target.value)} placeholder="p. ej. Sub-18" className={INPUT} />
            </L>
          </div>

          <L label="Notas">
            <textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={2} placeholder="Detalles del evento (opcional)" className={`${INPUT} resize-none`} />
          </L>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded-lg border border-perf-danger/30 px-3 py-2 text-xs font-medium text-perf-danger hover:bg-perf-danger/10 disabled:opacity-40"
            >
              Eliminar
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-3 py-2 text-sm font-medium text-white/55 hover:text-white disabled:opacity-40">
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !valido}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Guardando…' : mode === 'create' ? 'Crear evento' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  )
}

// ── Primitivas ────────────────────────────────────────────────────────────────
const INPUT =
  'w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-accent'

function L({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs text-white/45">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Backdrop({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}

const MES_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function monthAbbr(iso: string): string {
  return MES_ABBR[Number(iso.slice(5, 7)) - 1] ?? ''
}
