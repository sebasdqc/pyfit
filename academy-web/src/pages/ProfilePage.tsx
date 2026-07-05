// Perfil del usuario. Datos reales de /api/academy/me/. Permite editar el nombre
// visible y los datos personales (PATCH /me/); el correo es de solo lectura.
// Muestra rol y métricas. Integración inicial simple — el onboarding propio de
// la academia (más guiado) queda para una iteración futura.

import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { getBadges } from '@/api/academy'
import { updateMe } from '@/api/auth'
import { useAuth } from '@/auth/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/Icon'
import { BadgeGallery } from '@/components/badges/BadgeGallery'
import { COUNTRIES } from '@/lib/countries'
import type { AcademyBadgeCatalog } from '@/types'

const HOY = new Date().toISOString().slice(0, 10)

const REDES = [
  { key: 'instagram', label: 'Instagram', placeholder: '@usuario' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@usuario' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/…' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: '@usuario' },
  { key: 'sitio_web', label: 'Sitio web', placeholder: 'https://…' },
] as const

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [nombre, setNombre] = useState(user?.nombre ?? '')
  const [pais, setPais] = useState(user?.pais ?? '')
  const [ciudad, setCiudad] = useState(user?.ciudad ?? '')
  const [profesion, setProfesion] = useState(user?.profesion ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(user?.fecha_nacimiento ?? '')
  const [intereses, setIntereses] = useState<string[]>(user?.intereses ?? [])
  const [interesInput, setInteresInput] = useState('')
  const [redes, setRedes] = useState<Record<string, string>>(user?.redes_sociales ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [badges, setBadges] = useState<AcademyBadgeCatalog | null>(null)

  useEffect(() => {
    let active = true
    getBadges()
      .then((b) => active && setBadges(b))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  if (!user) return null
  const nombreValido = nombre.trim() !== ''
  const dirty =
    nombreValido &&
    (nombre.trim() !== user.nombre ||
      pais !== (user.pais ?? '') ||
      ciudad !== (user.ciudad ?? '') ||
      profesion !== (user.profesion ?? '') ||
      fechaNacimiento !== (user.fecha_nacimiento ?? '') ||
      JSON.stringify(intereses) !== JSON.stringify(user.intereses ?? []) ||
      JSON.stringify(redes) !== JSON.stringify(user.redes_sociales ?? {}))

  function clearStatus() {
    setSaved(false)
    setSaveError(false)
  }

  function agregarInteres(raw: string) {
    const tag = raw.trim()
    if (!tag || intereses.includes(tag) || intereses.length >= 20) return
    setIntereses((prev) => [...prev, tag])
    clearStatus()
  }

  function quitarInteres(tag: string) {
    setIntereses((prev) => prev.filter((x) => x !== tag))
    clearStatus()
  }

  function handleInteresKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      agregarInteres(interesInput)
      setInteresInput('')
    } else if (e.key === 'Backspace' && interesInput === '' && intereses.length > 0) {
      quitarInteres(intereses[intereses.length - 1])
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setSaveError(false)
    try {
      await updateMe({
        nombre: nombre.trim(),
        pais,
        ciudad,
        profesion,
        fecha_nacimiento: fechaNacimiento || null,
        intereses,
        redes_sociales: redes,
      })
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
            <Badge tone={user.nivel_academia === 'pro' ? 'ok' : 'neutral'}>
              {user.nivel_academia === 'pro' ? 'Academy Pro' : 'Starter'}
            </Badge>
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat icon="learning" value={user.total_inscripciones} label="Inscripciones" />
        <Stat icon="instructor" value={user.total_cursos_creados} label="Cursos creados" />
      </section>

      {/* Suscripción */}
      <Link
        to="/suscripcion"
        className="za-card flex items-center gap-4 p-5 transition-colors hover:bg-surface-soft"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/5 text-brand">
          <Icon name="star" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Mi suscripción</p>
          <p className="text-xs text-ink-muted">
            {user.nivel_academia === 'pro' ? 'Academy Pro activo — gestionar plan' : 'Desbloquea el catálogo completo con Academy Pro'}
          </p>
        </div>
        <Icon name="chevronRight" size={18} className="shrink-0 text-ink-muted" />
      </Link>

      {/* Insignias de identidad */}
      {badges && <BadgeGallery identidad={badges} />}

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
                clearStatus()
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                Fecha de nacimiento
              </span>
              <input
                type="date"
                value={fechaNacimiento ?? ''}
                max={HOY}
                onChange={(e) => {
                  setFechaNacimiento(e.target.value)
                  clearStatus()
                }}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                Profesión
              </span>
              <input
                value={profesion}
                placeholder="Ej. Preparador físico"
                onChange={(e) => {
                  setProfesion(e.target.value)
                  clearStatus()
                }}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">País</span>
              <select
                value={pais}
                onChange={(e) => {
                  setPais(e.target.value)
                  clearStatus()
                }}
                className="input"
              >
                <option value="">Selecciona un país</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Ciudad</span>
              <input
                value={ciudad}
                placeholder="Ej. Asunción"
                onChange={(e) => {
                  setCiudad(e.target.value)
                  clearStatus()
                }}
                className="input"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Intereses</span>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-3 py-2 focus-within:border-accent focus-within:bg-surface">
              {intereses.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/10 py-1 pl-3 pr-1.5 text-xs font-medium text-accent"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => quitarInteres(tag)}
                    aria-label={`Quitar interés ${tag}`}
                    className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/20"
                  >
                    <Icon name="close" size={11} />
                  </button>
                </span>
              ))}
              <input
                value={interesInput}
                onChange={(e) => setInteresInput(e.target.value)}
                onKeyDown={handleInteresKeyDown}
                onBlur={() => {
                  agregarInteres(interesInput)
                  setInteresInput('')
                }}
                placeholder={intereses.length === 0 ? 'Ej. Fútbol, nutrición… (Enter para añadir)' : ''}
                className="h-7 min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              Redes sociales
            </span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {REDES.map((red) => (
                <label key={red.key} className="block">
                  <span className="mb-1 block text-[11px] text-ink-muted">{red.label}</span>
                  <input
                    value={redes[red.key] ?? ''}
                    placeholder={red.placeholder}
                    onChange={(e) => {
                      setRedes((prev) => ({ ...prev, [red.key]: e.target.value }))
                      clearStatus()
                    }}
                    className="input"
                  />
                </label>
              ))}
            </div>
          </div>

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
