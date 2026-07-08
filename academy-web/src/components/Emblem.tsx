// Emblema PLACEHOLDER de Zyfit Academy.
//
// Inspirado en el lenguaje del manual de marca CONMEBOL (escudo + ráfaga de
// segmentos tipo balón, bicolor azul) pero SIN reproducir el logo oficial
// (protegido). Se muestra cuando el tenant no tiene `logo_url` configurado.
//
// `tone="light"` → emblema en azules de marca (para fondos claros).
// `tone="dark"`  → emblema en blanco/azul claro (para fondos navy / hero).

import { useTenant } from '@/tenant/TenantContext'

export function Emblem({ size = 40, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const navy = tone === 'dark' ? '#ffffff' : '#1a3e72'
  const blue = tone === 'dark' ? '#7ab6ff' : '#0066b3'
  const cap = '#ffffff'

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180
        const x = 32 + Math.cos(a) * 29
        const y = 32 + Math.sin(a) * 29
        return (
          <rect
            key={i}
            x={x - 2.1}
            y={y - 2.1}
            width={4.2}
            height={4.2}
            rx={1}
            fill={blue}
            opacity={0.85}
            transform={`rotate(${i * 30} ${x} ${y})`}
          />
        )
      })}
      <path d="M32 8 L52 15 V32 C52 44 43 51 32 55 C21 51 12 44 12 32 V15 Z" fill={navy} />
      <path d="M20 27 L32 22 L44 27 L32 32 Z" fill={cap} />
      <path d="M24 30 V37 C24 39 40 39 40 37 V30" stroke={cap} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M44 27 V35" stroke={cap} strokeWidth={2} strokeLinecap="round" />
      <circle cx="44" cy="36.5" r="1.8" fill={cap} />
    </svg>
  )
}

// Wordmark tipográfico puro (sin ícono) — para contextos donde el emblema
// placeholder no encaja visualmente, p.ej. la landing pública, que quiere una
// identidad más tipográfica y menos "escudo institucional".
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
  const main = tone === 'dark' ? 'text-white' : 'text-brand'
  const sub  = tone === 'dark' ? 'text-white/60' : 'text-accent'
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

  // Sin logo: emblema placeholder + nombre de la plataforma.
  return (
    <div className="flex items-center gap-2.5">
      <Emblem size={size} tone={tone} />
      <div className="leading-none">
        <span className={`block text-[15px] font-bold tracking-tight ${main}`}>
          {tenant.nombre_plataforma}
        </span>
        {showTagline && tagline && (
          <span className={`mt-0.5 block text-[9px] font-medium uppercase tracking-[0.24em] ${sub}`}>
            {tagline}
          </span>
        )}
      </div>
    </div>
  )
}
