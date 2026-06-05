// Topbar fija sobre el contenido principal. Izquierda: saludo al director.
// Derecha: selector de período (tabs), botón secundario de reporte y el menú de
// usuario (avatar + nombre + dropdown). En móvil aparece el botón hamburguesa.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/auth/useAuth'

type Periodo = 'diario' | 'semanal' | 'mensual'
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'diario', label: 'Diario' },
  { id: 'semanal', label: 'Semanal' },
  { id: 'mensual', label: 'Mensual' },
]

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth()
  const [periodo, setPeriodo] = useState<Periodo>('semanal')
  const nombre = (user?.nombre ?? '').split(/\s+/)[0] || 'Director'

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
          <p className="hidden truncate text-xs text-white/45 sm:block">
            Resumen del rendimiento de la plantilla
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Selector de período (tabs compactos) */}
        <div className="hidden items-center gap-0.5 rounded-lg border border-perf-border bg-perf-surface p-0.5 sm:flex">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                periodo === p.id ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Generar reporte (secundario) */}
        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg border border-perf-border bg-perf-surface px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-perf-surface2 hover:text-white md:flex"
        >
          <Icon name="report" size={15} />
          Generar reporte
        </button>

        <UserMenu nombre={user?.nombre ?? 'Usuario'} onLogout={logout} />
      </div>
    </header>
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
