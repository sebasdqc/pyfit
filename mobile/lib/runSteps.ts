/**
 * runSteps.ts — Expande la estructura prescrita por el motor en una secuencia
 * de PASOS ejecutables, para guiar la sesión durante la carrera.
 *
 * El backend (`ai_running.training_science_running.prescribe_run_session`)
 * devuelve `estructura_fases.segmentos`, donde un segmento puede representar
 * VARIAS repeticiones a la vez:
 *
 *     { fase: 'principal', repeticiones: 5, trabajo: {distancia_km: 1.0},
 *       recuperacion: {min: 2, tipo: 'trote suave'}, pace_objetivo: [...], rpe: 9 }
 *
 * Eso describe la sesión, pero no se puede *ejecutar* directamente: hay que
 * desplegarlo en 5 bloques de trabajo intercalados con 4 de recuperación.
 * Este módulo hace exactamente esa expansión.
 *
 * ⚠️ La recuperación va SOLO ENTRE repeticiones, nunca después de la última —
 * es la misma regla que usa el backend para calcular la duración total
 * (`n_rec = max(0, reps - 1)` en `_seg_min_km`). Si acá se contara distinto, la
 * sesión guiada duraría más que la prescrita.
 *
 * Lógica pura, sin React/RN, testeable sin montar la pantalla ni el GPS —
 * mismo criterio que runMode.ts y disciplinas.ts.
 */

export type PasoTipo = 'calentamiento' | 'trabajo' | 'recuperacion' | 'enfriamiento'

/** Objetivos del paso. `rpe` SIEMPRE existe; ritmo y FC pueden faltar (cold-start). */
export interface PasoObjetivo {
  paceRange: [number, number] | null   // s/km
  hrRange: [number, number] | null     // ppm
  rpe: number
}

export interface Paso {
  id: string
  tipo: PasoTipo
  etiqueta: string
  /** Criterio de fin por distancia (metros). Excluyente con metaDuracionS. */
  metaDistanciaM: number | null
  /** Criterio de fin por tiempo (segundos). Excluyente con metaDistanciaM. */
  metaDuracionS: number | null
  /**
   * true cuando el paso no tiene criterio automático y lo cierra el usuario.
   * Caso real: la recuperación de cuestas es "bajar trotando" — sin duración,
   * porque depende de la cuesta. Forzar un tiempo ahí sería inventar el dato.
   */
  manual: boolean
  objetivo: PasoObjetivo
  /** Posición dentro de la serie (1-based) y total, o null si no es serie. */
  repIndex: number | null
  repTotal: number | null
}

interface SegmentoCrudo {
  fase?: string
  repeticiones?: number
  trabajo?: Record<string, number> | null
  recuperacion?: (Record<string, unknown> & { tipo?: string }) | null
  pace_objetivo?: unknown
  fc_objetivo?: unknown
  rpe?: number
}

/** Normaliza un rango [lo, hi] del backend; cualquier cosa que no lo sea → null. */
function rango(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length < 2) return null
  const [lo, hi] = v
  if (typeof lo !== 'number' || typeof hi !== 'number') return null
  return [lo, hi]
}

/** Convierte un bloque {distancia_km|min|seg} a metros o segundos. */
function meta(bloque: Record<string, number> | null | undefined): {
  distanciaM: number | null
  duracionS: number | null
} {
  const b = bloque || {}
  if (typeof b.distancia_km === 'number' && b.distancia_km > 0) {
    return { distanciaM: Math.round(b.distancia_km * 1000), duracionS: null }
  }
  if (typeof b.min === 'number' && b.min > 0) {
    return { distanciaM: null, duracionS: Math.round(b.min * 60) }
  }
  if (typeof b.seg === 'number' && b.seg > 0) {
    return { distanciaM: null, duracionS: Math.round(b.seg) }
  }
  return { distanciaM: null, duracionS: null }
}

const ETIQUETA_FASE: Record<string, string> = {
  calentamiento: 'Calentamiento',
  enfriamiento: 'Enfriamiento',
  principal: 'Bloque principal',
}

function tipoDeFase(fase: string | undefined): PasoTipo {
  if (fase === 'calentamiento') return 'calentamiento'
  if (fase === 'enfriamiento') return 'enfriamiento'
  return 'trabajo'
}

/**
 * Expande `estructura_fases.segmentos` en la secuencia de pasos a ejecutar.
 * Devuelve [] para una sesión de descanso o una estructura ausente/inválida.
 */
export function expandirPasos(segmentos: unknown): Paso[] {
  if (!Array.isArray(segmentos)) return []

  const pasos: Paso[] = []

  segmentos.forEach((raw, segIdx) => {
    const seg = (raw || {}) as SegmentoCrudo
    const reps = Math.max(1, Math.round(seg.repeticiones ?? 1))
    const trabajo = meta(seg.trabajo)
    const objetivo: PasoObjetivo = {
      paceRange: rango(seg.pace_objetivo),
      hrRange: rango(seg.fc_objetivo),
      rpe: typeof seg.rpe === 'number' ? seg.rpe : 0,
    }
    const tipo = tipoDeFase(seg.fase)
    const esSerie = reps > 1
    const rec = seg.recuperacion || null
    const recMeta = meta(rec as Record<string, number> | null)
    const recTipo = typeof rec?.tipo === 'string' ? rec.tipo : null

    for (let i = 1; i <= reps; i++) {
      pasos.push({
        id: `${segIdx}-${i}-w`,
        tipo,
        etiqueta: esSerie
          ? `Serie ${i} de ${reps}`
          : (ETIQUETA_FASE[seg.fase ?? ''] ?? 'Bloque principal'),
        metaDistanciaM: trabajo.distanciaM,
        metaDuracionS: trabajo.duracionS,
        manual: trabajo.distanciaM === null && trabajo.duracionS === null,
        objetivo,
        repIndex: esSerie ? i : null,
        repTotal: esSerie ? reps : null,
      })

      // Recuperación SOLO entre repeticiones — nunca tras la última.
      if (rec && i < reps) {
        pasos.push({
          id: `${segIdx}-${i}-r`,
          tipo: 'recuperacion',
          etiqueta: recTipo ? `Recuperación · ${recTipo}` : 'Recuperación',
          metaDistanciaM: recMeta.distanciaM,
          metaDuracionS: recMeta.duracionS,
          // Sin duración declarada (p. ej. "bajar trotando") → lo cierra el usuario.
          manual: recMeta.distanciaM === null && recMeta.duracionS === null,
          objetivo: { paceRange: null, hrRange: null, rpe: 0 },
          repIndex: null,
          repTotal: null,
        })
      }
    }
  })

  return pasos
}

/**
 * Progreso (0..1) dentro de un paso, dado lo avanzado DESDE QUE EMPEZÓ ese paso.
 * Los pasos manuales devuelven 0: no tienen contra qué medirse.
 */
export function progresoPaso(paso: Paso, distanciaEnPasoM: number, tiempoEnPasoS: number): number {
  if (paso.metaDistanciaM && paso.metaDistanciaM > 0) {
    return Math.min(1, Math.max(0, distanciaEnPasoM / paso.metaDistanciaM))
  }
  if (paso.metaDuracionS && paso.metaDuracionS > 0) {
    return Math.min(1, Math.max(0, tiempoEnPasoS / paso.metaDuracionS))
  }
  return 0
}

/**
 * ¿Se cumplió el criterio de fin del paso? Siempre false para pasos manuales
 * — avanzarlos es decisión del usuario, no del reloj.
 */
export function pasoCompletado(paso: Paso, distanciaEnPasoM: number, tiempoEnPasoS: number): boolean {
  if (paso.manual) return false
  return progresoPaso(paso, distanciaEnPasoM, tiempoEnPasoS) >= 1
}

/** Totales planificados de la secuencia, para mostrar un resumen antes de arrancar. */
export function totalesPlanificados(pasos: Paso[]): { distanciaM: number; duracionS: number } {
  return pasos.reduce(
    (acc, p) => ({
      distanciaM: acc.distanciaM + (p.metaDistanciaM ?? 0),
      duracionS: acc.duracionS + (p.metaDuracionS ?? 0),
    }),
    { distanciaM: 0, duracionS: 0 },
  )
}
