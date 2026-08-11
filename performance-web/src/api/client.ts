// Cliente HTTP del panel: instancia axios apuntando al backend Django existente,
// con inyección automática del JWT y refresh transparente ante un 401.

import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  API_URL,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from '@/lib/constants'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Rutas públicas (ver router.tsx): un token muerto en localStorage (de una
// sesión vieja) no debe expulsar de la landing/precio/para-quién a un
// visitante que ni siquiera está tratando de entrar al panel.
const PUBLIC_PATHS = ['/', '/login', '/recuperar', '/precio']
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/para-quien')
}

// ── Gestión de tokens (localStorage) ────────────────────────────────────────
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}
export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

// ── Request: añade Authorization si hay token ───────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: refresh transparente ante 401 (una sola vez por request) ──────
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  // Sin refresh token no se puede renovar: limpia también el access para que la
  // rehidratación no vuelva a pedir /me/ con un token muerto (causa de recarga infinita).
  if (!refresh) {
    clearTokens()
    return null
  }
  try {
    // Usa axios "crudo" para no recursar por este mismo interceptor.
    const res = await axios.post(`${API_URL}/api/auth/refresh/`, { refresh })
    const access = res.data.access as string
    setTokens(access, res.data.refresh)
    return access
  } catch {
    clearTokens()
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      refreshing = refreshing ?? refreshAccessToken()
      const access = await refreshing
      refreshing = null
      if (access) {
        original.headers = { ...original.headers, Authorization: `Bearer ${access}` }
        return api(original)
      }
      // Refresh falló: sesión muerta. Limpia tokens SIEMPRE (si quedara un access
      // sin refresh, la rehidratación volvería a pedir /me/ → 401 → recarga infinita)
      // y redirige solo si estamos en una ruta que REQUIERE sesión — en una
      // pública (landing, precio, para-quién), un token viejo y muerto no debe
      // expulsar a un visitante que ni siquiera intentaba entrar al panel.
      clearTokens()
      if (typeof window !== 'undefined' && !isPublicPath(window.location.pathname)) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
