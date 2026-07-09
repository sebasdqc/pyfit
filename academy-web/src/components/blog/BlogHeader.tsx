// Header del Blog público — mismo tratamiento visual que el header flotante
// de LandingPage.tsx (barra de vidrio oscura + Wordmark), para que /blog se
// sienta una continuación de la landing y no una pantalla aparte. A
// diferencia de Landing (que redirige a cualquier usuario logueado antes de
// mostrar el header), el blog es visible con O sin sesión — la nav cambia
// según haya usuario activo.

import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Wordmark } from '@/components/Emblem'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'

export function BlogHeader() {
  const t = useT()
  const { user } = useAuth()

  return (
    <header className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-black/55 px-4 py-3 shadow-lg shadow-black/30 backdrop-blur-xl sm:inset-x-6 sm:top-5 sm:px-6">
      <Link to="/" className="shrink-0">
        <Wordmark tone="dark" />
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link
          to={user ? '/catalogo' : '/explorar'}
          className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white sm:inline-block"
        >
          {t('landing.exploreCourses')}
        </Link>
        {user ? (
          <Link
            to="/inicio"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-white/90 sm:px-4"
          >
            {t('blog.goToDashboard')}
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white sm:px-3"
            >
              {t('landing.login')}
            </Link>
            <Link
              to="/registro"
              className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-white/90 sm:px-4"
            >
              {t('landing.createAccount')}
            </Link>
          </>
        )}
        <LocaleToggle className="!border-white/15 !bg-white/10 !text-white/75 hover:!bg-white/15 hover:!text-white" />
      </nav>
    </header>
  )
}
