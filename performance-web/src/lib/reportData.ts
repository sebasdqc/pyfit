// Agrega los datos REALES de un centro (o de la demo) para los informes
// exportables. Convierte las respuestas del servidor a las mismas formas de vista
// que usan los módulos, de modo que el informe y la pantalla comparten modelo.
// Solo incluye datos reales (roster + registros de módulo); NO usa las métricas
// sintéticas de squadSynth, para no presentar datos inventados en un informe.

import type { Athlete } from './mockSquad'
import type { Injury } from './mockInjuries'
import type { SavedTest } from './testStore'
import type { SavedWellness } from './wellnessStore'
import type { SavedPsych } from './psychStore'
import { loadInjuries } from './injuryStore'
import { loadTests } from './testStore'
import { loadWellness } from './wellnessStore'
import { loadPsych } from './psychStore'
import { listInjuries, listTests, listWellness, listPsych, listEvents } from '@/api/performance'
import type {
  CalendarEvent, InjuryReport, PhysicalTestRecord, PsychRecord, WellnessRecord,
} from '@/types'

export interface ReportData {
  injuries: Injury[]
  tests: SavedTest[]
  wellness: SavedWellness[]
  psych: SavedPsych[]
  events: CalendarEvent[]
}

function rtpFrom(estado: string, fechaAlta: string | null): string {
  if (estado === 'alta') return 'Disponible'
  if (!fechaAlta) return '—'
  const d = Math.ceil((new Date(fechaAlta).getTime() - Date.now()) / 86400000)
  return d > 0 ? `~${d}d` : 'Por revisar'
}

// ── Mapeos servidor → vista (athlete=userId se traduce al id del vínculo) ─────
function injView(r: InjuryReport, u: Map<number, string>): Injury | null {
  const athleteId = u.get(r.athlete)
  if (!athleteId) return null
  return {
    id: String(r.id), athleteId, zona: r.zona, vista: r.vista, x: r.zona_x, y: r.zona_y,
    tipo: r.tipo, severidad: r.severidad, estado: r.estado, fecha: r.fecha,
    diasBaja: r.dias_baja, rtp: rtpFrom(r.estado, r.fecha_alta_estimada), mecanismo: r.mecanismo,
  }
}
function testView(r: PhysicalTestRecord, u: Map<number, string>): SavedTest | null {
  const athleteId = u.get(r.athlete)
  if (!athleteId) return null
  return {
    id: String(r.id), athleteId, slug: r.test_slug, nombre: r.nombre, familia: r.categoria,
    fecha: r.fecha, inputs: r.inputs, resultados: r.resultados, guardadoEn: r.created_at,
  }
}
function wellView(r: WellnessRecord, u: Map<number, string>): SavedWellness | null {
  const athleteId = u.get(r.athlete)
  if (!athleteId) return null
  return {
    id: String(r.id), athleteId, fecha: r.fecha, sueno: r.sueno, fatiga: r.fatiga,
    estres: r.estres, dolor_muscular: r.dolor_muscular, animo: r.animo,
    indice_bienestar: r.indice_bienestar, estado: r.estado, guardadoEn: r.created_at,
  }
}
function psyView(r: PsychRecord, u: Map<number, string>): SavedPsych | null {
  const athleteId = u.get(r.athlete)
  if (!athleteId) return null
  return {
    id: String(r.id), athleteId, instrument: r.instrument, nombre: r.instrument,
    fecha: r.fecha, subescalas: r.subescalas, resultados: r.resultados, guardadoEn: r.created_at,
  }
}

const settled = <T>(r: PromiseSettledResult<T[]>): T[] => (r.status === 'fulfilled' ? r.value : [])

// Roster real → datos del servidor. Cada módulo se carga de forma tolerante: si el
// usuario no tiene acceso a un módulo (403) o falla la red, esa sección va vacía.
export async function fetchReportData(centerId: number, squad: Athlete[]): Promise<ReportData> {
  const u = new Map<number, string>()
  for (const a of squad) if (a.userId != null) u.set(a.userId, a.id)
  const [inj, tst, wel, psy, evs] = await Promise.allSettled([
    listInjuries(centerId), listTests(centerId), listWellness(centerId), listPsych(centerId), listEvents(centerId),
  ])
  return {
    injuries: settled(inj).map((r) => injView(r, u)).filter(Boolean) as Injury[],
    tests: settled(tst).map((r) => testView(r, u)).filter(Boolean) as SavedTest[],
    wellness: settled(wel).map((r) => wellView(r, u)).filter(Boolean) as SavedWellness[],
    psych: settled(psy).filter((r) => r.instrument).map((r) => psyView(r, u)).filter(Boolean) as SavedPsych[],
    events: settled(evs),
  }
}

// Demo (sin centro) → datos de los stores locales (sembrados de la muestra).
export function demoReportData(): ReportData {
  return {
    injuries: loadInjuries(),
    tests: loadTests(),
    wellness: loadWellness(),
    psych: loadPsych(),
    events: [],
  }
}

// El último check-in de bienestar por atleta (para el resumen de equipo).
export function latestWellnessByAthlete(data: ReportData): Map<string, SavedWellness> {
  const m = new Map<string, SavedWellness>()
  for (const w of data.wellness) {
    const prev = m.get(w.athleteId)
    if (!prev || w.fecha > prev.fecha) m.set(w.athleteId, w)
  }
  return m
}
