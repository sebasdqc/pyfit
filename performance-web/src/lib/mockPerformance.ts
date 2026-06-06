// Datos de rendimiento derivados de la plantilla (esta fase aún sin API). Para
// cada atleta se calculan los parámetros más usados en el campo: carga interna
// (sRPE: aguda/crónica/ACWR/monotonía/strain), neuromuscular (CMJ), autonómico
// (HRV), readiness y carga externa tipo GPS (distancia/HSR/sprints/Player Load/
// velocidad máx), más una serie semanal de las últimas 10 semanas.
//
// Todo es DETERMINISTA (derivado de los campos del atleta + un hash de su id),
// así que no cambia entre renders y respeta las ediciones de la plantilla.

import type { Athlete } from './mockSquad'

export const PERF_WEEKS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']

export interface PerfMetrics {
  cargaAguda: number // UA (7 días)
  cargaCronica: number // UA (28 días)
  acwr: number
  monotonia: number // Foster
  strain: number
  cmj: number // cm
  hrv: number // ms
  readiness: number // 0–100
  maxVel: number // km/h
  distancia: number // km/sesión
  hsr: number // m (high-speed running)
  sprints: number // nº
  playerLoad: number // AU
}

export interface PerfPoint {
  semana: string
  aguda: number
  cronica: number
  cmj: number
  hrv: number
  readiness: number
}

export interface AthletePerf {
  id: string
  nombre: string
  posicion: string
  estado: Athlete['estado']
  metrics: PerfMetrics
  series: PerfPoint[]
}

const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
// Ruido determinista 0..1 a partir de una semilla.
const noise = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function athletePerf(a: Athlete): AthletePerf {
  const h = hash(a.id)
  const r = a.radar

  const cargaCronica = a.cargaSemanal
  const acwr = a.acwr
  const cargaAguda = Math.round(cargaCronica * acwr)
  const monotonia = round1(clamp(1.1 + noise(h) * 0.9 + (acwr - 1) * 0.4, 0.8, 2.6))
  const strain = Math.round(cargaCronica * monotonia)
  const cmj = round1(30 + r.potencia * 0.12 + r.agilidad * 0.04 + noise(h + 1) * 2)
  const hrv = Math.round(58 + r.recuperacion * 0.45 - (acwr - 1) * 30 + noise(h + 2) * 6)
  const readiness = Math.round(clamp(55 + a.bienestar * 5 - (acwr - 1) * 45 + noise(h + 8) * 6, 0, 100))
  const maxVel = round1(29 + r.velocidad * 0.06 + noise(h + 3) * 0.8)
  const distancia = round1(5 + r.resistencia * 0.06 + noise(h + 4) * 1)
  const hsr = Math.round(280 + r.velocidad * 4 + noise(h + 5) * 80)
  const sprints = Math.round(8 + r.velocidad * 0.22 + noise(h + 7) * 4)
  const playerLoad = Math.round(320 + cargaCronica * 0.25 + noise(h + 6) * 60)

  const series: PerfPoint[] = PERF_WEEKS.map((semana, i) => {
    const last = i === PERF_WEEKS.length - 1
    const trend = 0.85 + 0.15 * (i / 9) // construcción gradual de la carga
    const cr = last ? cargaCronica : Math.round(cargaCronica * trend * (1 + (noise(h + i) - 0.5) * 0.05))
    const ag = last ? cargaAguda : Math.round(cr * (0.85 + noise(h + i + 30) * 0.5))
    const cj = last ? cmj : round1(cmj + (noise(h + i + 60) - 0.5) * 5)
    const hv = last ? hrv : Math.round(hrv + (noise(h + i + 90) - 0.5) * 14)
    const rd = last ? readiness : Math.round(clamp(readiness + (noise(h + i + 120) - 0.5) * 18, 0, 100))
    return { semana, aguda: ag, cronica: cr, cmj: cj, hrv: hv, readiness: rd }
  })

  return {
    id: a.id,
    nombre: a.nombre,
    posicion: a.posicion,
    estado: a.estado,
    metrics: { cargaAguda, cargaCronica, acwr: round2(acwr), monotonia, strain, cmj, hrv, readiness, maxVel, distancia, hsr, sprints, playerLoad },
    series,
  }
}

export function buildPerformance(squad: Athlete[]): AthletePerf[] {
  return squad.map(athletePerf)
}

// Serie de carga del equipo (media de aguda/crónica por semana).
export function teamLoadSeries(perfs: AthletePerf[]): { semana: string; aguda: number; cronica: number }[] {
  return PERF_WEEKS.map((semana, i) => ({
    semana,
    aguda: Math.round(avg(perfs.map((p) => p.series[i].aguda))),
    cronica: Math.round(avg(perfs.map((p) => p.series[i].cronica))),
  }))
}

// Promedios del equipo de las métricas clave (para los KPIs de la vista general).
export function teamAverages(perfs: AthletePerf[]) {
  const m = (sel: (p: AthletePerf) => number) => avg(perfs.map(sel))
  return {
    cargaAguda: Math.round(m((p) => p.metrics.cargaAguda)),
    acwr: round2(m((p) => p.metrics.acwr)),
    cmj: round1(m((p) => p.metrics.cmj)),
    hrv: Math.round(m((p) => p.metrics.hrv)),
    monotonia: round1(m((p) => p.metrics.monotonia)),
    readiness: Math.round(m((p) => p.metrics.readiness)),
  }
}
