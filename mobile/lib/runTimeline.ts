/**
 * runTimeline.ts — Helpers puros para mostrar la RUTINA COMPLETA (todos los
 * `Paso[]` de runSteps.ts) como timeline durante la carrera en vivo, no solo
 * el bloque en curso.
 *
 * Lógica pura, sin React/RN — mismo criterio que runSteps.ts/runMode.ts,
 * testeable sin montar la pantalla.
 */
import type { Paso, PasoTipo } from './runSteps'

export type PasoEstado = 'done' | 'current' | 'upcoming'

/** Estado visual de un paso del timeline según el índice en curso real. */
export function estadoPaso(idx: number, pasoIdx: number): PasoEstado {
  if (idx < pasoIdx) return 'done'
  if (idx === pasoIdx) return 'current'
  return 'upcoming'
}

// Ritmo nominal SOLO para estimar la duración de un paso por distancia cuando
// el corredor no tiene zonas de ritmo todavía (cold-start) — nunca se usa
// para prescribir ni medir avance real (eso sigue siendo distancia/tiempo
// acumulado de la carrera). Mismo fallback conservador que usa el backend
// (NOMINAL_EASY_PACE['intermedio'] en training_science_running.py).
const RITMO_NOMINAL_S_KM = 360

/** Duración estimada (segundos) de un paso, para ubicarlo en el timeline. */
export function estimarDuracionPasoS(paso: Paso): number {
  if (paso.metaDuracionS) return paso.metaDuracionS
  if (paso.metaDistanciaM) {
    const paceMid = paso.objetivo.paceRange
      ? (paso.objetivo.paceRange[0] + paso.objetivo.paceRange[1]) / 2
      : RITMO_NOMINAL_S_KM
    return (paso.metaDistanciaM / 1000) * paceMid
  }
  // Paso manual sin meta declarada (ej. bajar una cuesta trotando): no hay
  // forma de estimarlo, no suma al offset de los siguientes.
  return 0
}

/** Offset acumulado (segundos, desde el inicio de la sesión) al EMPEZAR cada paso. */
export function offsetsAcumulados(pasos: Paso[]): number[] {
  let acc = 0
  return pasos.map(p => {
    const inicio = acc
    acc += estimarDuracionPasoS(p)
    return inicio
  })
}

// Emoji por tipo de paso — mismo código de fase que ya usa el resto del
// producto (calentamiento/principal/vuelta a la calma), extendido a
// recuperación entre series.
export const TIPO_ICON: Record<PasoTipo, string> = {
  calentamiento: '🔥',
  trabajo: '🏃',
  recuperacion: '💨',
  enfriamiento: '❄️',
}

// Clave de color del tema (`Colors`, ver lib/colors.ts) por tipo de paso.
// Único lugar que define este mapeo — run/index.tsx y RunTimelineSheet.tsx
// lo comparten para que el color de un bloque nunca diverja entre pantallas.
export const TIPO_COLOR_KEY: Record<PasoTipo, 'orange' | 'accent' | 'inkMuted' | 'green'> = {
  calentamiento: 'orange',
  trabajo: 'accent',
  recuperacion: 'inkMuted',
  enfriamiento: 'green',
}

/** Texto de meta (sin objetivo numérico) para pasos como recuperación/manual. */
export function metaTexto(paso: Paso): string {
  if (paso.metaDistanciaM) {
    return paso.metaDistanciaM >= 1000
      ? `${(paso.metaDistanciaM / 1000).toFixed(2)} km`
      : `${Math.round(paso.metaDistanciaM)} m`
  }
  if (paso.metaDuracionS) {
    const m = Math.floor(paso.metaDuracionS / 60)
    const s = Math.round(paso.metaDuracionS % 60)
    return s > 0 ? `${m} min ${s}s` : `${m} min`
  }
  return paso.manual ? 'a tu ritmo' : ''
}
