// Anillo de progreso por escuela (Home). No existe un componente circular en el
// design system (ProgressBar es lineal) — este es deliberadamente simple: un SVG
// con stroke-dasharray, sin librería de gráficos ni animación.

import { Icon, type IconName } from '@/components/Icon'
import { useT } from '@/locale/useT'

export function SchoolProgressRing({
  value,
  accent,
  icon,
  size = 64,
}: {
  value: number
  accent: string
  icon: IconName
  size?: number
}) {
  const t = useT()
  const pct = Math.round(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)))
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={t('schoolProgressRing.ariaLabel', { pct })}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-surface-border"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon name={icon} size={size * 0.28} />
        <span className="text-[11px] font-semibold tabular-nums">{pct}%</span>
      </div>
    </div>
  )
}
