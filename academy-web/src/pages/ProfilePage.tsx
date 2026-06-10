// Perfil del usuario. Datos reales de /api/academy/me/. Permite editar el nombre
// visible (PATCH /me/); el correo es de solo lectura. Muestra rol y métricas.

import { useState } from 'react'
import { updateMe } from '@/api/auth'
import { useAuth } from '@/auth/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/Icon'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [nombre, setNombre] = useState(user?.nombre ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)

  if (!user) return null
  const dirty = nombre.trim() !== '' && nombre.trim() !== user.nombre

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setSaveError(false)
    try {
      await updateMe({ nombre: nombre.trim() })
      await refreshUser()
      setSaved(true)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <p className="za-eyebrow">Perfil</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Mi cuenta</h1>
      </header>

      {/* Cabecera de identidad */}
      <section className="za-card flex items-center gap-4 p-6">
        <Avatar name={user.nombre} size={64} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">{user.nombre}</p>
          <p className="truncate text-sm text-ink-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.is_admin && <Badge tone="brand">Administrador</Badge>}
            {user.is_instructor && <Badge tone="accent">Instructor</Badge>}
            {!user.is_admin && !user.is_instructor && <Badge tone="neutral">Estudiante</Badge>}
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat icon="learning" value={user.total_inscripciones} label="Inscripciones" />
        <Stat icon="instructor" value={user.total_cursos_creados} label="Cursos creados" />
      </section>

      {/* Datos editables */}
      <section className="za-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Datos personales</h2>
        <div className="mt-4 flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              Nombre visible
            </span>
            <input
              value={nombre}
              autoComplete="name"
              onChange={(e) => {
                setNombre(e.target.value)
                setSaved(false)
                setSaveError(false)
              }}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              Correo electrónico
            </span>
            <input value={user.email} readOnly className="input cursor-not-allowed bg-surface-soft text-ink-muted" />
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {saved && !dirty && (
              <span role="status" className="inline-flex items-center gap-1.5 text-sm text-ok">
                <Icon name="check" size={16} /> Guardado
              </span>
            )}
            {saveError && (
              <span role="alert" className="inline-flex items-center gap-1.5 text-sm text-danger">
                <Icon name="close" size={16} /> No se pudo guardar.
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: 'learning' | 'instructor'; value: number; label: string }) {
  return (
    <div className="za-card flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/5 text-brand">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
    </div>
  )
}
