// Autenticación contra el backend Django (vertical academy).

import { api } from './client'
import type { AuthUser, LoginResponse } from '@/types'

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/academy/auth/login/', { email, password })
  return res.data
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<AuthUser>('/academy/me/')
  return res.data
}

export async function updateMe(payload: { nombre?: string }): Promise<AuthUser> {
  const res = await api.patch<AuthUser>('/academy/me/', payload)
  return res.data
}
