// Tablero SVG de la pizarra táctica: cancha responsiva, fichas arrastrables
// (mouse y touch vía Pointer Events) y trazos (pase/conducción/mov. sin balón/
// bloqueo). Todo opera en coordenadas NORMALIZADAS (0..1); la conversión a px
// del viewBox vive en lib/simulador. El estado (fichas/trazos) lo posee la
// página; aquí solo se gestionan las interacciones transitorias (drag/dibujo).

import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Ficha, Pt, Trazo, TrazoTipo } from '@/types'
import {
  R_BALL, R_PLAYER, STROKE_W, HIT_W, VB_H, VB_W,
  TRAZO_ORDER, TRAZO_STYLES, arrowHead, blockCap, dist, linePath, midPoint,
  toNorm, toPx, wavyPath,
} from '@/lib/simulador'
import { PitchMarkings } from './PitchMarkings'

export type Tool = 'mover' | 'borrar' | TrazoTipo

export interface AthleteLite {
  nombre: string
  foto?: string
  dorsal?: number | string
}

const GREEN = '#32c896'
const RED = '#ff4444'
const ACCENT = '#4f8cff'
const TOKEN_FILL = '#0f1525'
const MIN_TRAZO = 0.03 // longitud mínima (normalizada) para crear un trazo

const isStroke = (t: Tool): t is TrazoTipo => (TRAZO_ORDER as string[]).includes(t)

export function TacticalBoard({
  fichas,
  trazos,
  tool,
  selectedId,
  getAthlete,
  onFichaMove,
  onSelect,
  onErase,
  onTrazoCommit,
  onDragStart,
  frozen = false,
}: {
  fichas: Ficha[]
  trazos: Trazo[]
  tool: Tool
  selectedId: string | null
  getAthlete: (ref: Ficha['ref']) => AthleteLite | undefined
  onFichaMove: (id: string, x: number, y: number) => void
  onSelect: (id: string | null) => void
  onErase: (id: string) => void
  onTrazoCommit: (tipo: TrazoTipo, puntos: Pt[]) => void
  onDragStart?: () => void
  frozen?: boolean // durante la reproducción: sin interacción (solo se muestran las fichas animadas)
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drawing, setDrawing] = useState<{ tipo: TrazoTipo; start: Pt; end: Pt } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  function ptOf(e: ReactPointerEvent): Pt {
    const rect = svgRef.current!.getBoundingClientRect()
    return toNorm(e.clientX, e.clientY, rect)
  }

  function start(e: ReactPointerEvent, fichaId?: string) {
    if (frozen) return // reproducción en curso: tablero de solo lectura
    const pt = ptOf(e)
    svgRef.current?.setPointerCapture(e.pointerId)
    if (isStroke(tool)) {
      setDrawing({ tipo: tool, start: pt, end: pt })
      return
    }
    if (tool === 'borrar') {
      if (fichaId) onErase(fichaId)
      return
    }
    // mover
    if (fichaId) {
      onDragStart?.()
      setDragId(fichaId)
      onSelect(fichaId)
    } else {
      onSelect(null)
    }
  }

  function move(e: ReactPointerEvent) {
    if (!dragId && !drawing) return
    const pt = ptOf(e)
    if (dragId) onFichaMove(dragId, pt.x, pt.y)
    else if (drawing) setDrawing((d) => (d ? { ...d, end: pt } : d))
  }

  function end(e: ReactPointerEvent) {
    svgRef.current?.releasePointerCapture(e.pointerId)
    if (dragId) setDragId(null)
    if (drawing) {
      if (dist(drawing.start, drawing.end) >= MIN_TRAZO) {
        onTrazoCommit(drawing.tipo, [drawing.start, drawing.end])
      }
      setDrawing(null)
    }
  }

  const cursor = frozen ? 'default' : isStroke(tool) ? 'crosshair' : tool === 'borrar' ? 'pointer' : 'default'

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-perf-border bg-perf-surface">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="block w-full select-none"
        style={{ aspectRatio: `${VB_W} / ${VB_H}`, touchAction: 'none', cursor }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <defs>
          <filter id="tokShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>

        <PitchMarkings />

        {/* Capa de captura para el fondo (dibujar / deseleccionar) */}
        <rect
          x={0}
          y={0}
          width={VB_W}
          height={VB_H}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
          onPointerDown={(e) => start(e)}
        />

        {/* Trazos guardados */}
        {trazos.map((t) => (
          <TrazoNode
            key={t.id}
            trazo={t}
            selected={t.id === selectedId}
            tool={tool}
            onErase={onErase}
            onSelect={onSelect}
          />
        ))}

        {/* Vista previa del trazo en curso */}
        {drawing && <TrazoShape tipo={drawing.tipo} a={drawing.start} b={drawing.end} preview />}

        {/* Fichas */}
        {fichas.map((f) => (
          <FichaNode
            key={f.id}
            ficha={f}
            athlete={f.tipo === 'jugador' ? getAthlete(f.ref) : undefined}
            selected={f.id === selectedId}
            tool={tool}
            onPointerDown={(e) => {
              e.stopPropagation()
              start(e, f.id)
            }}
            onErase={onErase}
          />
        ))}
      </svg>
    </div>
  )
}

// ── Trazo (forma + área clicable + botón de borrado) ─────────────────────────
function TrazoNode({
  trazo,
  selected,
  tool,
  onErase,
  onSelect,
}: {
  trazo: Trazo
  selected: boolean
  tool: Tool
  onErase: (id: string) => void
  onSelect: (id: string | null) => void
}) {
  const a = trazo.puntos[0]
  const b = trazo.puntos[trazo.puntos.length - 1]
  const mid = toPx(midPoint(trazo.puntos))

  function onDown(e: ReactPointerEvent) {
    if (isStroke(tool)) return // deja que el fondo inicie un dibujo nuevo
    e.stopPropagation()
    if (tool === 'borrar') onErase(trazo.id)
    else onSelect(trazo.id)
  }

  return (
    <g>
      <TrazoShape tipo={trazo.tipo} a={a} b={b} highlight={selected} />
      {/* Área invisible y ancha para facilitar selección/touch */}
      <path
        d={trazo.tipo === 'conduccion' ? wavyPath(a, b) : linePath(a, b)}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_W}
        style={{ pointerEvents: 'stroke', cursor: tool === 'borrar' ? 'pointer' : 'default' }}
        onPointerDown={onDown}
      />
      {selected && tool === 'mover' && (
        <DeleteButton cx={mid.x} cy={mid.y} onErase={() => onErase(trazo.id)} />
      )}
    </g>
  )
}

// Dibuja la forma del trazo según su tipo (sin interacción).
function TrazoShape({
  tipo,
  a,
  b,
  preview = false,
  highlight = false,
}: {
  tipo: TrazoTipo
  a: Pt
  b: Pt
  preview?: boolean
  highlight?: boolean
}) {
  const st = TRAZO_STYLES[tipo]
  const w = STROKE_W + (highlight ? 2 : 0)
  const opacity = preview ? 0.6 : 1
  return (
    <g opacity={opacity} style={{ pointerEvents: 'none' }}>
      {highlight && (
        <path
          d={tipo === 'conduccion' ? wavyPath(a, b) : linePath(a, b)}
          fill="none"
          stroke={ACCENT}
          strokeWidth={w + 7}
          strokeOpacity={0.35}
          strokeLinecap="round"
        />
      )}
      <path
        d={tipo === 'conduccion' ? wavyPath(a, b) : linePath(a, b)}
        fill="none"
        stroke={st.color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray={st.dash}
      />
      {st.arrow && <polygon points={arrowHead(a, b)} fill={st.color} />}
      {st.block && <Bar a={a} b={b} color={st.color} w={w} />}
    </g>
  )
}

function Bar({ a, b, color, w }: { a: Pt; b: Pt; color: string; w: number }) {
  const c = blockCap(a, b)
  return <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={color} strokeWidth={w + 1} strokeLinecap="round" />
}

// ── Ficha (jugador / rival / balón) ──────────────────────────────────────────
function FichaNode({
  ficha,
  athlete,
  selected,
  tool,
  onPointerDown,
  onErase,
}: {
  ficha: Ficha
  athlete?: AthleteLite
  selected: boolean
  tool: Tool
  onPointerDown: (e: ReactPointerEvent) => void
  onErase: (id: string) => void
}) {
  const { x, y } = toPx(ficha)
  const isBall = ficha.tipo === 'balon'
  const r = isBall ? R_BALL : R_PLAYER
  const ring = ficha.tipo === 'rival' ? RED : GREEN
  const clipId = `clip-${ficha.id}`
  const label = ficha.etiqueta || (athlete?.dorsal != null ? String(athlete.dorsal) : '')
  const nombre = athlete?.nombre ? firstName(athlete.nombre) : ficha.tipo === 'rival' ? 'Rival' : ''
  const grab = tool === 'mover' ? 'grab' : tool === 'borrar' ? 'pointer' : 'crosshair'

  return (
    <g transform={`translate(${x} ${y})`} style={{ cursor: grab }} onPointerDown={onPointerDown}>
      {selected && tool === 'mover' && (
        <circle r={r + 7} fill="none" stroke={ACCENT} strokeWidth={3} strokeDasharray="6 6" />
      )}

      {isBall ? (
        <g filter="url(#tokShadow)">
          <circle r={r} fill="#f4f7ff" stroke="#0a0e1a" strokeWidth={3} />
          <circle r={r * 0.42} fill="none" stroke="#0a0e1a" strokeWidth={2} opacity={0.5} />
        </g>
      ) : (
        <g filter="url(#tokShadow)">
          {athlete?.foto ? (
            <>
              <clipPath id={clipId}>
                <circle r={r} />
              </clipPath>
              <image
                href={athlete.foto}
                x={-r}
                y={-r}
                width={r * 2}
                height={r * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
              />
              <circle r={r} fill="none" stroke={ring} strokeWidth={4} />
              {label && (
                <g>
                  <circle cx={r * 0.66} cy={r * 0.66} r={11} fill="#0a0e1a" stroke={ring} strokeWidth={1.5} />
                  <text x={r * 0.66} y={r * 0.66} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill="#fff">
                    {label}
                  </text>
                </g>
              )}
            </>
          ) : (
            <>
              <circle r={r} fill={TOKEN_FILL} stroke={ring} strokeWidth={4} />
              <text textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill="#fff">
                {label}
              </text>
            </>
          )}
        </g>
      )}

      {nombre && (
        <text
          y={r + 19}
          textAnchor="middle"
          fontSize={18}
          fontWeight={600}
          fill="rgba(255,255,255,0.85)"
          stroke="#0a0e1a"
          strokeWidth={4}
          style={{ paintOrder: 'stroke', pointerEvents: 'none' }}
        >
          {nombre}
        </text>
      )}

      {selected && tool === 'mover' && (
        <DeleteButton cx={r * 0.95} cy={-r * 0.95} onErase={() => onErase(ficha.id)} />
      )}
    </g>
  )
}

// Botón circular de borrado (×). En coordenadas locales del grupo que lo monta.
function DeleteButton({ cx, cy, onErase }: { cx: number; cy: number; onErase: () => void }) {
  return (
    <g
      transform={`translate(${cx} ${cy})`}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        e.stopPropagation()
        onErase()
      }}
    >
      <circle r={13} fill={RED} stroke="#0a0e1a" strokeWidth={2} />
      <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
    </g>
  )
}

function firstName(n: string): string {
  return n.trim().split(/\s+/)[0] ?? n
}
