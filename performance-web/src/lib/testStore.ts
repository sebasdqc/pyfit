// Persistencia local de resultados de test (por dispositivo/navegador), igual que
// squadStore. El CÁLCULO siempre ocurre en el servidor (POST /tests/compute/);
// aquí solo guardamos la foto del resultado por atleta hasta que el backend
// exponga atletas reales y se cablee POST /centers/<id>/test/ con el athlete real
// (el endpoint ya existe y persiste inputs+resultados; ver performance/views.py).

export interface SavedTest {
  id: string
  athleteId: string // id del atleta en la plantilla (mockSquad)
  slug: string
  nombre: string
  familia: string
  fecha: string // YYYY-MM-DD
  inputs: Record<string, unknown>
  resultados: Record<string, unknown>
  guardadoEn: string // ISO 8601
}

const KEY = 'zperf_tests_v1'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `t_${Date.now()}_${Math.round(Math.random() * 1e6)}`
}

export function loadTests(): SavedTest[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedTest[]) : []
  } catch {
    return []
  }
}

function persist(list: SavedTest[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* sin localStorage (modo privado/cuota): se ignora */
  }
}

/** Guarda un resultado nuevo (al principio) y devuelve la lista completa. */
export function saveTest(t: Omit<SavedTest, 'id' | 'guardadoEn'>): SavedTest[] {
  const record: SavedTest = { ...t, id: uid(), guardadoEn: new Date().toISOString() }
  const next = [record, ...loadTests()]
  persist(next)
  return next
}

export function deleteTest(id: string): SavedTest[] {
  const next = loadTests().filter((t) => t.id !== id)
  persist(next)
  return next
}
