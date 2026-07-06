// Login de Zyfit Academy — pantalla a viewport completo.
// Panel izquierdo: branding del tenant activo (logo, nombre, tagline, colores CSS).
// Panel derecho blanco: formulario de acceso.
// La lógica de autenticación consume /api/academy/auth/login/.

import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { useAuth } from '@/auth/useAuth'
import { Emblem, BrandLockup } from '@/components/Emblem'
import { Icon } from '@/components/Icon'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'
import { useTenant } from '@/tenant/TenantContext'

// El backend distingue tres motivos de rechazo (401 credenciales, 403 sin
// acceso/tenant equivocado) con formas de payload distintas (`error` vs
// `detail` — ver academy_login en backend/academy/views.py). Sin esto, un
// catch genérico mostraba el mismo mensaje para los tres casos y hacía
// imposible saber, por ejemplo, si una cuenta simplemente no existe en
// producción o si existe pero pertenece a otra organización.
function describeLoginError(err: unknown, t: ReturnType<typeof useT>): string {
  const ax = err as AxiosError<{ error?: string; detail?: string }>
  if (!ax?.response) {
    return t('login.errorNoConnection')
  }
  const { status, data } = ax.response
  if (status === 401) {
    return data?.error || t('login.errorBadCredentials')
  }
  if (status === 403) {
    return data?.detail || t('login.errorNoAccess')
  }
  if (status === 429) {
    return t('login.errorTooManyAttempts')
  }
  return t('login.errorGeneric')
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const tenant = useTenant()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const loggedInUser = await login(email, password)
      navigate(loggedInUser.onboarding_academia_completo ? '/inicio' : '/bienvenida', { replace: true })
    } catch (err) {
      setError(describeLoginError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full bg-white">
      <div className="fixed right-4 top-4 z-30">
        <LocaleToggle />
      </div>
      {/* Panel de marca (izquierda) — solo en escritorio */}
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-deep p-12 lg:flex">
        {/* Ráfaga decorativa de emblemas (muy tenue) */}
        <div className="pointer-events-none absolute -right-16 -top-16 opacity-[0.06]">
          <Emblem size={420} tone="dark" />
        </div>
        <BrandLockup size={34} tone="dark" />

        <div className="relative z-10 max-w-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
            {t('login.brandEyebrow')}
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white">
            {t('login.brandTitleLine1')}
            <br />
            {t('login.brandTitleLine2')}
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/65">
            {t('login.brandBody')}
          </p>
          {tenant.tagline && (
            <p className="mt-10 text-2xl font-light italic text-white/80">"{tenant.tagline}."</p>
          )}
        </div>

        <p className="relative z-10 text-xs text-white/40">
          {t('login.copyright', { year: new Date().getFullYear(), platform: tenant.nombre_plataforma })}
        </p>
      </aside>

      {/* Formulario (derecha) */}
      <main className="flex w-full flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          {/* Marca compacta — visible en móvil/tablet donde se oculta el panel izq. */}
          <div className="mb-10 lg:hidden">
            <BrandLockup size={32} />
          </div>

          <p className="za-eyebrow">{t('login.eyebrow')}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t('login.title')}<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            {t('login.noAccountYet')}{' '}
            <Link to="/registro" className="font-medium text-accent hover:text-accent-dark">
              {t('login.createFree')}
            </Link>
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            {t('login.justLooking')}{' '}
            <Link to="/explorar" className="font-medium text-accent hover:text-accent-dark">
              {t('login.exploreNoAccount')}
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Field
              id="email"
              label={t('auth.emailLabel')}
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="username"
              icon={<Icon name="mail" size={18} />}
            />
            <Field
              id="password"
              label={t('auth.passwordLabel')}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              icon={<Icon name="lock" size={18} />}
            />

            <Link
              to="/recuperar"
              className="-mt-2 self-end text-xs font-medium text-accent hover:text-accent-dark"
            >
              {t('login.forgotPassword')}
            </Link>

            {error && (
              <p role="alert" className="break-words text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
            >
              {submitting ? t('login.submitting') : t('login.submit')}
              {!submitting && <Icon name="arrowRight" size={17} />}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-ink-muted">
            {t('login.copyright', { year: new Date().getFullYear(), platform: tenant.nombre_plataforma })}
          </p>
        </div>
      </main>
    </div>
  )
}

// Campo con etiqueta flotante (sube al enfocar / al escribir). Foco → borde azul.
function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  icon,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  icon: ReactNode
}) {
  const [show, setShow] = useState(false)
  const t = useT()
  const isPassword = type === 'password'
  const inputType = isPassword && show ? 'text' : type
  return (
    <div className="relative">
      <input
        id={id}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder=" "
        className={`peer h-14 w-full rounded-xl border border-surface-border bg-surface-soft px-4 pt-2 text-[15px] text-ink transition-colors placeholder:text-transparent focus:border-accent focus:bg-white ${
          isPassword ? 'pr-20' : 'pr-12'
        }`}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-muted transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-accent peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:text-accent"
      >
        {label}
      </label>
      {isPassword ? (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted transition-colors hover:text-accent"
        >
          {show ? t('auth.hidePassword') : t('auth.showPassword')}
        </button>
      ) : (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint">{icon}</span>
      )}
    </div>
  )
}
