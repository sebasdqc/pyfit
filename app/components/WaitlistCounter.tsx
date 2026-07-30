'use client'

import { useEffect, useState } from 'react'

/**
 * Contador de la lista de espera, estética de odómetro: un dígito por caja,
 * rodando desde 0 al montar.
 *
 * El número está FIJO en 117 a propósito. Para automatizarlo basta reemplazar
 * `FIXED_COUNT` por el total real —`GET /api/waitlist` ya devuelve
 * `{ count }` leyendo `waitlist_signups`— y pasar ese valor a `<Odometer />`.
 */
const FIXED_COUNT = 117
const ROLL_MS = 1500

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export default function WaitlistCounter() {
  return (
    <div
      className="glass-strong rounded-[2rem] px-6 py-12 sm:px-14 sm:py-14 relative overflow-hidden"
      style={{ boxShadow: 'var(--shadow-lift)' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 55% 90% at 50% 0%, rgba(79,140,255,0.16), transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center gap-6">
        <span
          className="font-mono-label inline-flex items-center gap-2 text-[11px] uppercase px-3 py-1.5 rounded-full glass"
          style={{ color: 'var(--accent-light)' }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--green)' }} />
          Lista de espera abierta
        </span>

        <Odometer value={FIXED_COUNT} />

        <p className="font-mono-label text-xs uppercase" style={{ color: 'var(--ink-dim)' }}>
          personas ya en la lista de espera
        </p>

        <a href="#lista-de-espera" className="btn-primary rounded-xl px-6 py-3.5 text-sm font-semibold">
          Unirme a la lista
        </a>
      </div>
    </div>
  )
}

function Odometer({ value }: { value: number }) {
  const digits = String(Math.max(0, Math.trunc(value))).split('').map(Number)
  // Arranca en ceros y rueda hasta el valor real, para que se lea el movimiento.
  const [rolled, setRolled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRolled(true)
      return
    }
    const raf = requestAnimationFrame(() => setRolled(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="flex items-stretch gap-2 sm:gap-3"
      role="img"
      aria-label={`${value} personas ya en la lista de espera`}
    >
      {digits.map((d, i) => (
        <span key={i} className="odometer-digit" aria-hidden>
          <span
            className="odometer-strip"
            style={{
              transform: `translateY(-${(rolled ? d : 0) * 10}%)`,
              // Las decenas y unidades cierran después: el giro se ve encadenado.
              transitionDuration: `${ROLL_MS + i * 220}ms`,
            }}
          >
            {DIGITS.map((n) => (
              <span key={n} className="odometer-cell counter-value gradient-text">
                {n}
              </span>
            ))}
          </span>
          <span className="odometer-seam" />
        </span>
      ))}
    </div>
  )
}
