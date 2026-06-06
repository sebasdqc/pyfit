// Persistencia de la plantilla en localStorage (por dispositivo/navegador).
// Esta fase aún no tiene modelos en el backend para estos campos (radar,
// demográficos, carga…), así que los cambios se guardan en el cliente. Cuando
// el backend exponga atletas reales, se reemplaza por llamadas a la API.
// Se almacenan SOLO los atletas editados (los que tienen `editadoEn`), de modo
// que los no tocados siempre reflejan la base.

import { SQUAD, type Athlete } from './mockSquad.ts'

const KEY = 'zperf_squad_v1'

export function loadSquad(): Athlete[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return SQUAD
    const overrides = JSON.parse(raw) as Record<string, Athlete>
    return SQUAD.map((a) => (overrides[a.id] ? { ...a, ...overrides[a.id] } : a))
  } catch {
    return SQUAD
  }
}

export function saveSquad(squad: Athlete[]): void {
  try {
    const overrides: Record<string, Athlete> = {}
    for (const a of squad) if (a.editadoEn) overrides[a.id] = a
    localStorage.setItem(KEY, JSON.stringify(overrides))
  } catch {
    /* sin localStorage (modo privado/cuota): se ignora */
  }
}
