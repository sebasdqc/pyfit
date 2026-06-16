// Equipo del centro — vista unificada: lista de atletas y staff (alta/baja
// operacional) + ficha técnica desplegable al hacer clic en cada fila de atleta.
// Reemplaza tanto /equipo (gestión) como /plantilla (ficha + radar + métricas).

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/Icon'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { Dialog } from '@/components/ui/Dialog'
import { AthleteEditModal } from '@/components/AthleteEditModal'
import { useActiveCenter } from '@/centers/useActiveCenter'
import { useSquad } from '@/centers/useSquad'
import { useAuth } from '@/auth/useAuth'
import { canEditRole } from '@/lib/squadEdit'
import { SEM, acwrTone, type Tone } from '@/lib/tone'
import { ESTADO_LABEL, ESTADO_TONE, RADAR_AXES, type Athlete } from '@/lib/mockSquad'
import { CreateCenterButton } from '@/components/CreateCenterModal'
import { MODULES } from '@/lib/constants'
import {
  listCenterAthletes, createCenterAthlete, deleteCenterAthlete,
  listStaff, createStaff, deleteStaff,
} from '@/api/performance'
import type { CenterAthlete, CenterRole, CenterStaff } from '@/types'

const CENTER_ROLE_LABEL: Record<CenterRole, string> = {
  director_tecnico: 'Director técnico',
  preparador_fisico: 'Preparador físico',
  fisioterapeuta: 'Fisioterapeuta',
  analista: 'Analista',
  planificador: 'Planificador',
  psicologo: 'Psicólogo',
}
const ROLES_ALTA: CenterRole[] = [
  'preparador_fisico', 'fisioterapeuta', 'analista', 'planificador', 'psicologo', 'director_tecnico',
]
const MODULE_LABEL: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.id, m.label]))
const ESTADOS: CenterAthlete['estado'][] = ['activo', 'lesionado', 'baja']

const APP_URL = 'https://pyfit.app'
function inviteText(email: string): string {
  return (
    `Te han añadido como atleta en Zyfit Performance.\n` +
    `Activa tu cuenta en la app con tu correo: ${email}\n` +
    `Descárgala en ${APP_URL} y usa "¿Olvidaste tu contraseña?" para crear tu acceso.`
  )
}

function apiError(e: unknown): string {
  const data = (e as { response?: { data?: unknown } })?.response?.data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (typeof obj.detail === 'string') return obj.detail
    const first = Object.entries(obj)[0]
    if (first) {
      const [campo, val] = first
      return `${campo}: ${Array.isArray(val) ? String(val[0]) : String(val)}`
    }
  }
  return 'No se pudo completar. Revisa los datos e inténtalo de nuevo.'
}

// ── Página ─────────────────────────────────────────────────────────────────
export function EquipoPage() {
  const { centers, activeCenterId, setActiveCenterId } = useActiveCenter()
  const [tab, setTab] = useState<'atletas' | 'staff'>('atletas')

  if (activeCenterId == null) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-xl font-semibold text-white">Equipo del centro</h1>
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

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Equipo del centro</h1>
          <p className="text-xs text-white/45">Atletas, staff y ficha técnica por jugador</p>
        </div>
        {centers.length > 1 && (
          <select
            value={activeCenterId}
            onChange={(e) => setActiveCenterId(Number(e.target.value))}
            className="rounded-lg border border-perf-border bg-perf-surface px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
          >
            {centers.map((c) => (
              <option key={c.center_id} value={c.center_id}>{c.center_nombre}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex w-fit gap-1 rounded-xl border border-perf-border bg-perf-surface p-1">
        <TabBtn active={tab === 'atletas'} onClick={() => setTab('atletas')} label="Atletas" />
        <TabBtn active={tab === 'staff'} onClick={() => setTab('staff')} label="Staff" />
      </div>

      {tab === 'atletas'
        ? <AtletasTab centerId={activeCenterId} />
        : <StaffTab centerId={activeCenterId} />}
    </div>
  )
}

// ── Pestaña ATLETAS ──────────────────────────────────────────────────────────
function AtletasTab({ centerId }: { centerId: number }) {
  const { user } = useAuth()
  const canEdit = canEditRole(user?.role) || !!user?.is_admin || !!user?.is_director
  const { athletes: squad, loading, error, isRealRoster, reload, applyEdit } = useSquad()

  // Secondary fetch for cuenta_activa + email (not in Athlete type)
  const [caMap, setCaMap] = useState<Map<string, CenterAthlete>>(new Map())
  const [caTick, setCaTick] = useState(0)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    listCenterAthletes(centerId)
      .then((list) => setCaMap(new Map(list.map((ca) => [String(ca.id), ca]))))
      .catch(() => {})
  }, [centerId, caTick])

  function refetch() {
    reload()
    setCaTick((t) => t + 1)
  }

  async function remove(athleteId: string, name: string) {
    if (!confirm(`¿Dar de baja a ${name}?`)) return
    try {
      await deleteCenterAthlete(centerId, Number(athleteId))
      if (expandedId === athleteId) setExpandedId(null)
      refetch()
    } catch {
      /* noop */
    }
  }

  const noContent = loading || error || (isRealRoster && squad.length === 0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return squad
    return squad.filter((a) =>
      `${a.nombre} ${a.posicion} ${a.dorsal}`.toLowerCase().includes(q),
    )
  }, [query, squad])

  const editingAthlete = editingId ? squad.find((a) => a.id === editingId) ?? null : null

  return (
    <Panel
      title="Atletas"
      subtitle={noContent ? (loading ? 'Cargando…' : '') : `${squad.length} registrados`}
      action={
        <div className="flex items-center gap-2">
          <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="hidden w-36 rounded-lg border border-perf-border bg-perf-bg py-1.5 pl-3 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-accent sm:block"
          />
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accentDark"
          >
            <span aria-hidden className="text-base leading-none">+</span>
            Registrar
          </button>
        </div>
      }
    >
      {noContent ? (
        loading ? (
          <div className="flex items-center gap-2.5 py-4 text-sm text-white/45">
            <Spinner size={18} /> Cargando…
          </div>
        ) : (
          <SquadState loading={loading} error={error} empty={isRealRoster && squad.length === 0} />
        )
      ) : (
        <>
          {/* Buscador en móvil (en escritorio va en el slot action del Panel) */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar atleta…"
            className="mb-3 block w-full rounded-lg border border-perf-border bg-perf-bg py-2 pl-3 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-accent sm:hidden"
          />

          <ul className="flex flex-col divide-y divide-perf-border">
            {filtered.map((a) => {
              const ca = caMap.get(a.id)
              const isExpanded = expandedId === a.id
              return (
                <li key={a.id}>
                  {/* Fila: clic en el área principal abre/cierra la ficha */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedId(isExpanded ? null : a.id) }}
                    className="-mx-1 flex cursor-pointer select-none flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-1 py-3 transition-colors first:pt-0 hover:bg-white/[0.02] last:pb-0"
                    aria-expanded={isExpanded}
                  >
                    {/* Avatar + nombre */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={a.nombre} src={a.foto ?? null} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/90">
                          {a.nombre}
                          {a.dorsal ? (
                            <span className="ml-2 text-xs text-white/40">#{a.dorsal}</span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-white/45">
                          {[a.posicion, a.grupo].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>

                    {/* Acciones: stopPropagation para no abrir/cerrar la ficha */}
                    <div
                      className="flex shrink-0 items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {ca && !ca.cuenta_activa && (
                        <span className="hidden shrink-0 rounded-full bg-perf-warn/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-perf-warn sm:inline">
                          Invitación pendiente
                        </span>
                      )}
                      {ca && !ca.cuenta_activa && <InviteButton email={ca.email} />}
                      <EstadoBadge estado={a.estado} />
                      <button
                        type="button"
                        onClick={() => void remove(a.id, a.nombre)}
                        className="shrink-0 rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-perf-danger"
                        aria-label="Dar de baja"
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </div>

                    {/* Chevron: indica si la ficha está abierta */}
                    <Icon
                      name="chevronDown"
                      size={15}
                      className={`shrink-0 text-white/35 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                    />
                  </div>

                  {/* Ficha desplegable */}
                  {isExpanded && (
                    <div className="border-t border-perf-border/40 py-4">
                      <AthleteDetail
                        a={a}
                        canEdit={canEdit}
                        onEdit={() => setEditingId(a.id)}
                      />
                    </div>
                  )}
                </li>
              )
            })}
            {filtered.length === 0 && squad.length > 0 && (
              <p className="py-4 text-sm text-white/40">
                Sin resultados para "{query}".
              </p>
            )}
          </ul>
        </>
      )}

      {modalOpen && (
        <AtletaModal
          centerId={centerId}
          onClose={() => setModalOpen(false)}
          onCreated={() => { setModalOpen(false); refetch() }}
        />
      )}

      {editingAthlete && (
        <AthleteEditModal
          athlete={editingAthlete}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            const meta = {
              editadoPor: user?.nombre ?? 'Usuario',
              editadoEn: new Date().toISOString(),
            }
            applyEdit(editingAthlete.id, patch, meta)
            setEditingId(null)
          }}
        />
      )}
    </Panel>
  )
}

// ── Ficha del atleta (desplegable) ──────────────────────────────────────────
function AthleteDetail({
  a,
  canEdit,
  onEdit,
}: {
  a: Athlete
  canEdit: boolean
  onEdit: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Datos + radar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Datos del atleta */}
        <div className="rounded-xl border border-perf-border bg-perf-bg p-4 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35">
              Datos del atleta
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-lg border border-perf-border px-2.5 py-1 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Icon name="edit" size={12} />
                Editar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <DemoField label="Edad" value={`${a.edad} años`} />
            <DemoField label="Nacionalidad" value={a.nacionalidad} />
            <DemoField label="Altura" value={`${a.altura} cm`} />
            <DemoField label="Peso" value={`${a.peso} kg`} />
            <DemoField label="Pie hábil" value={a.pie} />
            <DemoField label="Grupo" value={a.grupo} />
          </div>
          {a.editadoEn && (
            <p className="mt-3 flex items-center gap-1.5 border-t border-perf-border pt-3 text-[11px] text-white/35">
              <Icon name="edit" size={11} />
              {fmtFecha(a.editadoEn)}
              {a.editadoPor ? ` · por ${a.editadoPor}` : ''}
            </p>
          )}
        </div>

        {/* Radar de rendimiento */}
        <div className="rounded-xl border border-perf-border bg-perf-bg p-4 lg:col-span-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/35">
            Perfil de rendimiento{' '}
            <span className="font-normal normal-case text-white/25">· escala 0–100</span>
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={RADAR_AXES.map((ax) => ({ axis: ax.label, v: a.radar[ax.key] }))}
                outerRadius="72%"
              >
                <PolarGrid stroke="#1c2740" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name={a.nombre}
                  dataKey="v"
                  stroke="#4f8cff"
                  fill="#4f8cff"
                  fillOpacity={0.22}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="ACWR" value={a.acwr.toFixed(2)} tone={acwrTone(a.acwr)} />
        <StatCard label="Bienestar" value={`${a.bienestar}`} unit="/10" tone="ok" />
        <StatCard label="Carga sem." value={`${a.cargaSemanal}`} unit=" UA" tone="warn" />
        <StatCard label="Disponib." value={`${a.disponibilidad}`} unit="%" tone="accent" />
        <StatCard label="Minutos" value={`${a.minutos}`} tone="accent" />
        <StatCard label="Sesiones" value={`${a.sesiones}`} tone="accent" />
      </div>
    </div>
  )
}

// ── Pestaña STAFF ────────────────────────────────────────────────────────────
function StaffTab({ centerId }: { centerId: number }) {
  const [list, setList] = useState<CenterStaff[] | null>(null)
  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    setList(null)
    listStaff(centerId).then(setList).catch(() => setList([]))
  }, [centerId])

  async function removeStaff(s: CenterStaff) {
    if (!confirm(`¿Eliminar a ${s.nombre || s.email} del centro?`)) return
    setDeletingId(s.id)
    try {
      await deleteStaff(centerId, s.id)
      setList((prev) => prev?.filter((x) => x.id !== s.id) ?? null)
    } catch (e) {
      const data = (e as { response?: { data?: { detail?: string } } })?.response?.data
      alert(data?.detail ?? 'No se pudo eliminar el miembro del equipo.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Panel
      title="Staff"
      subtitle={list == null ? 'Cargando…' : `${list.length} miembros`}
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accentDark"
        >
          <span aria-hidden className="text-base leading-none">+</span>
          Añadir staff
        </button>
      }
    >
      {list == null ? (
        <div className="flex items-center gap-2.5 py-4 text-sm text-white/45">
          <Spinner size={18} /> Cargando…
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-white/40">Aún no hay staff. Añade al primer miembro.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-perf-border">
          {list.map((s) => (
            <li key={s.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <Avatar name={s.nombre || s.email} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-white/90">{s.nombre || s.email}</p>
                  <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    {CENTER_ROLE_LABEL[s.rol] ?? s.rol}
                  </span>
                  {!s.activo && (
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/45">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-white/45">{s.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {s.modulos.map((m) => (
                    <span
                      key={m}
                      className="rounded-md border border-perf-border bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/65"
                    >
                      {MODULE_LABEL[m] ?? m}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void removeStaff(s)}
                disabled={deletingId === s.id}
                className="shrink-0 rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-perf-danger disabled:opacity-40"
                aria-label="Eliminar del centro"
              >
                {deletingId === s.id ? <Spinner size={15} /> : <Icon name="close" size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <StaffModal
          onClose={() => setOpen(false)}
          onCreated={(s) => setList((prev) => [s, ...(prev ?? [])])}
          centerId={centerId}
        />
      )}
    </Panel>
  )
}

// ── Modal: registrar atleta ──────────────────────────────────────────────────
function AtletaModal({
  centerId,
  onClose,
  onCreated,
}: {
  centerId: number
  onClose: () => void
  onCreated: () => void
}) {
  const [f, setF] = useState({
    email: '',
    nombre: '',
    dorsal: '',
    posicion: '',
    grupo: '',
    estado: 'activo' as CenterAthlete['estado'],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canSave = f.email.trim().length > 3 && f.email.includes('@') && !saving

  async function submit() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      await createCenterAthlete(centerId, {
        email: f.email.trim(),
        nombre: f.nombre.trim(),
        dorsal: f.dorsal.trim() || undefined,
        posicion: f.posicion.trim() || undefined,
        grupo: f.grupo.trim() || undefined,
        estado: f.estado,
      })
      onCreated()
    } catch (e) {
      setError(apiError(e))
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title="Registrar atleta"
      subtitle="Por email · se crea la cuenta si no existe"
      onClose={onClose}
      saving={saving}
      canSave={canSave}
      onSubmit={submit}
      cta="Registrar"
      error={error}
    >
      <LabeledInput label="Email del atleta" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="atleta@email.com" type="email" autoFocus />
      <LabeledInput label="Nombre" value={f.nombre} onChange={(v) => setF({ ...f, nombre: v })} placeholder="Nombre y apellido" />
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput label="Dorsal" value={f.dorsal} onChange={(v) => setF({ ...f, dorsal: v })} placeholder="10" />
        <LabeledInput label="Posición" value={f.posicion} onChange={(v) => setF({ ...f, posicion: v })} placeholder="Opcional" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput label="Grupo / categoría" value={f.grupo} onChange={(v) => setF({ ...f, grupo: v })} placeholder="Primer equipo" />
        <label className="block">
          <span className="text-xs text-white/45">Estado</span>
          <select
            value={f.estado}
            onChange={(e) => setF({ ...f, estado: e.target.value as CenterAthlete['estado'] })}
            className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm capitalize text-white outline-none focus:border-accent"
          >
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
    </ModalShell>
  )
}

// ── Modal: añadir staff ──────────────────────────────────────────────────────
function StaffModal({
  centerId,
  onClose,
  onCreated,
}: {
  centerId: number
  onClose: () => void
  onCreated: (s: CenterStaff) => void
}) {
  const [f, setF] = useState({
    email: '',
    nombre: '',
    rol: 'preparador_fisico' as CenterRole,
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canSave = f.email.includes('@') && f.password.length >= 8 && !saving

  async function submit() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const s = await createStaff(centerId, {
        email: f.email.trim(),
        nombre: f.nombre.trim(),
        rol: f.rol,
        password: f.password,
      })
      onCreated(s)
      onClose()
    } catch (e) {
      setError(apiError(e))
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title="Añadir staff"
      subtitle="Por email · se crea la cuenta si no existe"
      onClose={onClose}
      saving={saving}
      canSave={canSave}
      onSubmit={submit}
      cta="Añadir"
      error={error}
    >
      <LabeledInput label="Email" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="staff@email.com" type="email" autoFocus />
      <LabeledInput label="Nombre" value={f.nombre} onChange={(v) => setF({ ...f, nombre: v })} placeholder="Nombre y apellido" />
      <label className="block">
        <span className="text-xs text-white/45">Rol en el centro</span>
        <select
          value={f.rol}
          onChange={(e) => setF({ ...f, rol: e.target.value as CenterRole })}
          className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
        >
          {ROLES_ALTA.map((r) => <option key={r} value={r}>{CENTER_ROLE_LABEL[r]}</option>)}
        </select>
        <span className="mt-1 block text-[11px] text-white/35">
          Define qué módulos verá. El director ve todos.
        </span>
      </label>
      <LabeledInput
        label="Contraseña temporal"
        value={f.password}
        onChange={(v) => setF({ ...f, password: v })}
        placeholder="Mínimo 8 caracteres"
        type="text"
        hint="Compártesela; podrá cambiarla al entrar. Si la cuenta ya existe, se ignora."
      />
    </ModalShell>
  )
}

// ── Piezas de UI ─────────────────────────────────────────────────────────────
function InviteButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteText(email))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sin permiso */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-perf-border px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
      title="Copiar invitación"
    >
      {copied ? 'Copiado ✓' : 'Invitar'}
    </button>
  )
}

function EstadoBadge({ estado }: { estado: Athlete['estado'] }) {
  const t = ESTADO_TONE[estado]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${SEM[t].soft} ${SEM[t].text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${SEM[t].bg}`} />
      {ESTADO_LABEL[estado]}
    </span>
  )
}

function StatCard({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone: Tone }) {
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

function DemoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-0.5 text-sm text-white/85">{value}</p>
    </div>
  )
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-accent text-white' : 'text-white/60 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  autoFocus?: boolean
  hint?: string
}) {
  return (
    <label className="block">
      <span className="text-xs text-white/45">{label}</span>
      <input
        autoFocus={autoFocus}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent"
      />
      {hint && <span className="mt-1 block text-[11px] text-white/35">{hint}</span>}
    </label>
  )
}

function ModalShell({
  title,
  subtitle,
  onClose,
  onSubmit,
  saving,
  canSave,
  cta,
  error,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  onSubmit: () => void
  saving: boolean
  canSave: boolean
  cta: string
  error: string
  children: ReactNode
}) {
  const titleId = `modal-${title.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <Dialog
      onClose={onClose}
      labelledBy={titleId}
      className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-perf-border bg-perf-surface shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center justify-between border-b border-perf-border px-5 py-4">
        <div>
          <h2 id={titleId} className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-xs text-white/45">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} className="text-white/45 hover:text-white" aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
        {children}
        {error && (
          <p className="rounded-lg bg-perf-danger/10 px-3 py-2 text-xs text-perf-danger">{error}</p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-perf-border px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSave}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Guardando…' : cta}
        </button>
      </div>
    </Dialog>
  )
}

function fmtFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
