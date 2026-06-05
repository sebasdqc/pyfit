// Llamadas de autenticación contra el backend Django (vertical performance).

import { api } from './client'
import type { AuthUser, LoginResponse } from '@/types'

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/performance/auth/login/', { email, password })
  return res.data
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<AuthUser>('/performance/me/')
  return res.data
}
