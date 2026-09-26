// Portada operativa de Performance. Consume un único contrato agregado del
// backend y representa explícitamente datos faltantes: nunca deriva métricas de
// la identidad del roster ni sustituye un fallo por contenido demo.

import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDailyBrief } from '@/api/performance'
import { useActiveCenter } from '@/centers/useActiveCenter'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, Legend, MetricCard, type Metric } from '@/components/ui/dashboard'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { SEM, type Tone } from '@/lib/tone'
import type { DailyAvailabilityStatus, DailyBrief, DailyBriefAthlete } from '@/types'

const STATUS: Record<DailyAvailabilityStatus, { label: string; tone: Tone }> = {
  ready: { label: 'Disponible', tone: 'ok' },
  modified: { label: 'Adaptar', tone: 'warn' },
  review: { label: 'Revisar', tone: 'danger' },
  unavailable: { label: 'No disponible', tone: 'danger' },
  unknown: { label: 'Sin datos', tone: 'accent' },
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] : (parts[0] ?? '—')
}

function formatDate(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone,
  }).format(new Date(`${value}T12:00:00Z`))
}

function formatUpdated(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('es', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone,
  }).format(new Date(value))
}

function sourceRoute(source: string): string {
  if (source === 'injuries') return '/lesiones'
  if (source === 'wellness') return '/psicologico'
  if (source === 'load') return '/carga'
  return '/equipo'
}

function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-perf-border bg-perf-surface/50 px-6 text-center">
      {children}
    </div>
  )
}

export function DashboardPage() {
  const { activeCenterId, activeCenter, termino } = useActiveCenter()
  const navigate = useNavigate()
  const [brief, setBrief] = useState<DailyBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!activeCenterId) {
      setBrief(null)
      setError(false)
      return
    }
    let alive = true
    setLoading(true)
    setError(false)
    setBrief(null)
    getDailyBrief(activeCenterId)
      .then((data) => {
        if (alive) setBrief(data)
      })
      .catch(() => {
        if (alive) setError(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [activeCenterId, retryKey])

  if (!activeCenterId) {
    return (
      <EmptyCard>
        <p className="text-sm font-medium text-white/80">Aún no hay un centro activo.</p>
        <p className="max-w-sm text-sm text-white/45">
          Crea o selecciona un centro para abrir el briefing operativo.
        </p>
      </EmptyCard>
    )
  }

  if (loading) {
    return (
      <EmptyCard>
        <Spinner size={22} />
        <p className="text-sm text-white/45">Preparando el briefing con datos reales…</p>
      </EmptyCard>
    )
  }

  if (error || !brief) {
    return (
      <EmptyCard>
        <p className="text-sm font-medium text-perf-danger">No se pudo cargar el briefing.</p>
        <p className="max-w-sm text-sm text-white/45">
          Tus datos no fueron sustituidos por una muestra. Revisa la conexión e inténtalo de nuevo.
        </p>
        <button
          type="button"
          onClick={() => setRetryKey((value) => value + 1)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark"
        >
          Reintentar
        </button>
      </EmptyCard>
    )
  }

  if (brief.coverage.roster_total === 0) {
    return (
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <DashboardHeader brief={brief} centerName={activeCenter?.center_nombre} />
        <EmptyCard>
          <p className="text-sm font-medium text-white/80">Este centro aún no tiene atletas.</p>
          <p className="max-w-sm text-sm text-white/45">
            Registra a tu {termino('persona').toLowerCase()} para comenzar a construir el briefing diario.
          </p>
          <Link
            to="/equipo"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark"
          >
            Ir a Equipo
          </Link>
        </EmptyCard>
      </div>
    )
  }

  const attention = brief.availability.modified + brief.availability.review + brief.availability.unavailable
  const coverageTone: Tone = brief.coverage.status === 'complete'
    ? 'ok'
    : brief.coverage.status === 'partial' ? 'warn' : 'danger'
  const metrics: Metric[] = [
    {
      label: 'Plantilla', value: String(brief.coverage.roster_total), icon: 'plantilla', tone: 'accent',
      foot: `${brief.availability.unknown} sin clasificar`,
    },
    {
      label: 'Disponibles', value: String(brief.availability.ready), icon: 'shield', tone: 'ok',
      foot: 'Con señal real favorable',
    },
    {
      label: 'Requieren atención', value: String(attention), icon: 'alert',
      tone: attention > 0 ? 'danger' : 'ok', foot: 'Adaptar, revisar o excluir',
    },
    {
      label: 'Wellness de hoy', value: `${brief.coverage.wellness_pct}%`, icon: 'wellness',
      tone: coverageTone, foot: `${brief.coverage.wellness_today}/${brief.coverage.roster_total} respuestas`,
    },
    {
      label: 'Carga últimos 7 días', value: `${brief.coverage.load_pct}%`, icon: 'gauge',
      tone: coverageTone, foot: `${brief.coverage.load_7d}/${brief.coverage.roster_total} con registro`,
    },
  ]
  const priorities = brief.athletes.filter((athlete) =>
    athlete.status === 'review' || athlete.status === 'unavailable' || athlete.status === 'modified')

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <DashboardHeader brief={brief} centerName={activeCenter?.center_nombre} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            m={metric}
            className={index === 4 ? 'col-span-2 lg:col-span-1' : ''}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Disponibilidad de la plantilla"
          subtitle="Estado operativo; “sin datos” nunca significa disponible"
        >
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-8">
            {brief.athletes.map((athlete) => {
              const state = STATUS[athlete.status]
              return (
                <button
                  key={athlete.center_athlete_id}
                  type="button"
                  onClick={() => navigate('/equipo')}
                  className="group flex min-w-0 flex-col items-center gap-1.5 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title={`${athlete.name}: ${state.label}`}
                >
                  <Avatar name={athlete.name} src={athlete.photo} size={42} />
                  <span className={`h-2 w-2 rounded-full ${SEM[state.tone].bg}`} />
                  <span className="max-w-full truncate text-[10px] text-white/50 group-hover:text-white/75">
                    {shortName(athlete.name)}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-perf-border pt-4 text-xs text-white/55">
            <Legend tone="ok" label="Disponible" count={brief.availability.ready} />
            <Legend tone="warn" label="Adaptar" count={brief.availability.modified} />
            <Legend tone="danger" label="Revisar / no disponible" count={brief.availability.review + brief.availability.unavailable} />
            <Legend tone="accent" label="Sin datos" count={brief.availability.unknown} />
          </div>
        </Panel>

        <CoveragePanel brief={brief} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Prioridades de hoy"
          subtitle={priorities.length ? `${priorities.length} casos requieren decisión` : 'Sin restricciones detectadas'}
        >
          {priorities.length ? (
            <ul className="divide-y divide-perf-border">
              {priorities.map((athlete) => (
                <PriorityRow key={athlete.center_athlete_id} athlete={athlete} navigate={navigate} />
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-white/45">
              No hay casos marcados para adaptar o revisar con la información recibida.
            </p>
          )}
        </Panel>

        <Panel
          title="Plan de hoy"
          subtitle={brief.permissions.planning_detail ? 'Sesiones persistidas en Planificación' : 'Detalle restringido por permisos'}
        >
          {!brief.permissions.planning_detail ? (
            <p className="py-4 text-sm text-white/45">No tienes acceso al detalle de planificación.</p>
          ) : brief.sessions.length ? (
            <ul className="divide-y divide-perf-border">
              {brief.sessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/90">{session.name}</p>
                    <p className="mt-0.5 text-xs text-white/45">
                      {[session.duration_min && `${session.duration_min} min`, session.target_load_ua && `${session.target_load_ua} UA`]
                        .filter(Boolean).join(' · ') || 'Sin dosificación cargada'}
                    </p>
                  </div>
                  <Badge tone="accent" label={session.status} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-4">
              <p className="text-sm text-white/60">No hay sesiones planificadas para hoy.</p>
              <Link to="/planificacion" className="mt-2 inline-block text-sm font-medium text-accent hover:text-accentLight">
                Abrir Planificación
              </Link>
            </div>
          )}
          {brief.next_event && (
            <div className="mt-4 border-t border-perf-border pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Próximo evento</p>
              <p className="mt-1 text-sm font-medium text-white/85">{brief.next_event.title}</p>
              <p className="text-xs text-white/45">{brief.next_event.start_date}</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function DashboardHeader({ brief, centerName }: { brief: DailyBrief; centerName?: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
          {centerName ?? brief.center.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Briefing de hoy</h1>
        <p className="mt-1 text-sm capitalize text-white/50">{formatDate(brief.date, brief.timezone)}</p>
      </div>
      <div className="text-right">
        <p className="flex items-center justify-end gap-2 text-xs font-medium text-perf-ok">
          <span className="h-2 w-2 rounded-full bg-perf-ok" />
          Datos del centro
        </p>
        <p className="mt-1 text-[11px] text-white/35">
          Generado {formatUpdated(brief.generated_at, brief.timezone)} · {brief.timezone}
        </p>
      </div>
    </header>
  )
}

function CoveragePanel({ brief }: { brief: DailyBrief }) {
  const rows = [
    { label: 'Wellness hoy', value: brief.coverage.wellness_pct, count: brief.coverage.wellness_today },
    { label: 'Carga 7 días', value: brief.coverage.load_pct, count: brief.coverage.load_7d },
    {
      label: 'Ficha completa hoy',
      value: brief.coverage.roster_total ? Math.round(brief.coverage.complete_today / brief.coverage.roster_total * 100) : 0,
      count: brief.coverage.complete_today,
    },
  ]
  return (
    <Panel title="Cobertura de datos" subtitle="Qué tan completa es la lectura de hoy">
      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-white/60">{row.label}</span>
              <span className="font-semibold tabular-nums text-white/80">
                {row.count}/{brief.coverage.roster_total} · {row.value}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-accent" style={{ width: `${row.value}%` }} />
            </div>
          </div>
        ))}
      </div>
      {brief.coverage.missing_wellness_ids.length > 0 && (
        <p className="mt-5 border-t border-perf-border pt-4 text-xs leading-relaxed text-white/45">
          Faltan {brief.coverage.missing_wellness_ids.length} check-ins de bienestar. Esos casos permanecen sin clasificar salvo que exista otra señal real.
        </p>
      )}
    </Panel>
  )
}

function PriorityRow({
  athlete,
  navigate,
}: {
  athlete: DailyBriefAthlete
  navigate: (to: string) => void
}) {
  const state = STATUS[athlete.status]
  const primary = athlete.reasons[0]
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={() => navigate(primary ? sourceRoute(primary.source) : '/equipo')}
        className="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Avatar name={athlete.name} src={athlete.photo} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white/90">{athlete.name}</p>
          <p className="truncate text-xs text-white/45">{primary?.label ?? 'Requiere revisión'}</p>
        </div>
        <Badge tone={state.tone} label={state.label} />
      </button>
    </li>
  )
}
