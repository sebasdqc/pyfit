// Dashboard principal de Zyfit Performance — primera pantalla del director
// técnico. Densidad de información profesional con jerarquía clara: fila de 5
// métricas + 3 filas de contenido (semáforo de plantilla + microciclo · alertas
// + ACWR · accesos a módulos). Único acento: el azul. Estados: verde/ámbar/rojo.
// Datos de muestra (esta fase aún no conecta a la API).

import { useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { useActiveCenter } from '@/centers/useActiveCenter'

// ── Paleta semántica → clases ──────────────────────────────────────────────
type Tone = 'accent' | 'ok' | 'warn' | 'danger'
const SEM: Record<Tone, { text: string; bg: string; soft: string }> = {
  accent: { text: 'text-accent', bg: 'bg-accent', soft: 'bg-accent/10' },
  ok: { text: 'text-perf-ok', bg: 'bg-perf-ok', soft: 'bg-perf-ok/10' },
  warn: { text: 'text-perf-warn', bg: 'bg-perf-warn', soft: 'bg-perf-warn/10' },
  danger: { text: 'text-perf-danger', bg: 'bg-perf-danger', soft: 'bg-perf-danger/10' },
}

// ── Datos de muestra ───────────────────────────────────────────────────────
type Estado = 'ok' | 'duda' | 'baja'
const ESTADO_TONE: Record<Estado, Tone> = { ok: 'ok', duda: 'warn', baja: 'danger' }

const SQUAD: { n: string; s: Estado }[] = [
  { n: 'Iker Salas', s: 'ok' }, { n: 'Marco Ruiz', s: 'ok' }, { n: 'Diego Castro', s: 'duda' },
  { n: 'Luis Fernández', s: 'baja' }, { n: 'Pablo Vidal', s: 'ok' }, { n: 'Hugo Mena', s: 'ok' },
  { n: 'Javier Pérez', s: 'baja' }, { n: 'Andrés Gómez', s: 'duda' }, { n: 'Sergio Lara', s: 'ok' },
  { n: 'Tomás Ríos', s: 'ok' }, { n: 'Nico Bravo', s: 'ok' }, { n: 'Raúl Núñez', s: 'duda' },
  { n: 'Mateo Soto', s: 'ok' }, { n: 'Bruno Díaz', s: 'ok' }, { n: 'Kevin Vidal', s: 'ok' },
  { n: 'Adrián Paz', s: 'ok' }, { n: 'Gael Mora', s: 'baja' }, { n: 'Iván Cruz', s: 'ok' },
  { n: 'Leo Acosta', s: 'duda' }, { n: 'Óscar Vega', s: 'ok' }, { n: 'Dani Roca', s: 'ok' },
  { n: 'Saúl Ibáñez', s: 'ok' },
]

const MICROCICLO: { d: string; load: number; match?: boolean }[] = [
  { d: 'Lun', load: 35 }, { d: 'Mar', load: 78 }, { d: 'Mié', load: 64 },
  { d: 'Jue', load: 88 }, { d: 'Vie', load: 52 }, { d: 'Sáb', load: 28 },
  { d: 'Dom', load: 100, match: true },
]

type Modulo = 'lesion' | 'acwr' | 'psico'
const MODULO_BADGE: Record<Modulo, { label: string; tone: Tone }> = {
  lesion: { label: 'Lesión', tone: 'danger' },
  acwr: { label: 'ACWR', tone: 'warn' },
  psico: { label: 'Psicológico', tone: 'accent' },
}
// A qué módulo lleva cada alerta al hacer clic.
const MODULO_ROUTE: Record<Modulo, string> = {
  lesion: '/lesiones',
  acwr: '/rendimiento',
  psico: '/psicologico',
}
const ALERTAS: { n: string; desc: string; mod: Modulo }[] = [
  { n: 'Luis Fernández', desc: 'Molestia isquiotibial — 3.º día de baja', mod: 'lesion' },
  { n: 'Javier Pérez', desc: 'ACWR 1.62 — carga aguda elevada', mod: 'acwr' },
  { n: 'Andrés Gómez', desc: 'Ánimo y sueño bajos (3 días seguidos)', mod: 'psico' },
  { n: 'Gael Mora', desc: 'Sobrecarga en gemelo derecho', mod: 'lesion' },
  { n: 'Diego Castro', desc: 'ACWR 1.48 — monitorizar progresión', mod: 'acwr' },
]

const ACWR: { n: string; v: number }[] = [
  { n: 'Javier Pérez', v: 1.62 }, { n: 'Diego Castro', v: 1.48 }, { n: 'Raúl Núñez', v: 1.41 },
  { n: 'Leo Acosta', v: 1.34 }, { n: 'Mateo Soto', v: 1.21 }, { n: 'Kevin Vidal', v: 1.08 },
]
const acwrTone = (v: number): Tone => (v >= 1.5 ? 'danger' : v >= 1.3 ? 'warn' : 'ok')

interface Metric {
  label: string
  value: string
  unit?: string
  icon: IconName
  tone: Tone
  trend?: { up: boolean; delta: string; good: boolean }
  foot?: string
}
const METRICS: Metric[] = [
  { label: 'Jugadores convocados', value: '23', icon: 'plantilla', tone: 'accent', trend: { up: true, delta: '+2', good: true } },
  { label: 'Disponibles próx. partido', value: '18', icon: 'shield', tone: 'ok', trend: { up: false, delta: '−1', good: false } },
  { label: 'Alertas activas', value: '5', icon: 'alert', tone: 'danger', foot: '3 lesión · 2 ACWR' },
  { label: 'Bienestar medio (hoy)', value: '7.4', unit: '/10', icon: 'wellness', tone: 'ok', trend: { up: true, delta: '+0.3', good: true } },
  { label: 'Carga media (sesión)', value: '612', unit: 'UA', icon: 'gauge', tone: 'warn', trend: { up: true, delta: '+4%', good: true } },
]

// ── Página ─────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { activeCenter } = useActiveCenter()
  const navigate = useNavigate()
  const centro = activeCenter?.center_nombre ?? 'Tu centro deportivo'
  const counts = { ok: SQUAD.filter((p) => p.s === 'ok').length, duda: SQUAD.filter((p) => p.s === 'duda').length, baja: SQUAD.filter((p) => p.s === 'baja').length }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">{centro}</p>
        <DemoBadge variant="demo" />
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {METRICS.map((m, i) => (
          <MetricCard key={m.label} m={m} className={i === 4 ? 'col-span-2 lg:col-span-1' : ''} />
        ))}
      </div>

      {/* Fila 1 — semáforo de plantilla (2/3) + microciclo (1/3) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Panel
          className="md:col-span-2"
          title="Disponibilidad de la plantilla"
          subtitle="Estado físico de cada jugador para el próximo partido"
        >
          <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-6 lg:grid-cols-8">
            {SQUAD.map((p) => (
              <div key={p.n} className="flex flex-col items-center gap-1.5">
                <Avatar name={p.n} size={42} />
                <span className={`h-2 w-2 rounded-full ${SEM[ESTADO_TONE[p.s]].bg}`} />
                <span className="max-w-full truncate text-[10px] text-white/45">{p.n.split(' ')[1]}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-perf-border pt-4 text-xs text-white/55">
            <Legend tone="ok" label="Disponible" count={counts.ok} />
            <Legend tone="warn" label="Duda" count={counts.duda} />
            <Legend tone="danger" label="No disponible" count={counts.baja} />
          </div>
        </Panel>

        <Panel title="Microciclo de la semana" subtitle="Carga planificada por día">
          <div className="flex flex-col gap-2.5">
            {MICROCICLO.map((day) => (
              <div key={day.d} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs text-white/45">{day.d}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${day.match ? 'bg-accent' : 'bg-white/20'}`}
                    style={{ width: `${day.load}%` }}
                  />
                </div>
                {day.match ? (
                  <span className="w-14 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wide text-accent">
                    Partido
                  </span>
                ) : (
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-white/40">{day.load}%</span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Fila 2 — alertas prioritarias + ACWR críticos (1:1) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Alertas prioritarias" subtitle={`${ALERTAS.length} requieren atención`}>
          <ul className="flex flex-col divide-y divide-perf-border">
            {ALERTAS.map((a) => (
              <li key={a.n} className="first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => navigate(MODULO_ROUTE[a.mod])}
                  className="flex w-full items-center gap-3 py-3 text-left transition-opacity hover:opacity-80"
                >
                  <Avatar name={a.n} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/90">{a.n}</p>
                    <p className="truncate text-xs text-white/45">{a.desc}</p>
                  </div>
                  <Badge tone={MODULO_BADGE[a.mod].tone} label={MODULO_BADGE[a.mod].label} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="ACWR — jugadores críticos" subtitle="Ratio carga aguda : crónica">
          <div className="flex flex-col gap-3">
            {ACWR.map((a) => {
              const tone = acwrTone(a.v)
              return (
                <div key={a.n} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs text-white/65">{a.n}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full ${SEM[tone].bg}`} style={{ width: `${Math.min(a.v / 2, 1) * 100}%` }} />
                  </div>
                  <span className={`w-10 shrink-0 text-right text-xs font-semibold tabular-nums ${SEM[tone].text}`}>
                    {a.v.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-perf-border pt-4 text-[11px] text-white/50">
            <Legend tone="ok" label="Óptimo <1.30" />
            <Legend tone="warn" label="Alerta 1.30–1.50" />
            <Legend tone="danger" label="Riesgo >1.50" />
          </div>
        </Panel>
      </div>

      {/* Fila 3 — accesos directos a módulos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ModuleCard icon="rendimiento" title="Rendimiento" metric="612 UA" detail="Carga media · +4% vs. ant." onClick={() => navigate('/rendimiento')} />
        <ModuleCard icon="lesiones" title="Lesiones" metric="3 activas" detail="2 jugadores en duda" onClick={() => navigate('/lesiones')} />
        <ModuleCard icon="tests" title="Tests" metric="34.2 cm" detail="CMJ medio · próximo 12 jun" onClick={() => navigate('/tests')} />
      </div>
    </div>
  )
}

// ── Componentes ────────────────────────────────────────────────────────────
function MetricCard({ m, className = '' }: { m: Metric; className?: string }) {
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
      {m.trend ? (
        <div className={`mt-1.5 flex items-center gap-1 text-xs ${m.trend.good ? 'text-perf-ok' : 'text-perf-danger'}`}>
          <Icon name={m.trend.up ? 'trendUp' : 'trendDown'} size={13} />
          <span className="font-medium">{m.trend.delta}</span>
          <span className="text-white/30">vs. ant.</span>
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-white/45">{m.foot}</p>
      )}
    </div>
  )
}

function ModuleCard({ icon, title, metric, detail, onClick }: { icon: IconName; title: string; metric: string; detail: string; onClick?: () => void }) {
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

function Badge({ tone, label }: { tone: Tone; label: string }) {
  const sem = SEM[tone]
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${sem.soft} ${sem.text}`}>
      {label}
    </span>
  )
}

function Legend({ tone, label, count }: { tone: Tone; label: string; count?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${SEM[tone].bg}`} />
      {label}
      {count !== undefined && <span className="font-semibold text-white/80">{count}</span>}
    </span>
  )
}
