import { getAccessToken, getRefreshToken, saveTokens, clearTokens, clearUser } from './storage'
import { router } from 'expo-router'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

async function getHeaders(includeAuth = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (includeAuth) {
    const token = await getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function tryRefresh(): Promise<boolean> {
  const refresh = await getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    await saveTokens(data.access, data.refresh || refresh)
    return true
  } catch {
    return false
  }
}

async function request(
  method: string,
  path: string,
  payload?: unknown,
  auth = true,
  isRetry = false,
): Promise<any> {
  const fetchOptions: RequestInit = {
    method,
    headers: await getHeaders(auth),
  }
  if (payload !== undefined) {
    fetchOptions.body = JSON.stringify(payload)
  }

  const res = await fetch(`${BASE_URL}${path}`, fetchOptions)

  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh()
    if (!refreshed) {
      await clearTokens()
      await clearUser()
      router.replace('/(auth)/login')
      throw new Error('Sesión expirada')
    }
    return request(method, path, payload, auth, true)
  }

  if (res.status === 204) return null

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    // DRF validation errors come as { field: ["msg", ...], ... }
    if (typeof errBody === 'object' && !errBody.error && !errBody.detail) {
      const firstKey = Object.keys(errBody)[0]
      if (firstKey) {
        const msg = Array.isArray(errBody[firstKey]) ? errBody[firstKey][0] : errBody[firstKey]
        throw new Error(`${firstKey}: ${msg}`)
      }
    }
    throw new Error(errBody.error || errBody.detail || `Error ${res.status}`)
  }

  return res.json()
}

export function apiGet(path: string): Promise<any> {
  return request('GET', path)
}

export function apiPost(path: string, body: unknown, auth = true): Promise<any> {
  return request('POST', path, body, auth)
}

export function apiPut(path: string, body: unknown): Promise<any> {
  return request('PUT', path, body)
}

export function apiDelete(path: string): Promise<null> {
  return request('DELETE', path)
}
