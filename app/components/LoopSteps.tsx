'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type Step = {
  n: string
  pos: 'n' | 'e' | 's' | 'w'
  color: string
  title: string
  /** Etiqueta corta siempre visible: da cuerpo a la card colapsada. */
  hint: string
  text: string
  micro: ReactNode
}

const AUTOPLAY_MS = 5200

/* ── Micro-visuales: un fragmento de la app por paso ─────────────── */

function CheckinMicro() {
  const chips = [
    ['Sueño', '7 h'],
    ['Ánimo', '3/5'],
    ['Tiempo', "45'"],
  ]
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-baseline gap-1.5 rounded-lg px-2.5 py-1.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
        >
          <span className="font-mono-label text-[9px] uppercase" style={{ color: 'var(--ink-faint)' }}>
            {k}
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
            {v}
          </span>
        </span>
      ))}
    </div>
  )
}

function GenerandoMicro() {
  const rows = [
    ['Press banca', '4 × 8'],
    ['Remo con barra', '4 × 10'],
  ]
  return (
    <div className="space-y-1.5">
      {rows.map(([ex, s]) => (
        <div key={ex} className="flex items-center justify-between gap-3 text-xs">
          <span style={{ color: 'var(--ink-dim)' }}>{ex}</span>
          <span className="font-mono-label text-[10px]" style={{ color: 'var(--cyan)' }}>
            {s}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-0.5">
        <span className="loop-skel h-2 flex-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
        <span className="font-mono-label text-[9px] uppercase" style={{ color: 'var(--ink-faint)' }}>
          generando
        </span>
      </div>
    </div>
  )
}

function RpeMicro() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono-label text-[9px] uppercase" style={{ color: 'var(--ink-faint)' }}>
          RPE percibido
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--orange)' }}>
          8 / 10
        </span>
      </div>
      <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: '80%', background: 'linear-gradient(90deg, var(--accent), var(--orange))' }}
        />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
          style={{ left: 'calc(80% - 6px)', background: 'var(--orange)', boxShadow: '0 0 12px -2px var(--orange)' }}
        />
      </div>
      <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>
        80 kg × 8 · serie completada
      </div>
    </div>
  )
}

function AjusteMicro() {
  const bars = [38, 46, 44, 58, 74]
  return (
    <div className="space-y-2">
      <div className="flex h-10 items-end gap-1.5">
        {bars.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${h}%`,
              background: i === bars.length - 1 ? 'var(--green)' : 'rgba(255,255,255,0.12)',
              boxShadow: i === bars.length - 1 ? '0 0 14px -4px var(--green)' : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono-label text-[9px] uppercase" style={{ color: 'var(--ink-faint)' }}>
          Carga semanal
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--green)' }}>
          +7 %
        </span>
      </div>
    </div>
  )
}

const STEPS: Step[] = [
  {
    n: '01',
    pos: 'n',
    color: 'var(--accent-light)',
    title: 'Check-in diario',
    hint: '30 segundos',
    text: 'Antes de entrenar cuentas cómo dormiste, tu ánimo, tu tiempo disponible y cualquier molestia. 30 segundos.',
    micro: <CheckinMicro />,
  },
  {
    n: '02',
    pos: 'e',
    color: 'var(--cyan)',
    title: 'La IA arma tu sesión',
    hint: 'Fuerza o running',
    text: 'Con tu perfil, tu historial y el check-in de hoy, el motor genera una rutina de fuerza o running a tu medida.',
    micro: <GenerandoMicro />,
  },
  {
    n: '03',
    pos: 's',
    color: 'var(--orange)',
    title: 'Entrenas y das feedback',
    hint: 'Peso · reps · RPE',
    text: 'Registras peso, repeticiones y RPE. Al terminar, calificas cómo te sentiste y qué tan bien cumpliste.',
    micro: <RpeMicro />,
  },
  {
    n: '04',
    pos: 'w',
    color: 'var(--green)',
    title: 'La próxima sesión se ajusta',
    hint: 'Progresión automática',
    text: 'Ese feedback entra al motor: si veníamos fuerte, subimos la carga; si hubo fatiga, la próxima se adapta.',
    micro: <AjusteMicro />,
  },
]

export default function LoopSteps() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // No gastamos timers mientras la sección no está en pantalla.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), {
      threshold: 0.25,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (paused || reduced || !visible) return
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), AUTOPLAY_MS)
    return () => clearTimeout(t)
  }, [active, paused, reduced, visible])

  return (
    <div
      ref={stageRef}
      className="loop-stage mt-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Órbita: línea punteada + cometa que la recorre 01→02→03→04→01 */}
      <svg className="loop-ring" viewBox="0 0 940 830" fill="none" aria-hidden>
        <defs>
          <linearGradient id="loopComet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-light)" stopOpacity="0" />
            <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--violet)" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* rx/ry pasan por el centro de cada card (ver .loop-node en globals.css) */}
        <ellipse
          cx="470"
          cy="415"
          rx="317"
          ry="351"
          stroke="var(--border-strong)"
          strokeWidth="1.5"
          strokeDasharray="2 12"
          strokeLinecap="round"
          opacity="0.7"
        />
        <ellipse
          className="loop-comet"
          cx="470"
          cy="415"
          rx="317"
          ry="351"
          stroke="url(#loopComet)"
          strokeWidth="2.5"
          strokeDasharray="175 1925"
          strokeLinecap="round"
        />
      </svg>

      {/* Núcleo */}
      <div className="loop-hub glass-strong">
        <span className="loop-hub-sweep" aria-hidden />
        <div className="relative text-center">
          <span className="font-mono-label block text-[10px] uppercase" style={{ color: 'var(--ink-dim)' }}>
            Zyfit Loop
          </span>
          <span className="font-accent gradient-text mt-1.5 block text-5xl leading-none">{STEPS[active].n}</span>
        </div>
      </div>

      {STEPS.map((s, i) => {
        const isActive = i === active
        return (
          <div key={s.n} className="contents">
            <button
              type="button"
              data-pos={s.pos}
              data-active={isActive}
              aria-expanded={isActive}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className="loop-node glass w-full rounded-2xl p-5 text-left"
              style={isActive ? { borderColor: s.color, boxShadow: `0 0 40px -22px ${s.color}` } : undefined}
            >
              <div className="flex items-center gap-3">
                <span
                  className="font-mono-label inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs transition-colors"
                  style={{
                    background: isActive ? `color-mix(in srgb, ${s.color} 16%, transparent)` : 'rgba(255,255,255,0.04)',
                    color: isActive ? s.color : 'var(--ink-faint)',
                    border: `1px solid ${isActive ? s.color : 'var(--border)'}`,
                  }}
                >
                  {s.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base leading-tight font-semibold">{s.title}</h3>
                  <span
                    className="font-mono-label mt-1.5 block text-[10px] uppercase transition-colors"
                    style={{ color: isActive ? s.color : 'var(--ink-faint)' }}
                  >
                    {s.hint}
                  </span>
                </div>
              </div>

              <div className="loop-node-body">
                <div>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                    {s.text}
                  </p>
                  <div className="mt-4 rounded-xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    {s.micro}
                  </div>
                </div>
              </div>
            </button>

            {/* Conector vertical del apilado. Se oculta en lg desde globals.css,
                NO con `lg:hidden`: este CSS va sin capa y le gana a las utilidades
                de Tailwind, que viven en @layer utilities. */}
            {i < STEPS.length - 1 && (
              <span
                className="loop-link rounded-full"
                aria-hidden
                data-done={i < active}
                style={{ background: i < active ? s.color : 'var(--border-strong)' }}
              />
            )}
          </div>
        )
      })}

      {/* Riel de retorno 04 → 01: solo en el apilado, donde no hay órbita que
          muestre que el proceso es circular. En lg lo reemplaza el cometa. */}
      <span className="loop-return" aria-hidden />
    </div>
  )
}
