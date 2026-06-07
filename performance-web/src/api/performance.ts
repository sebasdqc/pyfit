// Stubs del cliente de API para los recursos del panel. Definen el contrato con
// el backend; las pantallas todavía NO los consumen (fuera de alcance del
// andamiaje), pero quedan listos para cablear.

import { api } from './client'
import type {
  CenterAthlete, CenterRole, CenterStaff, ModuleId, SportsCenter, TestCatalogItem, TestComputeResponse,
  TrainingPlan, TrainingPlanDetail, Mesocycle, Microcycle,
  TacticalPlay, Escena, WellnessRecord, CalendarEvent,
} from '@/types'

// ── Centros ──────────────────────────────────────────────────────────────────
export async function listCenters(): Promise<SportsCenter[]> {
  const res = await api.get<SportsCenter[]>('/performance/centers/')
  return res.data
}

// Crea un centro. El backend deja al creador como director técnico del centro
// (membresía automática), por lo que tras crearlo conviene refrescar /me/.
export type CreateCenterPayload = {
  nombre: string
  slug: string
  disciplina?: string
  ciudad?: string
  pais?: string
}
export async function createCenter(payload: CreateCenterPayload): Promise<SportsCenter> {
  const res = await api.post<SportsCenter>('/performance/centers/', payload)
  return res.data
}

export async function getCenter(centerId: number): Promise<SportsCenter> {
  const res = await api.get<SportsCenter>(`/performance/centers/${centerId}/`)
  return res.data
}

// ── Staff del centro (CenterMembership) ──────────────────────────────────────
export async function listStaff(centerId: number): Promise<CenterStaff[]> {
  const res = await api.get<CenterStaff[]>(`/performance/centers/${centerId}/staff/`)
  return res.data
}

// Alta de staff por email: el backend vincula o crea la cuenta (necesita
// contraseña temporal para entrar al panel) y siembra los módulos según el rol.
export type StaffPayload = { email: string; nombre: string; rol: CenterRole; password: string }
export async function createStaff(centerId: number, payload: StaffPayload): Promise<CenterStaff> {
  const res = await api.post<CenterStaff>(`/performance/centers/${centerId}/staff/`, payload)
  return res.data
}

// ── Atletas (los registra el director técnico) ───────────────────────────────
export async function listCenterAthletes(centerId: number): Promise<CenterAthlete[]> {
  const res = await api.get<CenterAthlete[]>(`/performance/centers/${centerId}/athletes/`)
  return res.data
}

// Alta de atleta por email: el backend vincula o crea la cuenta de consumo (sin
// contraseña; la reclama luego en la app móvil).
export type AthletePayload = {
  email: string
  nombre: string
  dorsal?: string
  posicion?: string
  grupo?: string
  estado?: CenterAthlete['estado']
}
export async function createCenterAthlete(centerId: number, payload: AthletePayload): Promise<CenterAthlete> {
  const res = await api.post<CenterAthlete>(`/performance/centers/${centerId}/athletes/`, payload)
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

// ── Simulador: pizarra táctica (jugadas con coordenadas normalizadas) ─────────
const simBase = (centerId: number) => `/performance/centers/${centerId}/simulador`

export type PlayPayload = {
  nombre: string
  descripcion?: string
  formacion?: string
  campo?: string
  escena: Escena
}

export async function listPlays(centerId: number): Promise<TacticalPlay[]> {
  const res = await api.get<TacticalPlay[]>(`${simBase(centerId)}/`)
  return res.data
}

export async function createPlay(centerId: number, payload: PlayPayload): Promise<TacticalPlay> {
  const res = await api.post<TacticalPlay>(`${simBase(centerId)}/`, payload)
  return res.data
}

export async function updatePlay(
  centerId: number, playId: number, payload: Partial<PlayPayload>,
): Promise<TacticalPlay> {
  const res = await api.patch<TacticalPlay>(`${simBase(centerId)}/${playId}/`, payload)
  return res.data
}

export async function deletePlay(centerId: number, playId: number): Promise<void> {
  await api.delete(`${simBase(centerId)}/${playId}/`)
}

// ── Calendario: temporadas, torneos, partidos y eventos del centro ────────────
const calBase = (centerId: number) => `/performance/centers/${centerId}/calendario`

// Campos editables del evento (el resto los pone el servidor).
export type EventPayload = Partial<
  Pick<
    CalendarEvent,
    | 'tipo' | 'titulo' | 'descripcion' | 'fecha_inicio' | 'fecha_fin'
    | 'hora_inicio' | 'todo_el_dia' | 'ubicacion' | 'grupo' | 'rival' | 'localia'
  >
> & { titulo: string; fecha_inicio: string; tipo: CalendarEvent['tipo'] }

export async function listEvents(centerId: number): Promise<CalendarEvent[]> {
  const res = await api.get<CalendarEvent[]>(`${calBase(centerId)}/`)
  return res.data
}

export async function createEvent(centerId: number, payload: EventPayload): Promise<CalendarEvent> {
  const res = await api.post<CalendarEvent>(`${calBase(centerId)}/`, payload)
  return res.data
}

export async function updateEvent(
  centerId: number, eventId: number, payload: Partial<EventPayload>,
): Promise<CalendarEvent> {
  const res = await api.patch<CalendarEvent>(`${calBase(centerId)}/${eventId}/`, payload)
  return res.data
}

export async function deleteEvent(centerId: number, eventId: number): Promise<void> {
  await api.delete(`${calBase(centerId)}/${eventId}/`)
}

// ── Módulo PSICOLÓGICO: check-ins de bienestar por atleta (API real) ─────────
// `athlete` = id de USUARIO real. El servidor calcula y persiste el índice.
export async function listWellness(centerId: number, athleteId?: number): Promise<WellnessRecord[]> {
  const res = await api.get<WellnessRecord[]>(`/performance/centers/${centerId}/psicologico/wellness/`, {
    params: athleteId != null ? { athlete: athleteId } : undefined,
  })
  return res.data
}

export type WellnessPayload = {
  athlete: number
  fecha: string
  sueno: number
  fatiga: number
  estres: number
  dolor_muscular: number
  animo: number
  notas?: string
}
export async function createWellness(centerId: number, payload: WellnessPayload): Promise<WellnessRecord> {
  const res = await api.post<WellnessRecord>(`/performance/centers/${centerId}/psicologico/wellness/`, payload)
  return res.data
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
