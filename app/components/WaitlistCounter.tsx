'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Contador de registros reales en la lista de espera (tabla `waitlist_signups`).
 *
 * Por debajo de MIN_VISIBLE_COUNT no mostramos el número: un "0 personas" o un
 * "3 personas" resta más de lo que suma. En su lugar mostramos el encuadre de
 * acceso anticipado. Poné MIN_VISIBLE_COUNT = 0 para mostrar siempre el crudo.
 *
 * Cuando exista el contador de USUARIOS de la app, este componente se reusa
 * cambiando `endpoint` y los textos por props.
 */
const MIN_VISIBLE_COUNT = 25
const COUNT_UP_MS = 1400

const nf = new Intl.NumberFormat('es-ES')

export default function WaitlistCounter() {
  const [count, setCount] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const res = await fetch('/api/waitlist', { cache: 'no-store' })
        if (!res.ok) throw new Error('bad status')
        const data = (await res.json()) as { count?: number }
        if (!alive) return
        if (typeof data.count !== 'number') throw new Error('bad payload')
        setCount(data.count)
        setFailed(false)
      } catch {
        if (alive) setFailed(true)
      }
    }

    load()
    // Si alguien se registra sin recargar, el número se actualiza al instante.
    const onSignup = () => load()
    window.addEventListener('zyfit:waitlist-signup', onSignup)
    return () => {
      alive = false
      window.removeEventListener('zyfit:waitlist-signup', onSignup)
    }
  }, [])

  const showNumber = count !== null && count >= MIN_VISIBLE_COUNT
  const loading = count === null && !failed

  return (
    <div
      className="glass-strong rounded-[2rem] px-8 py-12 sm:px-14 sm:py-14 relative overflow-hidden"
      style={{ boxShadow: 'var(--shadow-lift)' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 55% 90% at 50% 0%, rgba(79,140,255,0.16), transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center gap-5 sm:flex-row sm:text-left sm:justify-between sm:gap-10">
        <div>
          <span
            className="font-mono-label inline-flex items-center gap-2 text-[11px] uppercase px-3 py-1.5 rounded-full glass"
            style={{ color: 'var(--accent-light)' }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--green)' }}
            />
            Lista de espera abierta
          </span>

          <div className="mt-6 flex items-baseline justify-center sm:justify-start gap-3">
            {loading ? (
              <span
                className="counter-skel rounded-xl"
                style={{ width: '7.5rem', height: '3.6rem' }}
                aria-hidden
              />
            ) : showNumber ? (
              <CountUp target={count} />
            ) : (
              <span className="counter-value gradient-text">Sé de los primeros</span>
            )}
          </div>

          <p className="mt-3 text-base leading-snug" style={{ color: 'var(--ink-dim)' }}>
            {loading
              ? 'Contando personas en la lista de espera…'
              : showNumber
                ? `${count === 1 ? 'persona ya está' : 'personas ya están'} esperando Zyfit. Súmate antes del lanzamiento.`
                : 'Zyfit todavía no está publicado. Deja tu email y entras en el primer grupo de acceso.'}
          </p>
        </div>

        <a
          href="#lista-de-espera"
          className="btn-primary rounded-xl px-6 py-3.5 text-sm font-semibold whitespace-nowrap shrink-0"
        >
          Unirme a la lista
        </a>
      </div>
    </div>
  )
}

function CountUp({ target }: { target: number }) {
  const [display, setDisplay] = useState(target)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      setDisplay(target)
      return
    }
    started.current = true

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target)
      return
    }

    let raf = 0
    let t0 = 0
    const tick = (now: number) => {
      if (!t0) t0 = now
      const p = Math.min(1, (now - t0) / COUNT_UP_MS)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    setDisplay(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <span
      className="counter-value gradient-text tabular-nums"
      aria-label={`${nf.format(target)} personas registradas en la lista de espera`}
    >
      {nf.format(display)}
    </span>
  )
}
