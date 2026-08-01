// Dashboard 3 — Carga semanal (gestión de carga y riesgo de lesión). KPIs de
// carga aguda/crónica + ACWR del equipo (calculado en cliente) + monotonía;
// barra de zona ACWR con aguja; evolución de carga de 8 semanas (aguda/crónica +
// ACWR en eje derecho); tabla de ACWR individual con filas resaltadas por riesgo;
// distribución de carga por día; resumen y planificación. Datos vía useWeeklyLoad.

import { useMemo } from 'react'
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { SEM } from '@/lib/tone'
import {
  useWeeklyLoad, acwr, acwrRisk, acwrNeedlePct, RISK_META, TONE_HEX,
} from '@/lib/gpsDashboards'
import { DashHeader, Kpi, StatusPill, GRID, axisTick, tip } from './dashboardKit'

export function WeeklyLoadPage() {
  const { data } = useWeeklyLoad()
  const { week, trend, dayDist, summary, nextWeek } = data

  const teamAcwr = acwr(data.agudaTeam, data.cronicaTeam)
  const teamRisk = acwrRisk(teamAcwr)

  // ACWR por jugador (orden desc) + conteo en riesgo (>1.4).
  const rows = useMemo(
    () =>
      data.rows
        .map((r) => ({ ...r, acwr: acwr(r.aguda, r.cronica) }))
        .sort((a, b) => b.acwr - a.acwr),
    [data.rows],
  )
  const enRiesgo = rows.filter((r) => r.acwr > 1.4).length
  const enZona = rows.filter((r) => r.acwr >= 0.8 && r.acwr <= 1.3).length

  const prevAguda = trend[trend.length - 2]?.aguda ?? data.agudaTeam
  const agudaDelta = Math.round(((data.agudaTeam - prevAguda) / prevAguda) * 1000) / 10

  const maxDay = Math.max(...dayDist.map((d) => d.val), 1)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <DashHeader
        title="Carga semanal"
        subtitle={`${week.subtitle} · ${week.staff}`}
        right={<StatusPill tone="accent" label={week.pill} />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Carga aguda (sem.)" value={data.agudaTeam.toLocaleString('es-ES')} unit="ua Player Load prom." delta={`${agudaDelta >= 0 ? '+' : ''}${agudaDelta}% vs sem. anterior`} tone="accent" />
        <Kpi label="Carga crónica (4 sem.)" value={data.cronicaTeam.toLocaleString('es-ES')} unit="ua promedio rodante" delta="Referencia estable" tone="accent" />
        <Kpi label="ACWR equipo" value={teamAcwr.toFixed(2)} unit="Zona segura: 0.80–1.30" delta={teamRisk === 'ok' ? '✓ En rango óptimo' : RISK_META[teamRisk].label} tone={teamRisk} />
        <Kpi label="Jugadores en riesgo" value={`${enRiesgo}`} unit="ACWR >1.4 esta semana" delta={enRiesgo > 0 ? '▲ Acción requerida' : '✓ Sin alertas'} tone={enRiesgo > 0 ? 'danger' : 'ok'} />
        <Kpi label="Monotonía semanal" value={data.monotonia.toFixed(1)} unit="Recomendado: <2.0" delta={data.monotonia < 2 ? '✓ Dentro del rango' : '▲ Elevada'} tone={data.monotonia < 2 ? 'warn' : 'danger'} />
      </div>

      {/* Barra de zona ACWR */}
      <Panel title="Zona ACWR del equipo — método Banister" action={<span className="text-[11px] text-white/45">ACWR actual: <strong className={SEM[teamRisk].text}>{teamAcwr.toFixed(2)}</strong></span>}>
        <div className="relative mb-1.5 flex h-5 overflow-hidden rounded-full">
          <div style={{ width: '20%', background: 'rgba(20,184,166,0.4)' }} />
          <div style={{ width: '25%', background: 'rgba(50,200,150,0.35)' }} />
          <div style={{ width: '25%', background: 'rgba(50,200,150,0.55)' }} />
          <div style={{ width: '15%', background: 'rgba(255,170,50,0.45)' }} />
          <div style={{ width: '15%', background: 'rgba(255,68,68,0.4)' }} />
          <span
            className="absolute -top-1 h-[26px] w-[3px] -translate-x-1/2 rounded-sm bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)] transition-all duration-500"
            style={{ left: `${acwrNeedlePct(teamAcwr)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/35">
          <span>Subcargado (&lt;0.8)</span>
          <span>Seguro (0.8–1.3)</span>
          <span>Precaución (1.3–1.5)</span>
          <span>Riesgo (&gt;1.5)</span>
        </div>
      </Panel>

      {/* Evolución de carga */}
      <Panel
        title="Evolución de carga — últimas 8 semanas"
        action={
          <div className="hidden flex-wrap gap-4 text-[11px] text-white/45 sm:flex">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: TONE_HEX.ok }} />Aguda</span>
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-white/40" />Crónica</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: TONE_HEX.accent }} />ACWR (der.)</span>
          </div>
        }
      >
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend} margin={{ top: 6, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="sem" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis yAxisId="load" domain={[1600, 2800]} tick={axisTick} tickLine={false} axisLine={false} width={46} />
              <YAxis yAxisId="acwr" orientation="right" domain={[0.8, 1.6]} tick={{ ...axisTick, fill: TONE_HEX.accent }} tickLine={false} axisLine={false} width={32} />
              <Tooltip {...tip} />
              <Bar yAxisId="load" dataKey="aguda" name="Carga aguda" fill="rgba(50,200,150,0.25)" stroke="rgba(50,200,150,0.6)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="load" type="monotone" dataKey="cronica" name="Carga crónica" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2 }} />
              <Line yAxisId="acwr" type="monotone" dataKey="acwr" name="ACWR" stroke={TONE_HEX.accent} strokeWidth={2} dot={{ r: 3, fill: TONE_HEX.accent }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Tabla ACWR + columna derecha */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="ACWR individual — semana 24" subtitle="Ordenado por ACWR desc." bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-perf-border text-left text-[10px] uppercase tracking-wide text-white/40">
                  <th className="px-3 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">Jugador</th>
                  <th className="px-3 py-2.5 text-right font-medium">Aguda</th>
                  <th className="px-3 py-2.5 text-right font-medium">Crónica</th>
                  <th className="px-3 py-2.5 text-right font-medium">ACWR</th>
                  <th className="px-3 py-2.5 text-right font-medium">Δ sem.</th>
                  <th className="px-3 py-2.5 text-right font-medium">Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const risk = acwrRisk(r.acwr)
                  const meta = RISK_META[risk]
                  const rowBg = risk === 'danger' ? 'bg-perf-danger/[0.05]' : risk === 'warn' ? 'bg-perf-warn/[0.05]' : ''
                  const deltaTone = r.delta.startsWith('+') ? 'text-perf-warn' : 'text-perf-ok'
                  return (
                    <tr key={r.num} className={`border-b border-perf-border/60 last:border-0 hover:bg-white/[0.02] ${rowBg}`}>
                      <td className="px-3 py-2.5 tabular-nums text-white/40">{r.num}</td>
                      <td className="px-3 py-2.5 font-medium text-white/90">{r.name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-white/70">{r.aguda.toLocaleString('es-ES')}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-white/70">{r.cronica.toLocaleString('es-ES')}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${meta.tone === 'ok' ? 'text-perf-ok' : meta.tone === 'warn' ? 'text-perf-warn' : 'text-perf-danger'}`}>{r.acwr.toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${deltaTone}`}>{r.delta}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${SEM[meta.tone].soft} ${SEM[meta.tone].text}`}>{meta.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Distribución de carga por día">
            <div className="grid grid-cols-6 gap-1.5">
              {dayDist.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[9px] tabular-nums text-white/40">{d.val > 0 ? d.val : '—'}</span>
                  <div className="flex h-[64px] w-full items-end">
                    <div
                      className="w-full rounded-t"
                      style={{ height: `${d.val > 0 ? Math.max((d.val / maxDay) * 60, 4) : 4}px`, background: d.val > 0 ? 'rgba(50,200,150,0.5)' : 'rgba(255,255,255,0.08)' }}
                    />
                  </div>
                  <span className="text-[10px] text-white/40">{d.day}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Resumen semanal">
            <div className="grid grid-cols-2 gap-2">
              {summary.map((s) => (
                <div key={s.label} className="rounded-xl bg-perf-surface2 p-3 text-center">
                  <p className={`text-lg font-bold tabular-nums ${s.tone ? SEM[s.tone].text : 'text-white'}`}>{s.value}</p>
                  <p className="mt-0.5 text-[10px] text-white/45">{s.label}</p>
                  <p className="text-[9px] text-white/30">{s.sub}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] text-white/30">{enZona}/{rows.length} jugadores en zona segura</p>
          </Panel>

          <Panel title="Planificación próxima semana">
            <div className="flex flex-col">
              {nextWeek.map((d) => (
                <div key={d.day} className="flex items-center justify-between border-b border-perf-border py-1.5 text-xs last:border-0">
                  <span className="text-white/55">{d.day}</span>
                  <span className={d.tone ? SEM[d.tone].text : 'text-white/40'}>{d.plan}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
