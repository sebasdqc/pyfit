// Login de Zyfit Performance — panel web para centros deportivos de alto
// rendimiento. Pantalla a viewport completo: fotografía de fondo (servida desde
// la raíz pública del proyecto) con una capa de oscurecimiento densa que la
// mantiene legible, y un recuadro (card) que agrupa todos los elementos del
// login —logo, título y formulario— flotando en la banda izquierda.
// Identidad: púrpura de acción sobre fondos azul-morado profundo, sin gradientes.
// La lógica de autenticación se conserva intacta.

import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

// Assets servidos desde performance-web/public/ (raíz «/»): no son URLs externas
// ni van embebidos en el código. Si el fondo no carga, cae a bg-perf-ink.
const BG_IMAGE = '/high-angle-man-tying-shoelaces.jpg'
const LOGO_IMAGE = '/Logo-Zyfit-Blanco.png'

// Enlaces externos del equipo Zyfit. La única propiedad web pública verificada
// es la landing pyfit.app (no hay aún canal de contacto ni login web de coach
// dedicados); centralizados aquí para repuntarlos cuando existan.
const HOME_HREF = 'https://pyfit.app'
const CONTACT_HREF = 'https://pyfit.app'
const COACH_LOGIN_HREF = 'https://pyfit.app' // Portal Entrenador → login de Zyfit Coach

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
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
      navigate('/dashboard', { replace: true })
    } catch {
      setError('No se pudo iniciar sesión. Verifica tus credenciales y tu acceso al panel.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-perf-ink">
      {/* Fondo fotográfico + color de respaldo (se ve si la imagen no carga). */}
      <div
        className="absolute inset-0 bg-perf-ink bg-cover bg-center"
        style={{ backgroundImage: `url('${BG_IMAGE}')` }}
        aria-hidden
      />
      {/* Capa de oscurecimiento plana, densa (sin gradiente) para legibilidad. */}
      <div className="absolute inset-0 bg-[rgba(7,5,18,0.86)]" aria-hidden />

      {/* Barra superior: navegación discreta a la derecha. El logo vive en el card. */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-end px-6 py-6 sm:px-10 md:px-12 md:py-8">
        <nav className="flex items-center gap-6 text-sm text-white/60">
          <a href={HOME_HREF} className="transition-colors hover:text-white">
            Inicio
          </a>
          <a href={CONTACT_HREF} className="transition-colors hover:text-white">
            Contacto
          </a>
        </nav>
      </header>

      {/* Contenido principal: recuadro en la banda izquierda, centrado vertical. */}
      <main className="relative z-10 flex h-full items-center">
        <div className="w-full px-6 sm:px-10 md:px-12 lg:px-20">
          {/* Recuadro que recubre todos los elementos del login. */}
          <div className="w-full max-w-[460px] rounded-2xl border border-white/[0.14] bg-white/[0.05] p-7 backdrop-blur-md sm:p-9">
            {/* Logo Zyfit (blanco) + tag de la vertical. */}
            <div className="mb-8 flex items-end gap-3">
              <img src={LOGO_IMAGE} alt="Zyfit" className="h-6 w-auto sm:h-7" />
              <span className="pb-1 text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
                Performance
              </span>
            </div>

            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-perf-purpleMuted/80">
              Acceso profesional
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Accede a tu portal<span className="text-perf-purple">.</span>
            </h1>

            <p className="mt-4 text-sm text-white/50">
              ¿No tienes acceso aún?{' '}
              <a
                href={CONTACT_HREF}
                className="font-medium text-perf-purpleMuted transition-colors hover:text-perf-purple"
              >
                Contáctanos
              </a>
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <Field
                id="email"
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="username"
                icon={<MailIcon />}
              />
              <Field
                id="password"
                label="Contraseña"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                icon={<LockIcon />}
              />

              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}

              {/* Botones: en escritorio van en fila (secundario izq · primario der);
                  en móvil se apilan con el primario arriba (flex-col-reverse). */}
              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
                <a
                  href={COACH_LOGIN_HREF}
                  className="flex h-12 flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  Portal Entrenador
                </a>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 flex-1 rounded-lg bg-perf-purple text-sm font-semibold text-white transition-colors hover:bg-perf-purpleDark disabled:opacity-60"
                >
                  {submitting ? 'Accediendo…' : 'Acceder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

// Campo con etiqueta flotante: la etiqueta actúa como placeholder centrado
// cuando está vacío y sube a la esquina superior izquierda (pequeña, púrpura
// apagado) al enfocar o al escribir contenido. El foco pinta el borde púrpura.
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
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder=" "
        className="peer h-14 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 pt-2 text-[15px] text-white outline-none transition-colors placeholder:text-transparent focus:border-perf-purple"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40 transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-perf-purpleMuted peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:text-perf-purpleMuted"
      >
        {label}
      </label>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
        {icon}
      </span>
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
