// Piezas visuales compartidas por los paneles de admin (métricas y cobros).
// Sin librería de gráficos a propósito: son barras de CSS, pesan nada y
// heredan los tokens del tema (claro/oscuro) sin configuración.

import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/Icon'

export const usd = (n: number) =>
  new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)

export const num = (n: number) => new Intl.NumberFormat('es').format(n)

export function fechaCorta(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

export function fechaLarga(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Tone = 'neutral' | 'warn' | 'danger' | 'ok'

const TONE_ICON: Record<Tone, string> = {
  neutral: 'bg-accent/10 text-accent',
  warn: 'bg-warn/10 text-warn',
  danger: 'bg-danger/10 text-danger',
  ok: 'bg-ok/10 text-ok',
}

/** Variación porcentual contra el período anterior (▲ verde / ▼ rojo). */
export function Variation({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-muted">sin base previa</span>
  const up = value >= 0
  return (
    <span className={up ? 'text-ok' : 'text-danger'}>
      {up ? '▲' : '▼'} {Math.abs(value)}% vs. período anterior
    </span>
  )
}

export function StatCard({
  label, value, detail, icon, tone = 'neutral',
}: { label: string; value: ReactNode; detail?: ReactNode; icon: IconName; tone?: Tone }) {
  return (
    <div className="flex min-w-0 items-start gap-3 px-5 py-5">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE_ICON[tone]}`}>
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
        {detail && <p className="mt-1 text-xs text-ink-muted">{detail}</p>}
      </div>
    </div>
  )
}

/** Fila de tarjetas separadas por divisores, estilo del panel del instructor. */
export function StatRow({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  return (
    <section className="za-card overflow-hidden">
      <div
        className={`grid divide-y divide-surface-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 ${cols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
      >
        {children}
      </div>
    </section>
  )
}

export function Panel({
  title, subtitle, aside, children, id,
}: { title: string; subtitle?: string; aside?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section className="za-card overflow-hidden" aria-labelledby={id}>
      <header className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
        <div>
          <h2 id={id} className="text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {aside && <div className="shrink-0 text-xs text-ink-muted">{aside}</div>}
      </header>
      {children}
    </section>
  )
}

export function PanelEmpty({ message }: { message: string }) {
  return <p className="px-5 py-8 text-center text-sm text-ink-muted">{message}</p>
}

/** Aviso accionable (vencimientos, pendientes...). */
export function Callout({
  tone = 'warn', title, children,
}: { tone?: 'warn' | 'danger'; title: string; children?: ReactNode }) {
  const cls = tone === 'danger' ? 'border-danger/30 bg-danger/5' : 'border-warn/30 bg-warn/5'
  const icon = tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn'
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 ${cls}`}>
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${icon}`}>
        <Icon name="flag" size={16} />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-ink">{title}</p>
        {children && <div className="mt-1 leading-5 text-ink-soft">{children}</div>}
      </div>
    </div>
  )
}

/** Lista de barras horizontales (ranking). */
export function BarList({
  items, format = num,
}: { items: { label: string; value: number; hint?: string }[]; format?: (n: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="divide-y divide-surface-border">
      {items.map((i) => (
        <li key={i.label} className="grid gap-1.5 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_11rem_5.5rem] sm:items-center">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{i.label}</p>
            {i.hint && <p className="truncate text-xs text-ink-muted">{i.hint}</p>}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft" aria-hidden="true">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
          <p className="text-right text-sm font-semibold tabular-nums text-ink">{format(i.value)}</p>
        </li>
      ))}
    </ul>
  )
}

/** Gráfico de columnas. Muestra la etiqueta cada `labelEvery` columnas. */
export function ColumnChart({
  items, format = num, labelEvery = 1, label,
}: { items: { label: string; value: number }[]; format?: (n: number) => string; labelEvery?: number; label: string }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <figure className="px-5 py-5" aria-label={label}>
      <div className="flex h-40 items-end gap-1" role="img" aria-label={label}>
        {items.map((i) => (
          <div
            key={i.label}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
            title={`${i.label}: ${format(i.value)}`}
          >
            <div
              className={`w-full rounded-t ${i.value > 0 ? 'bg-accent' : 'bg-surface-soft'}`}
              style={{ height: `${i.value > 0 ? Math.max((i.value / max) * 100, 4) : 2}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 text-[10px] text-ink-muted">
        {items.map((i, idx) => (
          <span key={i.label} className="min-w-0 flex-1 truncate text-center">
            {idx % labelEvery === 0 ? i.label : ''}
          </span>
        ))}
      </div>
    </figure>
  )
}
