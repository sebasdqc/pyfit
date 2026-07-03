// Inverso de ProtectedRoute: para rutas públicas del onboarding sin registro
// (/registro, /explorar/*) que no tienen sentido para alguien ya logueado —
// lo mandamos a su equivalente autenticado en vez de mostrarle la vista anónima.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'

// true mientras la página pública NO debe renderizar su contenido (todavía
// rehidratando la sesión, o ya hay usuario y se está redirigiendo).
export function useRedirectIfAuthenticated(path: string): boolean {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate(path, { replace: true })
  }, [loading, user, navigate, path])

  return loading || Boolean(user)
}
