// Redirige a un usuario ya logueado lejos de una pantalla pública (landing,
// login). Mientras `loading` o si hay `user`, el caller debe mostrar un
// estado de espera en vez de la pantalla pública (evita el flash de
// contenido público antes del redirect).

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function useRedirectIfAuthenticated(path: string): boolean {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate(path, { replace: true })
  }, [loading, user, navigate, path])

  return loading || Boolean(user)
}
