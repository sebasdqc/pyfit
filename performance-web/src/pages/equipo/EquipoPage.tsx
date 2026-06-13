// Gestión del centro: ATLETAS y STAFF, sobre los endpoints reales (alta por
// email — el backend vincula o crea la cuenta). Es una superficie aparte de la
// "Plantilla" mock que alimenta Test/Psicológico/Simulador, para no tocar esa
// dependencia mientras se migra a atletas reales.

import { useEffect, useState, type ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/Icon'
import { useActiveCenter } from '@/centers/useActiveCenter'
import { useSquad } from '@/centers/useSquad'
import { CreateCenterButton } from '@/components/CreateCenterModal'
import { MODULES } from '@/lib/constants'
import {
  listCenterAthletes, createCenterAthlete, deleteCenterAthlete,
  listStaff, createStaff, deleteStaff,
} from '@/api/performance'
import { Dialog } from '@/components/ui/Dialog'
import type { CenterAthlete, CenterRole, CenterStaff } from '@/types'

const CENTER_ROLE_LABEL: Record<CenterRole, string> = {
  director_tecnico: 'Director técnico',
  preparador_fisico: 'Preparador físico',
  fisioterapeuta: 'Fisioterapeuta',
  analista: 'Analista',
  planificador: 'Planificador',
  psicologo: 'Psicólogo',
}
// Roles que se pueden dar de alta desde aquí (el director ya existe por el centro).
const ROLES_ALTA: CenterRole[] = [
  'preparador_fisico', 'fisioterapeuta', 'analista', 'planificador', 'psicologo', 'director_tecnico',
]
const MODULE_LABEL: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.id, m.label]))

const ESTADOS: CenterAthlete['estado'][] = ['activo', 'lesionado', 'baja']
const ESTADO_STYLE: Record<CenterAthlete['estado'], string> = {
  activo: 'text-perf-ok bg-perf-ok/10',
  lesionado: 'text-perf-warn bg-perf-warn/10',
  baja: 'text-perf-danger bg-perf-danger/10',
}

// App de consumo donde el atleta reclama su cuenta (no hay portal web propio aún).
const APP_URL = 'https://pyfit.app'
function inviteText(email: string): string {
  return (
    `Te han añadido como atleta en Zyfit Performance.\n` +
    `Activa tu cuenta en la app con tu correo: ${email}\n` +
    `Descárgala en ${APP_URL} y usa "¿Olvidaste tu contraseña?" para crear tu acceso.`
  )
}

// Mensaje legible de un error de axios/DRF (detail o errores por campo).
function errorMessage(e: unknown): string {
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
  // Opera sobre el MISMO centro activo que el resto del panel (una sola fuente de
  // verdad): así, registrar un atleta aquí lo hace aparecer en los módulos.
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
      {/* Encabezado + selector de centro (espejo del selector del Topbar; útil
          en móvil, donde el del Topbar se oculta). */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Equipo del centro</h1>
          <p className="text-xs text-white/45">Da de alta atletas y staff por email</p>
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

      {/* Pestañas */}
      <div className="flex w-fit gap-1 rounded-xl border border-perf-border bg-perf-surface p-1">
        <TabBtn active={tab === 'atletas'} onClick={() => setTab('atletas')} label="Atletas" />
        <TabBtn active={tab === 'staff'} onClick={() => setTab('staff')} label="Staff" />
      </div>

      {tab === 'atletas' ? <AtletasTab centerId={activeCenterId} /> : <StaffTab centerId={activeCenterId} />}
    </div>
  )
}

// ── Pestaña ATLETAS ──────────────────────────────────────────────────────────
function AtletasTab({ centerId }: { centerId: number }) {
  // Refresca la plantilla unificada al alta/baja para que los módulos (Plantilla,
  // Rendimiento, Test…) reflejen el cambio sin recargar.
  const { reload } = useSquad()
  const [list, setList] = useState<CenterAthlete[] | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setList(null)
    listCenterAthletes(centerId).then(setList).catch(() => setList([]))
  }, [centerId])

  async function remove(a: CenterAthlete) {
    if (!confirm(`¿Dar de baja a ${a.nombre || a.email}?`)) return
    try {
      await deleteCenterAthlete(centerId, a.id)
      setList((prev) => (prev ?? []).filter((x) => x.id !== a.id))
      reload()
    } catch {
      /* noop: el listado se mantiene */
    }
  }

  return (
    <Panel
      title="Atletas"
      subtitle={list == null ? 'Cargando…' : `${list.length} registrados`}
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accentDark"
        >
          <span aria-hidden className="text-base leading-none">+</span>
          Registrar atleta
        </button>
      }
    >
      {list == null ? (
        <div className="flex items-center gap-2.5 py-4 text-sm text-white/45"><Spinner size={18} /> Cargando…</div>
      ) : list.length === 0 ? (
        <p className="text-sm text-white/40">Aún no hay atletas. Registra el primero.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-perf-border">
          {list.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
              {/* Identidad: ocupa toda la 1ª línea en móvil (basis-full), comparte fila en sm+ */}
              <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto">
                <Avatar name={a.nombre || a.email} src={a.foto || null} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/90">
                    {a.nombre || a.email}
                    {a.dorsal && <span className="ml-2 text-xs text-white/40">#{a.dorsal}</span>}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {[a.posicion, a.grupo].filter(Boolean).join(' · ') || a.email}
                  </p>
                </div>
              </div>
              {/* Acciones: en móvil bajan a una 2ª línea indentada bajo el nombre */}
              <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
                {!a.cuenta_activa && (
                  <span className="hidden shrink-0 rounded-full bg-perf-warn/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-perf-warn sm:inline">
                    Invitación pendiente
                  </span>
                )}
                {!a.cuenta_activa && <InviteButton email={a.email} />}
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${ESTADO_STYLE[a.estado]}`}>
                  {a.estado}
                </span>
                <button
                  type="button"
                  onClick={() => remove(a)}
                  className="shrink-0 rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-perf-danger"
                  aria-label="Dar de baja"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <AtletaModal
          onClose={() => setOpen(false)}
          onCreated={(a) => {
            setList((prev) => [a, ...(prev ?? [])])
            reload()
          }}
          centerId={centerId}
        />
      )}
    </Panel>
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
        <div className="flex items-center gap-2.5 py-4 text-sm text-white/45"><Spinner size={18} /> Cargando…</div>
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
                    <span key={m} className="rounded-md border border-perf-border bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/65">
                      {MODULE_LABEL[m] ?? m}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeStaff(s)}
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
  centerId, onClose, onCreated,
}: {
  centerId: number; onClose: () => void; onCreated: (a: CenterAthlete) => void
}) {
  const [f, setF] = useState({ email: '', nombre: '', dorsal: '', posicion: '', grupo: '', estado: 'activo' as CenterAthlete['estado'] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canSave = f.email.trim().length > 3 && f.email.includes('@') && !saving

  async function submit() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const a = await createCenterAthlete(centerId, {
        email: f.email.trim(),
        nombre: f.nombre.trim(),
        dorsal: f.dorsal.trim() || undefined,
        posicion: f.posicion.trim() || undefined,
        grupo: f.grupo.trim() || undefined,
        estado: f.estado,
      })
      onCreated(a)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Registrar atleta" subtitle="Por email · se crea la cuenta si no existe" onClose={onClose} saving={saving} canSave={canSave} onSubmit={submit} cta="Registrar" error={error}>
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
  centerId, onClose, onCreated,
}: {
  centerId: number; onClose: () => void; onCreated: (s: CenterStaff) => void
}) {
  const [f, setF] = useState({ email: '', nombre: '', rol: 'preparador_fisico' as CenterRole, password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canSave = f.email.includes('@') && f.password.length >= 8 && !saving

  async function submit() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const s = await createStaff(centerId, {
        email: f.email.trim(), nombre: f.nombre.trim(), rol: f.rol, password: f.password,
      })
      onCreated(s)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Añadir staff" subtitle="Por email · se crea la cuenta si no existe" onClose={onClose} saving={saving} canSave={canSave} onSubmit={submit} cta="Añadir" error={error}>
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
        <span className="mt-1 block text-[11px] text-white/35">Define qué módulos verá. El director ve todos.</span>
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
// Copia al portapapeles una invitación lista para enviarle al atleta (no hay
// envío de email automático todavía; el director la comparte por su canal).
function InviteButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteText(email))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sin permiso de portapapeles: no hacemos nada */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-perf-border px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
      title="Copiar invitación para el atleta"
    >
      {copied ? 'Copiado ✓' : 'Invitar'}
    </button>
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
  label, value, onChange, placeholder, type = 'text', autoFocus, hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; autoFocus?: boolean; hint?: string
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
  title, subtitle, onClose, onSubmit, saving, canSave, cta, error, children,
}: {
  title: string; subtitle: string; onClose: () => void; onSubmit: () => void
  saving: boolean; canSave: boolean; cta: string; error: string; children: ReactNode
}) {
  const titleId = `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <Dialog onClose={onClose} labelledBy={titleId} className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-perf-border bg-perf-surface shadow-[0_24px_70px_rgba(0,0,0,0.6)]">
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
        {error && <p className="rounded-lg bg-perf-danger/10 px-3 py-2 text-xs text-perf-danger">{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-perf-border px-5 py-4">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:text-white">
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
