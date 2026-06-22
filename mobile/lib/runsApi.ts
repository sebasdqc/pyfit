// ─── Runs API ─────────────────────────────────────────────────────────────────

import { apiGet, apiPatch, apiPost } from './api'

// Punto tal como lo captura el dispositivo / hook (latitude/longitude).
export interface RunPointInput {
  latitude: number
  longitude: number
  altitude?: number | null
  accuracy?: number | null
  timestamp: string
}

// Punto tal como lo devuelve el backend en el detalle (lat/lng + sufijos _m).
export interface RunPointApi {
  lat: number
  lng: number
  altitude_m?: number | null
  accuracy_m: number
  timestamp: string
  speed_m_s?: number | null
}

export interface RunSession {
  id: number
  status: 'active' | 'completed' | 'paused'
  started_at: string
  ended_at: string | null
  session_type: string
  // Nombres exactos del backend (RunSessionDetailSerializer).
  total_distance_m?: number
  total_duration_s?: number
  avg_pace_s_per_km?: number
  best_pace_s_per_km?: number
  elevation_gain_m?: number
  calories_burned?: number
  avg_heart_rate?: number | null
  points?: RunPointApi[]
  // Feedback post-carrera (null mientras no se haya registrado).
  rpe_real?: number | null
  rating?: number | null
  cumplimiento?: number | null
  molestias?: string[]
  feedback_notas?: string | null
  feedback_at?: string | null
  // Objetivo de la sesión inteligente vinculada (null en carreras libres) — adherencia.
  planned?: {
    tipo_sesion: string
    titulo: string
    zona_principal: string
    rpe_target: number | null
    pace_objetivo: [number, number] | null   // s/km [rápido, lento]
    fc_objetivo: [number, number] | null      // bpm [lo, hi]
  } | null
}

export interface RunFeedbackInput {
  rpe_real?: number
  rating?: number
  cumplimiento?: number
  molestias?: string[]
  feedback_notas?: string | null
}

/**
 * Create a new free run session.
 * Returns the created session object (with id).
 */
export async function createRunSession(startedAt: string): Promise<RunSession> {
  return apiPost('/api/runs/', {
    started_at: startedAt,
    session_type: 'free',
  })
}

/**
 * Send a batch of GPS points for an active run session.
 * Mapea los nombres del dispositivo (latitude/longitude/...) al contrato del
 * backend (lat/lng/altitude_m/accuracy_m). `accuracy_m` es obligatorio en el
 * backend: si no hay precisión, se envía un valor alto (queda fuera del cálculo
 * de métricas, que filtra accuracy_m ≤ 20).
 */
export async function sendRunPoints(
  sessionId: number,
  points: RunPointInput[],
): Promise<any> {
  const payload = points.map(p => ({
    lat: p.latitude,
    lng: p.longitude,
    altitude_m: p.altitude ?? null,
    accuracy_m: p.accuracy ?? 999,
    timestamp: p.timestamp,
  }))
  return apiPost(`/api/runs/${sessionId}/points/`, { points: payload })
}

/**
 * Mark a run session as completed.
 */
export async function completeRunSession(
  sessionId: number,
  endedAt: string,
): Promise<RunSession> {
  return apiPatch(`/api/runs/${sessionId}/`, {
    status: 'completed',
    ended_at: endedAt,
  })
}

/**
 * Fetch a single run session by id (for summary screen).
 */
export async function getRunSession(sessionId: number): Promise<RunSession> {
  return apiGet(`/api/runs/${sessionId}/`)
}

/**
 * Registra el feedback post-carrera sobre la RunSession.
 * Idempotente en el backend (reenviar sobreescribe).
 */
export async function sendRunFeedback(
  sessionId: number,
  feedback: RunFeedbackInput,
): Promise<RunSession> {
  return apiPost(`/api/runs/${sessionId}/feedback/`, feedback)
}
