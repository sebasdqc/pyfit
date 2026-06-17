// Datos, tipos y utilidades de los cuatro dashboards GPS de campo (Match Day,
// Post-sesión, Carga semanal y Perfil de jugador). Los prototipos HTML de
// referencia (zyfit_0*.html) traían sus datos simulados embebidos; aquí esos
// datos viven centralizados y se exponen mediante hooks con la forma
// { data, loading, error } para poder cambiarlos por llamados reales a Django
// sin tocar los componentes. La paleta se alinea con el sistema del portal
// (acento azul + ok/warn/danger): el púrpura de los prototipos es de Zyfit Coach
// y aquí se mapea al acento.

import type { Tone } from './tone'

// ── Paleta / helpers compartidos ─────────────────────────────────────────────

// Hex de los tonos semánticos: se usa donde no podemos pasar clases de Tailwind
// (rellenos de Recharts, barras SVG inline, agujas, etc.).
export const TONE_HEX: Record<Tone, string> = {
  accent: '#4f8cff',
  ok: '#32c896',
  warn: '#ffaa32',
  danger: '#ff4444',
}

export type Pos = 'PT' | 'DC' | 'MC' | 'DL'

// Color por demarcación (on-brand: azules + verde + ámbar, distinguibles).
export const POS_HEX: Record<Pos, string> = {
  PT: '#4f8cff',
  DC: '#32c896',
  MC: '#7ab6ff',
  DL: '#ffaa32',
}

export const POS_LABEL: Record<Pos, string> = {
  PT: 'Porteros (PT)',
  DC: 'Defensas centrales (DC)',
  MC: 'Mediocampistas (MC)',
  DL: 'Delanteros laterales (DL)',
}

// Zonas de velocidad (mismo esquema en todos los dashboards).
export const SPEED_ZONES = [
  { key: 'z1', label: 'Z1 <7 km/h', hex: '#545d72' },
  { key: 'z2', label: 'Z2 7–14 km/h', hex: '#00a36e' },
  { key: 'z3', label: 'Z3 14–19 km/h', hex: '#32c896' },
  { key: 'z4', label: 'Z4 19–24 km/h', hex: '#ffaa32' },
  { key: 'z5', label: 'Z5 >24 km/h', hex: '#ff4444' },
] as const

// Color de la barra de Player Load según el % del máximo individual (extraída de
// la función `barColor` del prototipo Match Day — función pura reutilizable).
export function loadTone(pct: number): Tone {
  if (pct >= 1.0) return 'danger'
  if (pct >= 0.9) return 'warn'
  if (pct >= 0.75) return 'accent'
  return 'ok'
}

// ── ACWR (carga aguda : crónica) ─────────────────────────────────────────────

export type Risk = 'ok' | 'warn' | 'danger'

export const RISK_META: Record<Risk, { tone: Tone; label: string }> = {
  ok: { tone: 'ok', label: 'Zona segura' },
  warn: { tone: 'warn', label: 'Precaución' },
  danger: { tone: 'danger', label: 'Riesgo alto' },
}

// ACWR a partir de carga aguda y crónica (función pura).
export function acwr(aguda: number, cronica: number): number {
  if (!cronica) return 0
  return Math.round((aguda / cronica) * 100) / 100
}

// Clasificación de riesgo por ACWR: óptimo <1.30 · precaución 1.30–1.50 ·
// riesgo >1.50.
export function acwrRisk(v: number): Risk {
  if (v >= 1.5) return 'danger'
  if (v >= 1.3) return 'warn'
  return 'ok'
}

// Posición (0–100%) de la aguja sobre la barra de zonas ACWR. Tramos:
// <0.8 [0–20%] · 0.8–1.05 [20–45%] · 1.05–1.3 [45–70%] · 1.3–1.5 [70–85%] ·
// >1.5 [85–100%]. Lineal por tramo, recortado a [0,100].
export function acwrNeedlePct(v: number): number {
  const map = (x: number, x0: number, x1: number, y0: number, y1: number) =>
    y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
  let pct: number
  if (v < 0.8) pct = map(v, 0.5, 0.8, 0, 20)
  else if (v < 1.05) pct = map(v, 0.8, 1.05, 20, 45)
  else if (v < 1.3) pct = map(v, 1.05, 1.3, 45, 70)
  else if (v < 1.5) pct = map(v, 1.3, 1.5, 70, 85)
  else pct = map(v, 1.5, 1.7, 85, 100)
  return Math.max(0, Math.min(100, Math.round(pct)))
}

// Forma estándar de los hooks: lista para cambiar el fallback por fetch/useQuery.
export interface GpsResult<T> {
  data: T
  loading: boolean
  error: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 1 — MATCH DAY
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchPlayer {
  num: number
  name: string
  pos: Pos
  pl: number
  plMax: number
  km: number
  vmax: number
  spr: number
  status: 'ok' | 'warn' | 'alert'
}

export interface MatchDayData {
  match: { title: string; venue: string; period: string; startSecs: number }
  players: MatchPlayer[]
  sensors: number
  gpsHz: string
  speedZonesPct: number[] // alineado con SPEED_ZONES
  accelByPos: { pos: Pos; acel: number; decel: number }[]
}

const MATCH_DAY: MatchDayData = {
  match: {
    title: 'Caracas FC vs Deportivo Lara — Liga Futve Jornada 18',
    venue: 'Estadio Olímpico · Caracas · Capacidad 35,000',
    period: '2º Tiempo',
    startSecs: 63 * 60 + 24,
  },
  sensors: 11,
  gpsHz: '10Hz',
  speedZonesPct: [18, 34, 28, 14, 6],
  accelByPos: [
    { pos: 'PT', acel: 8, decel: 7 },
    { pos: 'DC', acel: 13, decel: 11 },
    { pos: 'MC', acel: 19, decel: 17 },
    { pos: 'DL', acel: 22, decel: 20 },
  ],
  players: [
    { num: 1, name: 'Méndez', pos: 'PT', pl: 312, plMax: 480, km: 5.2, vmax: 18.4, spr: 12, status: 'ok' },
    { num: 3, name: 'González', pos: 'DC', pl: 501, plMax: 620, km: 9.8, vmax: 27.1, spr: 18, status: 'ok' },
    { num: 5, name: 'Herrera', pos: 'DC', pl: 548, plMax: 600, km: 10.1, vmax: 26.4, spr: 16, status: 'warn' },
    { num: 2, name: 'Pérez', pos: 'DL', pl: 589, plMax: 630, km: 10.9, vmax: 29.2, spr: 24, status: 'ok' },
    { num: 4, name: 'Castillo', pos: 'DL', pl: 472, plMax: 610, km: 10.3, vmax: 28.8, spr: 22, status: 'ok' },
    { num: 6, name: 'Martínez', pos: 'MC', pl: 634, plMax: 640, km: 11.4, vmax: 28.1, spr: 19, status: 'alert' },
    { num: 8, name: 'Torres', pos: 'MC', pl: 601, plMax: 650, km: 11.1, vmax: 27.9, spr: 17, status: 'ok' },
    { num: 10, name: 'Vargas', pos: 'MC', pl: 577, plMax: 660, km: 10.7, vmax: 29.5, spr: 21, status: 'ok' },
    { num: 7, name: 'Rodríguez', pos: 'DL', pl: 612, plMax: 670, km: 11.8, vmax: 31.7, spr: 28, status: 'ok' },
    { num: 11, name: 'Suárez', pos: 'DL', pl: 558, plMax: 640, km: 10.5, vmax: 30.1, spr: 25, status: 'ok' },
    { num: 9, name: 'Jiménez', pos: 'PT', pl: 648, plMax: 640, km: 9.2, vmax: 27.3, spr: 11, status: 'alert' },
  ],
}

export function useMatchDay(_sessionId?: string): GpsResult<MatchDayData> {
  // TODO: GET /api/gps/match/{sessionId}/ — por ahora, datos de demostración.
  return { data: MATCH_DAY, loading: false, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 2 — POST-SESIÓN
// ─────────────────────────────────────────────────────────────────────────────

export interface PostPlayer {
  num: number
  name: string
  pos: Pos
  km: number
  spr: number
  vmax: number
  pl: number
  acel: number
  decel: number
  pp: number
  hmld: number
  estado: 'ok' | 'warn'
}

export interface PostSessionData {
  session: { title: string; subtitle: string; analyst: string }
  kpis: { label: string; value: string; unit?: string; delta: string; tone: Tone }[]
  speedZonesPct: number[]
  posLoad: { pos: Pos; value: number; pct: number }[]
  compare: { label: string; today: number; prev: number; deltaPct: string; tone: Tone }[]
  players: PostPlayer[]
  recommendations: { text: string; tone: Tone }[]
}

const POST_SESSION: PostSessionData = {
  session: {
    title: 'Post-sesión — Entrenamiento táctico 4v4+4 / Partido reducido',
    subtitle: 'Lunes 10 Jun 2026 · 08:15 – 10:05 · Duración: 110 min · Campo principal',
    analyst: 'Analista: C. Romero',
  },
  kpis: [
    { label: 'Distancia total equipo', value: '107.4', unit: 'km · 11 jugadores', delta: '▲ +6.3% vs sesión anterior', tone: 'ok' },
    { label: 'HMLD promedio', value: '1,842', unit: 'm · high metabolic load dist.', delta: '▲ +7.7% vs semana ant.', tone: 'accent' },
    { label: 'Player Load promedio', value: '612', unit: 'ua · rango esperado: 580–650', delta: '▲ Dentro del rango objetivo', tone: 'accent' },
    { label: 'Sprint distance prom.', value: '842', unit: 'm · umbral: >19 km/h', delta: '▲ +5.4% vs sesión anterior', tone: 'warn' },
    { label: 'Power Plays promedio', value: '47', unit: 'acciones >20 w/kg · >1s', delta: '▲ +12% vs ref. partido', tone: 'ok' },
  ],
  speedZonesPct: [18, 34, 28, 14, 6],
  posLoad: [
    { pos: 'MC', value: 671, pct: 95 },
    { pos: 'DL', value: 614, pct: 87 },
    { pos: 'DC', value: 525, pct: 74 },
    { pos: 'PT', value: 310, pct: 44 },
  ],
  compare: [
    { label: 'Distancia (km)', today: 107.4, prev: 101.0, deltaPct: '▲ +6.3%', tone: 'ok' },
    { label: 'Player Load (ua)', today: 612, prev: 567, deltaPct: '▲ +8%', tone: 'accent' },
    { label: 'Sprint dist. (m)', today: 842, prev: 798, deltaPct: '▲ +5.4%', tone: 'warn' },
  ],
  players: [
    { num: 6, name: 'Martínez', pos: 'MC', km: 12.1, spr: 1102, vmax: 29.4, pl: 688, acel: 21, decel: 18, pp: 54, hmld: 2140, estado: 'ok' },
    { num: 8, name: 'Torres', pos: 'MC', km: 11.8, spr: 1048, vmax: 28.7, pl: 671, acel: 19, decel: 17, pp: 51, hmld: 2011, estado: 'ok' },
    { num: 10, name: 'Vargas', pos: 'MC', km: 11.4, spr: 987, vmax: 29.8, pl: 654, acel: 18, decel: 16, pp: 48, hmld: 1988, estado: 'ok' },
    { num: 7, name: 'Rodríguez', pos: 'DL', km: 12.4, spr: 1214, vmax: 31.7, pl: 641, acel: 24, decel: 21, pp: 61, hmld: 2244, estado: 'ok' },
    { num: 11, name: 'Suárez', pos: 'DL', km: 11.6, spr: 1098, vmax: 30.1, pl: 618, acel: 20, decel: 18, pp: 52, hmld: 2088, estado: 'ok' },
    { num: 2, name: 'Pérez', pos: 'DL', km: 11.1, spr: 944, vmax: 29.2, pl: 601, acel: 17, decel: 15, pp: 44, hmld: 1901, estado: 'warn' },
    { num: 4, name: 'Castillo', pos: 'DL', km: 10.9, spr: 911, vmax: 28.8, pl: 587, acel: 16, decel: 14, pp: 42, hmld: 1878, estado: 'ok' },
    { num: 5, name: 'Herrera', pos: 'DC', km: 10.4, spr: 712, vmax: 26.4, pl: 548, acel: 14, decel: 12, pp: 36, hmld: 1621, estado: 'warn' },
    { num: 3, name: 'González', pos: 'DC', km: 10.1, spr: 688, vmax: 27.1, pl: 501, acel: 12, decel: 11, pp: 31, hmld: 1544, estado: 'ok' },
    { num: 1, name: 'Méndez', pos: 'PT', km: 5.4, spr: 144, vmax: 18.4, pl: 318, acel: 8, decel: 7, pp: 14, hmld: 488, estado: 'ok' },
    { num: 9, name: 'Jiménez', pos: 'PT', km: 5.1, spr: 128, vmax: 17.8, pl: 302, acel: 7, decel: 6, pp: 12, hmld: 452, estado: 'ok' },
  ],
  recommendations: [
    { text: '#2 Pérez — 36h reposo activo', tone: 'warn' },
    { text: '#5 Herrera — revisión médica mañana', tone: 'danger' },
    { text: 'Equipo — sesión regenerativa martes', tone: 'ok' },
    { text: 'MC — reducir volumen sprint miércoles', tone: 'accent' },
    { text: 'DL — crioterapia post-entrenamiento', tone: 'ok' },
    { text: 'PT — trabajo técnico específico martes', tone: 'ok' },
  ],
}

export function usePostSession(_sessionId?: string): GpsResult<PostSessionData> {
  // TODO: GET /api/gps/post-session/{sessionId}/ (con comparativa sesión previa).
  return { data: POST_SESSION, loading: false, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 3 — CARGA SEMANAL
// ─────────────────────────────────────────────────────────────────────────────

export interface AcwrRow {
  num: number
  name: string
  aguda: number
  cronica: number
  delta: string
}

export interface WeeklyLoadData {
  week: { title: string; subtitle: string; pill: string; staff: string }
  agudaTeam: number
  cronicaTeam: number
  monotonia: number
  trend: { sem: string; aguda: number; cronica: number; acwr: number }[]
  rows: AcwrRow[]
  dayDist: { day: string; val: number }[]
  summary: { value: string; label: string; sub: string; tone?: Tone }[]
  nextWeek: { day: string; plan: string; tone?: Tone }[]
}

const WEEKLY_LOAD: WeeklyLoadData = {
  week: {
    title: 'Carga semanal — Gestión de carga y riesgo de lesión',
    subtitle: 'Semana 24 · 10–16 Jun 2026 · 4 sesiones planificadas',
    pill: 'Sem 24 / 38',
    staff: 'Preparador físico: L. García · 11 jugadores activos',
  },
  agudaTeam: 2448,
  cronicaTeam: 2211,
  monotonia: 1.4,
  trend: [
    { sem: 'Sem 17', aguda: 1988, cronica: 1844, acwr: 1.08 },
    { sem: 'Sem 18', aguda: 2101, cronica: 1901, acwr: 1.1 },
    { sem: 'Sem 19', aguda: 2244, cronica: 1966, acwr: 1.14 },
    { sem: 'Sem 20', aguda: 2088, cronica: 2001, acwr: 1.04 },
    { sem: 'Sem 21', aguda: 2311, cronica: 2088, acwr: 1.11 },
    { sem: 'Sem 22', aguda: 2488, cronica: 2144, acwr: 1.16 },
    { sem: 'Sem 23', aguda: 2350, cronica: 2188, acwr: 1.07 },
    { sem: 'Sem 24', aguda: 2448, cronica: 2211, acwr: 1.11 },
  ],
  rows: [
    { num: 7, name: 'Rodríguez', aguda: 2944, cronica: 1901, delta: '+0.18' },
    { num: 6, name: 'Martínez', aguda: 2810, cronica: 1988, delta: '+0.12' },
    { num: 8, name: 'Torres', aguda: 2688, cronica: 2100, delta: '+0.03' },
    { num: 10, name: 'Vargas', aguda: 2601, cronica: 2088, delta: '+0.01' },
    { num: 11, name: 'Suárez', aguda: 2488, cronica: 2044, delta: '-0.02' },
    { num: 2, name: 'Pérez', aguda: 2344, cronica: 2010, delta: '+0.05' },
    { num: 4, name: 'Castillo', aguda: 2288, cronica: 2001, delta: '-0.01' },
    { num: 5, name: 'Herrera', aguda: 2144, cronica: 1988, delta: '+0.02' },
    { num: 3, name: 'González', aguda: 2001, cronica: 1944, delta: '-0.04' },
    { num: 1, name: 'Méndez', aguda: 1244, cronica: 1188, delta: '+0.01' },
    { num: 9, name: 'Jiménez', aguda: 1188, cronica: 1144, delta: '-0.02' },
  ],
  dayDist: [
    { day: 'Lun', val: 688 },
    { day: 'Mar', val: 412 },
    { day: 'Mié', val: 721 },
    { day: 'Jue', val: 627 },
    { day: 'Vie', val: 0 },
    { day: 'Sáb', val: 0 },
  ],
  summary: [
    { value: '3,428', label: 'Strain semanal (ua)', sub: 'Carga × monotonía' },
    { value: '107.4', label: 'km dist. total equipo', sub: '+6.3% vs semana ant.' },
    { value: '4/5', label: 'Sesiones completadas', sub: '1 partido oficial' },
    { value: '9/11', label: 'Jugadores en zona', sub: 'ACWR 0.8–1.3', tone: 'ok' },
  ],
  nextWeek: [
    { day: 'Lun 17 Jun', plan: 'Regenerativo (60 min)' },
    { day: 'Mar 18 Jun', plan: 'Táctico (90 min)' },
    { day: 'Mié 19 Jun', plan: '⚠ Reducir carga (#6, #7)', tone: 'warn' },
    { day: 'Jue 20 Jun', plan: 'Precompetencia (75 min)' },
    { day: 'Vie 21 Jun', plan: 'Partido vs Mineros', tone: 'accent' },
  ],
}

export function useWeeklyLoad(_teamId?: string): GpsResult<WeeklyLoadData> {
  // TODO: GET /api/gps/weekly-load/{teamId}/?week=NN
  return { data: WEEKLY_LOAD, loading: false, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 4 — PERFIL DE JUGADOR
// ─────────────────────────────────────────────────────────────────────────────

export type SeasonMetric = 'pl' | 'dist' | 'vmax' | 'spr'

export interface RtpStep {
  n: number
  label: string
  sub: string
  week: string
  status: 'done' | 'now' | 'pend'
}

export interface PlayerProfileData {
  player: {
    name: string
    meta: string
    season: string
    sessions: string
    tags: { label: string; tone: Tone }[]
  }
  cluster: { value: string; label: string; tone?: Tone }[]
  pills: { value: string; label: string }[]
  semLabels: string[]
  season: Record<SeasonMetric, (number | null)[]>
  seasonUnit: Record<SeasonMetric, string>
  injuryNote: string
  benchmarks: { label: string; val: number; tone: Tone }[]
  radar: { axis: string; player: number; avg: number }[]
  history: { sem: string; val: number | null; risk: Risk | 'injury' }[]
  rtp: { injury: string; steps: RtpStep[] } | null
}

const PLAYER_PROFILE: PlayerProfileData = {
  player: {
    name: 'Javier Rodríguez',
    meta: 'Delantero lateral derecho · #7 · 24 años · 78 kg · 181 cm · Zurdo',
    season: 'Temporada 2025–26',
    sessions: '34 sesiones registradas · 2,180 minutos de datos GPS',
    tags: [
      { label: 'Activo', tone: 'ok' },
      { label: 'Top velocista del equipo', tone: 'accent' },
      { label: 'ACWR elevado sem. 24', tone: 'warn' },
      { label: 'Return to play en curso', tone: 'danger' },
    ],
  },
  cluster: [
    { value: '31.7', label: 'vel. máx (km/h)', tone: 'warn' },
    { value: '11.8', label: 'dist. prom (km)' },
    { value: '641', label: 'Player Load prom.', tone: 'accent' },
    { value: '1.55', label: 'ACWR actual', tone: 'danger' },
    { value: 'P92', label: 'Pct. velocidad DL', tone: 'ok' },
  ],
  pills: [
    { value: '398.2', label: 'km totales temporada' },
    { value: '21,794', label: 'Player Load acumulado' },
    { value: '1,598', label: 'sprints >19 km/h' },
    { value: '1', label: 'lesión registrada' },
  ],
  semLabels: ['Sem12', 'Sem13', 'Sem14', 'Sem15', 'Sem16', 'Sem17', 'Sem18', 'Sem19', 'Sem20', 'Sem21', 'Sem22', 'Sem23', 'Sem24'],
  season: {
    pl: [588, 601, 612, 598, 621, 644, null, null, 631, 648, 638, 655, 641],
    dist: [10.9, 11.1, 11.4, 11.0, 11.6, 12.1, null, null, 11.7, 12.4, 12.0, 12.2, 11.8],
    vmax: [29.1, 29.8, 30.2, 29.5, 30.8, 31.2, null, null, 31.0, 31.7, 31.4, 31.5, 31.7],
    spr: [28, 31, 33, 29, 35, 38, null, null, 34, 41, 38, 42, 39],
  },
  seasonUnit: { pl: 'ua', dist: 'km', vmax: 'km/h', spr: 'sprints' },
  injuryNote: 'Sem 18–19: ausencia por lesión isquiotibial',
  benchmarks: [
    { label: 'Vel. máxima', val: 92, tone: 'ok' },
    { label: 'Sprint dist.', val: 88, tone: 'ok' },
    { label: 'Acel >3m/s²', val: 85, tone: 'accent' },
    { label: 'Distancia', val: 80, tone: 'accent' },
    { label: 'Player Load', val: 76, tone: 'accent' },
    { label: 'Power Plays', val: 71, tone: 'accent' },
  ],
  radar: [
    { axis: 'Vel. máx', player: 92, avg: 75 },
    { axis: 'Distancia', player: 80, avg: 75 },
    { axis: 'Sprint', player: 88, avg: 75 },
    { axis: 'Player Load', player: 76, avg: 75 },
    { axis: 'Acel.', player: 85, avg: 75 },
    { axis: 'HMLD', player: 82, avg: 75 },
    { axis: 'Power Plays', player: 71, avg: 75 },
  ],
  history: [
    { sem: 'S13', val: 2244, risk: 'ok' },
    { sem: 'S14', val: 2388, risk: 'ok' },
    { sem: 'S15', val: 2501, risk: 'ok' },
    { sem: 'S16', val: 2288, risk: 'ok' },
    { sem: 'S17', val: 2611, risk: 'warn' },
    { sem: 'S18', val: 2944, risk: 'danger' },
    { sem: 'S19', val: null, risk: 'injury' },
    { sem: 'S20', val: null, risk: 'injury' },
    { sem: 'S21', val: 2688, risk: 'ok' },
    { sem: 'S22', val: 2801, risk: 'warn' },
    { sem: 'S23', val: 2944, risk: 'danger' },
    { sem: 'S24', val: 2944, risk: 'danger' },
  ],
  rtp: {
    injury: 'Lesión muscular isquiotibial (grado I) · Semana 20 · Recuperación estimada: 2 semanas',
    steps: [
      { n: 1, label: 'Reposo y crioterapia', sub: 'Sin carga · hielo 3×/día', week: 'Sem 20–21', status: 'done' },
      { n: 2, label: 'Trabajo regenerativo', sub: 'Natación · bicicleta sin resistencia', week: 'Sem 21–22', status: 'done' },
      { n: 3, label: 'Carrera continua Z1–Z2', sub: 'Hasta 7 km · sin cambios de ritmo', week: 'Sem 22–23', status: 'done' },
      { n: 4, label: 'Sprints progresivos', sub: '50% → 75% → 90% vel. máx', week: 'Sem 24 · En curso', status: 'now' },
      { n: 5, label: 'Integración táctica', sub: 'Partido reducido · sin contacto', week: 'Sem 25', status: 'pend' },
      { n: 6, label: 'Alta médica y vuelta al equipo', sub: 'Partido oficial', week: 'Sem 25–26', status: 'pend' },
    ],
  },
}

export function usePlayerProfile(_playerId?: string): GpsResult<PlayerProfileData> {
  // TODO: GET /api/gps/player/{playerId}/
  return { data: PLAYER_PROFILE, loading: false, error: null }
}
