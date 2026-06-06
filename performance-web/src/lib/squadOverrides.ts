// Overrides locales (por centro) de los campos del atleta que el backend NO
// modela todavía (radar, demográficos, carga… ver squadSynth.SYNTH_FIELDS).
// Los campos REALES (dorsal/posición/grupo/estado/foto) se persisten en la API;
// estos otros se guardan en localStorage por dispositivo hasta que exista captura
// real. Es el mismo patrón que squadStore, pero namespaced por centro y aplicado
// sobre el roster real (no el mock).

import type { Athlete } from './mockSquad'
import type { AthletePatch } from './squadEdit'
import { SYNTH_FIELDS } from './squadSynth'

// Solo los campos sintéticos + la meta de edición. Usa el mismo tipo que el patch
// de edición (radar parcial admitido), de modo que no se pisan ejes no editados.
export type AthleteOverride = AthletePatch

const key = (centerId: number) => `zperf_squad_override_${centerId}`

export function loadOverrides(centerId: number): Record<string, AthleteOverride> {
  try {
    const raw = localStorage.getItem(key(centerId))
    return raw ? (JSON.parse(raw) as Record<string, AthleteOverride>) : {}
  } catch {
    return {}
  }
}

// Quédate solo con los campos sintéticos + la meta de edición de un patch.
export function pickLocalFields(patch: AthletePatch): AthleteOverride {
  const out: AthleteOverride = {}
  for (const f of SYNTH_FIELDS) {
    if (patch[f] !== undefined) (out as Record<string, unknown>)[f] = patch[f]
  }
  if (patch.editadoPor !== undefined) out.editadoPor = patch.editadoPor
  if (patch.editadoEn !== undefined) out.editadoEn = patch.editadoEn
  return out
}

// Mezcla el override del atleta `id` y lo persiste (radar fusionado por eje).
export function saveOverride(centerId: number, id: string, ov: AthleteOverride): void {
  try {
    const all = loadOverrides(centerId)
    const prev = all[id] ?? {}
    all[id] = {
      ...prev,
      ...ov,
      radar: ov.radar ? { ...prev.radar, ...ov.radar } : prev.radar,
    }
    localStorage.setItem(key(centerId), JSON.stringify(all))
  } catch {
    /* sin localStorage (modo privado/cuota): se ignora */
  }
}

// Aplica los overrides guardados sobre una lista de atletas reales (radar por eje).
export function applyOverrides(centerId: number, list: Athlete[]): Athlete[] {
  const all = loadOverrides(centerId)
  return list.map((a) => {
    const ov = all[a.id]
    if (!ov) return a
    return { ...a, ...ov, radar: ov.radar ? { ...a.radar, ...ov.radar } : a.radar }
  })
}
