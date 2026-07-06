// Sidebar flotante de la academia (tema claro CONMEBOL). Etiquetas en escritorio,
// solo íconos en tablet, drawer lateral en móvil (controlado por AppLayout).

import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'
import { BrandLockup } from '@/components/Emblem'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/auth/useAuth'
import { useTheme } from '@/theme/useTheme'
import { useT } from '@/locale/useT'

interface NavItem {
  id: string
  labelKey: string
  icon: IconName
  to: string
  instructorOnly?: boolean
}

const NAV: NavItem[] = [
  { id: 'inicio', labelKey: 'sidebar.navInicio', icon: 'home', to: '/inicio' },
  { id: 'catalogo', labelKey: 'sidebar.navCatalogo', icon: 'catalog', to: '/catalogo' },
  { id: 'aprendizaje', labelKey: 'sidebar.navAprendizaje', icon: 'learning', to: '/aprendizaje' },
  { id: 'biblioteca', labelKey: 'sidebar.navBiblioteca', icon: 'library', to: '/biblioteca' },
  { id: 'certificados', labelKey: 'sidebar.navCertificados', icon: 'certificate', to: '/certificados' },
  { id: 'simulador', labelKey: 'sidebar.navSimulador', icon: 'activity', to: '/simulador' },
  { id: 'comunidad', labelKey: 'sidebar.navComunidad', icon: 'users', to: '/comunidad' },
  { id: 'instructor', labelKey: 'sidebar.navInstructor', icon: 'instructor', to: '/instructor', instructorOnly: true },
]

const ROLE_LABEL_KEY: Record<string, string> = {
  admin: 'sidebar.roleAdmin',
  director_tecnico: 'sidebar.roleDirectorTecnico',
  coach: 'sidebar.roleCoach',
  athlete: 'sidebar.roleAthlete',
}

export function Sidebar({
  mobileOpen,
  onNavigate,
  onOpenTutor,
}: {
  mobileOpen: boolean
  onNavigate: () => void
  onOpenTutor: () => void
}) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const t = useT()
  const nav = NAV.filter((item) => !item.instructorOnly || user?.puede_crear_cursos)
  const roleLabel = user?.is_instructor
    ? t('sidebar.roleInstructor')
    : t(ROLE_LABEL_KEY[user?.role ?? ''] ?? 'sidebar.roleAthlete')
  const emblemTone = theme === 'dark' ? 'dark' : 'light'

  return (
    <aside
      className={[
        'fixed left-4 top-4 bottom-4 z-40 flex flex-col rounded-2xl border border-surface-border bg-surface',
        'shadow-card transition-transform duration-200',
        'w-60 md:w-[72px] lg:w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0',
      ].join(' ')}
    >
      {/* Marca + cerrar (móvil) */}
      <div className="flex items-center justify-between gap-2 px-5 pt-6 pb-5 md:justify-center md:px-0 lg:justify-start lg:px-5">
        <div className="md:hidden lg:block">
          <BrandLockup size={30} tone={emblemTone} />
        </div>
        <div className="hidden md:block lg:hidden">
          <BrandLockup size={30} tone={emblemTone} />
        </div>
        <button
          type="button"
          onClick={onNavigate}
          className="-mr-1.5 flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink md:hidden"
          aria-label={t('sidebar.closeMenu')}
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <button
          type="button"
          onClick={onOpenTutor}
          title={t('sidebar.tutorTitle')}
          aria-label={t('sidebar.openTutor')}
          aria-haspopup="dialog"
          className="group relative mb-2 flex min-h-11 w-full items-center gap-3 rounded-xl bg-accent/10 px-3 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-accent/15 md:justify-center md:px-0 lg:justify-start lg:px-3"
        >
          <Icon name="sparkles" size={19} className="text-accent" />
          <span className="md:hidden lg:inline">{t('sidebar.tutor')}</span>
        </button>
        <ul className="flex flex-col gap-1">
          {nav.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                className={({ isActive }) =>
                  [
                    'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    'md:justify-center md:px-0 lg:justify-start lg:px-3',
                    isActive
                      ? 'bg-accent/10 font-medium text-brand'
                      : 'text-ink-soft hover:bg-surface-soft hover:text-ink',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                    )}
                    <Icon name={item.icon} size={19} className={isActive ? 'text-accent' : ''} />
                    <span className="md:hidden lg:inline">{t(item.labelKey)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Usuario activo → perfil */}
      <div className="border-t border-surface-border px-3 py-3">
        <NavLink
          to="/perfil"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-soft md:justify-center md:px-0 lg:justify-start lg:px-2 ${
              isActive ? 'bg-accent/10' : ''
            }`
          }
          title={t('sidebar.myProfile')}
        >
          <Avatar name={user?.nombre ?? t('sidebar.userFallback')} size={34} />
          <div className="min-w-0 md:hidden lg:block">
            <p className="truncate text-sm font-medium text-ink">{user?.nombre ?? t('sidebar.userFallback')}</p>
            <p className="truncate text-xs text-ink-muted">{roleLabel}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}
