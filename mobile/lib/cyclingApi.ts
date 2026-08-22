// ─── Ciclismo inteligente API (/api/cycling/*) ─────────────────────────────────
//
// Cliente del motor de ciclismo inteligente (backend ai_cycling). Espejo de
// runningApi.ts. El motor DECIDE los números (FC/potencia/RPE/estructura) y el
// LLM solo redacta; aquí solo consumimos lo ya resuelto.
//
// ⚠️ Ancla FC + RPE, potencia OPCIONAL: la mayoría de quien pedalea no tiene
// potenciómetro. `potencia_objetivo` es null en ese caso (el caso ESPERADO,
// no un estado degradado) — nunca asumas que viene poblado.
// Sin distancia: ciclismo se prescribe en TIEMPO, no hay distancia_total_km
// (a diferencia de RunWorkout). Sin `indoor`: la sesión no oculta nada en
// rodillo, FC/potencia son igual de válidos ahí que en ruta.

import { apiGet, apiPost } from './api'

// Un segmento de una fase: el bloque de trabajo con su objetivo.
export interface RideSegment {
  repeticiones: number
  trabajo: string                     // "10 min", "45 s"
  recuperacion: string | null         // "5 min pedaleo suave" | null
  fc_objetivo: string | null          // "148–160 ppm" | null (sin FC)
  potencia_objetivo: string | null    // "210–225 W" | null (sin potenciómetro — el caso común)
  rpe: number
  cue: string
}

export interface RideFase {
  nombre: string                      // "Calentamiento" | "Principal" | "Enfriamiento"
  segmentos: RideSegment[]
}

// JSON que arma el backend (números del motor + texto del LLM).
export interface RideWorkout {
  titulo: string
  objetivo_sesion: string
  tipo_sesion: string
  zona_principal: string              // 'Z1'..'Z7' | 'SS' (sweet spot)
  rpe_target: number
  duracion_total_min: number
  fases: RideFase[]
  nota_del_coach: string
  decisions_log?: { icon: string; text: string }[]
}

export interface PlannedRide {
  id: number
  fecha: string
  tipo_sesion: string
  es_calidad: boolean
  zona_principal: string
  duracion_objetivo_min: number | null
  rpe_target: number | null
  estructura_fases: Record<string, any>
  respuesta_ia: RideWorkout
  estado: 'planificada' | 'ajustada' | 'completada' | 'saltada'
  ajuste_aplicado: string
  ride_session: number | null
  created_at: string
}

// La generación puede devolver una sesión planificada O un día de descanso.
export interface GeneratedRide extends Partial<PlannedRide> {
  es_rest?: boolean
  respuesta_ia: RideWorkout
}

export interface CyclistZones {
  hr: Record<string, [number, number]> | null      // ancla primaria
  power: Record<string, [number, number]> | null   // solo si hay FTP (potenciómetro)
  metodo_hr: string | null                          // 'pct_fthr' | 'karvonen'... | null
  metodo_power: string | null                       // 'pct_ftp' | null
}

export interface CyclistProfile {
  fthr_bpm: number | null
  ftp_w: number | null
  fc_max: number | null
  fc_reposo: number | null
  fc_max_es_estimada: boolean
  volumen_semanal_base_horas: number | null
  zonas: CyclistZones
  fuente_baseline: string
  confianza: 'alta' | 'media' | 'baja'
  fecha_calculo: string | null
}

export interface RidePlan {
  id: number
  meta_tipo: string
  meta_distancia_km: number | null
  meta_fecha: string | null
  meta_competition: number | null
  fase_actual: string
  semana_actual: number
  total_semanas: number | null
  horas_objetivo_semana: number
  dias_semana: number
  dias_preferidos: number[]
  is_active: boolean
  started_at: string
  week_start: string
}

// ── Perfil / baseline ──
export async function getCyclistProfile(): Promise<CyclistProfile> {
  return apiGet('/api/cycling/profile/')
}

export async function estimateCyclingBaseline(
  declaredTest?: { avg_power_w?: number; avg_hr_20min?: number },
): Promise<CyclistProfile> {
  return apiPost('/api/cycling/baseline/estimate/', declaredTest ? { declared_test: declaredTest } : {})
}

// ── Plan / microciclo ──
export async function getRidePlan(): Promise<RidePlan> {
  return apiGet('/api/cycling/plan/')
}

export async function createRidePlan(body: Partial<RidePlan>): Promise<RidePlan> {
  return apiPost('/api/cycling/plan/', body)
}

export async function getCyclingMicrocycle(): Promise<{ plan: RidePlan; sesiones: PlannedRide[] }> {
  return apiGet('/api/cycling/plan/microcycle/')
}

// ── Generación / ejecución ──
// Sin parámetro indoor (a diferencia de generateRunSession) — nada que ocultar en rodillo.
export async function generateRideSession(): Promise<GeneratedRide> {
  return apiPost('/api/cycling/sessions/generate/', {})
}

export async function getRideSessionToday(): Promise<GeneratedRide> {
  return apiGet('/api/cycling/sessions/today/')
}

export async function completePlannedRide(
  plannedId: number,
  rideSessionId: number,
): Promise<PlannedRide> {
  return apiPost(`/api/cycling/sessions/${plannedId}/complete/`, {
    ride_session_id: rideSessionId,
  })
}
