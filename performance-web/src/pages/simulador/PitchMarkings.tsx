// Cancha de fútbol dibujada en SVG (horizontal, proporción ~105:68): césped
// verde con franjas de corte sutiles y líneas reglamentarias aproximadas
// (áreas, círculo central, puntos y arcos de penal, córners y porterías).
// Es puramente decorativa (pointer-events: none) — las interacciones viven en
// el tablero. Todas las medidas se derivan del área jugable de lib/simulador.

import { MARGIN, PLAY_H, PLAY_W, VB_H, VB_W, toPx } from '@/lib/simulador'

const BASE = '#0e3a29'
const STRIPE_A = '#10402d'
const STRIPE_B = '#0c3322'
const LINE = 'rgba(255,255,255,0.45)'
const LW = 3

// frac (0..1) → px del viewBox
const P = (fx: number, fy: number) => toPx({ x: fx, y: fy })

const STRIPES = 8

export function PitchMarkings() {
  const bandW = PLAY_W / STRIPES
  const cy = MARGIN + PLAY_H / 2
  const rCircle = 0.135 * PLAY_H

  // Áreas (fracciones del área jugable)
  const penaltyDepth = 0.16 * PLAY_W
  const penaltyHalf = 0.29 * PLAY_H
  const goalDepth = 0.055 * PLAY_W
  const goalHalf = 0.135 * PLAY_H
  const spotIn = 0.105 * PLAY_W
  const goalMouthHalf = 0.05 * PLAY_H
  const netDepth = 12

  const leftX = MARGIN
  const rightX = MARGIN + PLAY_W

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Césped + franjas */}
      <rect x={0} y={0} width={VB_W} height={VB_H} fill={BASE} />
      {Array.from({ length: STRIPES }).map((_, i) => (
        <rect
          key={i}
          x={MARGIN + i * bandW}
          y={MARGIN}
          width={bandW}
          height={PLAY_H}
          fill={i % 2 === 0 ? STRIPE_A : STRIPE_B}
        />
      ))}

      <g fill="none" stroke={LINE} strokeWidth={LW}>
        {/* Perímetro */}
        <rect x={MARGIN} y={MARGIN} width={PLAY_W} height={PLAY_H} />
        {/* Línea de medio campo + círculo + punto central */}
        <line x1={P(0.5, 0).x} y1={P(0.5, 0).y} x2={P(0.5, 1).x} y2={P(0.5, 1).y} />
        <circle cx={P(0.5, 0.5).x} cy={cy} r={rCircle} />
        <circle cx={P(0.5, 0.5).x} cy={cy} r={3} fill={LINE} stroke="none" />

        {/* Áreas izquierda */}
        <rect x={leftX} y={cy - penaltyHalf} width={penaltyDepth} height={penaltyHalf * 2} />
        <rect x={leftX} y={cy - goalHalf} width={goalDepth} height={goalHalf * 2} />
        <circle cx={leftX + spotIn} cy={cy} r={3} fill={LINE} stroke="none" />
        {penaltyArc('left', leftX + penaltyDepth, leftX + spotIn, cy, rCircle)}
        {/* Portería izquierda */}
        <rect x={leftX - netDepth} y={cy - goalMouthHalf} width={netDepth} height={goalMouthHalf * 2} />

        {/* Áreas derecha */}
        <rect x={rightX - penaltyDepth} y={cy - penaltyHalf} width={penaltyDepth} height={penaltyHalf * 2} />
        <rect x={rightX - goalDepth} y={cy - goalHalf} width={goalDepth} height={goalHalf * 2} />
        <circle cx={rightX - spotIn} cy={cy} r={3} fill={LINE} stroke="none" />
        {penaltyArc('right', rightX - penaltyDepth, rightX - spotIn, cy, rCircle)}
        {/* Portería derecha */}
        <rect x={rightX} y={cy - goalMouthHalf} width={netDepth} height={goalMouthHalf * 2} />

        {/* Córners */}
        {corner(leftX, MARGIN, 1)}
        {corner(rightX, MARGIN, 2)}
        {corner(rightX, MARGIN + PLAY_H, 3)}
        {corner(leftX, MARGIN + PLAY_H, 4)}
      </g>
    </g>
  )
}

// Arco de penal: parte del círculo (radio rCircle centrado en el punto de penal)
// que sobresale del área. side define hacia dónde bombea.
function penaltyArc(side: 'left' | 'right', edgeX: number, spotX: number, cy: number, r: number) {
  const dx = Math.abs(edgeX - spotX)
  if (r <= dx) return null
  const dy = Math.sqrt(r * r - dx * dx)
  const sweep = side === 'left' ? 1 : 0
  return (
    <path d={`M ${edgeX} ${cy - dy} A ${r} ${r} 0 0 ${sweep} ${edgeX} ${cy + dy}`} />
  )
}

// Cuarto de círculo en una esquina. corner index: 1=TL,2=TR,3=BR,4=BL
function corner(x: number, y: number, idx: number) {
  const r = 11
  const map: Record<number, string> = {
    1: `M ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r}`,
    2: `M ${x} ${y + r} A ${r} ${r} 0 0 0 ${x - r} ${y}`,
    3: `M ${x - r} ${y} A ${r} ${r} 0 0 0 ${x} ${y - r}`,
    4: `M ${x} ${y - r} A ${r} ${r} 0 0 0 ${x + r} ${y}`,
  }
  return <path d={map[idx]} />
}
