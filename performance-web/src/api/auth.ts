// Llamadas de autenticación contra el backend Django (vertical performance).

import { api } from './client'
import type { AuthUser, LoginResponse } from '@/types'

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/performance/auth/login/', { email, password })
  return res.data
}

// Recuperación de contraseña — endpoints compartidos de pyfit
// (/api/auth/reset-password/ + /confirm-reset/), NO son de /performance/.
// Ya los usa el login de Zyfit Academy con el mismo contrato.
export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/reset-password/', { email })
}

export async function confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
  await api.post('/auth/confirm-reset/', { email, code, new_password: newPassword })
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<AuthUser>('/performance/me/')
  return res.data
}

// Actualiza datos del propio usuario (hoy: el nombre visible) y devuelve el
// payload ya actualizado para refrescar la sesión en todo el panel.
export async function updateMe(payload: { nombre?: string }): Promise<AuthUser> {
  const res = await api.patch<AuthUser>('/performance/me/', payload)
  return res.data
}
