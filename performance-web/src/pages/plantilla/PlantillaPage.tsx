// Plantilla — selección de atletas por chips. Al elegir uno se despliega su
// ficha: demográficos + radar de rendimiento + métricas de carga. El modo
// "Comparar" permite enfrentar a 2 jugadores (radar superpuesto + comparación
// métrica a métrica). Datos de muestra (esta fase aún no conecta a la API).

import { useEffect, useMemo, useState } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/Icon'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { SEM, acwrTone, type Tone } from '@/lib/tone'
import {
  ESTADO_LABEL,
  ESTADO_TONE,
  RADAR_AXES,
  type Athlete,
} from '@/lib/mockSquad'
import { useAuth } from '@/auth/useAuth'
import { useSquad } from '@/centers/useSquad'
import { AthleteEditModal } from '@/components/AthleteEditModal'
import { canEditRole } from '@/lib/squadEdit'

const COLOR_A = '#4f8cff' // azul (atleta A / único)
const COLOR_B = '#ffaa32' // ámbar (atleta B en comparativa)

export function PlantillaPage() {
  const { user } = useAuth()
  // Pueden editar: administrador, entrenador y director técnico. El backend
  // marca is_admin=true también para el staff/superusuario, por eso se incluyen
  // los flags (asegura que cualquier cuenta con acceso real al panel pueda editar).
  const canEdit = canEditRole(user?.role) || !!user?.is_admin || !!user?.is_director

  const { athletes: squad, loading, error, isRealRoster, applyEdit } = useSquad()
  const [compare, setCompare] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Selecciona el primer atleta cuando llega la plantilla (o si la selección
  // anterior quedó obsoleta al cambiar de centro).
  useEffect(() => {
    if (squad.length === 0) {
      setSelected((prev) => (prev.length ? [] : prev))
      return
    }
    setSelected((prev) => {
      const valid = prev.filter((id) => squad.some((a) => a.id === id))
      return valid.length ? valid : [squad[0].id]
    })
  }, [squad])

  const noContent = loading || error || (isRealRoster && squad.length === 0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return squad
    return squad.filter((a) => `${a.nombre} ${a.posicion} ${a.dorsal}`.toLowerCase().includes(q))
  }, [query, squad])

  const picked = selected.map((id) => squad.find((a) => a.id === id)).filter(Boolean) as Athlete[]
  const editingAthlete = editingId ? (squad.find((a) => a.id === editingId) ?? null) : null

  function toggle(id: string) {
    setSelected((prev) => {
      if (!compare) return [id]
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length < 2) return [...prev, id]
      return [prev[1], id] // ya hay 2 → reemplaza el más antiguo
    })
  }

  function toggleCompare() {
    setCompare((m) => !m)
    setSelected((prev) => prev.slice(0, 1)) // al cambiar de modo, conserva el primero
  }

  return (
    <div className="mx-auto flex max-w-[1300px] flex-col gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">Plantilla</h1>
            <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
          </div>
          <p className="text-xs text-white/45">
            {noContent ? 'Atletas del centro' : `${squad.length} atletas en el centro`}
          </p>
        </div>
        {!noContent && (
          <button
            type="button"
            onClick={toggleCompare}
            className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
              compare
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-perf-border bg-perf-surface text-white/80 hover:bg-perf-surface2 hover:text-white'
            }`}
          >
            <Icon name="plantilla" size={16} />
            {compare ? 'Comparando' : 'Comparar'}
          </button>
        )}
      </div>

      {noContent && (
        <SquadState loading={loading} error={error} empty={isRealRoster && squad.length === 0} />
      )}

      {/* Selector por chips + detalle */}
      {!noContent && (
        <>
      <Panel
        title={compare ? 'Elige 2 atletas para comparar' : 'Elige un atleta'}
        subtitle={
          compare
            ? `${picked.length}/2 seleccionados`
            : picked[0]
              ? `Seleccionado: ${picked[0].nombre}`
              : 'Ninguno seleccionado'
        }
        action={
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="w-36 rounded-lg border border-perf-border bg-perf-bg py-1.5 pl-3 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-accent sm:w-44"
            />
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {filtered.map((a) => {
            const idx = selected.indexOf(a.id)
            const isSel = idx >= 0
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                className={`flex max-w-full items-center gap-2 overflow-hidden rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
                  isSel
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-perf-border bg-perf-surface2 text-white/70 hover:text-white'
                }`}
              >
                <Avatar name={a.nombre} src={a.foto} size={24} />
                <span className="min-w-0 truncate">{a.nombre}</span>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEM[ESTADO_TONE[a.estado]].bg}`} />
                {compare && isSel && (
                  <span className="rounded bg-accent px-1.5 text-[10px] font-bold text-white">
                    {idx === 0 ? 'A' : 'B'}
                  </span>
                )}
              </button>
            )
          })}
          {filtered.length === 0 && <p className="text-sm text-white/40">Sin resultados.</p>}
        </div>
      </Panel>

      {/* Detalle */}
      {compare ? (
        picked.length === 2 ? (
          <Comparison a={picked[0]} b={picked[1]} />
        ) : (
          <EmptyHint text={`Selecciona ${2 - picked.length} atleta${2 - picked.length === 1 ? '' : 's'} más para comparar.`} />
        )
      ) : picked[0] ? (
        <SingleDetail a={picked[0]} canEdit={canEdit} onEdit={() => setEditingId(picked[0].id)} />
      ) : (
        <EmptyHint text="Elige un atleta en los chips de arriba para ver su ficha." />
      )}
        </>
      )}

      {editingAthlete && (
        <AthleteEditModal
          athlete={editingAthlete}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            // Roster real: los campos reales (dorsal/posición/grupo/estado/foto)
            // se guardan en la API; los sintéticos, en override local. Demo mock:
            // todo en localStorage. Lo resuelve applyEdit según el origen.
            const meta = { editadoPor: user?.nombre ?? 'Usuario', editadoEn: new Date().toISOString() }
            applyEdit(editingAthlete.id, patch, meta)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

// ── Detalle individual ─────────────────────────────────────────────────────
function SingleDetail({ a, canEdit, onEdit }: { a: Athlete; canEdit: boolean; onEdit: () => void }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Datos del atleta"
          className="lg:col-span-1"
          action={
            canEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-lg border border-perf-border px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-perf-surface2 hover:text-white"
              >
                <Icon name="edit" size={13} />
                Editar
              </button>
            ) : undefined
          }
        >
          <div className="flex items-center gap-3">
            <Avatar name={a.nombre} src={a.foto} size={56} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{a.nombre}</p>
              <p className="text-xs text-white/50">#{a.dorsal} · {a.posicion}</p>
              <EstadoBadge estado={a.estado} className="mt-1.5" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-perf-border pt-4">
            <Demo label="Edad" value={`${a.edad} años`} />
            <Demo label="Nacionalidad" value={a.nacionalidad} />
            <Demo label="Altura" value={`${a.altura} cm`} />
            <Demo label="Peso" value={`${a.peso} kg`} />
            <Demo label="Pie hábil" value={a.pie} />
            <Demo label="Grupo" value={a.grupo} />
          </div>
          {a.editadoEn && (
            <p className="mt-4 flex items-center gap-1.5 border-t border-perf-border pt-3 text-[11px] text-white/35">
              <Icon name="edit" size={11} />
              Última edición {fmtFecha(a.editadoEn)}
              {a.editadoPor ? ` · por ${a.editadoPor}` : ''}
            </p>
          )}
        </Panel>

        <Panel title="Perfil de rendimiento" subtitle="Escala 0–100" className="lg:col-span-2">
          <RadarBlock athletes={[a]} />
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="ACWR" value={a.acwr.toFixed(2)} tone={acwrTone(a.acwr)} />
        <Stat label="Bienestar" value={`${a.bienestar}`} unit="/10" tone="ok" />
        <Stat label="Carga sem." value={`${a.cargaSemanal}`} unit="UA" tone="warn" />
        <Stat label="Disponib." value={`${a.disponibilidad}`} unit="%" tone="accent" />
        <Stat label="Minutos" value={`${a.minutos}`} tone="accent" />
        <Stat label="Sesiones" value={`${a.sesiones}`} tone="accent" />
      </div>
    </>
  )
}

// ── Comparativa ────────────────────────────────────────────────────────────
function Comparison({ a, b }: { a: Athlete; b: Athlete }) {
  const rows: { label: string; av: number; bv: number; unit?: string; decimals?: number; lowerBetter?: boolean }[] = [
    ...RADAR_AXES.map((ax) => ({ label: ax.label, av: a.radar[ax.key], bv: b.radar[ax.key] })),
    { label: 'ACWR', av: a.acwr, bv: b.acwr, decimals: 2, lowerBetter: true },
    { label: 'Bienestar', av: a.bienestar, bv: b.bienestar, unit: '/10' },
    { label: 'Carga semanal', av: a.cargaSemanal, bv: b.cargaSemanal, unit: ' UA' },
    { label: 'Disponibilidad', av: a.disponibilidad, bv: b.disponibilidad, unit: '%' },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Radar comparativo" subtitle="Escala 0–100">
        <div className="mb-3 flex items-center justify-center gap-5 text-xs">
          <LegendDot color={COLOR_A} label={a.nombre} />
          <LegendDot color={COLOR_B} label={b.nombre} />
        </div>
        <RadarBlock athletes={[a, b]} />
      </Panel>

      <Panel title="Comparativa métrica a métrica">
        <div className="flex items-center justify-between pb-3 text-sm font-semibold">
          <span style={{ color: COLOR_A }}>{a.nombre}</span>
          <span style={{ color: COLOR_B }}>{b.nombre}</span>
        </div>
        <div className="flex flex-col divide-y divide-perf-border">
          {rows.map((r) => {
            const aWins = r.lowerBetter ? r.av < r.bv : r.av > r.bv
            const bWins = r.lowerBetter ? r.bv < r.av : r.bv > r.av
            const fmt = (v: number) => v.toFixed(r.decimals ?? 0) + (r.unit ?? '')
            return (
              <div key={r.label} className="py-2.5">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className={aWins ? 'font-bold text-accent' : 'text-white/70'}>{fmt(r.av)}</span>
                  <span className="text-white/45">{r.label}</span>
                  <span className={bWins ? 'font-bold text-perf-warn' : 'text-white/70'}>{fmt(r.bv)}</span>
                </div>
                <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                  <div className="rounded-l-full" style={{ flexGrow: r.av || 0.01, background: COLOR_A }} />
                  <div className="rounded-r-full" style={{ flexGrow: r.bv || 0.01, background: COLOR_B }} />
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

// ── Radar (Recharts) ───────────────────────────────────────────────────────
function RadarBlock({ athletes }: { athletes: Athlete[] }) {
  const data = RADAR_AXES.map((ax) => {
    const row: Record<string, string | number> = { axis: ax.label }
    athletes.forEach((ath, i) => {
      row[i === 0 ? 'a' : 'b'] = ath.radar[ax.key]
    })
    return row
  })

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#1c2740" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name={athletes[0].nombre} dataKey="a" stroke={COLOR_A} fill={COLOR_A} fillOpacity={0.22} strokeWidth={2} />
          {athletes[1] && (
            <Radar name={athletes[1].nombre} dataKey="b" stroke={COLOR_B} fill={COLOR_B} fillOpacity={0.18} strokeWidth={2} />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Piezas ─────────────────────────────────────────────────────────────────
function fmtFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function Demo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-0.5 text-sm text-white/85">{value}</p>
    </div>
  )
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone: Tone }) {
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-xs text-white/45">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-xl font-bold ${SEM[tone].text}`}>{value}</span>
        {unit && <span className="text-xs text-white/40">{unit}</span>}
      </div>
    </div>
  )
}

function EstadoBadge({ estado, className = '' }: { estado: Athlete['estado']; className?: string }) {
  const t = ESTADO_TONE[estado]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${SEM[t].soft} ${SEM[t].text} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${SEM[t].bg}`} />
      {ESTADO_LABEL[estado]}
    </span>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-white/70">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-perf-border bg-perf-surface/50 px-6 py-14 text-center text-sm text-white/45">
      {text}
    </div>
  )
}
