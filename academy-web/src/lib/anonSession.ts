// Sesión anónima del onboarding sin registro (probar contenido gratis antes
// de crear cuenta). Mismo mecanismo de persistencia que el JWT — localStorage,
// ver api/client.ts — pero en su propia clave para no mezclarse con los
// tokens ni sobrevivir a un login/registro real (se limpia al convertir).

import axios from 'axios'
import { API_URL, ANON_SESSION_KEY, TENANT_SLUG } from './constants'

export function getAnonSessionId(): string | null {
  return localStorage.getItem(ANON_SESSION_KEY)
}

export function clearAnonSession() {
  localStorage.removeItem(ANON_SESSION_KEY)
}

let creating: Promise<string | null> | null = null

// Crea (o reutiliza) el id de sesión anónima. Usa axios "crudo" — no la
// instancia `api` de client.ts — para no recursar: el interceptor de
// request de `api` es quien llama a esta función antes de cada llamada a
// `/academy/anon/*`.
export async function ensureAnonSessionId(): Promise<string | null> {
  const existing = getAnonSessionId()
  if (existing) return existing
  if (!creating) {
    creating = axios
      .post<{ id: string }>(
        `${API_URL}/api/academy/anon/sesion/`,
        {},
        { headers: TENANT_SLUG ? { 'X-Tenant-Slug': TENANT_SLUG } : {} },
      )
      .then((res) => {
        localStorage.setItem(ANON_SESSION_KEY, res.data.id)
        return res.data.id
      })
      .catch(() => null)
      .finally(() => {
        creating = null
      })
  }
  return creating
}
