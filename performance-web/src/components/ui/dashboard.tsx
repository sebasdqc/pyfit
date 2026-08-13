// Piezas compartidas por los dashboards del panel.
//
// Salieron de DashboardPage cuando apareció el segundo dashboard (el de atleta
// individual, para centros de tipo `atletas`). Viven acá para que las dos
// pantallas no diverjan en tarjetas de métrica, badges o leyendas — que era
// exactamente lo que iba a pasar si se copiaban.

import { Icon, type IconName } from '@/components/Icon'
import { SEM, type Tone } from '@/lib/tone'

export interface Metric {
  label: string
  value: string
  unit?: string
  icon: IconName
  tone: Tone
  foot?: string
}

export function MetricCard({ m, className = '' }: { m: Metric; className?: string }) {
  const sem = SEM[m.tone]
  return (
    <div className={`rounded-2xl border border-perf-border bg-perf-surface p-4 ${className}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${sem.soft} ${sem.text}`}>
        <Icon name={m.icon} size={17} />
      </span>
      <p className="mt-3 text-xs text-white/45">{m.label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-white">{m.value}</span>
        {m.unit && <span className="text-xs text-white/40">{m.unit}</span>}
      </div>
      {m.foot && <p className="mt-1.5 text-xs text-white/45">{m.foot}</p>}
    </div>
  )
}

export function ModuleCard({
  icon, title, metric, detail, onClick,
}: {
  icon: IconName
  title: string
  metric: string
  detail: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-perf-border bg-perf-surface p-5 text-left transition-colors hover:bg-perf-surface2"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Icon name={icon} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-white">{metric}</span>
        </p>
        <p className="truncate text-xs text-white/45">{detail}</p>
      </div>
      <Icon name="chevronRight" size={18} className="shrink-0 text-white/30 transition-colors group-hover:text-white/60" />
    </button>
  )
}

export function Badge({ tone, label }: { tone: Tone; label: string }) {
  const sem = SEM[tone]
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${sem.soft} ${sem.text}`}>
      {label}
    </span>
  )
}

export function Legend({ tone, label, count }: { tone: Tone; label: string; count?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${SEM[tone].bg}`} />
      {label}
      {count !== undefined && <span className="font-semibold text-white/80">{count}</span>}
    </span>
  )
}
