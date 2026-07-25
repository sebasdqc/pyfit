'use client'

import { useEffect, useRef, useState } from 'react'

const FACTORS: { label: string; value: number; color: string }[] = [
  { label: 'Consistencia', value: 88, color: 'var(--plate-red)' },
  { label: 'Rendimiento', value: 74, color: 'var(--plate-blue)' },
  { label: 'Adherencia', value: 91, color: 'var(--plate-green)' },
  { label: 'Recuperación', value: 69, color: 'var(--plate-yellow)' },
  { label: 'Momentum', value: 80, color: 'var(--chalk)' },
]

export default function FactorBars() {
  const ref = useRef<HTMLUListElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setOn(true)
            io.disconnect()
          }
        })
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <ul ref={ref} className="mt-8 space-y-5">
      {FACTORS.map((f, i) => (
        <li key={f.label}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--chalk)' }}>{f.label}</span>
            <span className="font-mono-label text-xs tabular-nums" style={{ color: 'var(--chalk-dim)' }}>
              {f.value}
            </span>
          </div>
          <div className="h-2 rounded-sm overflow-hidden" style={{ background: 'rgba(236,231,222,0.08)' }}>
            <div
              className="h-full w-full rounded-sm"
              style={{
                transform: `scaleX(${on ? f.value / 100 : 0})`,
                transformOrigin: 'left',
                background: f.color,
                transition: `transform 1.1s cubic-bezier(0.2,0.8,0.2,1) ${i * 120}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
