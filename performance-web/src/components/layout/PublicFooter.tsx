// Footer público compartido — mismo criterio que PublicHeader.tsx: se
// extrajo de LandingPage.tsx al sumar páginas públicas nuevas.
import { CONTACT_HREF, LOGO_IMAGE } from '@/lib/publicSite'
import { useT } from '@/locale/useT'

export function PublicFooter() {
  const t = useT()
  return (
    <footer className="border-t border-perf-border px-6 py-8 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <img src={LOGO_IMAGE} alt="Zyfit" className="h-5 w-auto opacity-80" />
          <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">{t('footer.tag')}</span>
        </div>
        <a href={CONTACT_HREF} className="text-xs font-medium text-white/45 transition-colors hover:text-accentLight">
          {t('footer.contact')}
        </a>
        <p className="text-xs text-white/35">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  )
}
