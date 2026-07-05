// Autenticación contra el backend Django (vertical academy).

import { api } from './client'
import { getAnonSessionId } from '@/lib/anonSession'
import type { AuthUser, LoginResponse } from '@/types'

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/academy/auth/login/', { email, password })
  return res.data
}

// Registro PRINCIPAL de pyfit (no es un endpoint de /academy/ — es el mismo
// que usa el onboarding móvil). Si el visitante navegó como anónimo, el id de
// sesión guardado viaja en `X-Anon-Session` para que el backend migre su
// progreso a la cuenta nueva (ver academy.migration_service). No se crea una
// sesión anónima aquí — si nunca hubo una, el header simplemente se omite.
export interface RegisterResponse {
  access: string
  refresh: string
  user: { id: number; email: string }
}

export async function registerRequest(email: string, password: string): Promise<RegisterResponse> {
  const anonId = getAnonSessionId()
  const res = await api.post<RegisterResponse>(
    '/auth/register/',
    { email, password },
    { headers: anonId ? { 'X-Anon-Session': anonId } : {} },
  )
  return res.data
}

// Recuperación de contraseña — mismos endpoints AllowAny que ya usa el
// onboarding móvil (/api/auth/reset-password/ y /confirm-reset/, no son de
// /academy/). El backend nunca revela si el email existe (siempre 200).
export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/reset-password/', { email })
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await api.post('/auth/confirm-reset/', { email, code, new_password: newPassword })
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<AuthUser>('/academy/me/')
  return res.data
}

export interface ProfilePatch {
  nombre?: string
  pais?: string
  ciudad?: string
  fecha_nacimiento?: string | null
  profesion?: string
  intereses?: string[]
  redes_sociales?: Record<string, string>
}

export async function updateMe(payload: ProfilePatch): Promise<AuthUser> {
  const res = await api.patch<AuthUser>('/academy/me/', payload)
  return res.data
}
