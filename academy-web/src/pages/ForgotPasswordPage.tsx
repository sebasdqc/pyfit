// Recuperación de contraseña — mismo shell visual que LoginPage/RegisterPage.
// Flujo en 2 pasos contra los endpoints ya existentes del registro principal
// de pyfit (/api/auth/reset-password/ + /confirm-reset/, no son de /academy/):
// 1) pide el email y solicita el código (el backend nunca revela si existe),
// 2) el alumno ingresa el código recibido + su nueva contraseña.

import { isAxiosError } from 'axios'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import { confirmPasswordReset, requestPasswordReset } from '@/api/auth'
import { BrandLockup } from '@/components/Emblem'
import { Icon } from '@/components/Icon'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'
import { useTenant } from '@/tenant/TenantContext'

function extractErrorMessage(err: unknown, t: ReturnType<typeof useT>): string {
  if (isAxiosError(err) && err.response?.status === 400) {
    const data = err.response.data as { error?: string } | undefined
    if (data?.error) return data.error
  }
  return t('forgotPassword.errorGeneric')
}

export function ForgotPasswordPage() {
  const redirecting = useRedirectIfAuthenticated('/inicio')
  const navigate = useNavigate()
  const tenant = useTenant()
  const t = useT()

  const [step, setStep] = useState<'email' | 'verify' | 'listo'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (redirecting) return <LoadingScreen />

  async function handleSendCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await requestPasswordReset(email.trim().toLowerCase())
    } catch {
      // No cambia el flujo: nunca se revela si el email existe.
    } finally {
      setSubmitting(false)
      setStep('verify')
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError(t('forgotPassword.errorPasswordLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('forgotPassword.errorPasswordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      await confirmPasswordReset(email.trim().toLowerCase(), code.trim(), newPassword)
      setStep('listo')
    } catch (err) {
      setError(extractErrorMessage(err, t))
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
        <BrandLockup size={34} tone="dark" />

        <div className="relative z-10 max-w-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
            {t('forgotPassword.brandEyebrow')}
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white">
            {t('forgotPassword.brandTitleLine1')}
            <br />
            {t('forgotPassword.brandTitleLine2')}
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/65">
            {t('forgotPassword.brandBody')}
          </p>
          {tenant.tagline && (
            <p className="mt-10 text-2xl font-light italic text-white/80">"{tenant.tagline}."</p>
          )}
        </div>

        <p className="relative z-10 text-xs text-white/40">
          {t('forgotPassword.copyright', { year: new Date().getFullYear(), platform: tenant.nombre_plataforma })}
        </p>
      </aside>

      {/* Formulario (derecha) */}
      <main className="flex w-full flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <BrandLockup size={32} />
          </div>

          {step === 'listo' ? (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ok/10 text-ok">
                <Icon name="check" size={26} />
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                {t('forgotPassword.doneTitle')}<span className="text-accent">.</span>
              </h1>
              <p className="mt-3 text-sm text-ink-soft">
                {t('forgotPassword.doneBody')}
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                {t('forgotPassword.goToLogin')}
                <Icon name="arrowRight" size={17} />
              </button>
            </>
          ) : (
            <>
              <p className="za-eyebrow">{t('forgotPassword.eyebrow')}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                {step === 'email' ? t('forgotPassword.stepEmailTitle') : t('forgotPassword.stepVerifyTitle')}
              </h1>
              <p className="mt-3 text-sm text-ink-soft">
                {step === 'email' ? (
                  <>
                    {t('forgotPassword.stepEmailBody')}{' '}
                    <Link to="/login" className="font-medium text-accent hover:text-accent-dark">
                      {t('forgotPassword.backToLogin')}
                    </Link>
                  </>
                ) : (
                  <>
                    {t('forgotPassword.stepVerifyBodyPrefix')} <strong className="break-words text-ink">{email}</strong>{' '}
                    {t('forgotPassword.stepVerifyBodySuffix')}
                  </>
                )}
              </p>

              {step === 'email' ? (
                <form onSubmit={handleSendCode} className="mt-8 flex flex-col gap-4">
                  <Field
                    id="email"
                    label={t('auth.emailLabel')}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    autoComplete="username"
                    icon={<Icon name="mail" size={18} />}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !email.trim()}
                    className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
                  >
                    {submitting ? t('forgotPassword.sending') : t('forgotPassword.sendCode')}
                    {!submitting && <Icon name="arrowRight" size={17} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirm} className="mt-8 flex flex-col gap-4">
                  <Field
                    id="code"
                    label={t('forgotPassword.codeLabel')}
                    type="text"
                    value={code}
                    onChange={setCode}
                    autoComplete="one-time-code"
                    icon={<Icon name="lock" size={18} />}
                  />
                  <Field
                    id="new-password"
                    label={t('forgotPassword.newPasswordLabel')}
                    type="password"
                    value={newPassword}
                    onChange={setNewPassword}
                    autoComplete="new-password"
                    icon={<Icon name="lock" size={18} />}
                  />
                  <Field
                    id="confirm-password"
                    label={t('forgotPassword.confirmPasswordLabel')}
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    icon={<Icon name="lock" size={18} />}
                  />

                  {error && (
                    <p role="alert" className="text-sm text-danger">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
                  >
                    {submitting ? t('forgotPassword.updating') : t('forgotPassword.changePassword')}
                    {!submitting && <Icon name="arrowRight" size={17} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email')
                      setCode('')
                      setError(null)
                    }}
                    className="text-center text-sm font-medium text-accent hover:text-accent-dark"
                  >
                    {t('forgotPassword.resendPrompt')}
                  </button>
                </form>
              )}
            </>
          )}

          <p className="mt-8 text-center text-xs text-ink-muted">
            {t('forgotPassword.copyright', { year: new Date().getFullYear(), platform: tenant.nombre_plataforma })}
          </p>
        </div>
      </main>
    </div>
  )
}

// Campo con etiqueta flotante — mismo patrón que LoginPage.tsx/RegisterPage.tsx.
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
