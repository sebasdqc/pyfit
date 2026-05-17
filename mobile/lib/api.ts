import { getAccessToken, getRefreshToken, saveTokens, clearTokens, clearUser } from './storage'
import { router } from 'expo-router'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
if (__DEV__) {
  console.log('[API] BASE_URL:', BASE_URL)
}

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

// Per-request timeout (ms). Generation can take ~10s on Groq slow days; keep
// generous but bounded so the UI never spins forever.
const REQUEST_TIMEOUT_MS = 45000

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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  fetchOptions.signal = controller.signal

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, fetchOptions)
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err?.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Verifica tu conexión.')
    }
    throw new Error('Sin conexión al servidor. Verifica tu red.')
  }
  clearTimeout(timeoutId)

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

export function apiPatch(path: string, body: unknown): Promise<any> {
  return request('PATCH', path, body)
}

export function apiDelete(path: string): Promise<null> {
  return request('DELETE', path)
}
