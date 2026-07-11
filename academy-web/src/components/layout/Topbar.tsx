// Topbar fija sobre el contenido. Izquierda: saludo. Derecha: menú de usuario.
// En móvil aparece el botón hamburguesa.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { StreakPill } from '@/components/StreakPill'
import { WeeklyStreakButton } from '@/components/WeeklyStreakButton'
import { useAuth } from '@/auth/useAuth'
import { useT } from '@/locale/useT'
import { useStreak } from '@/lib/useStreak'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth()
  const t = useT()
  const nombre = (user?.nombre ?? '').split(/\s+/)[0] || t('topbar.studentFallback')

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-surface-border bg-surface-soft/85 px-6 py-3.5 backdrop-blur-sm sm:px-8 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border bg-surface text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink md:hidden"
          aria-label={t('topbar.openMenu')}
        >
          <Icon name="menu" size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {t('topbar.greeting', { name: nombre })}
          </h1>
          <p className="hidden truncate text-xs text-ink-muted sm:block">
            {user?.is_instructor ? t('topbar.instructorPanel') : t('topbar.keepLearning')}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {!user?.is_instructor && <StreakPill />}
        {!user?.is_instructor && <WeeklyStreakButton />}
        <UserMenu
          nombre={user?.nombre ?? t('topbar.userFallback')}
          email={user?.email ?? ''}
          onLogout={logout}
          showPoints={!user?.is_instructor}
        />
      </div>
    </header>
  )
}

function UserMenu({
  nombre, email, onLogout, showPoints,
}: { nombre: string; email: string; onLogout: () => void; showPoints: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const t = useT()
  const { streak } = useStreak()

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
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface py-1.5 pl-1.5 pr-2 transition-colors hover:bg-surface-soft"
      >
        {showPoints && streak && (
          <span
            title={t('streakWeekly.pointsTooltip')}
            className="hidden items-center gap-1 border-r border-surface-border pr-2 text-xs font-bold tabular-nums text-ink-soft sm:flex"
          >
            {streak.puntos_totales.toLocaleString()}
            <span className="font-medium text-ink-muted">{t('streakWeekly.pointsShort')}</span>
          </span>
        )}
        <Avatar name={nombre} size={30} />
        <span className="hidden max-w-[120px] truncate text-sm text-ink lg:inline">{nombre}</span>
        <Icon name="chevronDown" size={15} className="text-ink-muted" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-surface-border bg-surface py-1 shadow-cardHover">
          <div className="px-4 py-2.5">
            <p className="truncate text-sm font-medium text-ink">{nombre}</p>
            <p className="truncate text-xs text-ink-muted">{email}</p>
          </div>
          <div className="border-t border-surface-border" />
          <Link
            to="/perfil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="profile" size={16} /> {t('topbar.myProfile')}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="logout" size={16} /> {t('topbar.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
