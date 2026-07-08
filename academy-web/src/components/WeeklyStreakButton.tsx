// Cohete de racha semanal, visible en la Topbar (inspirado en el indicador de
// Platzi). Abre un popover con las últimas 4 semanas: un círculo por semana,
// marcado si hubo al menos una actividad de estudio esa semana. Es una LECTURA
// distinta de los mismos datos que ya alimentan la racha diaria (StreakPill) —
// no tiene su propia mecánica de romper/freeze. Reutiliza el cache compartido
// de useStreak (mismo fetch que StreakPill/StreakCard).

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { useStreak } from '@/lib/useStreak'
import { useT } from '@/locale/useT'
import type { StreakColor } from '@/types'

const ALERT_TONE: Record<StreakColor, string> = {
  brand: 'bg-brand/10 text-brand',
  accent: 'bg-accent/10 text-accent',
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  neutral: 'bg-surface-soft text-ink-soft',
}

export function WeeklyStreakButton() {
  const { streak } = useStreak()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const t = useT()

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!streak) return null
  const { semanal } = streak
  const activo = semanal.racha_semanas > 0

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t('streakWeekly.title')}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-surface-border bg-surface px-2.5 py-1.5 transition-colors hover:bg-surface-soft"
      >
        <Icon name="rocket" size={16} className={activo ? 'text-brand' : 'text-ink-faint'} />
        <span className={`text-sm font-bold tabular-nums ${activo ? 'text-ink' : 'text-ink-muted'}`}>
          {semanal.racha_semanas}
        </span>
      </button>

      {open && (
        <div role="dialog" aria-label={t('streakWeekly.title')} className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-surface-border bg-surface shadow-cardHover">
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-accent/10">
              <Icon name="rocket" size={19} className={activo ? 'text-brand' : 'text-ink-faint'} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{t('streakWeekly.title')}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{t('streakWeekly.subtitle')}</p>
            </div>
          </div>

          <div className="px-4 pb-2">
            <div className="relative px-3">
              <div className="absolute left-3 right-3 top-4 h-0.5 bg-surface-border" aria-hidden />
              <div className="relative flex justify-between">
                {semanal.semanas.map((semana) => (
                  <div key={semana.numero} className="flex flex-col items-center gap-1.5">
                    <div
                      className={
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-surface ' +
                        (semana.activa
                          ? 'border-brand bg-brand text-white'
                          : semana.actual
                            ? 'border-brand text-ink-muted'
                            : 'border-surface-border text-ink-faint')
                      }
                    >
                      {semana.activa && <Icon name="check" size={13} />}
                    </div>
                    <span className={`text-[11px] tabular-nums ${semana.actual ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
                      {semana.numero}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-1 text-center text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              {t('streakWeekly.weekLabel')}
            </p>
          </div>

          {semanal.alerta && (
            <div className={`flex items-center gap-2 border-t border-surface-border px-4 py-2.5 text-[13px] font-medium ${ALERT_TONE[semanal.alerta.color]}`}>
              <Icon name="rocket" size={14} className="shrink-0" />
              <span>{semanal.alerta.mensaje}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
