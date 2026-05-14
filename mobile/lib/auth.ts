import { apiPost } from './api'
import { saveTokens, saveUser, clearTokens, clearUser, getUser, getRefreshToken } from './storage'

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

export async function logout() {
  const refresh = await getRefreshToken()
  if (refresh) {
    await apiPost('/api/auth/logout/', { refresh }).catch(() => {})
  }
  await clearTokens()
  await clearUser()
}

export { getUser }
