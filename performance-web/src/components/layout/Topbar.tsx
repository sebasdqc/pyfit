// Barra superior: usuario en sesión + cerrar sesión.

import { useAuth } from '@/auth/useAuth'

export function Topbar() {
  const { user, logout } = useAuth()
  return (
    <header className="topbar">
      <span>{user?.nombre}</span>
      <button onClick={logout}>Cerrar sesión</button>
    </header>
  )
}
