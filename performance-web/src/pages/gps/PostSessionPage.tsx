// Dashboard 2 — Post-sesión (análisis completo). KPIs de la sesión; distribución
// por zonas de velocidad (donut + barras); Player Load por posición; comparativa
// hoy vs sesión anterior; tabla de detalle individual; recomendaciones de
// recuperación (desde datos) y acel/decel por jugador. Datos vía usePostSession.

import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { SEM } from '@/lib/tone'
import {
  usePostSession, SPEED_ZONES, POS_HEX, POS_LABEL, TONE_HEX, type Pos,
} from '@/lib/gpsDashboards'
import { DashHeader, Kpi, StatusPill, GRID, axisTick, tip } from './dashboardKit'
import { useActiveCenter } from '@/centers/useActiveCenter'

const fmt = (n: number) => n.toLocaleString('es-ES')

export function PostSessionPage() {
  const { termino } = useActiveCenter()
  const { data } = usePostSession()
  const { session, kpis, speedZonesPct, posLoad, compare, players, recommendations } = data

  const zoneData = SPEED_ZONES.map((z, i) => ({ name: z.label, value: speedZonesPct[i], hex: z.hex }))
  const cmpData = compare.map((c) => ({ label: c.label, Hoy: c.today, Anterior: c.prev }))

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <DashHeader
        title="Post-sesión"
        subtitle={`${session.subtitle} · ${session.analyst}`}
        right={<StatusPill tone="ok" label="✓ Completado" />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Kpi key={k.label} label={k.label} value={k.value} unit={k.unit} delta={k.delta} tone={k.tone} />
        ))}
      </div>

      {/* Mid grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Zonas de velocidad */}
        <Panel title="Distribución por zonas de velocidad">
          <div className="relative h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={zoneData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none">
                  {zoneData.map((z) => (
                    <Cell key={z.name} fill={z.hex} />
                  ))}
                </Pie>
                <Tooltip {...tip} formatter={(v: number, n) => [`${v}%`, n as string]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {zoneData.map((z) => (
              <div key={z.name} className="grid grid-cols-[100px_1fr_36px] items-center gap-2.5">
                <span className="text-[11px] text-white/55">{z.name}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${z.value}%`, background: z.hex }} />
                </div>
                <span className="text-right text-[11px] tabular-nums text-white/40">{z.value}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Player Load por posición */}
        <Panel title="Player Load por posición">
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={posLoad} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="pos" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} />
                <Tooltip {...tip} formatter={(v: number) => [`${v} ua`, 'Player Load']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {posLoad.map((p) => (
                    <Cell key={p.pos} fill={POS_HEX[p.pos]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {posLoad.map((p) => (
              <div key={p.pos}>
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/55">{POS_LABEL[p.pos]}</span>
                  <span className="font-medium tabular-nums text-white">{p.value} ua</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: POS_HEX[p.pos] }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Hoy vs anterior */}
        <Panel title="Hoy vs sesión anterior">
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cmpData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 9 }} tickLine={false} axisLine={false} interval={0} />
                <YAxis hide />
                <Tooltip {...tip} />
                <Bar dataKey="Hoy" fill={TONE_HEX.ok} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Anterior" fill="rgba(255,255,255,0.15)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {compare.map((c) => (
              <div key={c.label} className="flex items-center justify-between text-[11px]">
                <span className="text-white/55">{c.label}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-white">{c.today}</span>
                  <span className={SEM[c.tone].text}>{c.deltaPct}</span>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Detalle individual */}
      <Panel title="Detalle individual — sesión de hoy" subtitle="Ordenado por Player Load desc." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-perf-border text-left text-[10px] uppercase tracking-wide text-white/40">
                <th className="px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">{termino('persona')}</th>
                <th className="px-3 py-2.5 font-medium">Pos</th>
                <th className="px-3 py-2.5 text-right font-medium">Dist (km)</th>
                <th className="px-3 py-2.5 text-right font-medium">Sprint (m)</th>
                <th className="px-3 py-2.5 text-right font-medium">Vel máx</th>
                <th className="px-3 py-2.5 text-right font-medium">P. Load</th>
                <th className="px-3 py-2.5 text-right font-medium">Acel</th>
                <th className="px-3 py-2.5 text-right font-medium">Decel</th>
                <th className="px-3 py-2.5 text-right font-medium">Power Plays</th>
                <th className="px-3 py-2.5 text-right font-medium">HMLD (m)</th>
                <th className="px-3 py-2.5 text-right font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.num} className="border-b border-perf-border/60 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 tabular-nums text-white/40">{p.num}</td>
                  <td className="px-3 py-2.5 font-medium text-white/90">{p.name}</td>
                  <td className="px-3 py-2.5"><PosBadge pos={p.pos} /></td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${p.km > 11.5 ? 'text-perf-ok' : 'text-white/70'}`}>{p.km.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-white/70">{fmt(p.spr)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${p.vmax > 30 ? 'text-perf-ok' : 'text-white/70'}`}>{p.vmax.toFixed(1)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium tabular-nums ${p.pl > 660 ? 'text-perf-warn' : 'text-white'}`}>{p.pl}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-white/70">{p.acel}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-white/70">{p.decel}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-accent">{p.pp}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-white/70">{fmt(p.hmld)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${p.estado === 'ok' ? `${SEM.ok.soft} ${SEM.ok.text}` : `${SEM.warn.soft} ${SEM.warn.text}`}`}>
                      {p.estado === 'ok' ? 'Óptimo' : 'Precaución'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Bottom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Recomendaciones de recuperación" subtitle="Basado en Player Load y estado individual">
          <div className="flex flex-wrap gap-2">
            {recommendations.map((r) => (
              <span key={r.text} className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${SEM[r.tone].soft} ${SEM[r.tone].text}`}>
                {r.text}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Aceleraciones y deceleraciones" subtitle="Por jugador">
          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={players.map((p) => ({ name: p.name.slice(0, 5), Acel: p.acel, Decel: p.decel }))} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 9 }} tickLine={false} axisLine={false} interval={0} />
                <YAxis hide />
                <Tooltip {...tip} />
                <Bar dataKey="Acel" fill={TONE_HEX.ok} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Decel" fill={TONE_HEX.accent} fillOpacity={0.6} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function PosBadge({ pos }: { pos: Pos }) {
  return (
    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ color: POS_HEX[pos], background: `${POS_HEX[pos]}1f` }}>
      {pos}
    </span>
  )
}
