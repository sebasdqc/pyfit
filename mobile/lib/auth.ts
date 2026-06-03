import * as SecureStore from 'expo-secure-store'
import { apiPost } from './api'
import { saveTokens, saveUser, clearTokens, clearUser, getUser, getRefreshToken, saveCoachSession } from './storage'

export async function login(email: string, password: string) {
  const data = await apiPost('/api/auth/login/', { email, password }, false)
  await saveTokens(data.access, data.refresh)
  await saveUser(data.user)
  return data.user
}

export async function register(email: string, password: string) {
  const data = await apiPost('/api/auth/register/', { email, password }, false)
  await saveTokens(data.access, data.refresh)
  await saveUser(data.user)
  return data.user
}

export type CoachLoginResult =
  | { status: 'ok'; user: any }      // coach con acceso activado
  | { status: 'pending' }            // credenciales válidas pero acceso de coach no activado
  | { status: 'invalid' }            // credenciales incorrectas
  | { status: 'error' }              // red / servidor

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Login del portal de entrenador. Usa un fetch dedicado (no apiPost) para
 * quedar desacoplado de la sesión del atleta y del manejo global de 401 de
 * lib/api.ts (que limpiaría tokens y redirigiría al login del atleta).
 *
 * Los tokens del coach se guardan bajo claves propias (saveCoachSession), sin
 * tocar la sesión del atleta. El portal del coach aún no consume los tokens
 * (la home usa datos de ejemplo), pero los dejamos listos para futuros endpoints.
 */
export async function coachLogin(email: string, password: string): Promise<CoachLoginResult> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/api/auth/coach/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.ok) {
    const data = await res.json().catch(() => ({}))
    if (data.access && data.refresh) {
      await saveCoachSession(data.access, data.refresh, data.user || {})
    }
    return { status: 'ok', user: data.user }
  }
  if (res.status === 403) return { status: 'pending' }
  if (res.status === 401) return { status: 'invalid' }
  return { status: 'error' }
}

export async function logout() {
  const refresh = await getRefreshToken()
  if (refresh) {
    await apiPost('/api/auth/logout/', { refresh }).catch(() => {})
  }
  await clearTokens()
  await clearUser()
  // Limpiar cualquier estado de impersonación al cerrar sesión para que el
  // próximo login (incluso si es otra cuenta) no arrastre datos previos.
  await SecureStore.deleteItemAsync('admin_impersonating').catch(() => {})
}

export { getUser }
