// Botón con estela de "estrella" recorriendo el borde (React Bits, adaptado a
// TS + a la identidad visual de Academy: píldora blanca / texto rojo marca en
// vez del negro genérico de la demo). Se usa SOLO en los CTA principales de
// la landing pública.
import type { CSSProperties, ElementType, ReactNode } from 'react'
import './StarBorder.css'

interface StarBorderProps {
  as?: ElementType
  className?: string
  color?: string
  speed?: string
  thickness?: number
  children?: ReactNode
  style?: CSSProperties
  [prop: string]: unknown
}

export default function StarBorder({
  as,
  className = '',
  color = 'white',
  speed = '6s',
  thickness = 2,
  children,
  style,
  ...rest
}: StarBorderProps) {
  // Componente dinámico (button/a/Link de react-router) — se tipa laxo a
  // propósito, el "as" polimórfico no vale la pena tipar en detalle para un
  // efecto visual acotado a un par de botones.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component: any = as ?? 'button'

  const wrapperStyle = {
    ...style,
    padding: `${thickness}px 0`,
    '--glow-color': color,
  }

  return (
    <Component {...rest} className={`star-border-container ${className}`} style={wrapperStyle as CSSProperties}>
      <div
        className="border-gradient-bottom"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <div
        className="border-gradient-top"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <div className="inner-content">{children}</div>
    </Component>
  )
}
