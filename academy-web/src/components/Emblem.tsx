// Identidad de marca de Zyfit Academy.
//
// El emblema tipo escudo (inspirado en el lenguaje del manual CONMEBOL) que
// existió acá se retiró por completo del producto: la única marca vigente es
// el `Wordmark` tipográfico de la landing pública, usado ahora en TODOS los
// contextos (Sidebar, Login, Register, certificados, reproductor de
// lecciones, etc.) vía `BrandLockup`.

import { useTenant } from '@/tenant/TenantContext'

// Wordmark tipográfico puro (sin ícono) — identidad única del producto.
export function Wordmark({ size = 19, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const tenant = useTenant()
  const strong = tone === 'dark' ? 'text-white' : 'text-ink'
  const soft = tone === 'dark' ? 'text-white/50' : 'text-ink-muted'
  const [first, ...rest] = tenant.nombre_plataforma.split(' ')

  return (
    <span className="flex items-center gap-2 select-none">
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <span style={{ fontSize: size }} className={`font-bold leading-none tracking-tight ${strong}`}>
        {first}
        {rest.length > 0 && <span className={`ml-1 font-medium ${soft}`}>{rest.join(' ')}</span>}
      </span>
    </span>
  )
}

// Lockup: logo del tenant (si existe) o emblema SVG + nombre de la plataforma.
// Siempre lee el tenant activo; no necesita props de branding.
export function BrandLockup({
  size = 30,
  tone = 'light',
  showTagline = false,
}: {
  size?: number
  tone?: 'light' | 'dark'
  showTagline?: boolean
}) {
  const tenant = useTenant()
  const sub = tone === 'dark' ? 'text-white/60' : 'text-accent'
  const tagline = tenant.tagline || 'Cree en grande'

  if (tenant.logo_url) {
    // El tenant tiene logo propio: mostrar imagen (ya incluye el wordmark).
    return (
      <div className="flex flex-col items-start gap-1">
        <img
          src={tenant.logo_url}
          alt={tenant.nombre_plataforma}
          style={{ height: size, width: 'auto', maxWidth: 180 }}
          className="object-contain"
        />
        {showTagline && tagline && (
          <span className={`text-[9px] font-medium uppercase tracking-[0.24em] ${sub}`}>
            {tagline}
          </span>
        )}
      </div>
    )
  }

  // Sin logo propio: wordmark tipográfico (mismo de la landing pública).
  return (
    <div className="flex flex-col items-start gap-1">
      <Wordmark size={size * 0.5} tone={tone} />
      {showTagline && tagline && (
        <span className={`text-[9px] font-medium uppercase tracking-[0.24em] ${sub}`}>
          {tagline}
        </span>
      )}
    </div>
  )
}
