// Dashboard 4 — Perfil de jugador (longitudinal). Cabecera con avatar + métricas
// clave + tags; strip de resumen de temporada; gráfico de evolución con toggle de
// métrica (estado local, no recarga datos); benchmarks por percentil; radar vs
// promedio de posición; historial de carga de 12 semanas coloreado por riesgo; y
// protocolo return to play (solo si hay uno activo). Datos vía usePlayerProfile.

import { useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid,
  PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { SEM, type Tone } from '@/lib/tone'
import {
  usePlayerProfile, TONE_HEX, type SeasonMetric, type RtpStep,
} from '@/lib/gpsDashboards'
import { DashHeader, GRID, axisTick, tip } from './dashboardKit'

const METRICS: { key: SeasonMetric; label: string }[] = [
  { key: 'pl', label: 'Player Load' },
  { key: 'dist', label: 'Distancia' },
  { key: 'vmax', label: 'Vel. máx' },
  { key: 'spr', label: 'Sprints' },
]

export function PlayerProfilePage() {
  const { data } = usePlayerProfile()
  const { player, cluster, pills, benchmarks, radar, history, rtp } = data
  const [metric, setMetric] = useState<SeasonMetric>('pl')

  const seasonSeries = data.semLabels.map((sem, i) => ({ sem, val: data.season[metric][i] }))
  const unit = data.seasonUnit[metric]

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <DashHeader title="Perfil de jugador" subtitle={`${player.season} · ${player.sessions}`} />

      {/* Cabecera del jugador */}
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-perf-border bg-perf-surface p-5">
        <Avatar name={player.name} size={60} />
        <div className="min-w-0">
          <p className="text-lg font-semibold text-white">{player.name}</p>
          <p className="mt-0.5 text-xs text-white/45">{player.meta}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {player.tags.map((t) => (
              <span
                key={t.label}
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${SEM[t.tone].soft} ${SEM[t.tone].text}`}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <div className="ml-auto grid grid-cols-3 gap-x-6 gap-y-3 sm:grid-cols-5">
          {cluster.map((c) => (
            <div key={c.label} className="text-center">
              <p className={`text-xl font-bold tabular-nums ${c.tone ? SEM[c.tone].text : 'text-white'}`}>{c.value}</p>
              <p className="mt-0.5 text-[10px] text-white/40">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen de temporada */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {pills.map((p) => (
          <div key={p.label} className="rounded-2xl border border-perf-border bg-perf-surface2 p-4 text-center">
            <p className="text-lg font-bold tabular-nums text-white">{p.value}</p>
            <p className="mt-0.5 text-[10px] text-white/40">{p.label}</p>
          </div>
        ))}
      </div>

      {/* Fila 1: evolución + benchmarks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Evolución de temporada"
          className="lg:col-span-2"
          action={
            <div className="flex flex-wrap gap-1">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMetric(m.key)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    metric === m.key ? 'bg-accent/15 text-accent' : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seasonSeries} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="sem" tick={axisTick} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={42} />
                <Tooltip {...tip} formatter={(v: number) => [`${v} ${unit}`, 'Valor']} />
                <Line
                  type="monotone"
                  dataKey="val"
                  stroke={TONE_HEX.accent}
                  strokeWidth={2}
                  dot={{ r: 3, fill: TONE_HEX.accent }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-center text-[10px] text-perf-danger/80">← {data.injuryNote}</p>
        </Panel>

        <Panel title="Benchmarks vs posición (DL)" subtitle="Percentil liga">
          <div className="flex flex-col gap-3">
            {benchmarks.map((b) => (
              <div key={b.label} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2.5">
                <span className="text-[11px] text-white/55">{b.label}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${b.val}%`, background: TONE_HEX[b.tone] }} />
                </div>
                <span className={`text-[11px] tabular-nums ${SEM[b.tone].text}`}>P{b.val}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Fila 2: radar + historial + return to play */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Radar de rendimiento" subtitle="Rodríguez vs prom. DL liga">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} />
                <PolarRadiusAxis domain={[40, 100]} tick={false} axisLine={false} />
                <Radar name="Prom. DL" dataKey="avg" stroke="rgba(255,255,255,0.25)" fill="rgba(255,255,255,0.04)" strokeDasharray="4 3" />
                <Radar name="Rodríguez" dataKey="player" stroke={TONE_HEX.accent} fill={TONE_HEX.accent} fillOpacity={0.15} strokeWidth={2} />
                <Tooltip {...tip} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Historial de carga — 12 semanas">
          <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-white/45">
            <Legend hex={TONE_HEX.ok} label="Zona segura" />
            <Legend hex={TONE_HEX.warn} label="Precaución" />
            <Legend hex={TONE_HEX.danger} label="Riesgo" />
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="sem" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={42} />
                <Tooltip {...tip} formatter={(v: number) => [`${v.toLocaleString('es-ES')} ua`, 'Carga']} />
                <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                  {history.map((h) => (
                    <Cell
                      key={h.sem}
                      fill={h.risk === 'injury' ? 'rgba(255,255,255,0.1)' : TONE_HEX[h.risk]}
                      fillOpacity={0.65}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {rtp && (
          <Panel title="Protocolo return to play" subtitle="En progreso — Paso 4/6">
            <div className="mb-3 rounded-lg border border-perf-danger/15 bg-perf-danger/[0.06] px-3 py-2 text-[11px] text-white/55">
              {rtp.injury}
            </div>
            <div className="flex flex-col">
              {rtp.steps.map((s) => (
                <RtpRow key={s.n} step={s} />
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}

function Legend({ hex, label }: { hex: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: hex }} />
      {label}
    </span>
  )
}

function RtpRow({ step }: { step: RtpStep }) {
  const tone: Tone = step.status === 'done' ? 'ok' : step.status === 'now' ? 'accent' : 'accent'
  const pending = step.status === 'pend'
  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-start gap-2.5 border-b border-perf-border py-2.5 last:border-0">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
          pending
            ? 'border border-perf-border bg-white/[0.04] text-white/35'
            : `${SEM[tone].soft} ${SEM[tone].text} ${step.status === 'now' ? 'ring-1 ring-accent/50' : ''}`
        }`}
      >
        {step.status === 'done' ? '✓' : step.n}
      </span>
      <div>
        <p className={`text-xs font-medium ${pending ? 'text-white/40' : step.status === 'now' ? 'text-accent' : 'text-white/85'}`}>
          {step.label}
        </p>
        <p className="mt-0.5 text-[11px] text-white/35">{step.sub}</p>
      </div>
      <span className="whitespace-nowrap pt-0.5 text-[10px] text-white/35">{step.week}</span>
    </div>
  )
}
