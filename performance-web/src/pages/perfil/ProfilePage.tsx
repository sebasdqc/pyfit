// Perfil del usuario del panel (director técnico / staff). Primera versión para
// iterar: cabecera de identidad + 4 bloques —datos de la cuenta, centros y
// permisos (datos reales del usuario), seguridad y preferencias. Las ediciones
// y la contraseña aún no se persisten en la API (esta fase).

import { useEffect, useState, type ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Toggle } from '@/components/ui/Toggle'
import { Avatar } from '@/components/ui/Avatar'
import { Icon, type IconName } from '@/components/Icon'
import { useAuth } from '@/auth/useAuth'
import { CreateCenterButton } from '@/components/CreateCenterModal'
import { MODULES } from '@/lib/constants'
import type { CenterRole, GlobalRole, ModuleId } from '@/types'

const ROLE_LABEL: Record<GlobalRole, string> = {
  director_tecnico: 'Director técnico',
  admin: 'Administrador',
  coach: 'Entrenador',
  athlete: 'Atleta',
}
const CENTER_ROLE_LABEL: Record<CenterRole, string> = {
  director_tecnico: 'Director técnico',
  preparador_fisico: 'Preparador físico',
  fisioterapeuta: 'Fisioterapeuta',
  analista: 'Analista',
  planificador: 'Planificador',
  psicologo: 'Psicólogo',
}
const MODULE_LABEL: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.id, m.label]))

export function ProfilePage() {
  const { user, logout } = useAuth()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', idioma: 'es' })
  const [prefs, setPrefs] = useState({ emailAlerts: true, weekly: true, criticas: true })
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, nombre: user.nombre, email: user.email }))
  }, [user])

  if (!user) return null

  const totalModulos = new Set(user.centros.flatMap((c) => c.modulos)).size

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      {/* Cabecera de identidad */}
      <div className="flex flex-col gap-4 rounded-2xl border border-perf-border bg-perf-surface p-6 sm:flex-row sm:items-center">
        <Avatar name={user.nombre} size={68} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-white">{user.nombre}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
              {ROLE_LABEL[user.role] ?? 'Staff'}
            </span>
            <span className="truncate text-sm text-white/55">{user.email}</span>
          </div>
          <p className="mt-2 text-xs text-white/40">
            {user.centros.length} {user.centros.length === 1 ? 'centro' : 'centros'} · {totalModulos}{' '}
            {totalModulos === 1 ? 'módulo' : 'módulos'} con acceso
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center justify-center gap-2 rounded-lg border border-perf-border bg-perf-surface2 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-perf-danger/10 hover:text-perf-danger"
        >
          <Icon name="logout" size={16} />
          Cerrar sesión
        </button>
      </div>

      {/* Fila 1: datos de la cuenta + centros */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Datos de la cuenta"
          subtitle="Información personal de tu perfil"
          action={
            editing ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/55 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accentDark"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border border-perf-border px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-perf-surface2 hover:text-white"
              >
                Editar
              </button>
            )
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Nombre completo" value={form.nombre} editing={editing} onChange={(v) => setForm({ ...form, nombre: v })} />
            <Field label="Correo electrónico" value={form.email} type="email" editing={editing} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Teléfono" value={form.telefono} type="tel" placeholder="—" editing={editing} onChange={(v) => setForm({ ...form, telefono: v })} />
            <div>
              <label className="text-xs text-white/45">Idioma</label>
              {editing ? (
                <select
                  value={form.idioma}
                  onChange={(e) => setForm({ ...form, idioma: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              ) : (
                <p className="mt-1 text-sm text-white/85">{form.idioma === 'es' ? 'Español' : 'English'}</p>
              )}
            </div>
          </div>
        </Panel>

        <Panel
          title="Centros y permisos"
          subtitle="Tus roles y módulos por centro"
          action={
            <CreateCenterButton className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accentDark" />
          }
        >
          {user.centros.length === 0 ? (
            <p className="text-sm text-white/45">
              Sin centros asignados todavía. Crea uno con el botón de arriba para empezar a usar los módulos.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-perf-border">
              {user.centros.map((c) => (
                <li key={c.center_id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-white/90">{c.center_nombre}</p>
                    <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                      {CENTER_ROLE_LABEL[c.rol] ?? c.rol}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.modulos.length === 0 ? (
                      <span className="text-xs text-white/35">Sin módulos asignados</span>
                    ) : (
                      c.modulos.map((m: ModuleId) => (
                        <span key={m} className="rounded-md border border-perf-border bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/65">
                          {MODULE_LABEL[m] ?? m}
                        </span>
                      ))
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Fila 2: seguridad + preferencias */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Seguridad" subtitle="Contraseña y acceso a tu cuenta">
          <div className="flex flex-col gap-4">
            <Field label="Contraseña actual" value={pwd.current} type="password" editing placeholder="••••••••" onChange={(v) => setPwd({ ...pwd, current: v })} />
            <Field label="Nueva contraseña" value={pwd.next} type="password" editing placeholder="Mínimo 8 caracteres" onChange={(v) => setPwd({ ...pwd, next: v })} />
            <Field label="Confirmar nueva contraseña" value={pwd.confirm} type="password" editing placeholder="Repite la contraseña" onChange={(v) => setPwd({ ...pwd, confirm: v })} />
            <button
              type="button"
              disabled={!pwd.current || pwd.next.length < 8 || pwd.next !== pwd.confirm}
              className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
            >
              Actualizar contraseña
            </button>

            <div className="mt-1 flex items-center justify-between gap-3 border-t border-perf-border pt-4">
              <Row icon="shield" title="Autenticación en dos pasos" desc="Capa extra de seguridad al iniciar sesión" />
              <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white/45">
                Próximamente
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Preferencias" subtitle="Notificaciones y apariencia">
          <div className="flex flex-col divide-y divide-perf-border">
            <PrefRow icon="bell" title="Alertas por correo" desc="Recibe avisos importantes en tu email" checked={prefs.emailAlerts} onChange={(v) => setPrefs({ ...prefs, emailAlerts: v })} />
            <PrefRow icon="reportes" title="Resumen semanal" desc="Informe de la plantilla cada lunes" checked={prefs.weekly} onChange={(v) => setPrefs({ ...prefs, weekly: v })} />
            <PrefRow icon="alert" title="Avisos críticos" desc="Lesiones y ACWR en zona de riesgo" checked={prefs.criticas} onChange={(v) => setPrefs({ ...prefs, criticas: v })} />
            <div className="flex items-center justify-between gap-3 py-4 last:pb-0">
              <Row icon="ajustes" title="Tema" desc="El panel usa el tema oscuro de Zyfit Performance" />
              <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white/55">
                Oscuro
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ── Componentes ────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  editing,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  editing: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-white/45">{label}</label>
      {editing ? (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-accent"
        />
      ) : (
        <p className="mt-1 text-sm text-white/85">{value || placeholder || '—'}</p>
      )}
    </div>
  )
}

function Row({ icon, title, desc }: { icon: IconName; title: string; desc: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/55">
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white/90">{title}</p>
        <p className="truncate text-xs text-white/45">{desc}</p>
      </div>
    </div>
  )
}

function PrefRow({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: IconName
  title: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}): ReactNode {
  return (
    <div className="flex items-center justify-between gap-3 py-4 first:pt-0">
      <Row icon={icon} title={title} desc={desc} />
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}
