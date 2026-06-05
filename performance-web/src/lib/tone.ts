// Tonos semánticos del portal → clases de Tailwind. Único acento azul + verde
// (ok) / ámbar (warn) / rojo (danger). Compartido por las pantallas.

export type Tone = 'accent' | 'ok' | 'warn' | 'danger'

export const SEM: Record<Tone, { text: string; bg: string; soft: string }> = {
  accent: { text: 'text-accent', bg: 'bg-accent', soft: 'bg-accent/10' },
  ok: { text: 'text-perf-ok', bg: 'bg-perf-ok', soft: 'bg-perf-ok/10' },
  warn: { text: 'text-perf-warn', bg: 'bg-perf-warn', soft: 'bg-perf-warn/10' },
  danger: { text: 'text-perf-danger', bg: 'bg-perf-danger', soft: 'bg-perf-danger/10' },
}

// ACWR: óptimo <1.30 · alerta 1.30–1.50 · riesgo >1.50.
export const acwrTone = (v: number): Tone => (v >= 1.5 ? 'danger' : v >= 1.3 ? 'warn' : 'ok')
