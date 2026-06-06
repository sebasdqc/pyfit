// Sidebar flotante del panel. No está pegada a los bordes ni forma parte del
// layout de columnas: flota (position fixed) con margen respecto a los bordes,
// bordes redondeados, fondo ligeramente más claro que la página y una sombra
// oscura muy sutil. Responsive: etiquetas en escritorio, solo íconos en tablet,
// y drawer lateral en móvil (controlado por AppLayout).

import { NavLink, useLocation } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/auth/useAuth'

const LOGO = '/Logo-Zyfit-Blanco.png'

interface NavItem {
  id: string
  label: string
  icon: IconName
  to?: string // si no hay ruta aún, el ítem es visual (fase de diseño)
}

// Navegación del portal. Dashboard ya está cableado; el resto son destinos
// previstos (pendientes de ruteo) — se muestran como ítems del menú.
const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
  { id: 'plantilla', label: 'Plantilla', icon: 'plantilla', to: '/plantilla' },
  { id: 'convocatoria', label: 'Convocatoria', icon: 'convocatoria' },
  { id: 'rendimiento', label: 'Rendimiento', icon: 'rendimiento', to: '/rendimiento' },
  { id: 'lesiones', label: 'Lesiones', icon: 'lesiones', to: '/lesiones' },
  { id: 'tests', label: 'Tests', icon: 'tests', to: '/tests' },
  { id: 'planificacion', label: 'Planificación', icon: 'planificacion', to: '/planificacion' },
  { id: 'psicologico', label: 'Psicológico', icon: 'psicologico', to: '/psicologico' },
  { id: 'reportes', label: 'Reportes', icon: 'reportes' },
  { id: 'ajustes', label: 'Ajustes', icon: 'ajustes' },
]

const ROLE_LABEL: Record<string, string> = {
  director_tecnico: 'Director técnico',
  admin: 'Administrador',
  coach: 'Entrenador',
  athlete: 'Atleta',
}

export function Sidebar({
  mobileOpen,
  onNavigate,
}: {
  mobileOpen: boolean
  onNavigate: () => void
}) {
  const { user } = useAuth()
  const { pathname } = useLocation()

  return (
    <aside
      className={[
        'fixed left-4 top-4 bottom-4 z-40 flex flex-col rounded-2xl border border-perf-border bg-perf-surface',
        'shadow-[0_10px_45px_rgba(0,0,0,0.55)] transition-transform duration-200',
        'w-60 md:w-[68px] lg:w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0',
      ].join(' ')}
    >
      {/* Logo + vertical */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5 md:justify-center md:px-0 lg:justify-start lg:px-5">
        <img src={LOGO} alt="Zyfit" className="h-5 w-auto" />
        <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-white/45 md:hidden lg:inline">
          Performance
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.to ? pathname.startsWith(item.to) : false
            return (
              <li key={item.id}>
                <NavItemRow item={item} active={active} onNavigate={onNavigate} />
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Usuario activo → perfil */}
      <div className="border-t border-perf-border px-3 py-3">
        <NavLink
          to="/perfil"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04] md:justify-center md:px-0 lg:justify-start lg:px-2 ${
              isActive ? 'bg-accent/10' : ''
            }`
          }
          title="Mi perfil"
        >
          <Avatar name={user?.nombre ?? 'Usuario'} size={34} />
          <div className="min-w-0 md:hidden lg:block">
            <p className="truncate text-sm font-medium text-white/90">{user?.nombre ?? 'Usuario'}</p>
            <p className="truncate text-xs text-white/45">
              {ROLE_LABEL[user?.role ?? ''] ?? 'Staff'}
            </p>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}

function NavItemRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate: () => void
}) {
  const base =
    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors md:justify-center md:px-0 lg:justify-start lg:px-3'
  const state = active
    ? 'bg-accent/10 text-white'
    : 'text-white/55 hover:bg-white/[0.04] hover:text-white/90'

  const inner = (
    <>
      {/* Acento azul a la izquierda del ítem activo */}
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
      )}
      <Icon name={item.icon} size={19} className={active ? 'text-accent' : ''} />
      <span className="md:hidden lg:inline">{item.label}</span>
    </>
  )

  if (item.to) {
    return (
      <NavLink to={item.to} onClick={onNavigate} className={`${base} ${state}`}>
        {inner}
      </NavLink>
    )
  }
  return (
    <button type="button" className={`${base} ${state} w-full`} title={item.label}>
      {inner}
    </button>
  )
}
