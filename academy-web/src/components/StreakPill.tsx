// Indicador compacto de la racha de estudio, SIEMPRE visible en la Topbar (punto
// de entrada principal, no enterrado en un submenú). Enlaza a "Mi aprendizaje".
// Reutiliza el cache compartido (useStreak) para no re-pedir el estado.

import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { useStreak } from '@/lib/useStreak'
import type { StreakEstado } from '@/types'

const FLAME_TONE: Record<StreakEstado, string> = {
  activa: 'text-brand',
  en_riesgo: 'text-warn',
  recuperable: 'text-accent',
  congelada: 'text-ink-muted',
  sin_iniciar: 'text-ink-faint',
}

export function StreakPill() {
  const { streak } = useStreak()
  if (!streak) return null

  const activa = streak.racha_actual > 0
  const flame = FLAME_TONE[streak.estado] ?? 'text-brand'
  const label = activa
    ? `Racha de estudio: ${streak.racha_actual} días`
    : 'Empieza tu racha de estudio'

  return (
    <Link
      to="/aprendizaje"
      title={label}
      aria-label={label}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-surface-border bg-surface px-2.5 py-1.5 transition-colors hover:bg-surface-soft"
    >
      <Icon name="flame" size={16} className={`${flame} ${activa ? 'za-flame' : ''}`} />
      <span className={`text-sm font-bold tabular-nums ${activa ? 'text-ink' : 'text-ink-muted'}`}>
        {streak.racha_actual}
      </span>
      {streak.freezes_disponibles > 0 && (
        <span className="flex items-center gap-0.5 text-ink-muted" aria-hidden>
          <Icon name="snowflake" size={12} />
          <span className="text-[11px] font-semibold tabular-nums">{streak.freezes_disponibles}</span>
        </span>
      )}
    </Link>
  )
}
