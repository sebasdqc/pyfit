// Footer del Blog público — mismo patrón que el footer de LandingPage.tsx
// (Wordmark + links legales + copyright), para cerrar la página con la misma
// identidad con la que abre el header.

import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/Emblem'
import { useT } from '@/locale/useT'

export function BlogFooter() {
  const t = useT()

  return (
    <footer className="border-t border-surface-border px-6 py-8 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Wordmark size={16} tone="dark" />
        <nav className="flex items-center gap-5">
          <Link to="/terminos" className="text-xs font-medium text-ink-soft hover:text-accent">
            {t('landing.termsOfService')}
          </Link>
          <Link to="/privacidad" className="text-xs font-medium text-ink-soft hover:text-accent">
            {t('landing.privacyPolicy')}
          </Link>
        </nav>
        <p className="text-xs text-ink-muted">{t('landing.copyright', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  )
}
