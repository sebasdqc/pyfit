// ─── Runs API ─────────────────────────────────────────────────────────────────

import { apiGet, apiPatch, apiPost } from './api'

export interface RunPoint {
  latitude: number
  longitude: number
  altitude?: number | null
  accuracy?: number | null
  timestamp: string
}

export interface RunSession {
  id: number
  status: 'active' | 'completed' | 'paused'
  started_at: string
  ended_at: string | null
  session_type: string
  total_distance?: number
  duration_seconds?: number
  avg_pace?: number
  best_pace?: number
  elevation_gain?: number
  calories?: number
  points?: RunPoint[]
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
 */
export async function sendRunPoints(
  sessionId: number,
  points: RunPoint[],
): Promise<any> {
  return apiPost(`/api/runs/${sessionId}/points/`, { points })
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
