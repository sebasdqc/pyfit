// Topbar fija sobre el contenido principal. Izquierda: saludo al usuario. Derecha:
// selector de centro activo y el menú de usuario (avatar + nombre + dropdown). En
// móvil aparece el botón hamburguesa.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/auth/useAuth'
import { useActiveCenter } from '@/centers/useActiveCenter'

const ROLE_LABEL: Record<string, string> = {
  director_tecnico: 'Director técnico',
  admin: 'Administrador',
  coach: 'Entrenador',
  athlete: 'Atleta',
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth()
  const nombre = (user?.nombre ?? '').split(/\s+/)[0] || 'Director'
  const subtitle = ROLE_LABEL[user?.role ?? ''] ?? 'Panel de gestión'

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-perf-border bg-perf-bg/90 px-4 py-4 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-perf-border text-white/70 hover:text-white md:hidden"
          aria-label="Abrir menú"
        >
          <Icon name="menu" size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
            Hola, {nombre}
          </h1>
          <p className="hidden truncate text-xs text-white/45 sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <CenterSwitcher />
        <UserMenu nombre={user?.nombre ?? 'Usuario'} onLogout={logout} />
      </div>
    </header>
  )
}

// Selector de centro activo. Con un solo centro es un chip informativo; con
// varios, un desplegable que cambia el centro en todo el panel.
function CenterSwitcher() {
  const { centers, activeCenter, activeCenterId, setActiveCenterId } = useActiveCenter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (centers.length === 0) return null
  const label = activeCenter?.center_nombre ?? 'Centro'

  // Un único centro: chip estático (sin desplegable).
  if (centers.length === 1) {
    return (
      <div className="hidden items-center gap-2 rounded-lg border border-perf-border bg-perf-surface px-3 py-2 sm:flex">
        <Icon name="shield" size={15} className="text-accent" />
        <span className="max-w-[160px] truncate text-xs font-medium text-white/85">{label}</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-perf-border bg-perf-surface px-3 py-2 transition-colors hover:bg-perf-surface2"
      >
        <Icon name="shield" size={15} className="text-accent" />
        <span className="max-w-[160px] truncate text-xs font-medium text-white/85">{label}</span>
        <Icon name="chevronDown" size={14} className="text-white/45" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-perf-border bg-perf-surface py-1 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35">
            Cambiar de centro
          </p>
          {centers.map((c) => {
            const active = c.center_id === activeCenterId
            return (
              <button
                key={c.center_id}
                type="button"
                onClick={() => {
                  setActiveCenterId(c.center_id)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.04] ${
                  active ? 'text-white' : 'text-white/70'
                }`}
              >
                <span className="truncate">{c.center_nombre}</span>
                {active && <Icon name="check" size={15} className="shrink-0 text-accent" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function UserMenu({ nombre, onLogout }: { nombre: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-perf-border bg-perf-surface py-1.5 pl-1.5 pr-2 transition-colors hover:bg-perf-surface2"
      >
        <Avatar name={nombre} size={30} />
        <span className="hidden max-w-[120px] truncate text-sm text-white/85 lg:inline">{nombre}</span>
        <Icon name="chevronDown" size={15} className="text-white/45" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-perf-border bg-perf-surface py-1 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          <Link
            to="/perfil"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <Icon name="plantilla" size={16} />
            Mi perfil
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <Icon name="logout" size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
