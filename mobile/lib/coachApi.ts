/**
 * coachApi.ts — Cliente HTTP del Portal de Coach.
 *
 * Usa el token `coach_access_token` (separado del de atleta) y su propio refresh.
 * El login de atleta y el de coach pueden coexistir en el mismo dispositivo sin
 * pisarse, así que necesitamos un cliente aparte: api.ts siempre manda el token
 * de atleta.
 *
 * Nota: el endpoint POST /api/coach/vincular/ lo llama el ATLETA, así que ese va
 * por api.ts (apiPost), no por aquí.
 */

import { router } from 'expo-router'
import {
  getCoachAccessToken,
  getCoachRefreshToken,
  saveCoachTokens,
  clearCoachSession,
} from './storage'
import { localDateStr } from './api'
import type { Atleta, Estado } from './coachMockData'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

export interface CarteraMetrics {
  activos:           number
  atencion_hoy:      number
  adherencia:        number
  adherencia_delta:  number
}

export interface CarteraResponse {
  metrics:  CarteraMetrics
  atletas:  Atleta[]
}

export interface CoachMe {
  id:             number
  email:          string
  nombre:         string
  codigo_coach:   string
  total_atletas:  number
}

// Singleton: si varias requests reciben 401 a la vez, comparten un solo refresh.
let _coachRefreshing: Promise<boolean> | null = null

async function tryCoachRefresh(): Promise<boolean> {
  if (_coachRefreshing) return _coachRefreshing
  _coachRefreshing = (async () => {
    const refresh = await getCoachRefreshToken()
    if (!refresh) return false
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
      if (!res.ok) return false
      const data = await res.json()
      await saveCoachTokens(data.access, data.refresh || refresh)
      return true
    } catch {
      return false
    } finally {
      _coachRefreshing = null
    }
  })()
  return _coachRefreshing
}

async function coachRequest(method: string, path: string, body?: unknown, isRetry = false): Promise<any> {
  const token = await getCoachAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Local-Date': localDateStr(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Sin conexión al servidor. Verifica tu red.')
  }

  if (res.status === 401 && !isRetry) {
    const ok = await tryCoachRefresh()
    if (ok) return coachRequest(method, path, body, true)
    await clearCoachSession()
    router.replace('/(auth)/coach-login' as any)
    throw new Error('Tu sesión de coach expiró. Vuelve a iniciar sesión.')
  }

  if (res.status === 204) return null

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.detail || `Error ${res.status}`)
  }
  return res.json()
}

export interface AtletaDetalleMetrics {
  consistencia:     number
  sesiones_mes:     number
  sesiones_target:  number
  rpe_promedio:     number | null
  antiguedad:       string
}

export interface CoachConfig {
  checkin:   boolean
  feedback:  boolean
  ia:        boolean
  manual:    boolean
}

export interface CoachDirectiva {
  objetivo:  string
  foco:      string
  evitar:    string
  nota:      string
}

export interface AtletaDetalle extends Atleta {
  metrics:                AtletaDetalleMetrics
  desde:                  string
  config:                 CoachConfig
  directiva:              Partial<CoachDirectiva>
  directiva_updated_at:   string | null
}

export type Barra = 'done' | 'skip' | 'alto'

export interface SesionHist {
  fecha:        string
  rpe:          number
  completados:  number
  total:        number
  min:          number
  barras:       Barra[]
}

export function fetchCoachMe(): Promise<CoachMe> {
  return coachRequest('GET', '/api/coach/me/')
}

export function fetchCartera(): Promise<CarteraResponse> {
  return coachRequest('GET', '/api/coach/atletas/')
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export interface AnalyticsAtleta {
  id:             string
  nombre:         string
  estado:         Estado
  score:          number
  adherencia:     number
  consistencia:   number
  recencia:       number
  rpe_promedio:   number | null
  carga_semanal:  number[]
}

export interface AnalyticsResponse {
  periodo_semanas: number
  metrics: {
    adherencia_media:    number
    adherencia_delta:    number
    consistencia_media:  number
    score_promedio:      number
    sesiones_total:      number
    activos:             number
  }
  sesiones_semana: { label: string; value: number }[]
  atletas:         AnalyticsAtleta[]
}

export function fetchAnalytics(semanas: number): Promise<AnalyticsResponse> {
  return coachRequest('GET', `/api/coach/analytics/?periodo=${semanas}`)
}

export function fetchAtletaDetalle(id: string | number): Promise<AtletaDetalle> {
  return coachRequest('GET', `/api/coach/atletas/${id}/`)
}

export function fetchAtletaSesiones(id: string | number): Promise<{ sesiones: SesionHist[] }> {
  return coachRequest('GET', `/api/coach/atletas/${id}/sesiones/`)
}

/** Actualiza (parcialmente) la config del atleta que controla el coach. */
export function patchAtletaConfig(id: string | number, config: Partial<CoachConfig>): Promise<{ config: CoachConfig }> {
  return coachRequest('PATCH', `/api/coach/atletas/${id}/config/`, { config })
}

/** Guarda la directiva del coach para el atleta (bias de la IA del atleta). */
export function putAtletaDirectiva(id: string | number, directiva: CoachDirectiva): Promise<{ directiva: CoachDirectiva; directiva_updated_at: string }> {
  return coachRequest('PUT', `/api/coach/atletas/${id}/directiva/`, directiva)
}
