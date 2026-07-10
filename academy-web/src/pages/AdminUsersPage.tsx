// Administración de usuarios de Zyfit Academy — SOLO admin (ver
// academy.permissions.IsAcademyAdmin). Permite crear cuentas de admin/
// profesor/estudiante directamente, a diferencia del registro público
// (/api/auth/register/, que siempre crea un estudiante).

import { isAxiosError } from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { createAcademyUser, listAcademyUsers } from '@/api/academy'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { useT } from '@/locale/useT'
import type { AcademyUserAccount, AcademyUserRol } from '@/types'

const ROL_TONE: Record<AcademyUserRol, 'brand' | 'accent' | 'neutral'> = {
  admin: 'brand',
  profesor: 'accent',
  estudiante: 'neutral',
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.status === 400) {
    const data = err.response.data as Record<string, string[] | string> | undefined
    const mensajes = Object.values(data ?? {}).flatMap((v) => (Array.isArray(v) ? v : [v]))
    if (mensajes.length) return mensajes.join(' ')
  }
  return fallback
}

export function AdminUsersPage() {
  const t = useT()
  const { user } = useAuth()

  if (!user?.is_admin) {
    return (
      <EmptyState
        icon="shield"
        title={t('adminUsers.accessDeniedTitle')}
        description={t('adminUsers.accessDeniedBody')}
      />
    )
  }

  return <AdminUsersPanel />
}

function AdminUsersPanel() {
  const t = useT()
  const [items, setItems] = useState<AcademyUserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [rolFiltro, setRolFiltro] = useState<AcademyUserRol | ''>('')

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    listAcademyUsers({ q: debouncedQ.trim() || undefined, rol: rolFiltro || undefined })
      .then((data) => active && setItems(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [debouncedQ, rolFiltro])

  function handleCreated(nuevo: AcademyUserAccount) {
    setItems((prev) => [nuevo, ...prev])
  }

  const isEmpty = !loading && !error && items.length === 0

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="za-eyebrow">{t('adminUsers.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{t('adminUsers.title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('adminUsers.body')}</p>
      </header>

      <CreateUserForm onCreated={handleCreated} />

      <div className="za-card p-5">
        <h2 className="text-sm font-semibold text-ink">{t('adminUsers.listTitle')}</h2>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('adminUsers.searchPlaceholder')}
              type="search"
              aria-label={t('adminUsers.searchAria')}
              className="h-10 w-full rounded-xl border border-surface-border bg-surface-soft pl-9 pr-3 text-sm text-ink transition-colors focus:border-accent focus:bg-surface"
            />
          </div>
          <select
            value={rolFiltro}
            onChange={(e) => setRolFiltro(e.target.value as AcademyUserRol | '')}
            aria-label={t('adminUsers.rolLabel')}
            className="h-10 rounded-xl border border-surface-border bg-surface-soft px-3 text-sm text-ink transition-colors focus:border-accent focus:bg-surface"
          >
            <option value="">{t('adminUsers.filterAll')}</option>
            <option value="admin">{t('adminUsers.rol.admin')}</option>
            <option value="profesor">{t('adminUsers.rol.profesor')}</option>
            <option value="estudiante">{t('adminUsers.rol.estudiante')}</option>
          </select>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size={32} />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-danger">{t('adminUsers.loadError')}</p>
          ) : isEmpty ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              {q.trim() || rolFiltro ? t('adminUsers.noResultsBody') : t('adminUsers.noUsersBody')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-ink-muted">
                    <th className="py-2 pr-3 font-medium">{t('adminUsers.columnName')}</th>
                    <th className="py-2 pr-3 font-medium">{t('adminUsers.columnEmail')}</th>
                    <th className="py-2 pr-3 font-medium">{t('adminUsers.columnRole')}</th>
                    <th className="py-2 pr-3 font-medium">{t('adminUsers.columnJoined')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr key={u.id} className="border-b border-surface-border last:border-0">
                      <td className="py-2.5 pr-3 text-ink">{u.nombre}</td>
                      <td className="py-2.5 pr-3 text-ink-soft">{u.email}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={ROL_TONE[u.rol]}>{t(`adminUsers.rol.${u.rol}`)}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-ink-muted">
                        {new Date(u.date_joined).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateUserForm({ onCreated }: { onCreated: (u: AcademyUserAccount) => void }) {
  const t = useT()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<AcademyUserRol>('estudiante')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmingAdmin, setConfirmingAdmin] = useState(false)

  async function doCreate() {
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      const nuevo = await createAcademyUser({ email, password, nombre, rol })
      onCreated(nuevo)
      setNombre('')
      setEmail('')
      setPassword('')
      setRol('estudiante')
      setSuccess(true)
    } catch (err) {
      setError(extractErrorMessage(err, t('adminUsers.createError')))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Otorgar el rol admin es una acción de alto privilegio (gestiona cuentas
    // y contenido de toda la academia) — a diferencia de profesor/estudiante,
    // pide confirmación explícita antes de crear la cuenta.
    if (rol === 'admin') {
      setConfirmingAdmin(true)
      return
    }
    doCreate()
  }

  return (
    <form onSubmit={handleSubmit} className="za-card flex flex-col gap-4 p-5">
      <h2 className="text-sm font-semibold text-ink">{t('adminUsers.createTitle')}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabeledInput
          label={t('adminUsers.nameLabel')}
          value={nombre}
          onChange={setNombre}
          placeholder={t('adminUsers.namePlaceholder')}
          required
        />
        <LabeledInput
          label={t('adminUsers.emailLabel')}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={t('adminUsers.emailPlaceholder')}
          required
        />
        <LabeledInput
          label={t('adminUsers.passwordLabel')}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder={t('adminUsers.passwordPlaceholder')}
          required
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-soft">{t('adminUsers.rolLabel')}</span>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as AcademyUserRol)}
            className="h-11 rounded-xl border border-surface-border bg-surface px-3 text-sm text-ink transition-colors focus:border-accent"
          >
            <option value="estudiante">{t('adminUsers.rol.estudiante')}</option>
            <option value="profesor">{t('adminUsers.rol.profesor')}</option>
            <option value="admin">{t('adminUsers.rol.admin')}</option>
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {success && (
        <p className="inline-flex items-center gap-1.5 text-sm text-ok">
          <Icon name="check" size={15} /> {t('adminUsers.createSuccess')}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60 sm:w-auto sm:self-start sm:px-6"
      >
        {submitting ? t('adminUsers.submitting') : t('adminUsers.submit')}
      </button>

      {confirmingAdmin && (
        <ConfirmAdminDialog
          email={email}
          onCancel={() => setConfirmingAdmin(false)}
          onConfirm={() => {
            setConfirmingAdmin(false)
            doCreate()
          }}
        />
      )}
    </form>
  )
}

function ConfirmAdminDialog({
  email,
  onCancel,
  onConfirm,
}: {
  email: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useT()
  return (
    <Dialog onClose={onCancel} labelledBy="confirm-admin-titulo" className="za-card max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <Icon name="shield" size={26} />
        </span>
        <div>
          <h2 id="confirm-admin-titulo" className="text-lg font-bold text-ink">
            {t('adminUsers.confirmAdminTitle')}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{t('adminUsers.confirmAdminBody', { email })}</p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            {t('adminUsers.confirmAdminConfirm')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm text-ink-soft hover:bg-surface-soft"
          >
            {t('adminUsers.confirmAdminCancel')}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={type === 'password' ? 8 : undefined}
        className="h-11 rounded-xl border border-surface-border bg-surface px-3.5 text-sm text-ink transition-colors focus:border-accent"
      />
    </label>
  )
}
