// Persistencia local de check-ins de bienestar (por dispositivo), igual que
// testStore. El ÍNDICE lo calcula el servidor (POST /psicologico/wellness/compute/);
// aquí solo guardamos la foto por atleta/fecha hasta que el backend exponga
// atletas reales y se cablee POST /centers/<id>/psicologico/wellness/ (ya existe,
// persiste y recalcula el índice). Un check-in por atleta y día (upsert).

export type WellnessEstado = 'ok' | 'duda' | 'alerta'

export interface SavedWellness {
  id: string
  athleteId: string
  fecha: string // YYYY-MM-DD
  sueno: number
  fatiga: number
  estres: number
  dolor_muscular: number
  animo: number
  indice_bienestar: number
  estado: WellnessEstado
  guardadoEn: string
}

const KEY = 'zperf_wellness_v1'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `w_${Date.now()}_${Math.round(Math.random() * 1e6)}`
}

export function loadWellness(): SavedWellness[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedWellness[]) : []
  } catch {
    return []
  }
}

function persist(list: SavedWellness[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* sin localStorage: se ignora */
  }
}

/** Upsert: reemplaza el check-in del mismo atleta y fecha si ya existía. */
export function saveWellness(rec: Omit<SavedWellness, 'id' | 'guardadoEn'>): SavedWellness[] {
  const record: SavedWellness = { ...rec, id: uid(), guardadoEn: new Date().toISOString() }
  const sinDuplicado = loadWellness().filter(
    (w) => !(w.athleteId === rec.athleteId && w.fecha === rec.fecha),
  )
  const next = [record, ...sinDuplicado]
  persist(next)
  return next
}

export function deleteWellness(id: string): SavedWellness[] {
  const next = loadWellness().filter((w) => w.id !== id)
  persist(next)
  return next
}
