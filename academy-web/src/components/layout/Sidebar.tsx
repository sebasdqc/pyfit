// Sidebar flotante de la academia (tema claro CONMEBOL). Etiquetas en escritorio,
// solo íconos en tablet, drawer lateral en móvil (controlado por AppLayout).

import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'
import { BrandLockup } from '@/components/Emblem'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/auth/useAuth'

interface NavItem {
  id: string
  label: string
  icon: IconName
  to: string
  instructorOnly?: boolean
}

const NAV: NavItem[] = [
  { id: 'inicio', label: 'Inicio', icon: 'home', to: '/inicio' },
  { id: 'catalogo', label: 'Catálogo', icon: 'catalog', to: '/catalogo' },
  { id: 'aprendizaje', label: 'Mi aprendizaje', icon: 'learning', to: '/aprendizaje' },
  { id: 'certificados', label: 'Certificados', icon: 'certificate', to: '/certificados' },
  { id: 'comunidad', label: 'Comunidad', icon: 'users', to: '/comunidad' },
  { id: 'instructor', label: 'Mis cursos', icon: 'instructor', to: '/instructor', instructorOnly: true },
]

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  director_tecnico: 'Director técnico',
  coach: 'Entrenador',
  athlete: 'Estudiante',
}

export function Sidebar({ mobileOpen, onNavigate }: { mobileOpen: boolean; onNavigate: () => void }) {
  const { user } = useAuth()
  const nav = NAV.filter((item) => !item.instructorOnly || user?.puede_crear_cursos)
  const roleLabel = user?.is_instructor ? 'Instructor' : ROLE_LABEL[user?.role ?? ''] ?? 'Estudiante'

  return (
    <aside
      className={[
        'fixed left-4 top-4 bottom-4 z-40 flex flex-col rounded-2xl border border-surface-border bg-white',
        'shadow-card transition-transform duration-200',
        'w-60 md:w-[72px] lg:w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0',
      ].join(' ')}
    >
      {/* Marca + cerrar (móvil) */}
      <div className="flex items-center justify-between gap-2 px-5 pt-6 pb-5 md:justify-center md:px-0 lg:justify-start lg:px-5">
        <div className="md:hidden lg:block">
          <BrandLockup size={30} />
        </div>
        <div className="hidden md:block lg:hidden">
          <BrandLockup size={30} />
        </div>
        <button
          type="button"
          onClick={onNavigate}
          className="-mr-1.5 flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink md:hidden"
          aria-label="Cerrar menú"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {nav.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
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
                    <span className="md:hidden lg:inline">{item.label}</span>
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
          title="Mi perfil"
        >
          <Avatar name={user?.nombre ?? 'Usuario'} size={34} />
          <div className="min-w-0 md:hidden lg:block">
            <p className="truncate text-sm font-medium text-ink">{user?.nombre ?? 'Usuario'}</p>
            <p className="truncate text-xs text-ink-muted">{roleLabel}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}
