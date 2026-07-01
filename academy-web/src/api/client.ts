// Cliente HTTP de la academia: instancia axios apuntando al backend Django, con
// inyección automática del JWT y refresh transparente ante un 401. Mismo patrón
// que el panel Performance (probado en producción).

import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { API_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TENANT_SLUG } from '@/lib/constants'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    // Identifica el tenant activo en el backend sin necesitar dominio propio.
    // El middleware de Academy lo prioriza sobre la resolución por Host.
    ...(TENANT_SLUG ? { 'X-Tenant-Slug': TENANT_SLUG } : {}),
  },
})

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
  // rehidratación no vuelva a pedir /me/ con un token muerto (recarga infinita).
  if (!refresh) {
    clearTokens()
    return null
  }
  try {
    // axios "crudo" para no recursar por este mismo interceptor.
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
      clearTokens()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
