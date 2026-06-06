// Contexto de autenticación del panel. Mantiene el usuario en sesión, expone
// login/logout y rehidrata la sesión al cargar (si hay token guardado).

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { fetchMe, loginRequest } from '@/api/auth'
import { clearTokens, getAccessToken, setTokens } from '@/api/client'
import type { AuthUser } from '@/types'

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Rehidratar: si hay access token, recuperar el usuario actual.
  useEffect(() => {
    let active = true
    async function bootstrap() {
      if (!getAccessToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await fetchMe()
        if (active) setUser(me)
      } catch {
        clearTokens()
      } finally {
        if (active) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password)
    setTokens(data.access, data.refresh)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  // Re-lee /me/ y actualiza el usuario en sesión (p. ej. tras crear un centro,
  // para que su membresía aparezca en `centros` en todo el panel).
  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) return
    const me = await fetchMe()
    setUser(me)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
