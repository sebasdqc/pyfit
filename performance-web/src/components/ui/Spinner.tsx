// Spinner circular reutilizable de Zyfit Performance: pista tenue + arco de
// acento azul que gira (animate-spin de Tailwind). Tamaño y grosor configurables.
// Hereda la identidad azul del panel; úsalo para cualquier estado de carga.

export function Spinner({
  size = 24,
  stroke,
  className = '',
}: {
  size?: number
  stroke?: number
  className?: string
}) {
  const sw = stroke ?? Math.max(2, Math.round(size / 10))
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`animate-spin ${className}`}
      role="status"
      aria-label="Cargando"
    >
      {/* Pista completa, casi invisible */}
      <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={sw} className="stroke-perf-border" />
      {/* Arco de acento (~30 % de la circunferencia) que gira */}
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * 0.7}
        className="stroke-accent"
      />
    </svg>
  )
}
