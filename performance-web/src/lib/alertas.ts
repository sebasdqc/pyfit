// Reglas de alerta sobre un atleta — fuente única de los umbrales del panel.
//
// Existían embebidas en el dashboard de equipo. Al aparecer el dashboard de
// atleta individual había que repetirlas, y dos copias de un umbral clínico es
// exactamente el tipo de cosa que se desincroniza sin que nadie lo note: el
// equipo avisaría con ACWR ≥1.30 y el atleta con ≥1.35, sobre el mismo dato.
//
// Los umbrales son los mismos que usa el resto del panel (ver lib/tone.ts
// acwrTone y las leyendas del dashboard): óptimo <1.30 · alerta 1.30–1.50 ·
// riesgo >1.50.

import type { Athlete } from '@/lib/mockSquad'
import type { Tone } from '@/lib/tone'

export type ModuloAlerta = 'lesion' | 'acwr' | 'psico'

export interface AlertaAtleta {
  desc: string
  mod: ModuloAlerta
  // Mayor = más urgente. Ordena tanto la lista de un atleta como la del equipo.
  sev: number
}

export const MODULO_BADGE: Record<ModuloAlerta, { label: string; tone: Tone }> = {
  lesion: { label: 'Lesión', tone: 'danger' },
  acwr: { label: 'ACWR', tone: 'warn' },
  psico: { label: 'Psicológico', tone: 'accent' },
}

// A qué módulo lleva cada alerta al hacer clic.
export const MODULO_ROUTE: Record<ModuloAlerta, string> = {
  lesion: '/lesiones',
  acwr: '/rendimiento',
  psico: '/psicologico',
}

/** Todas las alertas que aplican a un atleta, de más a menos urgente.
 *
 * A diferencia del resumen de equipo, acá NO se corta en la primera: a una
 * persona sí le interesa saber que además del ACWR alto tiene el bienestar
 * bajo. La vista de equipo se queda con la primera (ver `alertaPrincipal`). */
export function alertasDeAtleta(a: Athlete): AlertaAtleta[] {
  const out: AlertaAtleta[] = []

  if (a.acwr >= 1.5) {
    out.push({ desc: `ACWR ${a.acwr.toFixed(2)} — carga aguda elevada`, mod: 'acwr', sev: 100 + a.acwr })
  } else if (a.acwr >= 1.3) {
    out.push({ desc: `ACWR ${a.acwr.toFixed(2)} — monitorizar progresión`, mod: 'acwr', sev: 50 + a.acwr })
  }

  if (a.estado === 'baja') {
    out.push({ desc: 'No disponible — seguimiento de lesión', mod: 'lesion', sev: 90 })
  } else if (a.estado === 'duda') {
    out.push({ desc: 'En duda para la próxima competencia', mod: 'lesion', sev: 40 })
  }

  if (a.bienestar < 6) {
    out.push({ desc: `Bienestar ${a.bienestar.toFixed(1)}/10 — ánimo/sueño bajos`, mod: 'psico', sev: 70 + (6 - a.bienestar) })
  }

  return out.sort((x, y) => y.sev - x.sev)
}

/** La alerta más relevante de un atleta, o null si no tiene ninguna.
 *  Es lo que muestra el dashboard de equipo: una fila por persona. */
export function alertaPrincipal(a: Athlete): AlertaAtleta | null {
  return alertasDeAtleta(a)[0] ?? null
}
