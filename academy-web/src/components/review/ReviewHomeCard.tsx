// Tarjeta del Home: cuántas preguntas tocan hoy. Si el servicio falla o el
// alumno aún no tiene mazo, no estorba (no renderiza nada o solo una pista).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRepasoResumen } from '@/api/academy'
import { Icon } from '@/components/Icon'
import { useLocale } from '@/locale/useLocale'
import { useT } from '@/locale/useT'
import type { ReviewSummary } from '@/types'

export function ReviewHomeCard() {
  const t = useT()
  const { locale } = useLocale()
  const [resumen, setResumen] = useState<ReviewSummary | null>(null)

  useEffect(() => {
    getRepasoResumen().then(setResumen).catch(() => setResumen(null))
  }, [])

  if (!resumen || resumen.total === 0) return null

  const hayPendientes = resumen.pendientes > 0
  const fecha = resumen.proxima_fecha
    ? new Date(`${resumen.proxima_fecha}T00:00:00`).toLocaleDateString(locale === 'en' ? 'en' : 'es', { day: 'numeric', month: 'long' })
    : ''

  return (
    <Link
      to="/repaso"
      className={`za-card flex items-center gap-4 p-5 transition-colors hover:border-accent ${hayPendientes ? 'border-accent/40' : ''}`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${hayPendientes ? 'bg-accent text-white' : 'bg-surface-soft text-ink-muted'}`}>
        <Icon name="layers" size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="za-eyebrow">{t('review.homeCardTitle')}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {hayPendientes
            ? t('review.homeCardBody', { n: resumen.pendientes })
            : fecha ? t('review.homeCardDone', { fecha }) : t('review.caughtUpBody')}
        </p>
      </div>
      {hayPendientes && <span className="shrink-0 text-2xl font-bold tabular-nums text-accent">{resumen.pendientes}</span>}
      <Icon name="arrowRight" size={18} className="shrink-0 text-ink-muted" />
    </Link>
  )
}
