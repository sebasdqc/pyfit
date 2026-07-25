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

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(236,231,222,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--plate-red)"
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums"
          style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.32, lineHeight: 1, color: 'var(--chalk)' }}
        >
          {progress}
        </span>
        <span className="font-mono-label uppercase mt-1" style={{ color: 'var(--chalk-dim)', fontSize: size * 0.075 }}>
          {label}
        </span>
      </div>
    </div>
  )
}
