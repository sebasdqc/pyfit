// Dashboard principal de Zyfit Performance — primera pantalla del director
// técnico. Densidad de información profesional con jerarquía clara: fila de 5
// métricas + 3 filas de contenido (semáforo de plantilla + microciclo · alertas
// + ACWR · accesos a módulos). Único acento: verde azulado. Estados: verde/ámbar/rojo.
//
// Datos: la plantilla, las métricas agregadas, las alertas y el ACWR se derivan
// del roster REAL del centro activo (useSquad). El roster (nombres/dorsales/
// estado/foto) es real; las métricas de rendimiento (ACWR, bienestar, carga) aún
// se sintetizan en squadSynth, de ahí la <DemoBadge> en modo "sim". Sin centro
// (demo) cae al squad mock. El microciclo sigue siendo de muestra (la carga
// planificada por día pertenece al módulo de Planificación, no al roster).

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { useActiveCenter } from '@/centers/useActiveCenter'
import { useSquad } from '@/centers/useSquad'
import { SEM, acwrTone, type Tone } from '@/lib/tone'
import { ESTADO_TONE, type Athlete } from '@/lib/mockSquad'

// ── Microciclo (muestra — pertenece a Planificación, no al roster) ───────────
const MICROCICLO: { d: string; load: number; match?: boolean }[] = [
  { d: 'Lun', load: 35 }, { d: 'Mar', load: 78 }, { d: 'Mié', load: 64 },
  { d: 'Jue', load: 88 }, { d: 'Vie', load: 52 }, { d: 'Sáb', load: 28 },
  { d: 'Dom', load: 100, match: true },
]

// ── Alertas derivadas del roster ─────────────────────────────────────────────
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

interface Alerta { id: string; n: string; foto?: string; desc: string; mod: Modulo; sev: number }

// Una alerta (la más relevante) por atleta, ordenadas por severidad. Mismas
// reglas que el resto del panel: ACWR ≥1.50 / baja / bienestar bajo / ACWR ≥1.30.
function buildAlertas(squad: Athlete[]): Alerta[] {
  const out: Alerta[] = []
  for (const a of squad) {
    const base = { id: a.id, n: a.nombre, foto: a.foto }
    if (a.acwr >= 1.5) out.push({ ...base, desc: `ACWR ${a.acwr.toFixed(2)} — carga aguda elevada`, mod: 'acwr', sev: 100 + a.acwr })
    else if (a.estado === 'baja') out.push({ ...base, desc: 'No disponible — seguimiento de lesión', mod: 'lesion', sev: 90 })
    else if (a.bienestar < 6) out.push({ ...base, desc: `Bienestar ${a.bienestar.toFixed(1)}/10 — ánimo/sueño bajos`, mod: 'psico', sev: 70 + (6 - a.bienestar) })
    else if (a.acwr >= 1.3) out.push({ ...base, desc: `ACWR ${a.acwr.toFixed(2)} — monitorizar progresión`, mod: 'acwr', sev: 50 + a.acwr })
    else if (a.estado === 'duda') out.push({ ...base, desc: 'En duda para el próximo partido', mod: 'lesion', sev: 40 })
  }
  return out.sort((x, y) => y.sev - x.sev).slice(0, 6)
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
// Apellido (o única palabra) para la etiqueta compacta del semáforo.
function shortName(n: string): string {
  const p = n.trim().split(/\s+/).filter(Boolean)
  return p.length > 1 ? p[p.length - 1] : (p[0] ?? '—')
}

interface Metric {
  label: string
  value: string
  unit?: string
  icon: IconName
  tone: Tone
  foot?: string
}

// ── Página ─────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { activeCenter, termino } = useActiveCenter()
  const { athletes: squad, loading, error, isRealRoster } = useSquad()
  const navigate = useNavigate()
  const centro = activeCenter?.center_nombre ?? 'Tu centro deportivo'
  const noContent = loading || error || (isRealRoster && squad.length === 0)

  const d = useMemo(() => {
    const ok = squad.filter((a) => a.estado === 'ok').length
    const duda = squad.filter((a) => a.estado === 'duda').length
    const baja = squad.filter((a) => a.estado === 'baja').length
    const bienestar = avg(squad.map((a) => a.bienestar))
    const carga = avg(squad.map((a) => a.cargaSemanal))
    const alertas = buildAlertas(squad)
    const acwr = [...squad].sort((a, b) => b.acwr - a.acwr).slice(0, 6)
    const by = { lesion: 0, acwr: 0, psico: 0 }
    alertas.forEach((a) => { by[a.mod] += 1 })
    const alertResumen =
      [by.lesion && `${by.lesion} lesión`, by.acwr && `${by.acwr} ACWR`, by.psico && `${by.psico} psico`]
        .filter(Boolean)
        .join(' · ') || 'Sin alertas'
    return { total: squad.length, ok, duda, baja, bienestar, carga, alertas, acwr, alertResumen }
  }, [squad])

  const metrics: Metric[] = [
    { label: 'Atletas en plantilla', value: String(d.total), icon: 'plantilla', tone: 'accent', foot: `${d.ok} disponibles` },
    { label: 'Disponibles', value: String(d.ok), icon: 'shield', tone: d.baja === 0 ? 'ok' : 'warn', foot: `${d.baja} no disp.${d.duda ? ` · ${d.duda} duda` : ''}` },
    { label: 'Alertas activas', value: String(d.alertas.length), icon: 'alert', tone: d.alertas.length ? 'danger' : 'ok', foot: d.alertResumen },
    { label: 'Bienestar medio', value: d.bienestar.toFixed(1), unit: '/10', icon: 'wellness', tone: d.bienestar >= 7 ? 'ok' : d.bienestar >= 6 ? 'warn' : 'danger', foot: 'Media del plantel' },
    { label: 'Carga media', value: String(Math.round(d.carga)), unit: 'UA', icon: 'gauge', tone: 'warn', foot: 'Semanal por atleta' },
  ]

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">{centro}</p>
        <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
      </div>

      {noContent ? (
        <SquadState loading={loading} error={error} empty={isRealRoster && squad.length === 0} />
      ) : (
        <>
          {/* Métricas principales */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {metrics.map((m, i) => (
              <MetricCard key={m.label} m={m} className={i === 4 ? 'col-span-2 lg:col-span-1' : ''} />
            ))}
          </div>

          {/* Fila 1 — semáforo de plantilla (2/3) + microciclo (1/3) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Panel
              className="md:col-span-2"
              title="Disponibilidad de la plantilla"
              subtitle="Estado físico de cada atleta para el próximo partido"
            >
              <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-6 lg:grid-cols-8">
                {squad.map((a) => (
                  <div key={a.id} className="flex flex-col items-center gap-1.5">
                    <Avatar name={a.nombre} src={a.foto} size={42} />
                    <span className={`h-2 w-2 rounded-full ${SEM[ESTADO_TONE[a.estado]].bg}`} />
                    <span className="max-w-full truncate text-[10px] text-white/45">{shortName(a.nombre)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-perf-border pt-4 text-xs text-white/55">
                <Legend tone="ok" label="Disponible" count={d.ok} />
                <Legend tone="warn" label="Duda" count={d.duda} />
                <Legend tone="danger" label="No disponible" count={d.baja} />
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
            <Panel title="Alertas prioritarias" subtitle={d.alertas.length ? `${d.alertas.length} requieren atención` : 'Sin alertas activas'}>
              {d.alertas.length === 0 ? (
                <p className="py-3 text-sm text-white/45">La plantilla está en orden — sin alertas activas.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-perf-border">
                  {d.alertas.map((a) => (
                    <li key={a.id} className="first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => navigate(MODULO_ROUTE[a.mod])}
                        className="flex w-full items-center gap-3 py-3 text-left transition-opacity hover:opacity-80"
                      >
                        <Avatar name={a.n} src={a.foto} size={38} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white/90">{a.n}</p>
                          <p className="truncate text-xs text-white/45">{a.desc}</p>
                        </div>
                        <Badge tone={MODULO_BADGE[a.mod].tone} label={MODULO_BADGE[a.mod].label} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="ACWR — atletas a vigilar" subtitle="Ratio carga aguda : crónica">
              <div className="flex flex-col gap-3">
                {d.acwr.map((a) => {
                  const tone = acwrTone(a.acwr)
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-xs text-white/65">{a.nombre}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className={`h-full rounded-full ${SEM[tone].bg}`} style={{ width: `${Math.min(a.acwr / 2, 1) * 100}%` }} />
                      </div>
                      <span className={`w-10 shrink-0 text-right text-xs font-semibold tabular-nums ${SEM[tone].text}`}>
                        {a.acwr.toFixed(2)}
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
            <ModuleCard icon="rendimiento" title="Rendimiento" metric={`${Math.round(d.carga)} UA`} detail="Carga media de la plantilla" onClick={() => navigate('/rendimiento')} />
            <ModuleCard icon="lesiones" title="Lesiones" metric={`${d.baja} ${d.baja === 1 ? 'activa' : 'activas'}`} detail={d.duda ? `${d.duda} en duda` : `${termino('grupo')} disponible`} onClick={() => navigate('/lesiones')} />
            <ModuleCard icon="wellness" title="Psicológico" metric={`${d.bienestar.toFixed(1)}/10`} detail="Bienestar medio del plantel" onClick={() => navigate('/psicologico')} />
          </div>
        </>
      )}
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
      {m.foot && <p className="mt-1.5 text-xs text-white/45">{m.foot}</p>}
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
