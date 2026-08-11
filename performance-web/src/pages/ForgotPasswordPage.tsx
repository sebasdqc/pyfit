// Recuperación de contraseña de Zyfit Performance — mismo shell visual que
// LoginPage.tsx (foto de fondo + oscurecimiento + card flotante en la banda
// izquierda). Flujo en 2 pasos contra los endpoints ya existentes de pyfit
// (/api/auth/reset-password/ + /confirm-reset/, no son de /performance/ —
// los mismos que ya usa el login de Zyfit Academy):
// 1) pide el email y solicita el código (el backend nunca revela si existe),
// 2) el usuario ingresa el código recibido + su nueva contraseña.

import { isAxiosError } from 'axios'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { confirmPasswordReset, requestPasswordReset } from '@/api/auth'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'

const BG_IMAGE = '/FVF.jpg'
const LOGO_IMAGE = '/Logo-Zyfit-Blanco.png'

function extractErrorMessage(err: unknown, t: (path: string) => string): string {
  if (isAxiosError(err) && err.response?.status === 400) {
    const data = err.response.data as { error?: string } | undefined
    if (data?.error) return data.error
  }
  return t('forgotPassword.errorCodigoInvalido')
}

export function ForgotPasswordPage() {
  const t = useT()
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'verify' | 'listo'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      setError(t('forgotPassword.errorContrasenaCorta'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('forgotPassword.errorNoCoinciden'))
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
    <div className="relative h-screen w-screen overflow-hidden bg-perf-bg">
      <div
        className="absolute inset-0 bg-perf-bg bg-cover bg-center"
        style={{ backgroundImage: `url('${BG_IMAGE}')` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[rgba(6,9,18,0.86)]" aria-hidden />
      <div className="absolute right-4 top-4 z-20">
        <LocaleToggle />
      </div>

      <main className="relative z-10 flex h-full items-center">
        <div className="w-full px-6 sm:px-10 md:px-12 lg:px-20">
          <div className="w-full max-w-[460px] rounded-2xl border border-white/[0.14] bg-white/[0.05] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-9">
            <div className="mb-8 flex items-end gap-3">
              <img src={LOGO_IMAGE} alt="Zyfit" className="h-6 w-auto sm:h-7" />
              <span className="pb-1 text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
                Performance
              </span>
            </div>

            {step === 'listo' ? (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-perf-ok/10 text-perf-ok">
                  <CheckIcon />
                </span>
                <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl">
                  {t('forgotPassword.listoTitle')}
                  <span className="text-accent">.</span>
                </h1>
                <p className="mt-4 text-sm text-white/50">{t('forgotPassword.listoBody')}</p>
                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="mt-8 h-12 w-full rounded-lg bg-accent text-sm font-semibold text-white transition-colors hover:bg-accentDark"
                >
                  {t('forgotPassword.irAIniciarSesion')}
                </button>
              </>
            ) : (
              <>
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accentLight/80">
                  {t('forgotPassword.recuperarAcceso')}
                </p>
                <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
                  {step === 'email' ? (
                    <>
                      {t('forgotPassword.titleEmail')}
                      <span className="text-accent">?</span>
                    </>
                  ) : (
                    <>
                      {t('forgotPassword.titleVerify')}
                      <span className="text-accent">.</span>
                    </>
                  )}
                </h1>

                {step === 'email' ? (
                  <>
                    <p className="mt-4 text-sm text-white/50">
                      {t('forgotPassword.step1Body')}{' '}
                      <Link to="/login" className="font-medium text-accentLight transition-colors hover:text-accent">
                        {t('forgotPassword.volver')}
                      </Link>
                    </p>
                    <form onSubmit={handleSendCode} className="mt-8 flex flex-col gap-4">
                      <Field
                        id="email"
                        label={t('forgotPassword.correo')}
                        type="email"
                        value={email}
                        onChange={setEmail}
                        autoComplete="username"
                        icon={<MailIcon />}
                      />
                      <button
                        type="submit"
                        disabled={submitting || !email.trim()}
                        className="mt-2 h-12 rounded-lg bg-accent text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-60"
                      >
                        {submitting ? t('forgotPassword.enviando') : t('forgotPassword.enviarCodigo')}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-sm text-white/50">{t('forgotPassword.step2Body', { email })}</p>
                    <form onSubmit={handleConfirm} className="mt-8 flex flex-col gap-4">
                      <Field
                        id="code"
                        label={t('forgotPassword.codigo')}
                        type="text"
                        value={code}
                        onChange={setCode}
                        autoComplete="one-time-code"
                        icon={<LockIcon />}
                      />
                      <Field
                        id="new-password"
                        label={t('forgotPassword.nuevaContrasena')}
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                        autoComplete="new-password"
                        icon={<LockIcon />}
                      />
                      <Field
                        id="confirm-password"
                        label={t('forgotPassword.confirmarContrasena')}
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        autoComplete="new-password"
                        icon={<LockIcon />}
                      />

                      {error && (
                        <p role="alert" className="text-sm text-red-400">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="mt-2 h-12 rounded-lg bg-accent text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-60"
                      >
                        {submitting ? t('forgotPassword.actualizando') : t('forgotPassword.cambiarContrasena')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('email')
                          setCode('')
                          setError(null)
                        }}
                        className="h-11 text-center text-sm font-medium text-accentLight transition-colors hover:text-accent"
                      >
                        {t('forgotPassword.noRecibisteCodigo')}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// Campo con etiqueta flotante — mismo patrón que LoginPage.tsx, con toggle
// de mostrar/ocultar para los campos de contraseña.
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
  const t = useT()
  const [show, setShow] = useState(false)
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
        className={`peer h-14 w-full rounded-xl border border-white/10 bg-white/5 px-4 pt-2 text-[15px] text-white outline-none transition-colors placeholder:text-transparent focus:border-accent ${
          isPassword ? 'pr-20' : 'pr-12'
        }`}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40 transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-accentLight peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:text-accentLight"
      >
        {label}
      </label>
      {isPassword ? (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? t('forgotPassword.ocultarContrasena') : t('forgotPassword.mostrarContrasena')}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-3 text-[11px] font-semibold uppercase tracking-wide text-white/50 transition-colors hover:text-accentLight"
        >
          {show ? t('forgotPassword.ocultar') : t('forgotPassword.mostrar')}
        </button>
      ) : (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
          {icon}
        </span>
      )}
    </div>
  )
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
