// Barra de progreso del curso. El relleno usa el azul de acento CONMEBOL;
// al 100% pasa a verde (curso completado). Expone semántica de progressbar para
// lectores de pantalla; pasa un `label` contextual cuando hay varias en pantalla.

export function ProgressBar({
  value,
  showLabel = true,
  label = 'Progreso del curso',
}: {
  value: number
  showLabel?: boolean
  label?: string
}) {
  const safe = Number.isFinite(value) ? value : 0
  const pct = Math.round(Math.max(0, Math.min(100, safe)))
  const done = pct >= 100
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-soft"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct}%`}
      >
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
