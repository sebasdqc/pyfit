'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export default function Reveal({
  children,
  delay = 0,
  y = 26,
  className = '',
  style,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? 'in' : ''} ${className}`}
      style={{ ['--rv-delay' as string]: `${delay}ms`, ['--rv-y' as string]: `${y}px`, ...style }}
    >
      {children}
    </div>
  )
}
