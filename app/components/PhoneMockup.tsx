'use client'

import { useEffect, useRef, useState } from 'react'

export default function PhoneMockup() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })

  // Con prefers-reduced-motion el video queda congelado en el poster.
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const v = videoRef.current
    if (!v) return
    v.pause()
    v.currentTime = 0
  }, [])

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
          className="relative rounded-[2.4rem] p-2 glass-strong"
          style={{ boxShadow: 'var(--shadow-lift)' }}
        >
          {/* Screen — el video ya trae la status bar y la Dynamic Island reales,
              por eso no dibujamos notch propio. */}
          <div
            className="relative overflow-hidden rounded-[1.9rem]"
            style={{
              aspectRatio: '720 / 1566',
              background: '#0b1016',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
            }}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              src="/hero-app.mp4"
              poster="/hero-app-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="La app Zyfit generando la sesión del día a partir del check-in"
            />
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
