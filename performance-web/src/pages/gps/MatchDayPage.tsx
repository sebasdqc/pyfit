// Dashboard 1 — Match Day (monitoreo en vivo). El más reactivo: un reloj local
// (LiveTimer, setInterval propio) y un sondeo simulado cada 5s que actualiza las
// métricas de los jugadores (en producción será polling al endpoint Django). KPIs
// del equipo en vivo, tabla de jugadores con barra de Player Load (color por
// loadTone), panel de alertas, y tira inferior con zonas de velocidad, carga por
// jugador y acel/decel por posición. Datos iniciales vía useMatchDay.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { SEM, type Tone } from '@/lib/tone'
import {
  useMatchDay, loadTone, SPEED_ZONES, POS_HEX, TONE_HEX, type MatchPlayer, type Pos,
} from '@/lib/gpsDashboards'
import { DashHeader, Kpi, StatusPill, GRID, axisTick, tip } from './dashboardKit'

const POLL_MS = 5000 // sondeo simulado (en producción: refetch al endpoint)

export function MatchDayPage() {
  const { data } = useMatchDay()
  const [players, setPlayers] = useState<MatchPlayer[]>(data.players)

  // Sondeo simulado: incrementa carga/distancia/sprints de los jugadores que no
  // están ya en alerta, imitando datos en vivo. Limpieza del intervalo al salir.
  useEffect(() => {
    const id = setInterval(() => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.status === 'alert'
            ? p
            : {
                ...p,
                pl: Math.min(p.pl + Math.floor(Math.random() * 4), p.plMax + 30),
                km: Math.round((p.km + Math.random() * 0.03) * 100) / 100,
                spr: Math.random() < 0.12 ? p.spr + 1 : p.spr,
              },
        ),
      )
    }, POLL_MS)
    return () => clearInterval(id)
  }, [])

  const kpi = useMemo(() => {
    const n = players.length || 1
    return {
      dist: (players.reduce((a, p) => a + p.km, 0) / n / 1).toFixed(1),
      vmax: Math.max(...players.map((p) => p.vmax)).toFixed(1),
      pl: Math.round(players.reduce((a, p) => a + p.pl, 0) / n),
      spr: players.reduce((a, p) => a + p.spr, 0),
      alert: players.filter((p) => p.status === 'alert').length,
      warn: players.filter((p) => p.status === 'warn').length,
    }
  }, [players])

  const alertPlayers = players.filter((p) => p.status !== 'ok')

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <DashHeader
        title="Match Day"
        subtitle={`${data.match.title} · ${data.match.venue}`}
        right={
          <>
            <StatusPill tone="danger" label="En vivo" live />
            <span className="rounded border border-perf-border bg-perf-surface2 px-2 py-1 text-[11px] text-white/60">{data.match.period}</span>
            <LiveTimer startSecs={data.match.startSecs} />
          </>
        }
      />

      {/* KPIs en vivo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Distancia prom. equipo" value={kpi.dist} unit="km · meta partido: 10.5 km" delta="▲ Ritmo de partido" tone="ok" />
        <Kpi label="Velocidad máxima" value={kpi.vmax} unit="km/h · #7 Rodríguez" delta="▲ Récord temporada" tone="warn" />
        <Kpi label="Player Load promedio" value={`${kpi.pl}`} unit="ua · referencia: 640 ua" delta="▲ +12% vs partido anterior" tone="accent" />
        <Kpi label="Sprints totales equipo" value={`${kpi.spr}`} unit="acciones >19 km/h" delta="▲ 2.4/min ritmo actual" tone="ok" />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Tabla en tiempo real */}
        <Panel title={`Monitoreo en tiempo real — ${players.length} jugadores`} subtitle={`Sondeo cada ${POLL_MS / 1000}s`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-perf-border text-left text-[10px] uppercase tracking-wide text-white/40">
                  <th className="px-3 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">Pos</th>
                  <th className="px-3 py-2.5 font-medium">Jugador</th>
                  <th className="px-3 py-2.5 font-medium">Min</th>
                  <th className="px-3 py-2.5 font-medium">Player Load</th>
                  <th className="px-3 py-2.5 text-right font-medium">km</th>
                  <th className="px-3 py-2.5 text-right font-medium">v.máx</th>
                  <th className="px-3 py-2.5 text-right font-medium">Spr</th>
                  <th className="px-3 py-2.5 text-center font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const pct = p.pl / p.plMax
                  const tone = loadTone(pct)
                  const rowBg = p.status === 'alert' ? 'bg-perf-danger/[0.05]' : p.status === 'warn' ? 'bg-perf-warn/[0.05]' : ''
                  return (
                    <tr key={p.num} className={`border-b border-perf-border/60 last:border-0 hover:bg-white/[0.02] ${rowBg}`}>
                      <td className="px-3 py-2.5 tabular-nums text-white/40">{p.num}</td>
                      <td className="px-3 py-2.5"><PosBadge pos={p.pos} /></td>
                      <td className="px-3 py-2.5 font-medium text-white/90">{p.name}</td>
                      <td className="px-3 py-2.5 tabular-nums text-white/55">63'</td>
                      <td className="px-3 py-2.5">
                        <div className="w-[130px]">
                          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct * 100, 100)}%`, background: TONE_HEX[tone] }} />
                          </div>
                          <div className="mt-1 flex justify-between text-[9px] tabular-nums text-white/40">
                            <span>{p.pl} ua</span>
                            <span>{Math.round(pct * 100)}%</span>
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${p.km > 11 ? 'text-perf-ok' : 'text-white/70'}`}>{p.km.toFixed(1)}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${p.vmax > 30 ? 'text-perf-ok' : p.vmax > 28 ? 'text-perf-warn' : 'text-white/70'}`}>{p.vmax.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-white/70">{p.spr}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={p.status === 'alert' ? 'text-perf-danger' : p.status === 'warn' ? 'text-perf-warn' : 'text-white/25'}>
                          {p.status === 'alert' ? '⚠' : p.status === 'warn' ? '◉' : '●'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-perf-danger/20 bg-perf-danger/[0.06] p-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-perf-danger">⚠ Alertas activas</p>
            {alertPlayers.length === 0 ? (
              <p className="text-xs text-white/45">Sin alertas activas.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {alertPlayers.map((p) => {
                  const isAlert = p.status === 'alert'
                  const pct = Math.round((p.pl / p.plMax) * 100)
                  return (
                    <div key={p.num} className="border-b border-perf-danger/10 pb-2.5 last:border-0 last:pb-0">
                      <p className="text-xs font-semibold text-white">#{p.num} {p.name} <span className="text-[10px] font-normal text-white/40">({p.pos})</span></p>
                      <p className="mt-0.5 text-[11px] text-perf-danger/90">
                        {isAlert ? `Player Load al ${pct}% del máximo individual` : `Carga en zona de precaución (${pct}%)`}
                      </p>
                      <span className="mt-1.5 inline-block rounded bg-perf-danger/15 px-2 py-0.5 text-[10px] font-semibold text-perf-danger/90">
                        {isAlert ? 'Considerar sustitución' : 'Monitorear próximos 10 min'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <Panel title="Resumen equipo">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat value={`${kpi.alert}`} label="En zona de alerta" tone="danger" />
              <MiniStat value={`${kpi.warn}`} label="Precaución" tone="warn" />
              <MiniStat value={`${data.sensors}`} label="Sensores activos" />
              <MiniStat value={data.gpsHz} label="Frecuencia GPS" />
            </div>
          </Panel>
        </div>
      </div>

      {/* Tira inferior */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Zonas de velocidad — equipo">
          <div className="flex flex-col gap-2.5">
            {SPEED_ZONES.map((z, i) => (
              <div key={z.key} className="grid grid-cols-[96px_1fr_36px] items-center gap-2.5">
                <span className="text-[11px] text-white/45">{z.label}</span>
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${data.speedZonesPct[i]}%`, background: z.hex }} />
                </div>
                <span className="text-right text-[10px] tabular-nums text-white/40">{data.speedZonesPct[i]}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Carga por jugador" subtitle="Player Load (ua)">
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={players.map((p) => ({ name: p.name.slice(0, 4), pl: p.pl, tone: loadTone(p.pl / p.plMax) }))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 9 }} tickLine={false} axisLine={false} interval={0} />
                <YAxis domain={[0, 700]} tick={axisTick} tickLine={false} axisLine={false} width={34} />
                <Tooltip {...tip} formatter={(v: number) => [`${v} ua`, 'Player Load']} />
                <Bar dataKey="pl" radius={[3, 3, 0, 0]}>
                  {players.map((p) => (
                    <Cell key={p.num} fill={TONE_HEX[loadTone(p.pl / p.plMax)]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Aceleraciones / Deceleraciones" subtitle="Por posición">
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.accelByPos} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="pos" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={30} />
                <Tooltip {...tip} />
                <Bar dataKey="acel" name="Acel" fill={TONE_HEX.ok} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                <Bar dataKey="decel" name="Decel" fill={TONE_HEX.accent} fillOpacity={0.6} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  )
}

// Reloj local del partido: corre con su propio setInterval y se limpia al salir.
function LiveTimer({ startSecs }: { startSecs: number }) {
  const [secs, setSecs] = useState(startSecs)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    ref.current = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => {
      if (ref.current) clearInterval(ref.current)
    }
  }, [])
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return <span className="font-mono text-lg font-medium tabular-nums text-white">{m}:{String(s).padStart(2, '0')}</span>
}

function MiniStat({ value, label, tone }: { value: string; label: string; tone?: Tone }) {
  return (
    <div className="rounded-xl bg-perf-surface2 p-3 text-center">
      <p className={`text-lg font-bold tabular-nums ${tone ? SEM[tone].text : 'text-white'}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-white/45">{label}</p>
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
