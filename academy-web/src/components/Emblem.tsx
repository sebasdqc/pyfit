// Emblema PLACEHOLDER de Zyfit Academy.
//
// Inspirado en el lenguaje del manual de marca CONMEBOL (escudo + ráfaga de
// segmentos tipo balón, bicolor azul) pero SIN reproducir el logo oficial
// (protegido). Combina ese escudo con un birrete (academia). En próximas
// iteraciones se reemplazará por el asset de marca definitivo que nos entreguen.
//
// `tone="light"` → emblema en azules de marca (para fondos claros).
// `tone="dark"`  → emblema en blanco/azul claro (para fondos navy / hero).

export function Emblem({ size = 40, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const navy = tone === 'dark' ? '#ffffff' : '#1a3e72'
  const blue = tone === 'dark' ? '#7ab6ff' : '#0066b3'
  const cap = tone === 'dark' ? '#ffffff' : '#ffffff'

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      {/* Ráfaga de segmentos (evoca el balón del emblema CONMEBOL) */}
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
      {/* Escudo */}
      <path
        d="M32 8 L52 15 V32 C52 44 43 51 32 55 C21 51 12 44 12 32 V15 Z"
        fill={navy}
      />
      {/* Birrete (mortarboard) dentro del escudo */}
      <path d="M20 27 L32 22 L44 27 L32 32 Z" fill={cap} />
      <path d="M24 30 V37 C24 39 40 39 40 37 V30" stroke={cap} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M44 27 V35" stroke={cap} strokeWidth={2} strokeLinecap="round" />
      <circle cx="44" cy="36.5" r="1.8" fill={cap} />
    </svg>
  )
}

// Lockup: emblema + wordmark "ZYFIT Academy". `tone` controla el color del texto.
export function BrandLockup({
  size = 30,
  tone = 'light',
  showTagline = false,
}: {
  size?: number
  tone?: 'light' | 'dark'
  showTagline?: boolean
}) {
  const main = tone === 'dark' ? 'text-white' : 'text-brand'
  const sub = tone === 'dark' ? 'text-white/60' : 'text-accent'
  return (
    <div className="flex items-center gap-2.5">
      <Emblem size={size} tone={tone} />
      <div className="leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-[15px] font-bold tracking-tight ${main}`}>ZYFIT</span>
          <span className={`text-[15px] font-light tracking-tight ${main} opacity-90`}>Academy</span>
        </div>
        {showTagline && (
          <span className={`mt-1 block text-[9px] font-medium uppercase tracking-[0.24em] ${sub}`}>
            Cree en grande
          </span>
        )}
      </div>
    </div>
  )
}
