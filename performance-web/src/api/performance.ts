// Stubs del cliente de API para los recursos del panel. Definen el contrato con
// el backend; las pantallas todavía NO los consumen (fuera de alcance del
// andamiaje), pero quedan listos para cablear.

import { api } from './client'
import type {
  CenterAthlete, ModuleId, SportsCenter, TestCatalogItem, TestComputeResponse,
  TrainingPlan, TrainingPlanDetail, Mesocycle, Microcycle,
} from '@/types'

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

// Ficha individual del atleta del centro. `athleteId` es el id del vínculo
// CenterAthlete (no el del usuario). La foto viaja en el payload como data URL.
export async function getCenterAthlete(centerId: number, athleteId: number): Promise<CenterAthlete> {
  const res = await api.get<CenterAthlete>(`/performance/centers/${centerId}/athletes/${athleteId}/`)
  return res.data
}

// Edita la ficha (incluida la foto). PATCH: solo manda los campos a cambiar.
export async function updateCenterAthlete(
  centerId: number,
  athleteId: number,
  payload: Partial<Pick<CenterAthlete, 'dorsal' | 'posicion' | 'grupo' | 'estado' | 'foto'>>,
): Promise<CenterAthlete> {
  const res = await api.patch<CenterAthlete>(
    `/performance/centers/${centerId}/athletes/${athleteId}/`, payload,
  )
  return res.data
}

export async function deleteCenterAthlete(centerId: number, athleteId: number): Promise<void> {
  await api.delete(`/performance/centers/${centerId}/athletes/${athleteId}/`)
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

// ── Módulo TEST: catálogo de calculadoras y cálculo en servidor ──────────────
// El catálogo trae el `input_schema` con el que el frontend pinta cada formulario;
// el cálculo SIEMPRE ocurre en el servidor (el cliente solo envía inputs crudos).
export async function fetchTestCatalog(familia?: string): Promise<TestCatalogItem[]> {
  const res = await api.get<TestCatalogItem[]>('/performance/tests/catalog/', {
    params: familia ? { familia } : undefined,
  })
  return res.data
}

export async function computeTest(
  test_slug: string,
  inputs: Record<string, unknown>,
): Promise<TestComputeResponse> {
  const res = await api.post<TestComputeResponse>('/performance/tests/compute/', {
    test_slug,
    inputs,
  })
  return res.data
}

// ── Módulo PLANIFICACIÓN: periodización (macro → meso → micro) ────────────────
const planBase = (centerId: number) => `/performance/centers/${centerId}/planificacion`

export async function listPlans(centerId: number): Promise<TrainingPlan[]> {
  const res = await api.get<TrainingPlan[]>(`${planBase(centerId)}/`)
  return res.data
}

export async function createPlan(
  centerId: number,
  payload: Partial<TrainingPlan> & { nombre: string; fecha_inicio: string },
): Promise<TrainingPlan> {
  const res = await api.post<TrainingPlan>(`${planBase(centerId)}/`, payload)
  return res.data
}

export async function getPlanTree(centerId: number, planId: number): Promise<TrainingPlanDetail> {
  const res = await api.get<TrainingPlanDetail>(`${planBase(centerId)}/${planId}/`)
  return res.data
}

export async function deletePlan(centerId: number, planId: number): Promise<void> {
  await api.delete(`${planBase(centerId)}/${planId}/`)
}

export async function createMeso(
  centerId: number, planId: number, payload: Partial<Mesocycle>,
): Promise<Mesocycle> {
  const res = await api.post<Mesocycle>(`${planBase(centerId)}/${planId}/mesociclos/`, payload)
  return res.data
}

export async function updateMeso(
  centerId: number, planId: number, mesoId: number, payload: Partial<Mesocycle>,
): Promise<Mesocycle> {
  const res = await api.patch<Mesocycle>(`${planBase(centerId)}/${planId}/mesociclos/${mesoId}/`, payload)
  return res.data
}

export async function deleteMeso(centerId: number, planId: number, mesoId: number): Promise<void> {
  await api.delete(`${planBase(centerId)}/${planId}/mesociclos/${mesoId}/`)
}

export async function createMicro(
  centerId: number, planId: number, mesoId: number, payload: Partial<Microcycle>,
): Promise<Microcycle> {
  const res = await api.post<Microcycle>(
    `${planBase(centerId)}/${planId}/mesociclos/${mesoId}/microciclos/`, payload,
  )
  return res.data
}

export async function updateMicro(
  centerId: number, planId: number, mesoId: number, microId: number, payload: Partial<Microcycle>,
): Promise<Microcycle> {
  const res = await api.patch<Microcycle>(
    `${planBase(centerId)}/${planId}/mesociclos/${mesoId}/microciclos/${microId}/`, payload,
  )
  return res.data
}

export async function deleteMicro(
  centerId: number, planId: number, mesoId: number, microId: number,
): Promise<void> {
  await api.delete(`${planBase(centerId)}/${planId}/mesociclos/${mesoId}/microciclos/${microId}/`)
}

// ── Módulo PSICOLÓGICO: índice de bienestar (cálculo en servidor) ─────────────
export async function computeWellness(
  values: { sueno: number; fatiga: number; estres: number; dolor_muscular: number; animo: number },
): Promise<{ indice_bienestar: number; estado: 'ok' | 'duda' | 'alerta' }> {
  const res = await api.post('/performance/psicologico/wellness/compute/', values)
  return res.data
}

// ── Módulo PSICOLÓGICO: cuestionarios validados (scoring en servidor) ─────────
export interface PsychSubscale { key: string; label: string; min: number; max: number; dir: 'neg' | 'pos' }
export interface PsychInstrument { slug: string; nombre: string; descripcion: string; subescalas: PsychSubscale[] }
export interface PsychScore {
  instrument: string
  nombre: string
  subescalas: Record<string, number>
  resultados: { indice: number; indice_label: string; interpretacion: string }
}

export async function fetchInstruments(): Promise<PsychInstrument[]> {
  const res = await api.get<PsychInstrument[]>('/performance/psicologico/instruments/')
  return res.data
}

export async function scoreInstrument(
  instrument: string, subescalas: Record<string, number>,
): Promise<PsychScore> {
  const res = await api.post<PsychScore>('/performance/psicologico/instruments/score/', { instrument, subescalas })
  return res.data
}
