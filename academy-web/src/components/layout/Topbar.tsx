// Topbar fija sobre el contenido. Izquierda: saludo. Derecha: menú de usuario.
// En móvil aparece el botón hamburguesa.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { StreakPill } from '@/components/StreakPill'
import { useAuth } from '@/auth/useAuth'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth()
  const nombre = (user?.nombre ?? '').split(/\s+/)[0] || 'Estudiante'

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-surface-border bg-surface-soft/85 px-6 py-3.5 backdrop-blur-sm sm:px-8 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink md:hidden"
          aria-label="Abrir menú"
        >
          <Icon name="menu" size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink sm:text-xl">Hola, {nombre}</h1>
          <p className="hidden truncate text-xs text-ink-muted sm:block">
            {user?.is_instructor ? 'Panel de instructor' : 'Sigue aprendiendo'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {!user?.is_instructor && <StreakPill />}
        <UserMenu nombre={user?.nombre ?? 'Usuario'} email={user?.email ?? ''} onLogout={logout} />
      </div>
    </header>
  )
}

function UserMenu({ nombre, email, onLogout }: { nombre: string; email: string; onLogout: () => void }) {
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
        className="flex items-center gap-2 rounded-lg border border-surface-border bg-white py-1.5 pl-1.5 pr-2 transition-colors hover:bg-surface-soft"
      >
        <Avatar name={nombre} size={30} />
        <span className="hidden max-w-[120px] truncate text-sm text-ink lg:inline">{nombre}</span>
        <Icon name="chevronDown" size={15} className="text-ink-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-surface-border bg-white py-1 shadow-cardHover">
          <div className="px-4 py-2.5">
            <p className="truncate text-sm font-medium text-ink">{nombre}</p>
            <p className="truncate text-xs text-ink-muted">{email}</p>
          </div>
          <div className="border-t border-surface-border" />
          <Link
            to="/perfil"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="profile" size={16} /> Mi perfil
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="logout" size={16} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
