// Dashboard de un atleta individual — portada de los centros de tipo `atletas`.
//
// El dashboard de equipo no sirve acá y no es cuestión de etiquetas: está hecho
// de agregados (media de bienestar, semáforo de plantilla, "atletas a vigilar",
// carga media por atleta). Sobre una sola persona, una media es su propio valor
// y un semáforo de plantilla es un punto suelto — información cero.
//
// Este responde la pregunta que sí tiene un atleta: cómo estoy hoy, qué necesita
// atención y cómo vengo en la temporada. Mismos datos y MISMOS umbrales que el
// panel de equipo (lib/alertas.ts), presentados sobre una persona.
//
// Datos: el roster real del centro activo (useSquad). Las métricas de
// rendimiento todavía se sintetizan en squadSynth — de ahí la <DemoBadge>.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { Badge, Legend, MetricCard, ModuleCard, type Metric } from '@/components/ui/dashboard'
import { useSquad } from '@/centers/useSquad'
import { useActiveCenter } from '@/centers/useActiveCenter'
import { SEM, acwrTone } from '@/lib/tone'
import { ESTADO_LABEL, ESTADO_TONE, RADAR_AXES, type Athlete } from '@/lib/mockSquad'
import { MODULO_BADGE, MODULO_ROUTE, alertasDeAtleta } from '@/lib/alertas'

// Semana de muestra, igual que en el dashboard de equipo: la carga planificada
// por día pertenece a Planificación, no al roster. Sin "Partido" — un atleta
// individual apunta a una competencia, no a una fecha de fixture.
const SEMANA: { d: string; load: number; clave?: boolean }[] = [
  { d: 'Lun', load: 42 }, { d: 'Mar', load: 74 }, { d: 'Mié', load: 58 },
  { d: 'Jue', load: 86 }, { d: 'Vie', load: 45 }, { d: 'Sáb', load: 22 },
  { d: 'Dom', load: 100, clave: true },
]

function zonaAcwr(acwr: number): string {
  if (acwr >= 1.5) return 'Zona de riesgo (>1.50)'
  if (acwr >= 1.3) return 'Zona de alerta (1.30–1.50)'
  if (acwr < 0.8) return 'Carga baja (<0.80)'
  return 'Zona óptima (<1.30)'
}

export function AthleteDashboardPage() {
  const { activeCenter, termino } = useActiveCenter()
  const { athletes: squad, loading, error, isRealRoster } = useSquad()
  const navigate = useNavigate()

  // Un centro de tipo `atletas` normalmente tiene una sola persona, pero puede
  // tener alguna más (un atleta que entrena con compañeros de grupo). En ese
  // caso se elige, en vez de asumir la primera y mostrarle datos de otro.
  const [selId, setSelId] = useState<string | null>(null)
  useEffect(() => {
    if (squad.length && !squad.some((a) => a.id === selId)) setSelId(squad[0].id)
  }, [squad, selId])

  const atleta: Athlete | null = useMemo(
    () => squad.find((a) => a.id === selId) ?? squad[0] ?? null,
    [squad, selId],
  )

  const centro = activeCenter?.center_nombre ?? 'Tu espacio de trabajo'
  const sinContenido = loading || error || (isRealRoster && squad.length === 0)

  if (sinContenido || !atleta) {
    return (
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">{centro}</p>
          <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
        </div>
        <SquadState loading={loading} error={error} empty={isRealRoster && squad.length === 0} />
      </div>
    )
  }

  const alertas = alertasDeAtleta(atleta)
  const tonoEstado = ESTADO_TONE[atleta.estado]
  const tonoAcwr = acwrTone(atleta.acwr)

  const metrics: Metric[] = [
    {
      label: 'Estado', value: ESTADO_LABEL[atleta.estado], icon: 'shield', tone: tonoEstado,
      foot: alertas.length ? `${alertas.length} ${alertas.length === 1 ? 'aviso' : 'avisos'}` : 'Sin avisos',
    },
    {
      label: 'ACWR', value: atleta.acwr.toFixed(2), icon: 'gauge', tone: tonoAcwr,
      foot: zonaAcwr(atleta.acwr),
    },
    {
      label: 'Bienestar', value: atleta.bienestar.toFixed(1), unit: '/10', icon: 'wellness',
      tone: atleta.bienestar >= 7 ? 'ok' : atleta.bienestar >= 6 ? 'warn' : 'danger',
      foot: 'Ánimo, sueño y fatiga',
    },
    {
      label: 'Carga semanal', value: String(Math.round(atleta.cargaSemanal)), unit: 'UA',
      icon: 'carga', tone: 'accent', foot: 'Últimos 7 días',
    },
    {
      label: 'Disponibilidad', value: String(Math.round(atleta.disponibilidad)), unit: '%',
      icon: 'rendimiento', tone: atleta.disponibilidad >= 90 ? 'ok' : atleta.disponibilidad >= 75 ? 'warn' : 'danger',
      foot: 'De la temporada',
    },
  ]

  const datosRadar = RADAR_AXES.map((eje) => ({
    axis: eje.label,
    valor: atleta.radar[eje.key],
  }))

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">{centro}</p>
        <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
      </div>

      {/* Identidad: en un panel de una sola persona, quién es va primero. */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-perf-border bg-perf-surface p-5">
        <Avatar name={atleta.nombre} src={atleta.foto} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">{atleta.nombre}</h1>
            <Badge tone={tonoEstado} label={ESTADO_LABEL[atleta.estado]} />
          </div>
          <p className="mt-0.5 text-xs text-white/45">
            {[atleta.posicion, atleta.edad ? `${atleta.edad} años` : null, atleta.grupo]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {squad.length > 1 && (
          <select
            value={atleta.id}
            onChange={(e) => setSelId(e.target.value)}
            aria-label={termino('persona')}
            className="rounded-lg border border-perf-border bg-perf-bg px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
          >
            {squad.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* Métricas de la persona — ninguna es una media de nadie más. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map((m, i) => (
          <MetricCard key={m.label} m={m} className={i === 4 ? 'col-span-2 lg:col-span-1' : ''} />
        ))}
      </div>

      {/* Fila 1 — perfil de capacidades + semana */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Panel
          className="md:col-span-2"
          title="Perfil de capacidades"
          subtitle="Resultado de las últimas pruebas físicas"
        >
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={datosRadar} outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.55)' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name={atleta.nombre}
                  dataKey="valor"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.16}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Mi semana" subtitle="Carga planificada por día">
          <div className="flex flex-col gap-2.5">
            {SEMANA.map((dia) => (
              <div key={dia.d} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs text-white/45">{dia.d}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${dia.clave ? 'bg-accent' : 'bg-white/20'}`}
                    style={{ width: `${dia.load}%` }}
                  />
                </div>
                {dia.clave ? (
                  <span className="w-20 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wide text-accent">
                    Competencia
                  </span>
                ) : (
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-white/40">{dia.load}%</span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Fila 2 — qué atender + temporada */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel
          title="Qué necesita atención"
          subtitle={alertas.length ? `${alertas.length} ${alertas.length === 1 ? 'aviso activo' : 'avisos activos'}` : 'Sin avisos activos'}
        >
          {alertas.length === 0 ? (
            <p className="py-3 text-sm text-white/45">
              Todo en orden — carga, disponibilidad y bienestar dentro de rango.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-perf-border">
              {alertas.map((al) => (
                <li key={`${al.mod}-${al.desc}`} className="first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => navigate(MODULO_ROUTE[al.mod])}
                    className="flex w-full items-center gap-3 py-3 text-left transition-opacity hover:opacity-80"
                  >
                    <span className="min-w-0 flex-1 text-sm text-white/85">{al.desc}</span>
                    <Badge tone={MODULO_BADGE[al.mod].tone} label={MODULO_BADGE[al.mod].label} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-perf-border pt-4 text-[11px] text-white/50">
            <Legend tone="ok" label="ACWR óptimo <1.30" />
            <Legend tone="warn" label="Alerta 1.30–1.50" />
            <Legend tone="danger" label="Riesgo >1.50" />
          </div>
        </Panel>

        <Panel title="Temporada" subtitle="Acumulado del período en curso">
          <div className="grid grid-cols-2 gap-4">
            <DatoTemporada label="Sesiones" value={String(atleta.sesiones)} />
            <DatoTemporada label="Minutos" value={atleta.minutos.toLocaleString('es')} />
            <DatoTemporada label="Disponibilidad" value={`${Math.round(atleta.disponibilidad)}%`} />
            <DatoTemporada label="Carga semanal" value={`${Math.round(atleta.cargaSemanal)} UA`} />
          </div>
          <div className="mt-5 border-t border-perf-border pt-4">
            <div className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-white/50">ACWR actual</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${SEM[tonoAcwr].bg}`}
                  style={{ width: `${Math.min(atleta.acwr / 2, 1) * 100}%` }}
                />
              </div>
              <span className={`w-10 shrink-0 text-right text-xs font-semibold tabular-nums ${SEM[tonoAcwr].text}`}>
                {atleta.acwr.toFixed(2)}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Fila 3 — accesos, en la lectura de una sola persona */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ModuleCard
          icon="carga"
          title="Carga y forma"
          metric={`${Math.round(atleta.cargaSemanal)} UA`}
          detail="Tu carga semanal y tu estado de forma"
          onClick={() => navigate('/carga')}
        />
        <ModuleCard
          icon="tests"
          title="Pruebas"
          metric="Física"
          detail="Batería de tests y resultados"
          onClick={() => navigate('/tests/fisico')}
        />
        <ModuleCard
          icon="lesiones"
          title="Lesiones"
          metric={atleta.estado === 'baja' ? 'En curso' : 'Sin lesión'}
          detail={atleta.estado === 'baja' ? 'Seguimiento de recuperación' : 'Historial y prevención'}
          onClick={() => navigate('/lesiones')}
        />
      </div>
    </div>
  )
}

function DatoTemporada({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-0.5 text-xl font-bold tracking-tight text-white tabular-nums">{value}</p>
    </div>
  )
}
