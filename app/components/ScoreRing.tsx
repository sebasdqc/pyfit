'use client'

import { useEffect, useRef, useState } from 'react'

export default function ScoreRing({
  value,
  size = 120,
  stroke = 10,
  label = 'Zyfit Score',
  animate = true,
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
  animate?: boolean
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [progress, setProgress] = useState(animate ? 0 : value)

  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress / 100)

  useEffect(() => {
    if (!animate) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setProgress(value)
      return
    }
    const el = ref.current
    if (!el) return

    let raf = 0
    let started = false
    const run = () => {
      const start = performance.now()
      const duration = 1400
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        setProgress(Math.round(eased * value))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            started = true
            run()
            io.disconnect()
          }
        })
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [animate, value])

  const gid = `ring-grad-${size}`

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7ab6ff" />
            <stop offset="55%" stopColor="#4f8cff" />
            <stop offset="100%" stopColor="#8b7bff" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.1s linear', filter: 'drop-shadow(0 0 8px rgba(79,140,255,0.55))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold tabular-nums" style={{ fontSize: size * 0.28, lineHeight: 1 }}>
          {progress}
        </span>
        <span className="font-mono-label uppercase mt-1" style={{ color: 'var(--ink-dim)', fontSize: size * 0.075 }}>
          {label}
        </span>
      </div>
    </div>
  )
}
