// Lógica pura de edición de atletas (sin React, para poder testearla aislada).
// La edición de perfiles/parámetros está permitida a admin, entrenador y
// director técnico. updateAthlete devuelve una lista NUEVA (inmutable) con el
// atleta saneado: valores numéricos coercionados y acotados a rangos válidos.

import type { Athlete, RadarKey } from './mockSquad'

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

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}
const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

// Sanea un atleta a rangos válidos (evita radar fuera de 0–100, edades absurdas…).
export function sanitizeAthlete(a: Athlete): Athlete {
  const radar = { ...a.radar }
  for (const k of RADAR_KEYS) radar[k] = Math.round(clamp(radar[k], 0, 100))
  return {
    ...a,
    nombre: (a.nombre ?? '').trim() || 'Sin nombre',
    dorsal: Math.round(clamp(a.dorsal, 0, 999)),
    edad: Math.round(clamp(a.edad, 14, 60)),
    altura: Math.round(clamp(a.altura, 120, 230)),
    peso: Math.round(clamp(a.peso, 35, 180)),
    disponibilidad: Math.round(clamp(a.disponibilidad, 0, 100)),
    bienestar: round1(clamp(a.bienestar, 0, 10)),
    acwr: round2(clamp(a.acwr, 0, 3)),
    cargaSemanal: Math.round(clamp(a.cargaSemanal, 0, 5000)),
    minutos: Math.round(clamp(a.minutos, 0, 100000)),
    sesiones: Math.round(clamp(a.sesiones, 0, 1000)),
    radar,
  }
}

// Devuelve una lista nueva con el atleta `id` actualizado y saneado.
export function updateAthlete(list: Athlete[], id: string, patch: AthletePatch): Athlete[] {
  return list.map((a) =>
    a.id === id ? sanitizeAthlete({ ...a, ...patch, radar: { ...a.radar, ...(patch.radar ?? {}) } }) : a,
  )
}
