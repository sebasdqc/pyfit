// Guarda de rutas: exige sesión activa. Mientras rehidrata muestra un estado
// mínimo; sin usuario, redirige al login.

import { Navigate, Outlet } from 'react-router-dom'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
