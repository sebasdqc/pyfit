import { getAccessToken, getRefreshToken, saveTokens, clearTokens, clearUser } from './storage'
import { router } from 'expo-router'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
if (__DEV__) {
  console.log('[API] BASE_URL:', BASE_URL)
}

/**
 * Devuelve la fecha local del dispositivo en formato YYYY-MM-DD.
 * Usa los componentes locales (getFullYear/Month/Date), NO toISOString()
 * que convertiría a UTC y podría devolver el día incorrecto para zonas UTC-.
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function getHeaders(includeAuth = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Enviamos la fecha local del dispositivo en cada request para que el
    // backend pueda usar la fecha correcta (no UTC) al crear sesiones/checkins.
    'X-Local-Date': localDateStr(),
  }
  if (includeAuth) {
    const token = await getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// Singleton promise: si varias requests reciben 401 simultáneamente, todas
// esperan el MISMO refresh en lugar de intentar cada una el suyo (race condition).
let _refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise
  _refreshPromise = (async () => {
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
    } finally {
      _refreshPromise = null
    }
  })()
  return _refreshPromise
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
    // Tras refrescar, reintentar solo métodos idempotentes. NO reintentamos POST
    // automáticamente: si el 401 llegara tras procesarse parcialmente (proxy/gateway),
    // el reintento crearía el recurso dos veces. El token ya se renovó, así que el
    // usuario puede repetir la acción sin volver a loguearse.
    const idempotent = method === 'GET' || method === 'HEAD' || method === 'PUT' || method === 'DELETE'
    if (idempotent) {
      return request(method, path, payload, auth, true)
    }
    throw new Error('Tu sesión se renovó. Vuelve a intentar la acción.')
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
