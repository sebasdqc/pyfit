// Simulador de carga interna (sRPE → carga semanal → ACWR). Escuela Analítica y
// Rendimiento Deportivo: el estudiante arrastra 28 "días" de carga de un atleta
// ficticio y ve en vivo cómo reaccionan la carga semanal (monotonía/strain) y el
// ACWR — el MISMO motor que corre en el panel Zyfit Performance
// (academy.views.simulador_carga_compute delega en performance.calculators),
// nunca una aproximación calculada en el cliente.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { computeSimuladorCarga } from '@/api/academy'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/Icon'
import type { ACWRResultado, CargaSemanalResultado } from '@/types'

const VENTANA_AGUDA = 7
const MAX_UA = 700
const BAR_TRACK_H = 112 // px

interface Escenario {
  id: string
  label: string
  cargas: number[]
}

// 21 días de carga crónica "de fondo" + 7 días de semana actual que cada
// escenario personaliza, para que el contraste aguda/crónica sea siempre visible.
function base(valor: number, ruido = 20): number[] {
  return Array.from({ length: 21 }, (_, i) => Math.max(0, valor + (((i * 37) % 40) - 20) * (ruido / 40)))
}

const ESCENARIOS: Escenario[] = [
  { id: 'estable', label: 'Semana estable', cargas: [...base(300), 310, 290, 305, 300, 295, 300, 310] },
  { id: 'pico', label: 'Pico de partidos', cargas: [...base(280), 520, 540, 500, 560, 480, 530, 550] },
  { id: 'progresiva', label: 'Sobrecarga progresiva', cargas: [...base(260, 10), 380, 400, 420, 440, 460, 480, 500] },
  { id: 'descarga', label: 'Semana de descarga', cargas: [...base(320), 160, 150, 170, 140, 160, 150, 170] },
]

function round10(n: number) {
  return Math.round(n / 10) * 10
}

const ZONA_TONO: Record<string, 'ok' | 'warn' | 'danger'> = {
  'Infracarga': 'warn',
  'Óptima (sweet spot)': 'ok',
  'Precaución': 'warn',
  'Zona de peligro': 'danger',
  'Riesgo alto': 'danger',
  'Sin carga crónica': 'warn',
}

export function SimuladorCargaPage() {
  const [cargas, setCargas] = useState<number[]>(ESCENARIOS[0].cargas)
  const [semana, setSemana] = useState<CargaSemanalResultado | null>(null)
  const [acwr, setAcwr] = useState<ACWRResultado | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce: cada cambio en `cargas` (drag o escenario) reprograma el cálculo;
  // el cleanup cancela el timeout anterior y descarta respuestas de una serie vieja.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const t = setTimeout(async () => {
      try {
        const [semanaRes, acwrRes] = await Promise.all([
          computeSimuladorCarga<CargaSemanalResultado>('carga-semanal', {
            cargas_diarias: cargas.slice(-VENTANA_AGUDA),
          }),
          computeSimuladorCarga<ACWRResultado>('acwr', { cargas_diarias: cargas }),
        ])
        if (cancelled) return
        setSemana(semanaRes.resultados)
        setAcwr(acwrRes.resultados)
      } catch {
        if (!cancelled) setError('No se pudo calcular. Intenta de nuevo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [cargas])

  function setDia(index: number, valor: number) {
    setCargas((prev) => {
      if (prev[index] === valor) return prev
      const next = [...prev]
      next[index] = valor
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="za-eyebrow">Simulador · Analítica y Rendimiento Deportivo</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Carga interna y ACWR</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">
          Ajusta la carga diaria (sRPE, en UA) de un atleta ficticio y observa en vivo cómo cambian
          la carga semanal y el ACWR. El cálculo corre en el mismo motor que usa el cuerpo técnico
          en Zyfit Performance — no es una aproximación de práctica.
        </p>
      </header>

      {/* Escenarios de ejemplo */}
      <div className="flex flex-wrap gap-2">
        {ESCENARIOS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setCargas(e.cargas)}
            className="rounded-full border border-surface-border bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Ecualizador de carga diaria */}
      <div className="za-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">28 días de carga (UA)</p>
          <p className="text-xs text-ink-muted">Arrastra o usa ↑↓ sobre una barra para cambiar ese día</p>
        </div>

        <div className="mt-5 overflow-x-auto pb-1">
          <div className="flex min-w-max items-end gap-1">
            {cargas.map((valor, i) => (
              <DiaBar
                key={i}
                index={i}
                valor={valor}
                aguda={i >= cargas.length - VENTANA_AGUDA}
                onChange={(v) => setDia(i, v)}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand" /> Carga crónica (28 d)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Semana aguda (últimos 7 d)
          </span>
        </div>
      </div>

      {/* Resultados en vivo */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ResultCard title="Carga semanal · monotonía y strain (Foster)" loading={loading} error={error}>
          {semana && (
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Carga semanal" value={`${semana.carga_semanal_ua} UA`} />
              <Metric label="Media diaria" value={`${semana.carga_media_diaria_ua} UA`} />
              <Metric label="Monotonía" value={semana.monotonia ?? '—'} alerta={semana.monotonia_alerta} />
              <Metric label="Strain" value={semana.strain_ua ?? '—'} />
              {semana.nota && <p className="col-span-2 text-xs text-ink-muted">{semana.nota}</p>}
            </div>
          )}
        </ResultCard>

        <ResultCard title="ACWR (aguda 7d : crónica 28d)" loading={loading} error={error}>
          {acwr && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Metric label="ACWR · media móvil" value={acwr.acwr_ra ?? '—'} />
                <Metric label="ACWR · EWMA" value={acwr.acwr_ewma ?? '—'} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={ZONA_TONO[acwr.zona] ?? 'warn'}>{acwr.zona}</Badge>
                {acwr.riesgo_alerta && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                    <Icon name="flag" size={13} /> por encima de la zona de gestión segura
                  </span>
                )}
              </div>
              {acwr.nota && <p className="text-xs text-ink-muted">{acwr.nota}</p>}
            </div>
          )}
        </ResultCard>
      </div>

      <p className="text-xs text-ink-muted">
        El ACWR es un indicador contextual de gestión de carga, no un predictor causal de lesión.{' '}
        <Link to="/catalogo" className="font-medium text-accent hover:text-accent-dark">
          Profundiza en la escuela Analítica y Rendimiento →
        </Link>
      </p>
    </div>
  )
}

function DiaBar({
  index,
  valor,
  aguda,
  onChange,
}: {
  index: number
  valor: number
  aguda: boolean
  onChange: (v: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  function valueFromPointer(clientY: number) {
    const track = trackRef.current
    if (!track) return valor
    const rect = track.getBoundingClientRect()
    const ratio = 1 - (clientY - rect.top) / rect.height
    return Math.min(MAX_UA, Math.max(0, round10(ratio * MAX_UA)))
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setActive(true)
    onChange(valueFromPointer(e.clientY))
  }
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!active) return
    onChange(valueFromPointer(e.clientY))
  }

  const pct = Math.min(100, (valor / MAX_UA) * 100)

  return (
    <div className="group relative flex w-4 flex-col items-center">
      <span
        className={`pointer-events-none absolute -top-6 whitespace-nowrap rounded-md bg-brand-deep px-1.5 py-0.5 text-[10px] font-semibold text-white transition-opacity ${
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {valor}
      </span>
      <div
        ref={trackRef}
        role="slider"
        aria-label={`Carga día ${index + 1} de 28 (UA)`}
        aria-valuemin={0}
        aria-valuemax={MAX_UA}
        aria-valuenow={valor}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setActive(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            onChange(Math.min(MAX_UA, valor + 10))
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(Math.max(0, valor - 10))
          }
        }}
        style={{ height: BAR_TRACK_H, touchAction: 'none' }}
        className="flex w-3 cursor-ns-resize items-end rounded-sm bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className={`w-full rounded-t-[3px] ${aguda ? 'bg-accent' : 'bg-brand'}`} style={{ height: `${pct}%` }} />
      </div>
    </div>
  )
}

function ResultCard({
  title,
  loading,
  error,
  children,
}: {
  title: string
  loading: boolean
  error: string | null
  children: React.ReactNode
}) {
  return (
    <div className="za-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {loading && <span className="text-[11px] text-ink-muted">Calculando…</span>}
      </div>
      <div className="mt-4">{error ? <p className="text-sm text-danger">{error}</p> : children}</div>
    </div>
  )
}

function Metric({ label, value, alerta }: { label: string; value: string | number; alerta?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${alerta ? 'text-danger' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
