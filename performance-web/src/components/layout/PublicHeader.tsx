// Header público compartido — Landing, Precio y las 3 páginas "Para quién".
// Antes vivía inline solo en LandingPage.tsx; se extrajo al sumar rutas
// nuevas (2026-08-10) para no repetir el mismo bloque en cada página.
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { CONTACT_HREF, LOGO_IMAGE } from '@/lib/publicSite'
import { useT } from '@/locale/useT'

export function PublicHeader() {
  const t = useT()
  const AUDIENCE_LINKS: { to: string; label: string }[] = [
    { to: '/para-quien/equipos', label: t('header.audience.equipos') },
    { to: '/para-quien/atletas', label: t('header.audience.atletas') },
    { to: '/para-quien/instituciones', label: t('header.audience.instituciones') },
  ]

  return (
    <header className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/[0.14] bg-white/[0.05] px-5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md sm:inset-x-8 sm:top-6">
      <Link to="/" className="flex items-center gap-2.5">
        <img src={LOGO_IMAGE} alt="Zyfit" className="h-5 w-auto sm:h-6" />
        <span className="pb-0.5 text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
          Performance
        </span>
      </Link>
      <nav className="hidden items-center gap-1 sm:flex">
        {/* Dropdown por hover/focus, sin librería: el panel usa padding (no
            margin) para pegar su zona interactiva al botón — así no hay un
            hueco muerto donde el mouse "pierde" el hover al bajar. */}
        <div className="group relative">
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white"
          >
            {t('header.audience.label')}
            <Icon
              name="chevronDown"
              size={14}
              className="transition-transform duration-200 group-hover:rotate-180"
            />
          </button>
          <div className="invisible absolute left-0 top-full w-64 pt-3 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <div className="overflow-hidden rounded-2xl border border-white/[0.14] bg-perf-surface/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-md">
              {AUDIENCE_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <Link
          to="/precio"
          className="rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white"
        >
          {t('header.precio')}
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/75 transition-colors hover:text-white sm:px-3"
        >
          {t('header.login')}
        </Link>
        {/* "Registrarse" apunta al mismo flujo que "Solicitar acceso": el
            panel no tiene alta autoservicio (ver FAQ de LandingPage.tsx), el
            acceso siempre lo coordina el equipo — no hay backend de registro
            propio detrás de este link. */}
        <a
          href={CONTACT_HREF}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark sm:px-3.5"
        >
          {t('header.register')}
        </a>
        <LocaleToggle />
      </div>
    </header>
  )
}
