// Piezas compartidas por los cuatro dashboards GPS de campo: cabecera de página
// (título + subtítulo + slot derecho + distintivo de demo) y la tarjeta KPI.
// Mantiene el estilo alineado con el resto del portal (perf-* + acento).

import type { ReactNode } from 'react'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SEM, type Tone } from '@/lib/tone'

// Tema de gráficos (oscuro, plano) — compartido por los charts de Recharts.
export const GRID = '#16203a'
export const axisTick = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }
export const tip = {
  contentStyle: { background: '#0f1525', border: '1px solid #1c2740', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: 'rgba(255,255,255,0.55)' },
  itemStyle: { color: '#fff' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
} as const

export function DashHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle: string
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
          <DemoBadge variant="demo" />
        </div>
        <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>
      </div>
      {right && <div className="flex items-center gap-2.5">{right}</div>}
    </div>
  )
}

export function Kpi({
  label,
  value,
  unit,
  delta,
  tone = 'accent',
}: {
  label: string
  value: string
  unit?: string
  delta?: string
  tone?: Tone
}) {
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold leading-none ${SEM[tone].text}`}>{value}</p>
      {unit && <p className="mt-1.5 text-[11px] text-white/40">{unit}</p>}
      {delta && <p className={`mt-1 text-[11px] ${SEM[tone].text}`}>{delta}</p>}
    </div>
  )
}

// Píldora de estado (en vivo / completado / semana…). El punto pulsa si `live`.
export function StatusPill({
  tone,
  label,
  live = false,
}: {
  tone: Tone
  label: string
  live?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${SEM[tone].soft} ${SEM[tone].text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${SEM[tone].bg} ${live ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}
