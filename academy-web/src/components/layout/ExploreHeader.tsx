// Header público compartido por el flujo de onboarding sin registro
// (/explorar, /explorar/cursos/:id, /explorar/cursos/:id/lecciones/:id).
// Estilo claro (a diferencia de BlogHeader, vidrio oscuro flotante pensado
// para el fondo oscuro de pantalla completa de Landing/Blog) — este vive
// sobre el fondo claro que comparten las 3 pantallas de exploración.
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/components/Emblem'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'

export function ExploreHeader() {
  const t = useT()

  return (
    <header className="flex items-center justify-between border-b border-surface-border bg-white px-6 py-4 sm:px-10">
      <Link to="/" className="shrink-0">
        <BrandLockup size={28} />
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link
          to="/explorar"
          className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent sm:inline-block"
        >
          {t('landing.exploreCourses')}
        </Link>
        <Link
          to="/blog"
          className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent sm:inline-block"
        >
          {t('blog.eyebrow')}
        </Link>
        <Link
          to="/login"
          className="rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent sm:px-3"
        >
          {t('explore.login')}
        </Link>
        <LocaleToggle />
      </nav>
    </header>
  )
}
