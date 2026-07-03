// Login de Zyfit Academy — pantalla a viewport completo.
// Panel izquierdo: branding del tenant activo (logo, nombre, tagline, colores CSS).
// Panel derecho blanco: formulario de acceso.
// La lógica de autenticación consume /api/academy/auth/login/.

import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Emblem, BrandLockup } from '@/components/Emblem'
import { Icon } from '@/components/Icon'
import { useTenant } from '@/tenant/TenantContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const tenant = useTenant()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/inicio', { replace: true })
    } catch {
      setError('No se pudo iniciar sesión. Verifica tu correo y contraseña.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full bg-white">
      {/* Panel de marca (izquierda) — solo en escritorio */}
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-deep p-12 lg:flex">
        {/* Ráfaga decorativa de emblemas (muy tenue) */}
        <div className="pointer-events-none absolute -right-16 -top-16 opacity-[0.06]">
          <Emblem size={420} tone="dark" />
        </div>
        <BrandLockup size={34} tone="dark" />

        <div className="relative z-10 max-w-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
            Academia digital
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white">
            Formación de élite,
            <br />
            al alcance de todos.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/65">
            Cursos, evaluaciones y certificaciones para llevar tu conocimiento al
            siguiente nivel.
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
          {/* Marca compacta — visible en móvil/tablet donde se oculta el panel izq. */}
          <div className="mb-10 lg:hidden">
            <BrandLockup size={32} />
          </div>

          <p className="za-eyebrow">Acceso a la academia</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Inicia sesión<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            ¿No tienes cuenta aún?{' '}
            <Link to="/registro" className="font-medium text-accent hover:text-accent-dark">
              Crea una gratis
            </Link>
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            ¿Solo quieres ver de qué se trata?{' '}
            <Link to="/explorar" className="font-medium text-accent hover:text-accent-dark">
              Explora el catálogo sin cuenta
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
              autoComplete="current-password"
              icon={<Icon name="lock" size={18} />}
            />

            <Link
              to="/recuperar"
              className="-mt-2 self-end text-xs font-medium text-accent hover:text-accent-dark"
            >
              ¿Olvidaste tu contraseña?
            </Link>

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
              {submitting ? 'Accediendo…' : 'Acceder'}
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
