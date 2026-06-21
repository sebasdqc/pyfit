// ─── Running inteligente API (/api/running/*) ──────────────────────────────────
//
// Cliente del motor de running inteligente (backend ai_running). Espejo de
// runsApi.ts. El motor DECIDE los números (ritmos/FC/RPE/estructura) y el LLM solo
// redacta; aquí solo consumimos lo ya resuelto.

import { apiGet, apiPost, apiPatch } from './api'

// Un segmento de una fase: el bloque de trabajo con su objetivo.
export interface RunSegment {
  repeticiones: number
  trabajo: string                 // "5 km", "20 min", "45 s"
  recuperacion: string | null     // "2 min trote suave" | null
  pace_objetivo: string | null    // "4:55–5:05 /km" | null (indoor / sin baseline)
  fc_objetivo: string | null      // "160–172 ppm" | null (sin sensor)
  rpe: number
  cue: string
}

export interface RunFase {
  nombre: string                  // "Calentamiento" | "Principal" | "Enfriamiento"
  segmentos: RunSegment[]
}

// JSON que arma el backend (numbers del motor + texto del LLM).
export interface RunWorkout {
  titulo: string
  objetivo_sesion: string
  tipo_sesion: string
  zona_principal: string
  rpe_target: number
  duracion_total_min: number
  distancia_total_km: number
  fases: RunFase[]
  nota_del_coach: string
  decisions_log?: { icon: string; text: string }[]
}

export interface PlannedRun {
  id: number
  fecha: string
  tipo_sesion: string
  es_calidad: boolean
  zona_principal: string
  duracion_objetivo_min: number | null
  distancia_objetivo_km: number | null
  rpe_target: number | null
  estructura_fases: Record<string, any>
  respuesta_ia: RunWorkout
  estado: 'planificada' | 'ajustada' | 'completada' | 'saltada'
  ajuste_aplicado: string
  run_session: number | null
  created_at: string
}

// La generación puede devolver una sesión planificada O un día de descanso.
export interface GeneratedRun extends Partial<PlannedRun> {
  es_rest?: boolean
  respuesta_ia: RunWorkout
}

export interface RunnerZones {
  pace: Record<string, [number, number]> | null
  hr: Record<string, [number, number]> | null
  metodo_pace: string | null
  metodo_hr: string | null
}

export interface RunnerProfile {
  threshold_pace_s_km: number | null
  vo2_estimado: number | null
  fc_max: number | null
  fc_reposo: number | null
  fc_max_es_estimada: boolean
  volumen_semanal_base_km: number | null
  zonas: RunnerZones
  fuente_baseline: string
  confianza: 'alta' | 'media' | 'baja'
  n_runs_baseline: number
  fecha_calculo: string | null
}

export interface RunningPlan {
  id: number
  meta_tipo: string
  meta_distancia_km: number | null
  meta_fecha: string | null
  meta_competition: number | null
  fase_actual: string
  semana_actual: number
  total_semanas: number | null
  km_objetivo_semana: number
  dias_semana: number
  dias_preferidos: number[]
  is_active: boolean
  started_at: string
  week_start: string
}

// ── Perfil / baseline ──
export async function getRunnerProfile(): Promise<RunnerProfile> {
  return apiGet('/api/running/profile/')
}

export async function estimateBaseline(
  declared?: { tiempo_s: number; distancia_km: number },
): Promise<RunnerProfile> {
  return apiPost('/api/running/baseline/estimate/', declared ? { declared } : {})
}

// ── Plan / microciclo ──
export async function getRunningPlan(): Promise<RunningPlan> {
  return apiGet('/api/running/plan/')
}

export async function createRunningPlan(body: Partial<RunningPlan>): Promise<RunningPlan> {
  return apiPost('/api/running/plan/', body)
}

export async function getMicrocycle(): Promise<{ plan: RunningPlan; sesiones: PlannedRun[] }> {
  return apiGet('/api/running/plan/microcycle/')
}

// ── Generación / ejecución ──
export async function generateRunSession(indoor = false): Promise<GeneratedRun> {
  return apiPost('/api/running/sessions/generate/', { indoor })
}

export async function getRunSessionToday(): Promise<GeneratedRun> {
  return apiGet('/api/running/sessions/today/')
}

export async function completePlannedRun(
  plannedId: number,
  runSessionId: number,
): Promise<PlannedRun> {
  return apiPost(`/api/running/sessions/${plannedId}/complete/`, {
    run_session_id: runSessionId,
  })
}
