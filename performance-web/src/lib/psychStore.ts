// Persistencia local de evaluaciones con cuestionarios (por dispositivo), igual
// que testStore. El SCORING lo hace el servidor (POST /psicologico/instruments/
// score/ y el alta real en POST /centers/<id>/psicologico/); aquí guardamos la
// foto por atleta hasta tener atletas reales en el panel.

export interface SavedPsych {
  id: string
  athleteId: string
  instrument: string // slug
  nombre: string
  fecha: string // YYYY-MM-DD
  subescalas: Record<string, number>
  resultados: { indice: number; indice_label: string; interpretacion: string }
  guardadoEn: string
}

const KEY = 'zperf_psych_v1'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p_${Date.now()}_${Math.round(Math.random() * 1e6)}`
}

export function loadPsych(): SavedPsych[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedPsych[]) : []
  } catch {
    return []
  }
}

export function savePsych(rec: Omit<SavedPsych, 'id' | 'guardadoEn'>): SavedPsych[] {
  const record: SavedPsych = { ...rec, id: uid(), guardadoEn: new Date().toISOString() }
  const next = [record, ...loadPsych()]
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignora */ }
  return next
}

export function deletePsych(id: string): SavedPsych[] {
  const next = loadPsych().filter((p) => p.id !== id)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignora */ }
  return next
}
