// Lógica pura de edición de atletas (sin React, para poder testearla aislada).
// La edición de perfiles/parámetros está permitida a admin, entrenador y
// director técnico. updateAthlete devuelve una lista NUEVA (inmutable) con el
// atleta saneado. RANGES es la única fuente de verdad de los rangos válidos:
// la usan tanto el acotado (sanitizeAthlete) como la validación (validateAthlete).

import type { Athlete, RadarKey } from './mockSquad'
import { isValidHumanName } from './validation.ts'

// Puntuación de riesgo para campos tipo tag (posición/grupo): bloquea sintaxis
// de código/instrucciones sin restringir el resto del texto. Mismo criterio
// que contains_unsafe_chars en backend/pyfit/text_validators.py.
const UNSAFE_CHARS_RE = /[{}<>\\`]/

// Roles que pueden editar atletas.
export const EDIT_ROLES = ['admin', 'coach', 'director_tecnico'] as const

export function canEditRole(role: string | null | undefined): boolean {
  return !!role && (EDIT_ROLES as readonly string[]).includes(role)
}

// Patch de edición: cualquier campo del atleta; el radar admite claves parciales.
export type AthletePatch = Partial<Omit<Athlete, 'radar'>> & {
  radar?: Partial<Athlete['radar']>
}

const RADAR_KEYS: RadarKey[] = ['velocidad', 'resistencia', 'fuerza', 'potencia', 'agilidad', 'recuperacion']

// Rangos válidos [min, max] de cada campo numérico. Fuente única.
export const RANGES = {
  dorsal: [0, 999],
  edad: [14, 60],
  altura: [120, 230],
  peso: [35, 180],
  disponibilidad: [0, 100],
  bienestar: [0, 10],
  acwr: [0, 3],
  cargaSemanal: [0, 5000],
  minutos: [0, 100000],
  sesiones: [0, 1000],
  radar: [0, 100],
} as const

type NumericField = Exclude<keyof typeof RANGES, 'radar'>
const NUMERIC_FIELDS: NumericField[] = ['dorsal', 'edad', 'altura', 'peso', 'disponibilidad', 'bienestar', 'acwr', 'cargaSemanal', 'minutos', 'sesiones']

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}
const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

// Sanea un atleta a rangos válidos (red de seguridad; la validación de la UI
// ya impide guardar fuera de rango). Conserva la meta de edición.
export function sanitizeAthlete(a: Athlete): Athlete {
  const radar = { ...a.radar }
  for (const k of RADAR_KEYS) radar[k] = Math.round(clamp(radar[k], RANGES.radar[0], RANGES.radar[1]))
  return {
    ...a,
    nombre: (a.nombre ?? '').trim() || 'Sin nombre',
    dorsal: Math.round(clamp(a.dorsal, ...RANGES.dorsal)),
    edad: Math.round(clamp(a.edad, ...RANGES.edad)),
    altura: Math.round(clamp(a.altura, ...RANGES.altura)),
    peso: Math.round(clamp(a.peso, ...RANGES.peso)),
    disponibilidad: Math.round(clamp(a.disponibilidad, ...RANGES.disponibilidad)),
    bienestar: round1(clamp(a.bienestar, ...RANGES.bienestar)),
    acwr: round2(clamp(a.acwr, ...RANGES.acwr)),
    cargaSemanal: Math.round(clamp(a.cargaSemanal, ...RANGES.cargaSemanal)),
    minutos: Math.round(clamp(a.minutos, ...RANGES.minutos)),
    sesiones: Math.round(clamp(a.sesiones, ...RANGES.sesiones)),
    radar,
  }
}

// Devuelve una lista nueva con el atleta `id` actualizado y saneado.
export function updateAthlete(list: Athlete[], id: string, patch: AthletePatch): Athlete[] {
  return list.map((a) =>
    a.id === id ? sanitizeAthlete({ ...a, ...patch, radar: { ...a.radar, ...(patch.radar ?? {}) } }) : a,
  )
}

// ── Validación (para resaltar campos fuera de rango antes de guardar) ────────
export interface AthleteDraft {
  nombre?: string
  posicion?: string
  grupo?: string
  dorsal?: number
  edad?: number
  altura?: number
  peso?: number
  disponibilidad?: number
  bienestar?: number
  acwr?: number
  cargaSemanal?: number
  minutos?: number
  sesiones?: number
  radar?: Partial<Record<RadarKey, number>>
}

// Devuelve un mapa { campo: mensaje } solo con los campos inválidos. Vacío = OK.
// Las claves del radar van por su nombre de eje (velocidad, fuerza, …).
export function validateAthlete(v: AthleteDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!v.nombre || !v.nombre.trim()) errors.nombre = 'El nombre es obligatorio'
  else if (!isValidHumanName(v.nombre)) errors.nombre = 'Solo letras, espacios y guiones'

  if (v.posicion && UNSAFE_CHARS_RE.test(v.posicion)) errors.posicion = 'Caracteres no permitidos: { } < > \\ `'
  if (v.grupo && UNSAFE_CHARS_RE.test(v.grupo)) errors.grupo = 'Caracteres no permitidos: { } < > \\ `'

  for (const f of NUMERIC_FIELDS) {
    const val = v[f]
    if (val === undefined) continue
    const [min, max] = RANGES[f]
    if (!Number.isFinite(val)) errors[f] = 'Valor inválido'
    else if (val < min || val > max) errors[f] = `Debe estar entre ${min} y ${max}`
  }

  if (v.radar) {
    const [min, max] = RANGES.radar
    for (const k of RADAR_KEYS) {
      const val = v.radar[k]
      if (val === undefined) continue
      if (!Number.isFinite(val)) errors[k] = 'Valor inválido'
      else if (val < min || val > max) errors[k] = `Entre ${min} y ${max}`
    }
  }
  return errors
}
