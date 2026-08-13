// Alta de un centro deportivo desde el panel (sin pasar por el admin de Django).
// El backend (POST /performance/centers/) deja al creador como director técnico
// del centro, así que tras crearlo refrescamos /me/ para que su membresía
// aparezca en `centros` en todo el panel. Solo se ofrece a director/admin.

import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/auth/useAuth'
import { createCenter } from '@/api/performance'
import type { SportsCenter } from '@/types'

// slug legible: minúsculas, sin acentos, espacios→guiones, solo [a-z0-9-].
// Exportado: el paso de "crea tu centro" del onboarding lo reutiliza.
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita los diacríticos (acentos, tildes)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// Extrae un mensaje legible de un error de axios/DRF (errores por campo o detail).
function errorMessage(e: unknown): string {
  const data = (e as { response?: { data?: unknown } })?.response?.data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (typeof obj.detail === 'string') return obj.detail
    if (Array.isArray(obj.slug)) return `Slug: ${String(obj.slug[0])}`
    const first = Object.entries(obj)[0]
    if (first) {
      const [campo, val] = first
      const msg = Array.isArray(val) ? String(val[0]) : String(val)
      return `${campo}: ${msg}`
    }
  }
  return 'No se pudo crear el centro. Revisa los datos e inténtalo de nuevo.'
}

export function CreateCenterModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: (center: SportsCenter) => void
}) {
  const { refreshUser } = useAuth()
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [disciplina, setDisciplina] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // El slug sigue al nombre mientras el usuario no lo edite a mano.
  function onNombre(v: string) {
    setNombre(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  const slugFinal = slug.trim() || slugify(nombre)
  const canSave = nombre.trim().length > 0 && slugFinal.length > 0 && !saving

  async function submit() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const center = await createCenter({
        nombre: nombre.trim(),
        slug: slugFinal,
        disciplina: disciplina.trim() || undefined,
        ciudad: ciudad.trim() || undefined,
      })
      await refreshUser() // la nueva membresía (director) ya aparece en /me/
      onCreated?.(center)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="create-center-title"
      className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-perf-border bg-perf-surface shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
    >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-perf-border px-5 py-4">
          <div>
            <h2 id="create-center-title" className="text-sm font-semibold text-white">Crear centro</h2>
            <p className="text-xs text-white/45">Serás su director técnico</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/45 hover:text-white" aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-col gap-4 px-5 py-5">
          <label className="block">
            <span className="text-xs text-white/45">Nombre del centro</span>
            <input
              data-autofocus
              value={nombre}
              onChange={(e) => onNombre(e.target.value)}
              placeholder="p. ej. CD Águilas"
              className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/45">Identificador (slug)</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(slugify(e.target.value))
              }}
              placeholder="cd-aguilas"
              className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent"
            />
            <span className="mt-1 block text-[11px] text-white/35">Único, en minúsculas y con guiones. Se usa en rutas del panel.</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-white/45">Disciplina</span>
              <input
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
                placeholder="Fútbol"
                className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/45">Ciudad</span>
              <input
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Opcional"
                className="mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent"
              />
            </label>
          </div>

          {error && <p role="alert" className="rounded-lg bg-perf-danger/10 px-3 py-2 text-xs text-perf-danger">{error}</p>}
        </div>

        {/* Pie */}
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
            onClick={submit}
            disabled={!canSave}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Creando…' : 'Crear centro'}
          </button>
        </div>
    </Dialog>
  )
}

// Botón + modal listos para usar. Solo se muestra a quien puede crear centros
// (director/admin; el backend además acepta staff). `onCreated` permite a la
// página reaccionar (p. ej. seleccionar el centro recién creado).
export function CreateCenterButton({
  onCreated,
  className,
  label = 'Crear centro',
}: {
  onCreated?: (center: SportsCenter) => void
  className?: string
  label?: string
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const canCreate = !!user && (user.is_admin || user.is_director)
  if (!canCreate) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark'
        }
      >
        <span aria-hidden className="text-base leading-none">+</span>
        {label}
      </button>
      {open && <CreateCenterModal onClose={() => setOpen(false)} onCreated={onCreated} />}
    </>
  )
}
