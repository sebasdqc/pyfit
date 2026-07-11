// Login de Zyfit Academy — pantalla a viewport completo.
// Panel izquierdo: branding ANIMADO del tenant activo (aurora + textura de
// puntos + carrusel de features, todo en los colores del tenant vía variables
// CSS — funciona igual para cualquier organización blanco-etiquetada).
// Panel derecho blanco: formulario de acceso, sin cambios de lógica.
// La lógica de autenticación consume /api/academy/auth/login/.

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { useAuth } from '@/auth/useAuth'
import { BrandLockup } from '@/components/Emblem'
import { Icon, type IconName } from '@/components/Icon'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'
import { useTenant } from '@/tenant/TenantContext'

// Mismas 4 features que la landing (certificate/quiz/flame/users) — se
// reutilizan sus claves de traducción para no duplicar copy.
const FEATURES: { icon: IconName; titleKey: string; bodyKey: string }[] = [
  { icon: 'certificate', titleKey: 'landing.feature1Title', bodyKey: 'landing.feature1Body' },
  { icon: 'quiz', titleKey: 'landing.feature2Title', bodyKey: 'landing.feature2Body' },
  { icon: 'flame', titleKey: 'landing.feature3Title', bodyKey: 'landing.feature3Body' },
  { icon: 'users', titleKey: 'landing.feature4Title', bodyKey: 'landing.feature4Body' },
]

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
  const errorId = useId()
  const errorRef = useRef<HTMLParagraphElement>(null)

  // Mueve el foco al error al fallar el login: sin esto, un usuario de teclado
  // que se queda con el foco en el botón "Acceder" puede no notar el mensaje.
  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

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
      {/* Panel de marca (izquierda) — animado, solo en escritorio */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-deep p-10 lg:flex lg:p-12">
        {/* Aurora animada (blobs con blur, colores del tenant) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="za-blob-a absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-accent-light/30 blur-[90px]" />
          <div className="za-blob-b absolute -right-20 bottom-0 h-[380px] w-[380px] rounded-full bg-accent/25 blur-[90px]" />
        </div>
        {/* Textura de puntos, muy tenue */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        {/* Scrim: oscurece el fondo para garantizar contraste AA del texto en
            blanco/opacidad sin importar el color de marca del tenant activo. */}
        <div className="pointer-events-none absolute inset-0 bg-black/20" />

        {/* Header: logo + volver al inicio */}
        <div className="za-fade-up relative z-10 flex items-center justify-between">
          <BrandLockup size={34} tone="dark" />
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white"
          >
            <Icon name="chevronLeft" size={14} />
            {t('login.backToHome')}
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="za-fade-up text-[11px] font-medium uppercase tracking-[0.28em] text-white/80" style={{ animationDelay: '80ms' }}>
            {t('login.brandEyebrow')}
          </p>
          <h2 className="za-fade-up mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white" style={{ animationDelay: '150ms' }}>
            {t('login.brandTitleLine1')}
            <br />
            {t('login.brandTitleLine2')}
          </h2>
          <p className="za-fade-up mt-5 text-[15px] leading-relaxed text-white/85" style={{ animationDelay: '230ms' }}>
            {t('login.brandBody')}
          </p>
          {tenant.tagline && (
            <p className="za-fade-up mt-6 text-xl font-light italic text-white/90" style={{ animationDelay: '300ms' }}>
              "{tenant.tagline}."
            </p>
          )}

          <div className="za-fade-up za-float" style={{ animationDelay: '380ms' }}>
            <FeatureCarousel />
          </div>
        </div>

        <p className="za-fade-up relative z-10 text-xs text-white/75" style={{ animationDelay: '450ms' }}>
          {t('login.copyright', { year: new Date().getFullYear(), platform: tenant.nombre_plataforma })}
        </p>
      </aside>

      {/* Formulario (derecha) */}
      <main className="relative flex w-full flex-1 items-center justify-center overflow-hidden px-6 py-10 sm:px-10">
        {/* Glow ambiental muy sutil detrás de la card (también visible en móvil) */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[110px]" />

        <div className="za-fade-up relative z-10 w-full max-w-[400px]">
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
              autoFocus
              required
              invalid={!!error}
              describedBy={error ? errorId : undefined}
              icon={<Icon name="mail" size={18} />}
            />
            <Field
              id="password"
              label={t('auth.passwordLabel')}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
              invalid={!!error}
              describedBy={error ? errorId : undefined}
            />

            <Link
              to="/recuperar"
              className="-mt-2 self-end text-xs font-medium text-accent hover:text-accent-dark"
            >
              {t('login.forgotPassword')}
            </Link>

            {error && (
              <p id={errorId} ref={errorRef} tabIndex={-1} role="alert" className="break-words text-sm text-danger outline-none">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgb(var(--color-accent)/0.55)] transition-all hover:-translate-y-0.5 hover:bg-accent-dark hover:shadow-[0_12px_24px_-6px_rgb(var(--color-accent)/0.6)] disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
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

// Card de vidrio que rota entre las mismas 4 features de la landing, con
// indicador de progreso tipo carrusel. `key={index}` fuerza el remount para
// que `za-fade-up` se retriggeree en cada cambio (fade sutil, no un salto).
function FeatureCarousel() {
  const t = useT()
  const [index, setIndex] = useState(0)
  // Arranca en pausa si el sistema pide movimiento reducido (WCAG 2.3.3) —
  // además del control manual de abajo (WCAG 2.2.2, ver `playing`).
  const [playing, setPlaying] = useState(
    () => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setIndex((i) => (i + 1) % FEATURES.length), 4200)
    return () => clearInterval(id)
  }, [playing])

  const feature = FEATURES[index]

  return (
    <div className="mt-8">
      <div
        key={index}
        className="za-fade-up flex items-start gap-3 rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-sm"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
          <Icon name={feature.icon} size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{t(feature.titleKey)}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/80">{t(feature.bodyKey)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t('login.pauseFeatures') : t('login.playFeatures')}
          aria-pressed={!playing}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white"
        >
          <Icon name={playing ? 'pause' : 'play'} size={11} />
        </button>
        <div className="flex items-center gap-1.5">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setIndex(i)
                setPlaying(false)
              }}
              aria-label={t('login.goToFeature', { number: i + 1 })}
              aria-current={i === index}
              className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-white/80' : 'w-2.5 bg-white/25'}`}
            />
          ))}
        </div>
      </div>
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
  autoFocus,
  required,
  invalid,
  describedBy,
  icon,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  autoFocus?: boolean
  required?: boolean
  invalid?: boolean
  describedBy?: string
  icon?: ReactNode
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
        autoFocus={autoFocus}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
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
