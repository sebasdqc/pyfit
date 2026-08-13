// Wizard de bienvenida del primer inicio de sesión.
// El guardado es progresivo: cada paso manda su propio PATCH, así cerrar el
// navegador a mitad del wizard no pierde lo ya contestado.

import { api } from './client'
import type { OnboardingPatch, OnboardingState } from '@/types'

export async function fetchOnboarding(): Promise<OnboardingState> {
  const res = await api.get<OnboardingState>('/performance/onboarding/')
  return res.data
}

export async function saveOnboarding(patch: OnboardingPatch): Promise<OnboardingState> {
  const res = await api.patch<OnboardingState>('/performance/onboarding/', patch)
  return res.data
}

// Cierra el wizard. El servidor valida que los pasos obligatorios estén
// contestados y sella la fecha; devuelve 400 con `faltantes` si algo falta.
export async function completeOnboarding(): Promise<OnboardingState> {
  return saveOnboarding({ completado: true })
}
