'use client'

import { useEffect, useRef, useState } from 'react'

type Section = { id: string; label: string }

const SECTIONS: Section[] = [
  { id: 'problema', label: 'Problema y solución' },
  { id: 'producto', label: 'Producto' },
  { id: 'mercado', label: 'Mercado' },
  { id: 'competencia', label: 'Competencia' },
  { id: 'moat', label: 'Diferenciador y MOAT' },
  { id: 'pendiente', label: 'Pendiente' },
]

/** Nav de píldoras con scrollspy: se pega arriba y marca la sección visible. */
export default function DataroomNav() {
  const [active, setActive] = useState(SECTIONS[0].id)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="sticky top-4 z-40 px-6 flex justify-center pointer-events-none">
      <nav
        className="glass-strong rounded-full px-2 py-2 pointer-events-auto"
        style={{ boxShadow: 'var(--shadow-lift)' }}
        aria-label="Secciones del dataroom"
      >
        <div ref={railRef} className="flex items-center gap-1 overflow-x-auto max-w-[calc(100vw-3rem)]" style={{ scrollbarWidth: 'none' }}>
          {SECTIONS.map((s) => {
            const isActive = active === s.id
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all"
                style={{
                  color: isActive ? 'var(--button-text-on-accent, #051021)' : 'var(--ink-dim)',
                  background: isActive ? 'var(--grad-accent)' : 'transparent',
                }}
              >
                {s.label}
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
