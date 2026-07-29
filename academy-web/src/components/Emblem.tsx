// Identidad de marca de Zyfit Academy.
//
// El emblema tipo escudo (inspirado en el lenguaje del manual CONMEBOL) se
// retiró por completo del producto. Hoy la marca es SIEMPRE el logo real, en
// una de sus dos versiones según el fondo sobre el que se apoya:
//
//   tone="dark"  (fondo oscuro) → `public/logo-zyfit.png`         (blanco)
//   tone="light" (fondo claro)  → `public/logo-zyfit-oscuro.png`  (tinta)
//
// El archivo original que entregó el usuario es el BLANCO (`Logo-Zyfit.png` en
// la raíz del repo): letras blancas con sombra sobre transparencia, invisible
// sobre fondo claro. La versión en tinta se DERIVÓ de ese mismo archivo — mismos
// trazos y mismo lienzo (así ambas versiones alinean con idéntico `height`),
// aislando los glifos por luminancia, descartando la sombra y rellenando con el
// token de tinta del producto (#111827). Si algún día llega un archivo oscuro
// oficial, reemplazar `logo-zyfit-oscuro.png` y no hace falta tocar este código.

import { useTenant } from '@/tenant/TenantContext'

// Logos oficiales de Zyfit. Viven en `public/`, así que Vite los copia tal cual
// a `dist/` y se referencian por ruta absoluta.
const LOGO_ON_DARK = '/logo-zyfit.png'
const LOGO_ON_LIGHT = '/logo-zyfit-oscuro.png'

// Marca en línea: el logo + el resto del nombre de la plataforma. El archivo de
// logo dice solo "ZYFIT"; "Academy" se compone al lado para no perder de qué
// producto es la pantalla. El conjunto se lee como un lockup, no como dos marcas.
export function Wordmark({ size = 19, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const tenant = useTenant()
  const [first, ...rest] = tenant.nombre_plataforma.split(' ')
  const dark = tone === 'dark'

  return (
    <span className="flex items-baseline gap-2 select-none">
      <img
        src={dark ? LOGO_ON_DARK : LOGO_ON_LIGHT}
        alt={first}
        // El alto manda; el ancho sale de la proporción del archivo.
        style={{ height: Math.round(size * 0.92), width: 'auto' }}
        className="block object-contain"
      />
      {rest.length > 0 && (
        <span
          style={{ fontSize: size }}
          className={`font-medium leading-none tracking-tight ${dark ? 'text-white/60' : 'text-ink-muted'}`}
        >
          {rest.join(' ')}
        </span>
      )}
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

  // Sin logo propio del tenant: el logo de Zyfit a la altura pedida (`size` es
  // la altura del lockup, no un tamaño tipográfico).
  return (
    <div className="flex flex-col items-start gap-1">
      <Wordmark size={size * 0.78} tone={tone} />
      {showTagline && tagline && (
        <span className={`text-[9px] font-medium uppercase tracking-[0.24em] ${sub}`}>
          {tagline}
        </span>
      )}
    </div>
  )
}
