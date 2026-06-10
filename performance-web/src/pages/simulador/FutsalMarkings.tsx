// Cancha de FUTSAL dibujada en SVG, alternativa al campo de fútbol 11. Reglamento
// FIFA Futsal aproximado (40×20 m): superficie indoor de dos medios, áreas en "D"
// formadas por cuartos de círculo de 6 m centrados en cada poste, doble punto de
// penal (6 m y 10 m), círculo central de 3 m, porterías de 3 m y marcas de zona de
// cambio en la banda. Como el resto del tablero opera en coordenadas normalizadas
// (0..1), la cancha llena la MISMA área jugable que el campo de fútbol: las medidas
// en metros se escalan por separado en x/y (de ahí los arcos elípticos), de modo
// que las fichas y la animación funcionan igual en ambas canchas.
// Puramente decorativa (pointer-events: none).

import { MARGIN, PLAY_H, PLAY_W, VB_H, VB_W } from '@/lib/simulador'

const BASE = '#0a2230' // contorno (fuera de la cancha)
const HALF_A = '#103a4a' // medio izquierdo
const HALF_B = '#0d3140' // medio derecho
const LINE = 'rgba(255,255,255,0.5)'
const LW = 3

// Dimensiones reglamentarias del futsal (m) y escalas a px del área jugable.
const COURT_L = 40 // largo (m) → eje x
const COURT_W = 20 // ancho (m) → eje y
const sx = PLAY_W / COURT_L
const sy = PLAY_H / COURT_W

const leftX = MARGIN
const rightX = MARGIN + PLAY_W
const cy = MARGIN + PLAY_H / 2

// Metros (mx desde la línea de meta izquierda, my desde el centro a lo ancho) → px.
const PX = (mx: number, my: number) => ({ x: leftX + mx * sx, y: cy + my * sy })

const GOAL_HALF = 1.5 // medio ancho de portería (m) → portería de 3 m
const AREA_R = 6 // radio del cuarto de círculo del área (m)

export function FutsalMarkings() {
  const rx = AREA_R * sx
  const ry = AREA_R * sy
  const rCircleX = 3 * sx
  const rCircleY = 3 * sy
  const netDepth = 13

  // Área en "D" izquierda: arco (poste sup) → recta → arco (poste inf).
  const lA = PX(0, -(GOAL_HALF + AREA_R))
  const lB = PX(AREA_R, -GOAL_HALF)
  const lC = PX(AREA_R, GOAL_HALF)
  const lD = PX(0, GOAL_HALF + AREA_R)
  const leftArea = `M ${lA.x} ${lA.y} A ${rx} ${ry} 0 0 1 ${lB.x} ${lB.y} L ${lC.x} ${lC.y} A ${rx} ${ry} 0 0 1 ${lD.x} ${lD.y}`

  // Área derecha (espejo).
  const rA = PX(COURT_L, -(GOAL_HALF + AREA_R))
  const rB = PX(COURT_L - AREA_R, -GOAL_HALF)
  const rC = PX(COURT_L - AREA_R, GOAL_HALF)
  const rD = PX(COURT_L, GOAL_HALF + AREA_R)
  const rightArea = `M ${rA.x} ${rA.y} A ${rx} ${ry} 0 0 0 ${rB.x} ${rB.y} L ${rC.x} ${rC.y} A ${rx} ${ry} 0 0 0 ${rD.x} ${rD.y}`

  const center = PX(COURT_L / 2, 0)
  const goalTop = cy - GOAL_HALF * sy

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Superficie indoor: contorno + dos medios */}
      <rect x={0} y={0} width={VB_W} height={VB_H} fill={BASE} />
      <rect x={leftX} y={MARGIN} width={PLAY_W / 2} height={PLAY_H} fill={HALF_A} />
      <rect x={leftX + PLAY_W / 2} y={MARGIN} width={PLAY_W / 2} height={PLAY_H} fill={HALF_B} />

      <g fill="none" stroke={LINE} strokeWidth={LW}>
        {/* Perímetro */}
        <rect x={leftX} y={MARGIN} width={PLAY_W} height={PLAY_H} />

        {/* Línea de medio campo + círculo central (3 m) + punto central */}
        <line x1={center.x} y1={MARGIN} x2={center.x} y2={MARGIN + PLAY_H} />
        <ellipse cx={center.x} cy={cy} rx={rCircleX} ry={rCircleY} />
        <circle cx={center.x} cy={cy} r={3} fill={LINE} stroke="none" />

        {/* Áreas en "D" */}
        <path d={leftArea} />
        <path d={rightArea} />

        {/* Puntos de penal: 6 m y doble penal a 10 m, en ambos lados */}
        <circle {...spot(PX(6, 0))} />
        <circle {...spot(PX(10, 0))} />
        <circle {...spot(PX(COURT_L - 6, 0))} />
        <circle {...spot(PX(COURT_L - 10, 0))} />

        {/* Porterías (3 m) */}
        <rect x={leftX - netDepth} y={goalTop} width={netDepth} height={GOAL_HALF * 2 * sy} />
        <rect x={rightX} y={goalTop} width={netDepth} height={GOAL_HALF * 2 * sy} />

        {/* Arcos de esquina (25 cm, dibujados con un radio mínimo visible) */}
        {corner(leftX, MARGIN, 1)}
        {corner(rightX, MARGIN, 2)}
        {corner(rightX, MARGIN + PLAY_H, 3)}
        {corner(leftX, MARGIN + PLAY_H, 4)}

        {/* Marcas de zonas de cambio en la banda inferior (dos tramos de 5 m) */}
        {subTick(10)}
        {subTick(15)}
        {subTick(25)}
        {subTick(30)}
      </g>
    </g>
  )
}

// Punto (de penal/central) como círculo relleno pequeño.
function spot(p: { x: number; y: number }) {
  return { cx: p.x, cy: p.y, r: 3, fill: LINE, stroke: 'none' as const }
}

// Marca perpendicular de zona de cambio: tramo corto que sobresale de la banda
// inferior (las áreas frente a los banquillos donde se hacen los cambios).
function subTick(mx: number) {
  const top = PX(mx, COURT_W / 2)
  return <line key={mx} x1={top.x} y1={top.y} x2={top.x} y2={top.y + 9} />
}

// Cuarto de círculo en una esquina (idx: 1=TL, 2=TR, 3=BR, 4=BL).
function corner(x: number, y: number, idx: number) {
  const r = 9
  const map: Record<number, string> = {
    1: `M ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r}`,
    2: `M ${x} ${y + r} A ${r} ${r} 0 0 0 ${x - r} ${y}`,
    3: `M ${x - r} ${y} A ${r} ${r} 0 0 0 ${x} ${y - r}`,
    4: `M ${x} ${y - r} A ${r} ${r} 0 0 0 ${x + r} ${y}`,
  }
  return <path key={idx} d={map[idx]} />
}
