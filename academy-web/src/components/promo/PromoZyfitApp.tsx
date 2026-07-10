// Banner de descubrimiento para promocionar Zyfit APP (la app móvil de
// entrenamiento con IA) dentro de Zyfit Academy. Es puramente informativo:
// no gatea nada, no depende del backend y se puede cerrar para siempre.
// Zyfit APP todavía no tiene listing público en las tiendas, así que el CTA
// es un badge "Muy pronto" en vez de un link — evita prometer una descarga
// que hoy no existe. Cuando haya URL real, reemplazar el badge por un <a>.

import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { Icon } from '@/components/Icon'
import { useT } from '@/locale/useT'

function storageKey(userId: number | undefined): string {
  return `za-promo-app-dismissed-${userId ?? 'anon'}`
}

function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function PromoZyfitApp({ variant = 'card' }: { variant?: 'card' | 'inline' }) {
  const t = useT()
  const { user } = useAuth()
  const key = storageKey(user?.id)
  const [dismissed, setDismissed] = useState(() => readDismissed(key))

  // Si cambia el usuario (login/logout) sin remount del árbol, releer su propia preferencia.
  useEffect(() => {
    setDismissed(readDismissed(key))
  }, [key])

  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(key, '1')
    } catch {
      // Sin localStorage disponible: el banner queda oculto solo por esta sesión.
    }
  }

  if (variant === 'inline') {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Icon name="activity" size={18} />
        </span>
        <p className="min-w-0 flex-1 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Zyfit APP</span> {t('promoZyfitApp.inlineBody')}
        </p>
        <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {t('promoZyfitApp.comingSoon')}
        </span>
        <button onClick={dismiss} aria-label={t('promoZyfitApp.closeAria')} className="shrink-0 text-ink-muted hover:text-ink">
          <Icon name="close" size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="za-card relative border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-5">
      <button
        onClick={dismiss}
        aria-label={t('promoZyfitApp.closeAria')}
        className="absolute right-3 top-3 text-ink-muted hover:text-ink"
      >
        <Icon name="close" size={16} />
      </button>
      <div className="flex items-start gap-4 pr-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
          <Icon name="activity" size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="za-eyebrow">{t('promoZyfitApp.eyebrow')}</p>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
              {t('promoZyfitApp.comingSoon')}
            </span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-ink">
            {t('promoZyfitApp.title')}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {t('promoZyfitApp.body')}
          </p>
        </div>
      </div>
    </div>
  )
}
