// Identidad de marca de Zyfit Academy.
//
// El emblema tipo escudo (inspirado en el lenguaje del manual CONMEBOL) se
// retiró por completo del producto. Hoy la marca se resuelve así:
//
//   tone="dark"  (fondo oscuro) → LOGO REAL, `public/logo-zyfit.png`
//   tone="light" (fondo claro)  → wordmark tipográfico de respaldo
//
// ⚠️ El archivo de logo es BLANCO con sombra sobre transparencia: se vuelve
// invisible sobre fondos claros. Por eso el logo NO se aplica cuando
// `tone="light"` — no es un olvido. Cuando exista una versión en tinta oscura
// del logo, agregarla acá como `LOGO_LIGHT` y usarla en esa rama; ahí sí queda
// la marca real en el 100% del producto.

import { useTenant } from '@/tenant/TenantContext'

// Logo oficial de Zyfit (blanco). Vive en `public/`, así que Vite lo copia tal
// cual a `dist/` y se referencia por ruta absoluta.
const LOGO_DARK_BG = '/logo-zyfit.png'

// Marca en línea. Sobre fondo oscuro es el logo real; sobre fondo claro cae al
// wordmark tipográfico (ver nota de arriba).
export function Wordmark({ size = 19, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const tenant = useTenant()

  const [first, ...rest] = tenant.nombre_plataforma.split(' ')

  if (tone === 'dark') {
    // El archivo de logo dice solo "ZYFIT". El resto del nombre de la
    // plataforma ("Academy") se compone al lado para no perder de qué producto
    // es esta pantalla; el conjunto se lee como un lockup, no como dos marcas.
    return (
      <span className="flex items-baseline gap-2 select-none">
        <img
          src={LOGO_DARK_BG}
          alt={first}
          // El alto manda; el ancho sale de la proporción del archivo.
          style={{ height: Math.round(size * 0.92), width: 'auto' }}
          className="block object-contain"
        />
        {rest.length > 0 && (
          <span
            style={{ fontSize: size }}
            className="font-medium leading-none tracking-tight text-white/60"
          >
            {rest.join(' ')}
          </span>
        )}
      </span>
    )
  }

  return (
    <span className="flex items-center gap-2 select-none">
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <span style={{ fontSize: size }} className="font-bold leading-none tracking-tight text-ink">
        {first}
        {rest.length > 0 && <span className="ml-1 font-medium text-ink-muted">{rest.join(' ')}</span>}
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

  // Sin logo propio del tenant: sobre fondo oscuro va el logo de Zyfit a la
  // altura pedida (`size` es la altura del lockup, no un tamaño tipográfico);
  // sobre fondo claro cae al wordmark, que sí se mide en puntos de texto.
  return (
    <div className="flex flex-col items-start gap-1">
      <Wordmark size={tone === 'dark' ? size * 0.78 : size * 0.5} tone={tone} />
      {showTagline && tagline && (
        <span className={`text-[9px] font-medium uppercase tracking-[0.24em] ${sub}`}>
          {tagline}
        </span>
      )}
    </div>
  )
}
