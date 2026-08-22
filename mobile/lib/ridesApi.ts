// ─── Rides API (/api/rides/*) ───────────────────────────────────────────────
//
// CRUD de salidas de ciclismo. Espejo de runsApi.ts, con una diferencia real:
// sin RidePoint (sin tracking GPS en v1 — decisión de producto 2026-08-22),
// las métricas agregadas (potencia/cadencia/FC/distancia/desnivel) las manda
// el CLIENTE al completar, no se calculan de una traza. `total_duration_s` lo
// fija siempre el backend desde started_at/ended_at — no se manda ni se lee
// de la respuesta como algo que el cliente controle.

import { apiGet, apiPatch, apiPost } from './api'

export interface RideSession {
  id: number
  status: 'active' | 'completed' | 'paused'
  started_at: string
  ended_at: string | null
  session_type: string
  // Nombres exactos del backend (RideSessionDetailSerializer). Todas
  // opcionales porque, sin potenciómetro (el caso más común), quedan null.
  total_distance_m?: number | null
  total_duration_s?: number
  avg_power_w?: number | null
  normalized_power_w?: number | null
  avg_cadence_rpm?: number | null
  avg_heart_rate?: number | null
  elevation_gain_m?: number | null
  calories_burned?: number | null
  // Feedback post-salida (null mientras no se haya registrado).
  rpe_real?: number | null
  rating?: number | null
  cumplimiento?: number | null
  molestias?: string[]
  feedback_notas?: string | null
  feedback_at?: string | null
  // Objetivo de la sesión inteligente vinculada (null en salidas libres).
  planned?: {
    tipo_sesion: string
    titulo: string
    zona_principal: string
    rpe_target: number | null
    fc_objetivo: [number, number] | null         // bpm [lo, hi]
    potencia_objetivo: [number, number] | null   // W [lo, hi]
  } | null
  // Sin fotos: a diferencia de RunSession, el backend no expone fotos para
  // RideSession todavía (SessionPhoto está cableado a run_session con un
  // constraint compartido — ver cycling/serializers.py). No agregar este
  // campo hasta que el backend lo sirva de verdad.
}

export interface RideFeedbackInput {
  rpe_real?: number
  rating?: number
  cumplimiento?: number
  molestias?: string[]
  feedback_notas?: string | null
}

// Métricas agregadas que el cliente puede reportar al completar — el
// potenciómetro/pulsómetro propio, o entrada manual. Todas opcionales.
export interface RideCompleteMetrics {
  total_distance_m?: number
  avg_power_w?: number
  normalized_power_w?: number
  avg_cadence_rpm?: number
  avg_heart_rate?: number
  elevation_gain_m?: number
  calories_burned?: number
}

/** Crea una salida libre nueva. Devuelve la sesión creada (con id). */
export async function createRideSession(startedAt: string): Promise<RideSession> {
  return apiPost('/api/rides/', {
    started_at: startedAt,
    session_type: 'free',
  })
}

/**
 * Marca una salida como completada. `metrics` es lo que el dispositivo del
 * ciclista pudo reportar (o lo que el usuario ingresó a mano) — sin
 * potenciómetro, se puede completar solo con avg_heart_rate o incluso vacío.
 */
export async function completeRideSession(
  sessionId: number,
  endedAt: string,
  metrics: RideCompleteMetrics = {},
): Promise<RideSession> {
  return apiPatch(`/api/rides/${sessionId}/`, {
    status: 'completed',
    ended_at: endedAt,
    ...metrics,
  })
}

/** Sesión de ciclismo por id (para la pantalla de resumen). */
export async function getRideSession(sessionId: number): Promise<RideSession> {
  return apiGet(`/api/rides/${sessionId}/`)
}

/** Feedback post-salida. Idempotente en el backend (reenviar sobreescribe). */
export async function sendRideFeedback(
  sessionId: number,
  feedback: RideFeedbackInput,
): Promise<RideSession> {
  return apiPost(`/api/rides/${sessionId}/feedback/`, feedback)
}
