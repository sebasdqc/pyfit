// Módulo LESIONES. Gestión de partes médicos con modelo corporal interactivo:
// el mapa (frente/espalda) ubica cada lesión por severidad; la lista muestra el
// detalle. La selección es bidireccional (marcador ↔ tarjeta) y al elegir una
// lesión el cuerpo gira a su vista. Datos de muestra (lib/mockInjuries).

import { useMemo, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { BodyMap } from '@/components/BodyMap'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SEM, type Tone } from '@/lib/tone'
import { loadSquad } from '@/lib/squadStore'
import {
  ESTADO_LESION, INJURIES, SEV_LABEL, SEV_TONE, TIPO_LABEL,
  type Injury, type Severidad, type Vista,
} from '@/lib/mockInjuries'

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

export function LesionesPage() {
  const squad = useMemo(() => loadSquad(), [])
  const nameOf = (id: string) => squad.find((a) => a.id === id)?.nombre ?? id
  const posOf = (id: string) => squad.find((a) => a.id === id)?.posicion ?? ''
  const fotoOf = (id: string) => squad.find((a) => a.id === id)?.foto

  const [vista, setVista] = useState<Vista>('frente')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const activas = INJURIES.filter((i) => i.estado !== 'alta')
  const altas = INJURIES.filter((i) => i.estado === 'alta')
  const kpi = {
    activas: activas.length,
    baja: INJURIES.filter((i) => i.estado === 'activa').length,
    recup: INJURIES.filter((i) => i.estado === 'recuperacion').length,
    dias: INJURIES.reduce((s, i) => s + i.diasBaja, 0),
    nuevas: INJURIES.filter((i) => daysSince(i.fecha) <= 7).length,
  }
  const porVista = (v: Vista) => activas.filter((i) => i.vista === v).length

  function select(inj: Injury) {
    setSelectedId(inj.id)
    setVista(inj.vista)
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">Lesiones</h1>
            <DemoBadge variant="demo" />
          </div>
          <p className="text-xs text-white/45">{activas.length} partes activos · seguimiento y vuelta a competición</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Lesiones activas" value={`${kpi.activas}`} tone="warn" />
        <Kpi label="Jugadores de baja" value={`${kpi.baja}`} tone="danger" />
        <Kpi label="En recuperación" value={`${kpi.recup}`} tone="warn" />
        <Kpi label="Días perdidos" value={`${kpi.dias}`} tone="accent" />
        <Kpi label="Nuevas (7 días)" value={`${kpi.nuevas}`} tone="warn" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Modelo corporal */}
        <Panel
          title="Mapa de lesiones"
          subtitle="Severidad por zona"
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-0.5 rounded-lg border border-perf-border bg-perf-bg p-0.5">
              {(['frente', 'espalda'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVista(v)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    vista === v ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  {v} ({porVista(v)})
                </button>
              ))}
            </div>
          }
        >
          <BodyMap vista={vista} injuries={INJURIES} selectedId={selectedId} onSelect={(id) => select(INJURIES.find((i) => i.id === id)!)} />
          <div className="mt-3 flex items-center justify-center gap-5 border-t border-perf-border pt-3 text-xs">
            {(['leve', 'moderada', 'grave'] as Severidad[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-white/60">
                <span className={`h-2.5 w-2.5 rounded-full ${SEM[SEV_TONE[s]].bg}`} />
                {SEV_LABEL[s]}
              </span>
            ))}
          </div>
        </Panel>

        {/* Lista de partes */}
        <div className="flex flex-col gap-3 lg:col-span-3">
          {activas.map((inj) => (
            <InjuryCard
              key={inj.id}
              inj={inj}
              nombre={nameOf(inj.athleteId)}
              posicion={posOf(inj.athleteId)}
              foto={fotoOf(inj.athleteId)}
              selected={selectedId === inj.id}
              onClick={() => select(inj)}
            />
          ))}

          {altas.length > 0 && (
            <Panel title="Altas recientes" subtitle="Jugadores reincorporados">
              <ul className="flex flex-col divide-y divide-perf-border">
                {altas.map((inj) => (
                  <li key={inj.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Avatar name={nameOf(inj.athleteId)} src={fotoOf(inj.athleteId)} size={32} />
                    <span className="flex-1 truncate text-sm text-white/80">{nameOf(inj.athleteId)}</span>
                    <span className="truncate text-xs text-white/45">{inj.zona}</span>
                    <Badge tone="ok" label="Alta médica" />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function Kpi({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${SEM[tone].text}`}>{value}</p>
    </div>
  )
}

function InjuryCard({
  inj, nombre, posicion, foto, selected, onClick,
}: {
  inj: Injury; nombre: string; posicion: string; foto?: string; selected: boolean; onClick: () => void
}) {
  const est = ESTADO_LESION[inj.estado]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        selected ? 'border-accent bg-accent/5' : 'border-perf-border bg-perf-surface hover:bg-perf-surface2'
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={nombre} src={foto} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{nombre}</p>
            <Badge tone={SEV_TONE[inj.severidad]} label={SEV_LABEL[inj.severidad]} />
          </div>
          <p className="text-xs text-white/45">{posicion}</p>
          <p className="mt-1.5 text-sm font-medium text-white/90">
            {inj.zona} <span className="font-normal text-white/45">· {TIPO_LABEL[inj.tipo]}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-white/45">
            <Badge tone={est.tone} label={est.label} />
            <span>Baja: <span className="text-white/70">{inj.diasBaja}d</span></span>
            <span>RTP: <span className="text-white/70">{inj.rtp}</span></span>
            <span className="text-white/35">{inj.mecanismo}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function Badge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${SEM[tone].soft} ${SEM[tone].text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${SEM[tone].bg}`} />
      {label}
    </span>
  )
}
