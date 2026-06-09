// Barra de progreso del curso. El relleno usa el azul de acento CONMEBOL;
// al 100% pasa a verde (curso completado).

export function ProgressBar({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const pct = Math.max(0, Math.min(100, value))
  const done = pct >= 100
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-soft">
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-ok' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={`shrink-0 text-xs font-semibold tabular-nums ${done ? 'text-ok' : 'text-ink-soft'}`}>
          {pct}%
        </span>
      )}
    </div>
  )
}
