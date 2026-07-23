'use client'

import { useRef, useState } from 'react'
import ScoreRing from './ScoreRing'

const EXERCISES = [
  { name: 'Press banca', sets: '4×6 · RPE 8' },
  { name: 'Remo con barra', sets: '4×8 · RPE 7' },
  { name: 'Press militar', sets: '3×10 · RPE 8' },
]

export default function PhoneMockup() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })

  function handleMove(e: React.MouseEvent) {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setTilt({ rx: -py * 12, ry: px * 16 })
  }

  function reset() {
    setTilt({ rx: 0, ry: 0 })
  }

  return (
    <div
      ref={wrapRef}
      className="tilt-wrap relative"
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ width: 300 }}
    >
      <div
        className="tilt floaty"
        style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
      >
        {/* Phone body */}
        <div
          className="relative rounded-[2.4rem] p-5 glass-strong"
          style={{ boxShadow: 'var(--shadow-lift)' }}
        >
          {/* notch */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-2.5 h-1.5 w-16 rounded-full"
            style={{ background: 'rgba(255,255,255,0.14)' }}
          />

          <div className="flex items-center justify-between mb-5 mt-2">
            <span className="font-mono-label text-[10px] uppercase" style={{ color: 'var(--ink-dim)' }}>
              Sesión de hoy
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(79,140,255,0.16)', color: 'var(--accent-light)' }}
            >
              Fuerza · Tren superior
            </span>
          </div>

          <div className="flex items-center justify-center my-6" style={{ transform: 'translateZ(40px)' }}>
            <ScoreRing value={82} size={132} stroke={11} />
          </div>

          <div className="space-y-2">
            {EXERCISES.map((ex) => (
              <div
                key={ex.name}
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid var(--border)' }}
              >
                <span className="text-xs font-medium">{ex.name}</span>
                <span className="font-mono-label text-[10px]" style={{ color: 'var(--ink-dim)' }}>
                  {ex.sets}
                </span>
              </div>
            ))}
          </div>

          <div
            className="mt-4 rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ background: 'rgba(255,170,50,0.1)', border: '1px solid rgba(255,170,50,0.22)' }}
          >
            <span>🔥</span>
            <span className="text-xs font-medium" style={{ color: 'var(--orange)' }}>
              Racha de 12 días
            </span>
          </div>
        </div>

        {/* Floating depth chips */}
        <div
          className="absolute -left-10 top-24 glass-strong rounded-2xl px-4 py-3 hidden sm:block"
          style={{ transform: 'translateZ(70px)', boxShadow: 'var(--shadow-lift)' }}
        >
          <p className="font-mono-label text-[9px] uppercase" style={{ color: 'var(--ink-dim)' }}>
            Ritmo
          </p>
          <p className="text-lg font-semibold" style={{ color: 'var(--cyan)' }}>
            5:12<span className="text-xs font-normal" style={{ color: 'var(--ink-dim)' }}> /km</span>
          </p>
        </div>

        <div
          className="absolute -right-8 bottom-28 glass-strong rounded-2xl px-4 py-3 hidden sm:block"
          style={{ transform: 'translateZ(90px)', boxShadow: 'var(--shadow-lift)' }}
        >
          <p className="font-mono-label text-[9px] uppercase" style={{ color: 'var(--ink-dim)' }}>
            Volumen semanal
          </p>
          <p className="text-lg font-semibold gradient-text">+14%</p>
        </div>
      </div>
    </div>
  )
}
