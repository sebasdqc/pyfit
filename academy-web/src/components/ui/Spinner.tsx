// Spinner circular: pista tenue + arco de acento azul (animate-spin de Tailwind).

export function Spinner({ size = 24, stroke, className = '' }: { size?: number; stroke?: number; className?: string }) {
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
      <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={sw} className="stroke-surface-border" />
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
