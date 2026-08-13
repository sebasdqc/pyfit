// Guardia del wizard de bienvenida: quien todavía no lo completó no entra al
// panel. Va como ruta padre de <AppLayout>, no dentro de las páginas, para que
// el redirect ocurra antes de montar el dashboard (sin parpadeo ni peticiones
// de datos que se descartan enseguida).
//
// El flag viene en el payload de /me/ y del login (`AuthUser.onboarding_completo`),
// así que no cuesta una petición extra. Tras completar el wizard,
// `refreshUser()` lo actualiza y este guardia deja pasar.

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function OnboardingGate() {
  const { user } = useAuth()
  // Sin usuario no decide nada: de eso ya se encarga <ProtectedRoute> arriba.
  if (user && !user.onboarding_completo) return <Navigate to="/bienvenida" replace />
  return <Outlet />
}

// Espejo del anterior: evita que alguien que YA completó el onboarding vuelva
// a /bienvenida escribiendo la URL a mano.
export function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.onboarding_completo) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
