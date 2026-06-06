// Miniatura del estilo de un trazo (flecha / ondulada / punteada+flecha / barra
// perpendicular). Se usa en los botones de herramienta y en la leyenda. Es un
// SVG autónomo de tamaño fijo (no usa el viewBox del campo).

import type { TrazoTipo } from '@/types'
import { TRAZO_STYLES } from '@/lib/simulador'

const W = 30
const H = 14
const Y = 7
const X0 = 2
const X1 = 22

export function StrokePreview({ tipo }: { tipo: TrazoTipo }) {
  const st = TRAZO_STYLES[tipo]
  const arrow = `${X1 + 6},${Y} ${X1},${Y - 4} ${X1},${Y + 4}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      {tipo === 'conduccion' ? (
        <path d={wavyMini()} fill="none" stroke={st.color} strokeWidth={2} strokeLinecap="round" />
      ) : (
        <line
          x1={X0}
          y1={Y}
          x2={X1}
          y2={Y}
          stroke={st.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={st.dash ? '4 3' : undefined}
        />
      )}
      {st.arrow && <polygon points={arrow} fill={st.color} />}
      {st.block && <line x1={X1} y1={Y - 5} x2={X1} y2={Y + 5} stroke={st.color} strokeWidth={2.4} strokeLinecap="round" />}
    </svg>
  )
}

function wavyMini(): string {
  const len = X1 - X0
  const amp = 2.6
  const halfWaves = 4
  const samples = 18
  let d = `M ${X0} ${Y}`
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const px = X0 + t * len
    const py = Y + amp * Math.sin(t * Math.PI * halfWaves)
    d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`
  }
  return d
}
