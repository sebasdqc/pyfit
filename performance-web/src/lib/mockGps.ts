// Carga externa por GPS — síntesis al estilo de los sistemas profesionales de
// campo (Catapult / STATSports). Para cada atleta y cada sesión del microciclo
// se modelan los parámetros que el cuerpo técnico mira en una exportación real:
//
//   • Volumen        → distancia total (m) y distancia por minuto (intensidad)
//   • Alta velocidad → HSR (>20 km/h), distancia de sprint (>25 km/h), nº sprints
//   • Velocidad pico → velocidad máxima (km/h)
//   • Zonas de vel.  → reparto de la distancia en 5 bandas de velocidad
//   • Carga mecánica → Player Load (AU), PL/min y su reparto por planos
//   • Acel/Decel     → recuentos por intensidad (alta/media/baja)
//   • Metabólico     → HMLD, potencia metabólica media, gasto energético
//   • Perfil temporal→ traza de velocidad de la sesión
//   • Posicionamiento→ mapa de calor (densidad sobre el campo)
//
// Todo es DETERMINISTA (derivado de los campos del atleta + un hash de su id y
// de la sesión), así que no cambia entre renders y respeta las ediciones de la
// plantilla. Es la misma filosofía de lib/mockPerformance.

import type { Athlete } from './mockSquad'

// ── Catálogo de sesiones (un microciclo tipo MD±) ────────────────────────────
export type SesionTipo = 'partido' | 'entrenamiento'

export interface GpsSessionDef {
  id: string
  label: string
  fase: string // MD, MD-3, MD+2…
  tipo: SesionTipo
  fecha: string // etiqueta legible
  duracion: number // minutos nominales
  intensidad: number // factor de dist/min respecto a un partido (0..1)
}

// Orden cronológico del microciclo: el partido abre la semana, y los días se
// nombran por su distancia al siguiente (lenguaje MD± del fútbol de élite).
export const GPS_SESSIONS: GpsSessionDef[] = [
  { id: 'md', label: 'Partido vs Rival FC', fase: 'MD', tipo: 'partido', fecha: 'Dom 7 jun', duracion: 94, intensidad: 1.0 },
  { id: 'md+2', label: 'MD+2 · Reentreno aeróbico', fase: 'MD+2', tipo: 'entrenamiento', fecha: 'Mié 10 jun', duracion: 68, intensidad: 0.72 },
  { id: 'md-4', label: 'MD-4 · Carga + Posesión', fase: 'MD-4', tipo: 'entrenamiento', fecha: 'Jue 11 jun', duracion: 82, intensidad: 0.86 },
  { id: 'md-3', label: 'MD-3 · Fuerza + Táctico', fase: 'MD-3', tipo: 'entrenamiento', fecha: 'Vie 12 jun', duracion: 76, intensidad: 0.9 },
  { id: 'md-2', label: 'MD-2 · Velocidad', fase: 'MD-2', tipo: 'entrenamiento', fecha: 'Sáb 13 jun', duracion: 64, intensidad: 0.74 },
  { id: 'md-1', label: 'MD-1 · Activación', fase: 'MD-1', tipo: 'entrenamiento', fecha: 'Dom 14 jun', duracion: 50, intensidad: 0.46 },
]

// ── Bandas de velocidad ──────────────────────────────────────────────────────
export type ZoneKey = 'z1' | 'z2' | 'z3' | 'z4' | 'z5'
export interface ZoneMeta {
  key: ZoneKey
  label: string
  rango: string
  color: string
  vmed: number // velocidad representativa de la banda (km/h) — para repartir tiempo
}
// Bandas habituales en fútbol (km/h). Ramp frío→caliente: más rápido = más cálido.
export const ZONE_META: ZoneMeta[] = [
  { key: 'z1', label: 'Caminar', rango: '0–7 km/h', color: '#4f8cff', vmed: 4 },
  { key: 'z2', label: 'Trote', rango: '7–14 km/h', color: '#32c896', vmed: 10.5 },
  { key: 'z3', label: 'Carrera', rango: '14–20 km/h', color: '#ffd23f', vmed: 16.8 },
  { key: 'z4', label: 'Alta velocidad', rango: '20–25 km/h', color: '#ffaa32', vmed: 22.4 },
  { key: 'z5', label: 'Sprint', rango: '> 25 km/h', color: '#ff4444', vmed: 28 },
]

export interface ZoneSlice {
  key: ZoneKey
  dist: number // m
  tiempo: number // s
}

export interface GpsSample {
  id: string
  userId?: number
  nombre: string
  dorsal: number
  posicion: string
  estado: Athlete['estado']
  foto?: string
  duracion: number // min reales del atleta en la sesión
  // Volumen e intensidad
  distancia: number // m
  distMin: number // m/min
  // Alta velocidad
  hsr: number // m (>20 km/h)
  sprintDist: number // m (>25 km/h)
  sprints: number
  maxVel: number // km/h
  // Carga mecánica
  playerLoad: number // AU
  plMin: number // AU/min
  planes: { anterior: number; lateral: number; vertical: number } // % del PL
  // Aceleraciones / deceleraciones
  accAlta: number
  accMedia: number
  accBaja: number
  decAlta: number
  decMedia: number
  decBaja: number
  // Metabólico
  hmld: number // m (alta carga metabólica)
  metaPower: number // W/kg medio
  energia: number // kcal
  // Detalle
  zonas: ZoneSlice[]
  trace: { t: number; v: number }[] // perfil de velocidad
  heat: number[][] // mapa de calor (filas = largo, cols = ancho), 0..1
  pctPartido: number // intensidad relativa a un partido tipo (%)
}

// ── Utilidades deterministas ─────────────────────────────────────────────────
const round = (n: number) => Math.round(n)
const round1 = (n: number) => Math.round(n * 10) / 10
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
const noise = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// ── Perfil por demarcación (valores base de un partido completo, 90') ─────────
type PosKey = 'POR' | 'DEF' | 'LAT' | 'MED' | 'EXT' | 'DEL'
interface PosProfile {
  distM: number // distancia base de partido (m)
  hsrFrac: number // fracción de la distancia en alta velocidad
  sprintFrac: number // fracción en sprint
  plPerKm: number // Player Load por km
  accBias: number // sesgo de aceleraciones/deceleraciones
}
const POS: Record<PosKey, PosProfile> = {
  POR: { distM: 5400, hsrFrac: 0.025, sprintFrac: 0.005, plPerKm: 96, accBias: 0.55 },
  DEF: { distM: 9700, hsrFrac: 0.07, sprintFrac: 0.02, plPerKm: 110, accBias: 0.85 },
  LAT: { distM: 10900, hsrFrac: 0.105, sprintFrac: 0.031, plPerKm: 118, accBias: 1.06 },
  MED: { distM: 11300, hsrFrac: 0.078, sprintFrac: 0.017, plPerKm: 115, accBias: 1.0 },
  EXT: { distM: 10600, hsrFrac: 0.125, sprintFrac: 0.039, plPerKm: 122, accBias: 1.16 },
  DEL: { distM: 10200, hsrFrac: 0.1, sprintFrac: 0.034, plPerKm: 119, accBias: 1.1 },
}

function posKey(posicion: string): PosKey {
  const p = posicion.toLowerCase()
  if (p.includes('portero')) return 'POR'
  if (p.includes('lateral')) return 'LAT'
  if (p.includes('extremo')) return 'EXT'
  if (p.includes('delanter')) return 'DEL'
  if (p.includes('medio') || p.includes('mediocentro') || p.includes('volante') || p.includes('pivote')) return 'MED'
  if (p.includes('central') || p.includes('defensa')) return 'DEF'
  return 'MED'
}
function flankOf(posicion: string): -1 | 0 | 1 {
  const p = posicion.toLowerCase()
  if (p.includes('izquierd')) return -1
  if (p.includes('derech')) return 1
  return 0
}

// Reparto del tiempo en una banda a partir de su distancia y velocidad media.
const secFor = (distM: number, vmedKmh: number) => (vmedKmh > 0 ? distM / (vmedKmh / 3.6) : 0)

// ── Mapa de calor posicional ─────────────────────────────────────────────────
const HEAT_ROWS = 15 // largo del campo (propia → rival)
const HEAT_COLS = 10 // ancho

// Centroide (cx ancho 0..1, cy largo 0..1) y dispersión por demarcación.
function heatCentroid(pos: PosKey, flank: -1 | 0 | 1, h: number) {
  const jitterX = (noise(h + 11) - 0.5) * 0.06
  const jitterY = (noise(h + 12) - 0.5) * 0.06
  // cy: 0 = portería propia, 1 = portería rival.
  const base: Record<PosKey, { cy: number; sx: number; sy: number }> = {
    POR: { cy: 0.07, sx: 0.1, sy: 0.06 },
    DEF: { cy: 0.26, sx: 0.22, sy: 0.13 },
    LAT: { cy: 0.44, sx: 0.12, sy: 0.26 },
    MED: { cy: 0.5, sx: 0.26, sy: 0.2 },
    EXT: { cy: 0.66, sx: 0.12, sy: 0.26 },
    DEL: { cy: 0.78, sx: 0.2, sy: 0.16 },
  }
  const b = base[pos]
  // El flanco define el carril (cx) de laterales y extremos; el resto, centrado.
  const flankX = flank === 0 ? 0.5 : flank === -1 ? 0.2 : 0.8
  const cx = (pos === 'LAT' || pos === 'EXT' ? flankX : 0.5) + jitterX
  return { cx: clamp(cx, 0.08, 0.92), cy: clamp(b.cy + jitterY, 0.05, 0.95), sx: b.sx, sy: b.sy }
}

function heatGrid(pos: PosKey, flank: -1 | 0 | 1, h: number): number[][] {
  const { cx, cy, sx, sy } = heatCentroid(pos, flank, h)
  const grid: number[][] = []
  let max = 0
  for (let r = 0; r < HEAT_ROWS; r++) {
    const row: number[] = []
    for (let c = 0; c < HEAT_COLS; c++) {
      const x = c / (HEAT_COLS - 1)
      const y = r / (HEAT_ROWS - 1)
      const g = Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((y - cy) ** 2) / (2 * sy * sy)))
      const n = noise(h + r * 31 + c * 7) * 0.3
      const v = g + n * g // el ruido modula donde ya hay presencia
      row.push(v)
      if (v > max) max = v
    }
    grid.push(row)
  }
  // Normaliza a 0..1
  return grid.map((row) => row.map((v) => (max > 0 ? v / max : 0)))
}

// ── Traza de velocidad de la sesión ──────────────────────────────────────────
function speedTrace(avgKmh: number, maxVel: number, duracion: number, h: number): { t: number; v: number }[] {
  const N = 64
  const out: { t: number; v: number }[] = []
  for (let i = 0; i < N; i++) {
    const t = round1((duracion * i) / (N - 1))
    const n = noise(h + i * 3.7)
    const n2 = noise(h + i * 9.1)
    let v: number
    if (n > 0.86) {
      // Pico de sprint
      v = maxVel * (0.72 + n2 * 0.28)
    } else if (n > 0.62) {
      v = avgKmh * (1.6 + n2 * 1.4)
    } else {
      v = avgKmh * (0.25 + n2 * 1.0)
    }
    out.push({ t, v: round1(clamp(v, 0, maxVel)) })
  }
  return out
}

// ── Síntesis de una sesión para un atleta ────────────────────────────────────
export function athleteGps(a: Athlete, s: GpsSessionDef): GpsSample {
  const h = hash(a.id + '|' + s.id)
  const pos = posKey(a.posicion)
  const prof = POS[pos]
  const r = a.radar

  // Minutos reales: en partido, suplentes/rotaciones; en entrenos, casi nominal.
  const durFactor = s.tipo === 'partido' ? clamp(0.55 + a.disponibilidad / 100 * 0.5, 0.4, 1) : clamp(0.92 + (noise(h + 1) - 0.5) * 0.1, 0.8, 1)
  const duracion = round(s.duracion * durFactor)

  // Intensidad (m/min): base de la demarcación, escalada por la sesión y el
  // perfil aeróbico del atleta.
  const resMod = 0.9 + r.resistencia / 100 * 0.25
  const distMinBase = prof.distM / 90
  const distMin = round(distMinBase * s.intensidad * resMod * (0.96 + noise(h + 2) * 0.08))
  const distancia = round(distMin * duracion)

  // Alta velocidad: crece con la intensidad de la sesión y la velocidad punta.
  const velMod = 0.85 + r.velocidad / 100 * 0.4
  const hsrFrac = prof.hsrFrac * s.intensidad * velMod
  const sprintFrac = prof.sprintFrac * s.intensidad * velMod
  const hsr = round(distancia * hsrFrac)
  const sprintDist = round(distancia * sprintFrac)
  const sprints = round(sprintDist / 19) // ~19 m por esfuerzo de sprint
  const maxVel = round1(clamp((29.5 + r.velocidad * 0.055) * (0.82 + s.intensidad * 0.18), 22, 36))

  // Zonas de velocidad. Z4+Z5 = hsr; Z5 = sprint; el resto se reparte.
  const z5 = sprintDist
  const z4 = Math.max(0, hsr - sprintDist)
  const sub = Math.max(0, distancia - hsr)
  const z1 = round(sub * 0.3)
  const z2 = round(sub * 0.46)
  const z3 = Math.max(0, sub - z1 - z2)
  const zoneDist: Record<ZoneKey, number> = { z1, z2, z3, z4, z5 }

  // Tiempo por zona (de la distancia y la velocidad media de la banda); el
  // remanente respecto a la duración total se imputa como tiempo de pie en Z1.
  const zonas: ZoneSlice[] = ZONE_META.map((z) => ({ key: z.key, dist: zoneDist[z.key], tiempo: round(secFor(zoneDist[z.key], z.vmed)) }))
  const movedSec = zonas.reduce((acc, z) => acc + z.tiempo, 0)
  const standSec = Math.max(0, duracion * 60 - movedSec)
  zonas[0] = { ...zonas[0], tiempo: zonas[0].tiempo + round(standSec) }

  // Carga mecánica (Player Load) y su reparto por planos.
  const plMod = 0.92 + r.potencia / 100 * 0.2
  const playerLoad = round((distancia / 1000) * prof.plPerKm * plMod * (0.85 + s.intensidad * 0.3))
  const plMin = round1(playerLoad / Math.max(1, duracion))
  const planes = {
    anterior: round1(48 + (noise(h + 3) - 0.5) * 6),
    lateral: round1(28 + (noise(h + 4) - 0.5) * 5),
    vertical: 0,
  }
  planes.vertical = round1(clamp(100 - planes.anterior - planes.lateral, 12, 30))

  // Aceleraciones / deceleraciones (recuento por intensidad). Las deceleraciones
  // superan ligeramente a las aceleraciones (frenadas tras esfuerzo).
  const accTotal = round((distancia / 1000) * 8.5 * s.intensidad * prof.accBias)
  const decTotal = round(accTotal * 1.06)
  const split = (total: number, seed: number) => {
    const alta = round(total * (0.17 + noise(seed) * 0.04))
    const media = round(total * (0.33 + noise(seed + 1) * 0.04))
    return { alta, media, baja: Math.max(0, total - alta - media) }
  }
  const acc = split(accTotal, h + 5)
  const dec = split(decTotal, h + 6)

  // Metabólico
  const hmld = round(distancia * (0.13 + 0.09 * s.intensidad) * velMod)
  const metaPower = round1(clamp(7.5 + s.intensidad * 3.2 + r.velocidad * 0.012, 6, 13))
  const energia = round(distancia * (0.95 + noise(h + 7) * 0.2))

  const avgKmh = distMin * 0.06 // m/min → km/h media
  const trace = speedTrace(avgKmh, maxVel, duracion, h)
  const heat = heatGrid(pos, flankOf(a.posicion), h)
  const pctPartido = round((distMin / Math.max(1, distMinBase)) * 100)

  return {
    id: a.id,
    userId: a.userId,
    nombre: a.nombre,
    dorsal: a.dorsal,
    posicion: a.posicion,
    estado: a.estado,
    foto: a.foto,
    duracion,
    distancia,
    distMin,
    hsr,
    sprintDist,
    sprints,
    maxVel,
    playerLoad,
    plMin,
    planes,
    accAlta: acc.alta,
    accMedia: acc.media,
    accBaja: acc.baja,
    decAlta: dec.alta,
    decMedia: dec.media,
    decBaja: dec.baja,
    hmld,
    metaPower,
    energia,
    zonas,
    trace,
    heat,
    pctPartido,
  }
}

export function buildGps(squad: Athlete[], session: GpsSessionDef): GpsSample[] {
  // Los porteros distorsionan los promedios de campo; se incluyen igual (el panel
  // los muestra) pero el orden por defecto deja arriba a los de más volumen.
  return squad.map((a) => athleteGps(a, session)).sort((x, y) => y.distancia - x.distancia)
}

// ── Resumen del equipo (KPIs de la cabecera) ─────────────────────────────────
export interface GpsTeamSummary {
  jugadores: number
  distMedia: number
  distMinMedia: number
  plMedio: number
  hsrMedia: number
  sprintsTotal: number
  velMax: number
  accDecMedia: number
  distancia: number // total acumulada del plantel
}

export function teamGpsSummary(samples: GpsSample[]): GpsTeamSummary {
  const n = samples.length || 1
  const sum = (sel: (s: GpsSample) => number) => samples.reduce((a, s) => a + sel(s), 0)
  return {
    jugadores: samples.length,
    distMedia: round(sum((s) => s.distancia) / n),
    distMinMedia: round(sum((s) => s.distMin) / n),
    plMedio: round(sum((s) => s.playerLoad) / n),
    hsrMedia: round(sum((s) => s.hsr) / n),
    sprintsTotal: round(sum((s) => s.sprints)),
    velMax: round1(Math.max(...samples.map((s) => s.maxVel), 0)),
    accDecMedia: round(sum((s) => s.accAlta + s.accMedia + s.accBaja + s.decAlta + s.decMedia + s.decBaja) / n),
    distancia: round(sum((s) => s.distancia)),
  }
}

// Promedio de las zonas de velocidad del equipo (para el gráfico apilado).
export function teamZoneAverages(samples: GpsSample[]): Record<ZoneKey, number> {
  const n = samples.length || 1
  const acc: Record<ZoneKey, number> = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
  for (const s of samples) for (const z of s.zonas) acc[z.key] += z.dist
  for (const k of Object.keys(acc) as ZoneKey[]) acc[k] = round(acc[k] / n)
  return acc
}
