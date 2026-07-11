// Perfil del usuario. Datos reales de /api/academy/me/. Permite editar el nombre
// visible y los datos personales (PATCH /me/); el correo es de solo lectura.
// Muestra rol y métricas. Integración inicial simple — el onboarding propio de
// la academia (más guiado) queda para una iteración futura.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBadges } from '@/api/academy'
import { updateMe } from '@/api/auth'
import { useAuth } from '@/auth/useAuth'
import { useTheme } from '@/theme/useTheme'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/Icon'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { TagInput } from '@/components/ui/TagInput'
import { BadgeGallery } from '@/components/badges/BadgeGallery'
import { RedesSocialesFields } from '@/components/profile/RedesSocialesFields'
import { COUNTRIES } from '@/lib/countries'
import { useT } from '@/locale/useT'
import type { AcademyBadgeCatalog } from '@/types'

const HOY = new Date().toISOString().slice(0, 10)

export function ProfilePage() {
  const t = useT()
  const { user, refreshUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [nombre, setNombre] = useState(user?.nombre ?? '')
  const [pais, setPais] = useState(user?.pais ?? '')
  const [ciudad, setCiudad] = useState(user?.ciudad ?? '')
  const [profesion, setProfesion] = useState(user?.profesion ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(user?.fecha_nacimiento ?? '')
  const [intereses, setIntereses] = useState<string[]>(user?.intereses ?? [])
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
        <p className="za-eyebrow">{t('profile.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{t('profile.title')}</h1>
      </header>

      {/* Cabecera de identidad */}
      <section className="za-card flex items-center gap-4 p-6">
        <Avatar name={user.nombre} size={64} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">{user.nombre}</p>
          <p className="truncate text-sm text-ink-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.is_admin && <Badge tone="brand">{t('profile.roleAdmin')}</Badge>}
            {user.is_instructor && <Badge tone="accent">{t('profile.roleInstructor')}</Badge>}
            {!user.is_admin && !user.is_instructor && <Badge tone="neutral">{t('profile.roleStudent')}</Badge>}
            <Badge tone={user.nivel_academia === 'pro' ? 'ok' : 'neutral'}>
              {user.nivel_academia === 'pro' ? t('profile.tierPro') : t('profile.tierStarter')}
            </Badge>
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat icon="learning" value={user.total_inscripciones} label={t('profile.statEnrollments')} />
        <Stat icon="instructor" value={user.total_cursos_creados} label={t('profile.statCoursesCreated')} />
      </section>

      {/* Preferencias */}
      <section className="za-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{t('profile.preferencesTitle')}</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">{t('profile.themeLabel')}</p>
              <p className="text-xs text-ink-muted">
                {theme === 'dark' ? t('topbar.darkMode') : t('topbar.lightMode')}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('topbar.toLightMode') : t('topbar.toDarkMode')}
              className="flex h-10 items-center gap-2 rounded-lg border border-surface-border bg-surface px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
              {theme === 'dark' ? t('topbar.lightMode') : t('topbar.darkMode')}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink">{t('profile.languageLabel')}</p>
            <LocaleToggle />
          </div>
        </div>
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
          <p className="text-sm font-semibold text-ink">{t('profile.subscriptionTitle')}</p>
          <p className="text-xs text-ink-muted">
            {user.nivel_academia === 'pro' ? t('profile.subscriptionActiveBody') : t('profile.subscriptionInactiveBody')}
          </p>
        </div>
        <Icon name="chevronRight" size={18} className="shrink-0 text-ink-muted" />
      </Link>

      {/* Insignias de identidad */}
      {badges && <BadgeGallery identidad={badges} />}

      {/* Datos editables */}
      <section className="za-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{t('profile.personalDataTitle')}</h2>
        <div className="mt-4 flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t('profile.nameLabel')}
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
            {!nombreValido && (
              <p className="mt-1.5 text-xs text-danger">{t('onboarding.nameRequiredError')}</p>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t('profile.emailLabel')}
            </span>
            <input value={user.email} readOnly className="input cursor-not-allowed bg-surface-soft text-ink-muted" />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                {t('profile.birthDateLabel')}
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
                {t('profile.professionLabel')}
              </span>
              <input
                value={profesion}
                placeholder={t('profile.professionPlaceholder')}
                onChange={(e) => {
                  setProfesion(e.target.value)
                  clearStatus()
                }}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">{t('profile.countryLabel')}</span>
              <select
                value={pais}
                onChange={(e) => {
                  setPais(e.target.value)
                  clearStatus()
                }}
                className="input"
              >
                <option value="">{t('profile.countryPlaceholder')}</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">{t('profile.cityLabel')}</span>
              <input
                value={ciudad}
                placeholder={t('profile.cityPlaceholder')}
                onChange={(e) => {
                  setCiudad(e.target.value)
                  clearStatus()
                }}
                className="input"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">{t('profile.interestsLabel')}</span>
            <TagInput
              value={intereses}
              onChange={(tags) => {
                setIntereses(tags)
                clearStatus()
              }}
              placeholder={t('profile.interestsPlaceholder')}
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t('profile.socialLabel')}
            </span>
            <RedesSocialesFields
              value={redes}
              onChange={(r) => {
                setRedes(r)
                clearStatus()
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? t('profile.saving') : t('profile.saveChanges')}
            </button>
            {saved && !dirty && (
              <span role="status" className="inline-flex items-center gap-1.5 text-sm text-ok">
                <Icon name="check" size={16} /> {t('profile.saved')}
              </span>
            )}
            {saveError && (
              <span role="alert" className="inline-flex items-center gap-1.5 text-sm text-danger">
                <Icon name="close" size={16} /> {t('profile.saveError')}
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
