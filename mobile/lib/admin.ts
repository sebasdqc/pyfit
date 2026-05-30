/**
 * Helpers para el modo admin de la app móvil.
 *
 * Estado persistido en SecureStore:
 *   - user_data            → contiene `is_staff: bool`
 *   - admin_impersonating  → JSON `{ userId, email, nombre }` cuando el admin
 *                            está viendo la app como otro usuario, o ausente.
 *
 * Flujo de impersonación:
 *   1. Admin clickea un usuario → POST /api/admin/impersonate/<id>/
 *   2. Respuesta trae { access, refresh, user, impersonator }
 *   3. Guardamos los NUEVOS tokens (sobre los del admin) + user_data del target
 *      + admin_impersonating con los datos del target.
 *   4. Para volver: POST /api/admin/stop-impersonate/ — el backend lee el claim
 *      `impersonator_id` del JWT actual y emite tokens frescos del admin.
 */

import * as SecureStore from 'expo-secure-store'
import { apiGet, apiPost } from './api'
import { saveTokens, saveUser } from './storage'

const KEY_IMPERSONATING = 'admin_impersonating'

export interface AdminUserRow {
  id:              number
  email:           string
  nombre:          string
  is_staff:        boolean
  is_superuser:    boolean
  date_joined:     string | null
  last_login:      string | null
  total_sesiones:  number
  ultima_sesion:   string | null
}

export interface AdminUsersResponse {
  page:       number
  page_size:  number
  total:      number
  has_next:   boolean
  results:    AdminUserRow[]
}

export interface ImpersonationState {
  userId: number
  email:  string
  nombre: string
}

// ─── Persistencia de estado de impersonación ──────────────────────────────────

export async function getImpersonating(): Promise<ImpersonationState | null> {
  const raw = await SecureStore.getItemAsync(KEY_IMPERSONATING)
  if (!raw) return null
  try { return JSON.parse(raw) as ImpersonationState }
  catch { return null }
}

async function setImpersonating(state: ImpersonationState | null) {
  if (state) await SecureStore.setItemAsync(KEY_IMPERSONATING, JSON.stringify(state))
  else       await SecureStore.deleteItemAsync(KEY_IMPERSONATING)
}

// ─── Llamadas a la API ────────────────────────────────────────────────────────

export function fetchAdminMe() {
  return apiGet('/api/admin/me/')
}

export function fetchAdminUsers(query: string, page: number = 1): Promise<AdminUsersResponse> {
  const params = new URLSearchParams({ page: String(page) })
  if (query.trim()) params.set('q', query.trim())
  return apiGet(`/api/admin/users/?${params.toString()}`)
}

/**
 * Impersona al usuario. Guarda los nuevos tokens y limpia/setea
 * `admin_impersonating` localmente. Devuelve los datos del target.
 *
 * Si el admin tiene 2FA activo (`requires_otp` en /api/admin/me/), el backend
 * exige `otpToken` (código TOTP de 6 dígitos). Sin él responde 403.
 */
export async function startImpersonation(userId: number, otpToken?: string): Promise<{ user: any; impersonator: any }> {
  const body = otpToken ? { otp_token: otpToken } : {}
  const data = await apiPost(`/api/admin/impersonate/${userId}/`, body)
  await saveTokens(data.access, data.refresh)
  await saveUser(data.user)
  await setImpersonating({
    userId: data.user.id,
    email:  data.user.email,
    nombre: data.user.nombre || data.user.email,
  })
  return { user: data.user, impersonator: data.impersonator }
}

/**
 * Cierra la impersonación. El backend lee el claim del JWT y emite tokens
 * del admin original — no necesitamos cachear los tokens del admin.
 */
export async function stopImpersonation(): Promise<{ user: any }> {
  const data = await apiPost('/api/admin/stop-impersonate/', {})
  await saveTokens(data.access, data.refresh)
  await saveUser(data.user)
  await setImpersonating(null)
  return { user: data.user }
}
