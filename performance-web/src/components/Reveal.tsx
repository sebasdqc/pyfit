// Entrada al hacer scroll (fade + slide-up) para la landing pública. Estilos
// aplicados inline (no clases CSS globales nuevas): el bloque global de
// prefers-reduced-motion en index.css ya neutraliza cualquier transition-
// duration, incluida la de un `style` inline, así que la reducción de
// movimiento funciona sin tocar ese archivo.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = '',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
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

  const style: CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? 'none' : `translateY(${y}px)`,
    transition: `opacity 0.8s cubic-bezier(0.2,0.7,0.2,1) ${delay}ms, transform 0.8s cubic-bezier(0.2,0.7,0.2,1) ${delay}ms`,
    willChange: 'opacity, transform',
  }

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}
