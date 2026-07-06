// Datos de muestra del módulo CARGA (solo cuando NO hay roster real, igual que el
// módulo GPS usa mockGps). Espejo CLIENTE y determinista del cálculo del servidor
// (ACWR RA/EWMA, monotonía, strain) para poblar la demo y permitir registrar en
// vivo sin backend. Con roster real NUNCA se usa: ahí manda el servidor.

import type { CargaMetrics, CargaRecord, CargaTeamRow, FormaMetrics, FormaTeamRow, FormaZona } from '@/types'

// Hash determinista (mismo id → misma serie). Sin Math.random para reproducibilidad.
function seedFrom(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

// 28 cargas diarias (UA) deterministas con microciclos (días de descanso = 0).
export function demoSeries(id: string): number[] {
  const base = 350 + seedFrom(id) * 350 // 350–700 UA en días de carga
  const spike = seedFrom(id + 'x') > 0.7 // algunos atletas con pico reciente
  const serie: number[] = []
  for (let d = 0; d < 28; d++) {
    const dow = d % 7
    let v = dow === 6 ? 0 : base * (0.7 + 0.5 * Math.abs(Math.sin((d + seedFrom(id) * 6) * 0.7)))
    if (spike && d >= 24) v *= 1.7 // semana de choque
    serie.push(Math.round(v))
  }
  return serie
}

function pstdev(xs: number[]): number {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
}

function ewma(serie: number[], n: number): number {
  const lam = 2 / (n + 1)
  let e = serie[0]
  for (let i = 1; i < serie.length; i++) e = serie[i] * lam + (1 - lam) * e
  return e
}

export function zonaFromAcwr(acwr: number): string {
  if (acwr < 0.8) return 'Infracarga'
  if (acwr <= 1.3) return 'Óptima (sweet spot)'
  if (acwr <= 1.5) return 'Precaución'
  if (acwr <= 2.0) return 'Zona de peligro'
  return 'Riesgo alto'
}

export function zonaTone(zona: string): 'ok' | 'warn' | 'danger' | 'accent' {
  if (zona.startsWith('Óptima')) return 'ok'
  if (zona === 'Zona de peligro' || zona === 'Riesgo alto') return 'danger'
  if (zona === 'Infracarga' || zona === 'Precaución') return 'warn'
  return 'accent' // Acumulando datos / sin clasificar
}

// Calcula métricas (espejo del servidor) a partir de una serie diaria de 28 días.
export function metricsFromSerie(serie: number[]): CargaMetrics {
  const serie7 = serie.slice(-7)
  const aguda = serie7.reduce((a, b) => a + b, 0) / 7
  const cronica = serie.reduce((a, b) => a + b, 0) / serie.length
  const acwrRa = cronica > 0 ? aguda / cronica : null
  const acwrEwma = ewma(serie, 28) > 0 ? ewma(serie, 7) / ewma(serie, 28) : null
  const sd = pstdev(serie7)
  const total7 = serie7.reduce((a, b) => a + b, 0)
  const monotonia = sd > 0 ? total7 / 7 / sd : null
  const r = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100)
  const zona = acwrEwma != null ? zonaFromAcwr(acwrEwma) : 'Acumulando datos'
  return {
    dias_con_datos: serie.filter((v) => v > 0).length,
    suficiente: true,
    carga_serie: serie,
    carga_semanal_ua: Math.round(total7),
    carga_aguda_ua: Math.round(aguda),
    carga_cronica_ua: Math.round(cronica),
    acwr_ra: r(acwrRa),
    acwr_ewma: r(acwrEwma),
    zona,
    riesgo_alerta: acwrEwma != null && acwrEwma > 1.5,
    monotonia: r(monotonia),
    strain_ua: monotonia != null ? Math.round(total7 * monotonia) : null,
    monotonia_alerta: monotonia != null && monotonia > 2,
  }
}

export function demoTeamRow(athleteId: string, userId: number): CargaTeamRow {
  return { athlete: userId, ...metricsFromSerie(demoSeries(athleteId)) }
}

// ── Forma (fitness-fatiga / TSB) — espejo cliente de calculators/forma.py sobre
// la MISMA serie de 28 días de demoSeries (misma columna vertebral que Carga).
const FORMA_VENTANA_FATIGA = 7
const FORMA_VENTANA_FITNESS = 42
const FORMA_TSB_FRESCO = 5
const FORMA_TSB_NEUTRO_MIN = -10

function ewmaSeries(serie: number[], n: number): number[] {
  const lam = 2 / (n + 1)
  const out = [serie[0]]
  for (let i = 1; i < serie.length; i++) out.push(serie[i] * lam + (1 - lam) * out[out.length - 1])
  return out
}

export function formaZona(tsb: number): FormaZona {
  if (tsb > FORMA_TSB_FRESCO) return 'Fresco'
  if (tsb >= FORMA_TSB_NEUTRO_MIN) return 'Neutro / transición'
  return 'Fatigado'
}

export function formaTone(zona: FormaZona): 'ok' | 'warn' | 'danger' | 'accent' {
  if (zona === 'Fresco') return 'ok'
  if (zona === 'Fatigado') return 'danger'
  if (zona === 'Neutro / transición') return 'warn'
  return 'accent' // Acumulando datos
}

export function formaFromSerie(serie: number[]): FormaMetrics {
  const n = serie.length
  const r2 = (x: number) => Math.round(x * 100) / 100
  if (n < FORMA_VENTANA_FATIGA) {
    return {
      dias_con_datos: serie.filter((v) => v > 0).length, suficiente: false, zona: 'Acumulando datos',
      tsb: null, fitness_ua: null, fatiga_ua: null, fitness_serie: [], fatiga_serie: [], tsb_serie: [],
    }
  }
  const fatigaSerie = ewmaSeries(serie, FORMA_VENTANA_FATIGA)
  const ventanaFit = Math.min(FORMA_VENTANA_FITNESS, n)
  const fitnessSerie = ewmaSeries(serie.slice(-ventanaFit), ventanaFit)
  const fatigaAlineada = fatigaSerie.slice(-fitnessSerie.length)
  const tsbSerie = fitnessSerie.map((f, i) => r2(f - fatigaAlineada[i]))
  const tsb = tsbSerie[tsbSerie.length - 1]
  return {
    dias_con_datos: serie.filter((v) => v > 0).length,
    suficiente: true,
    zona: formaZona(tsb),
    tsb,
    fitness_ua: r2(fitnessSerie[fitnessSerie.length - 1]),
    fatiga_ua: r2(fatigaAlineada[fatigaAlineada.length - 1]),
    fitness_serie: fitnessSerie.map(r2),
    fatiga_serie: fatigaAlineada.map(r2),
    tsb_serie: tsbSerie,
    ...(n < FORMA_VENTANA_FITNESS ? { nota: `Ventana de fitness parcial: ${n} de ${FORMA_VENTANA_FITNESS} días.` } : {}),
  }
}

export function demoFormaTeamRow(athleteId: string, userId: number): FormaTeamRow {
  return { athlete: userId, ...formaFromSerie(demoSeries(athleteId)) }
}

// Convierte una serie en registros visibles (un sRPE por día con carga > 0).
export function demoRecords(serie: number[]): CargaRecord[] {
  const today = new Date()
  const recs: CargaRecord[] = []
  serie.forEach((v, i) => {
    if (v <= 0) return
    const d = new Date(today)
    d.setDate(today.getDate() - (serie.length - 1 - i))
    const rpe = Math.max(3, Math.min(10, Math.round(v / 80)))
    const dur = Math.round(v / rpe)
    recs.push({
      id: i + 1,
      athlete: 0,
      fecha: d.toISOString().slice(0, 10),
      carga_ua: v,
      metrica: `sRPE ${rpe}×${dur}min`,
      notas: '',
    })
  })
  return recs.reverse()
}
