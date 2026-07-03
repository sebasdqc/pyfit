// Registro de Zyfit Academy — pantalla a viewport completo. Único punto de
// conversión propio de academy-web (antes solo existía el onboarding móvil).
// Llama al registro PRINCIPAL de pyfit (/api/auth/register/, no /academy/):
// si el visitante navegó como anónimo, su progreso se migra automáticamente
// en el backend (ver academy.migration_service) — aquí solo hay que guardar
// los tokens y limpiar el id de sesión anónima ya consumido.

import { isAxiosError } from 'axios'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import { registerRequest } from '@/api/auth'
import { setTokens } from '@/api/client'
import { clearAnonSession } from '@/lib/anonSession'
import { Emblem, BrandLockup } from '@/components/Emblem'
import { Icon } from '@/components/Icon'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { useTenant } from '@/tenant/TenantContext'

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err) && err.response?.status === 400) {
    const data = err.response.data as Record<string, string[] | string> | undefined
    const mensajes = Object.values(data ?? {}).flatMap((v) => (Array.isArray(v) ? v : [v]))
    if (mensajes.length) return mensajes.join(' ')
  }
  return 'No se pudo crear la cuenta. Verifica los datos e inténtalo de nuevo.'
}

export function RegisterPage() {
  const redirecting = useRedirectIfAuthenticated('/inicio')
  const navigate = useNavigate()
  const tenant = useTenant()
  const { refreshUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (redirecting) return <LoadingScreen />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!acceptedTerms) {
      setError('Debes aceptar los Términos de Servicio y la Política de Privacidad.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const data = await registerRequest(email, password)
      setTokens(data.access, data.refresh)
      clearAnonSession() // ya se migró del lado del backend; no seguir mandándola
      await refreshUser()
      navigate('/inicio', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full bg-white">
      {/* Panel de marca (izquierda) — solo en escritorio */}
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-deep p-12 lg:flex">
        <div className="pointer-events-none absolute -right-16 -top-16 opacity-[0.06]">
          <Emblem size={420} tone="dark" />
        </div>
        <BrandLockup size={34} tone="dark" />

        <div className="relative z-10 max-w-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
            Crea tu cuenta
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white">
            Tu progreso ya
            <br />
            está avanzando.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/65">
            Regístrate gratis para conservarlo y desbloquear racha de estudio, insignias,
            certificados, el tutor IA y la comunidad.
          </p>
          {tenant.tagline && (
            <p className="mt-10 text-2xl font-light italic text-white/80">"{tenant.tagline}."</p>
          )}
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} {tenant.nombre_plataforma}
        </p>
      </aside>

      {/* Formulario (derecha) */}
      <main className="flex w-full flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <BrandLockup size={32} />
          </div>

          <p className="za-eyebrow">Onboarding sin registro</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Crea tu cuenta<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-accent hover:text-accent-dark">
              Inicia sesión
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Field
              id="email"
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="username"
              icon={<Icon name="mail" size={18} />}
            />
            <Field
              id="password"
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              icon={<Icon name="lock" size={18} />}
            />

            <label className="flex items-start gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked)
                  setError(null)
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-surface-border text-accent focus:ring-accent"
              />
              <span>
                Acepto los{' '}
                <Link to="/terminos" target="_blank" rel="noreferrer" className="font-medium text-accent hover:text-accent-dark">
                  Términos de Servicio
                </Link>{' '}
                y la{' '}
                <Link to="/privacidad" target="_blank" rel="noreferrer" className="font-medium text-accent hover:text-accent-dark">
                  Política de Privacidad
                </Link>
                .
              </span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !acceptedTerms}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
            >
              {submitting ? 'Creando cuenta…' : 'Crear cuenta gratis'}
              {!submitting && <Icon name="arrowRight" size={17} />}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-ink-muted">
            © {new Date().getFullYear()} {tenant.nombre_plataforma}
          </p>
        </div>
      </main>
    </div>
  )
}

// Campo con etiqueta flotante — mismo patrón que LoginPage.tsx.
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
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted transition-colors hover:text-accent"
        >
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      ) : (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint">{icon}</span>
      )}
    </div>
  )
}
