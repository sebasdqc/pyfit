// Stubs del cliente de API para los recursos del panel. Definen el contrato con
// el backend; las pantallas todavía NO los consumen (fuera de alcance del
// andamiaje), pero quedan listos para cablear.

import { api } from './client'
import type { CenterAthlete, ModuleId, SportsCenter } from '@/types'

// ── Centros ──────────────────────────────────────────────────────────────────
export async function listCenters(): Promise<SportsCenter[]> {
  const res = await api.get<SportsCenter[]>('/performance/centers/')
  return res.data
}

export async function getCenter(centerId: number): Promise<SportsCenter> {
  const res = await api.get<SportsCenter>(`/performance/centers/${centerId}/`)
  return res.data
}

// ── Atletas (los registra el director técnico) ───────────────────────────────
export async function listCenterAthletes(centerId: number): Promise<CenterAthlete[]> {
  const res = await api.get<CenterAthlete[]>(`/performance/centers/${centerId}/athletes/`)
  return res.data
}

export async function registerAthlete(
  centerId: number,
  payload: Partial<CenterAthlete> & { athlete: number },
): Promise<CenterAthlete> {
  const res = await api.post<CenterAthlete>(`/performance/centers/${centerId}/athletes/`, payload)
  return res.data
}

// ── Módulos (rendimiento / lesiones / test / planificacion / psicologico) ────
// Genéricos: el backend expone un endpoint por módulo bajo el centro.
export async function listModuleRecords<T = unknown>(
  centerId: number,
  modulo: ModuleId,
): Promise<T[]> {
  const res = await api.get<T[]>(`/performance/centers/${centerId}/${modulo}/`)
  return res.data
}

export async function createModuleRecord<T = unknown>(
  centerId: number,
  modulo: ModuleId,
  payload: Record<string, unknown>,
): Promise<T> {
  const res = await api.post<T>(`/performance/centers/${centerId}/${modulo}/`, payload)
  return res.data
}
