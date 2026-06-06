// Construye el modelo de vista `Athlete` a partir de un atleta REAL del centro
// (CenterAthlete, vía API). El backend hoy solo modela el roster (nombre, dorsal,
// posición, grupo, estado, foto); NO modela todavía las métricas de rendimiento
// (radar, demográficos, carga interna/externa, ACWR…). Para que las pantallas
// sigan renderizando mientras no exista esa captura, esos campos se SINTETIZAN
// de forma determinista (mismo patrón que lib/mockPerformance) a partir del id
// del atleta — son datos SIMULADOS y la UI los marca como tales con <DemoBadge>.
//
// El día que el backend exponga métricas reales, se reemplaza `synthMetrics`
// por la lectura de la API y se retira el badge. El roster (nombre/foto/dorsal/
// posición/estado) ya es 100% real desde hoy.

import type { CenterAthlete } from '@/types'
import type { Athlete, Estado, RadarKey } from './mockSquad'

// El estado del backend (activo/lesionado/baja) no es 1:1 con el del semáforo de
// la UI (ok/duda/baja): 'lesionado' se trata como no disponible.
const ESTADO_FROM_API: Record<CenterAthlete['estado'], Estado> = {
  activo: 'ok',
  lesionado: 'baja',
  baja: 'baja',
}

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
const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

type SynthFields = Pick<
  Athlete,
  'edad' | 'nacionalidad' | 'altura' | 'peso' | 'pie' | 'radar'
  | 'acwr' | 'bienestar' | 'cargaSemanal' | 'disponibilidad' | 'minutos' | 'sesiones'
>

// Conjunto de campos NO modelados por el backend: se sintetizan y, si el usuario
// los edita, se guardan en un override local por centro (no en la API).
export const SYNTH_FIELDS: (keyof SynthFields)[] = [
  'edad', 'nacionalidad', 'altura', 'peso', 'pie', 'radar',
  'acwr', 'bienestar', 'cargaSemanal', 'disponibilidad', 'minutos', 'sesiones',
]

function synthMetrics(seed: string): SynthFields {
  const h = hash(seed)
  const n = (k: number) => noise(h + k)
  const radarKeys: RadarKey[] = ['velocidad', 'resistencia', 'fuerza', 'potencia', 'agilidad', 'recuperacion']
  const radar = radarKeys.reduce((acc, key, i) => {
    acc[key] = 50 + Math.round(n(i + 1) * 45) // 50..95
    return acc
  }, {} as Record<RadarKey, number>)

  return {
    edad: 18 + Math.round(n(10) * 20), // 18..38
    nacionalidad: '—',
    altura: 165 + Math.round(n(11) * 30), // 165..195 cm
    peso: 60 + Math.round(n(12) * 32), // 60..92 kg
    pie: n(13) > 0.5 ? 'Derecho' : 'Izquierdo',
    radar,
    acwr: round2(0.85 + n(20) * 0.8), // 0.85..1.65
    bienestar: round1(5 + n(21) * 4), // 5..9
    cargaSemanal: 420 + Math.round(n(22) * 380), // 420..800 UA
    disponibilidad: 60 + Math.round(n(23) * 40), // 60..100 %
    minutos: Math.round(n(24) * 2200),
    sesiones: 8 + Math.round(n(25) * 18),
  }
}

// CenterAthlete (API) → Athlete (vista). Roster real + métricas sintetizadas.
export function athleteFromCenter(dto: CenterAthlete): Athlete {
  const nombre = (dto.nombre || dto.email || 'Atleta').trim()
  const synth = synthMetrics(`${dto.id}:${nombre}`)
  return {
    ...synth,
    id: String(dto.id), // id del vínculo CenterAthlete
    userId: dto.athlete, // id de usuario real (para endpoints por usuario)
    nombre,
    dorsal: Number(dto.dorsal) || 0,
    posicion: dto.posicion || 'Sin posición',
    grupo: dto.grupo || 'Sin grupo',
    estado: ESTADO_FROM_API[dto.estado],
    foto: dto.foto || undefined,
  }
}
