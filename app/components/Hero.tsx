'use client'

import { useEffect, useRef, useState } from 'react'
import WaitlistForm from '../WaitlistForm'
import PhoneMockup from './PhoneMockup'

export default function Hero() {
  const [scrollY, setScrollY] = useState(0)
  const reduce = useRef(false)

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce.current) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        setScrollY(window.scrollY)
        raf = 0
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const textShift = reduce.current ? 0 : scrollY * 0.15
  const mockupShift = reduce.current ? 0 : scrollY * -0.08
  const fade = Math.max(0, 1 - scrollY / 620)

  return (
    <section id="top" className="relative glow-soft">
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-36 pb-24 lg:pt-44 lg:pb-32 grid lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
        <div style={{ transform: `translateY(${textShift}px)`, opacity: fade }}>
          <span
            className="font-mono-label inline-flex items-center gap-2 text-[11px] uppercase px-3 py-1.5 rounded-full glass"
            style={{ color: 'var(--accent-light)' }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
            IA adaptativa · fuerza + running
          </span>

          <h1 className="display mt-6">
            Un entrenador que{' '}
            <span className="font-accent gradient-text">se adapta</span>{' '}
            a ti, no al revés.
          </h1>

          <p className="mt-6 text-lg leading-relaxed max-w-lg" style={{ color: 'var(--ink-dim)' }}>
            Zyfit genera tu rutina de fuerza o running en base a tu progreso real, tu feedback de cada
            sesión y cómo llegas ese día. Nada de plantillas genéricas.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            <WaitlistForm />
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
                Muy pronto en App Store y Google Play
              </span>
              <span style={{ color: 'var(--ink-faint)' }}>·</span>
              <span>Sin spam</span>
            </div>
          </div>
        </div>

        <div
          className="flex justify-center lg:justify-end"
          style={{ transform: `translateY(${mockupShift}px)` }}
        >
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}
