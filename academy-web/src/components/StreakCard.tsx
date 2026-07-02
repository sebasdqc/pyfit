// Tarjeta de la racha de estudio para el dashboard del alumno ("Mi aprendizaje").
// Comunica el estado de forma clara pero motivacional (no punitiva): racha activa,
// mejor racha, freezes, día en riesgo y ventana de recuperación. Usa los tokens
// themables (brand/accent) → se adapta al branding de cada tenant.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import type { StreakColor, StreakState } from '@/types'

const ALERT_TONE: Record<StreakColor, string> = {
  brand: 'bg-brand/10 text-brand',
  accent: 'bg-accent/10 text-accent',
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  neutral: 'bg-surface-soft text-ink-soft',
}

export function StreakCard({ streak }: { streak: StreakState | null }) {
  // Micro-animación al extenderse la racha (confirmación de que sumó el día).
  const [pop, setPop] = useState(false)
  const prev = useRef<number | null>(null)
  useEffect(() => {
    if (!streak) return
    if (prev.current !== null && streak.racha_actual > prev.current) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 600)
      prev.current = streak.racha_actual
      return () => clearTimeout(t)
    }
    prev.current = streak.racha_actual
  }, [streak?.racha_actual])

  if (!streak) return null

  const activa = streak.racha_actual > 0
  const flameTone =
    streak.estado === 'en_riesgo' ? 'text-warn'
    : streak.estado === 'recuperable' ? 'text-accent'
    : streak.estado === 'congelada' ? 'text-ink-muted'
    : activa ? 'text-brand' : 'text-ink-faint'

  return (
    <section className="za-card overflow-hidden" aria-label="Racha de estudio">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Racha actual */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/10 to-accent/10">
            <Icon name="flame" size={30} className={`${flameTone} ${activa ? 'za-flame' : ''}`} />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-extrabold tabular-nums text-ink ${pop ? 'za-pop' : ''}`}>
                {streak.racha_actual}
              </span>
              <span className="text-sm font-medium text-ink-muted">
                {streak.racha_actual === 1 ? 'día' : 'días'} de racha
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              {streak.mejor_racha > 0
                ? `Mejor racha: ${streak.mejor_racha} días · ${streak.total_dias_activos} días de estudio`
                : 'Completa una lección hoy para empezar tu racha'}
            </p>
          </div>
        </div>

        {/* Freezes */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
          <div className="flex items-center gap-1" title={`Freezes: ${streak.freezes_disponibles} de ${streak.freezes_max}`}>
            {Array.from({ length: streak.freezes_max }).map((_, i) => (
              <Icon
                key={i}
                name="snowflake"
                size={16}
                className={i < streak.freezes_disponibles ? 'text-accent' : 'text-ink-faint'}
                aria-hidden
              />
            ))}
          </div>
          <p className="text-[11px] text-ink-muted">
            {streak.freezes_disponibles > 0
              ? `${streak.freezes_disponibles} freeze${streak.freezes_disponibles > 1 ? 's' : ''} · protege tu racha`
              : streak.proximo_freeze_en != null
                ? `Próximo freeze en ${streak.proximo_freeze_en} día${streak.proximo_freeze_en > 1 ? 's' : ''}`
                : 'Sin freezes'}
          </p>
        </div>
      </div>

      {/* Recuperación (ventana post-ruptura) — banner destacado */}
      {streak.recuperacion && (
        <Link
          to="/catalogo"
          className="flex items-center gap-3 border-t border-surface-border bg-accent/10 px-5 py-3 text-sm transition-colors hover:bg-accent/15"
        >
          <Icon name="flame" size={18} className="shrink-0 text-accent" />
          <span className="flex-1 font-medium text-accent">
            Recupera tu racha de {streak.recuperacion.racha_en_riesgo} días — te quedan{' '}
            {streak.recuperacion.horas_restantes} h. Completa una lección.
          </span>
          <Icon name="arrowRight" size={16} className="shrink-0 text-accent" />
        </Link>
      )}

      {/* Alerta motivacional (activa / en riesgo / congelada) */}
      {!streak.recuperacion && streak.alerta && (
        <div className={`flex items-center gap-2 border-t border-surface-border px-5 py-2.5 text-[13px] font-medium ${ALERT_TONE[streak.alerta.color]}`}>
          <Icon name={streak.estado === 'congelada' ? 'snowflake' : 'flame'} size={15} className="shrink-0" />
          <span>{streak.alerta.mensaje}</span>
        </div>
      )}
    </section>
  )
}
