// Persistencia local de partes de lesión para la DEMO (sin centro / plantilla
// mock), igual que wellnessStore/testStore. Se siembra con la muestra (INJURIES)
// la primera vez. Con roster real, las lesiones viven en el servidor
// (GET/POST/PATCH/DELETE /centers/<id>/lesiones/) y este store no se usa.

import { INJURIES, type Injury } from './mockInjuries'

const KEY = 'zperf_injuries_v1'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `inj_${Date.now()}_${Math.round(Math.random() * 1e6)}`
}

export function loadInjuries(): Injury[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Injury[]) : INJURIES // semilla
  } catch {
    return INJURIES
  }
}

function persist(list: Injury[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* sin localStorage (modo privado/cuota): se ignora */
  }
}

/** Crea un parte nuevo (al principio) y devuelve la lista completa. */
export function saveInjuryLocal(rec: Omit<Injury, 'id'>): Injury[] {
  const next = [{ ...rec, id: uid() }, ...loadInjuries()]
  persist(next)
  return next
}

/** Aplica un parche a un parte (p. ej. dar de alta) y devuelve la lista. */
export function updateInjuryLocal(id: string, patch: Partial<Injury>): Injury[] {
  const next = loadInjuries().map((i) => (i.id === id ? { ...i, ...patch } : i))
  persist(next)
  return next
}

export function deleteInjuryLocal(id: string): Injury[] {
  const next = loadInjuries().filter((i) => i.id !== id)
  persist(next)
  return next
}
