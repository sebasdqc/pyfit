// Geometría y constantes de la pizarra táctica (Simulador). Funciones PURAS
// (sin React) para poder razonarlas/testearlas aisladas.
//
// REGLA: las coordenadas del dominio (fichas, puntos de trazo) son SIEMPRE
// normalizadas (x, y ∈ [0,1]) relativas al campo. Aquí se convierten a unidades
// del viewBox del SVG (px lógicos) solo para pintar, y de vuelta a normalizadas
// al leer eventos de puntero. Así una jugada se ve igual en cualquier pantalla.

import type { Pt, TrazoTipo } from '@/types'

// viewBox del campo (proporción real ~105:68). El área jugable va con un margen
// (la franja exterior verde) para que las fichas no toquen el borde del SVG.
export const VB_W = 1050
export const VB_H = 680
export const MARGIN = 32
export const PLAY_W = VB_W - 2 * MARGIN
export const PLAY_H = VB_H - 2 * MARGIN

// Tamaños (en unidades de viewBox)
export const R_PLAYER = 24
export const R_BALL = 13
export const STROKE_W = 5
export const HIT_W = 26 // ancho del área "clicable" invisible de un trazo

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

// Normalizado (0..1) → px del viewBox (dentro del área jugable).
export function toPx(p: Pt): { x: number; y: number } {
  return { x: MARGIN + p.x * PLAY_W, y: MARGIN + p.y * PLAY_H }
}

// Evento de puntero (clientX/Y) + rect del SVG → punto normalizado y acotado.
// Asume que el contenedor respeta la proporción del viewBox (sin letterboxing),
// de modo que el mapeo rect→viewBox es lineal y exacto.
export function toNorm(clientX: number, clientY: number, rect: DOMRect): Pt {
  const vx = ((clientX - rect.left) / rect.width) * VB_W
  const vy = ((clientY - rect.top) / rect.height) * VB_H
  return { x: clamp01((vx - MARGIN) / PLAY_W), y: clamp01((vy - MARGIN) / PLAY_H) }
}

export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y)

// Estilo visual de cada tipo de trazo. El estilo de línea ya los distingue
// (flecha / ondulada / punteada+flecha / barra perpendicular); el color refuerza.
export const TRAZO_STYLES: Record<
  TrazoTipo,
  { label: string; color: string; dash?: string; wavy?: boolean; arrow?: boolean; block?: boolean }
> = {
  pase: { label: 'Pase', color: '#e8efff', arrow: true },
  conduccion: { label: 'Conducción', color: '#6ce5ff', wavy: true, arrow: true },
  mov_sin_balon: { label: 'Mov. sin balón', color: '#ffaa32', dash: '15 13', arrow: true },
  bloqueo: { label: 'Bloqueo', color: '#ff6b6b', block: true },
}

export const TRAZO_ORDER: TrazoTipo[] = ['pase', 'conduccion', 'mov_sin_balon', 'bloqueo']

// Path recto (en px) para pase / mov. sin balón / bloqueo.
export function linePath(a: Pt, b: Pt): string {
  const A = toPx(a)
  const B = toPx(b)
  return `M ${A.x.toFixed(1)} ${A.y.toFixed(1)} L ${B.x.toFixed(1)} ${B.y.toFixed(1)}`
}

// Path ondulado (en px) para conducción: onda senoidal a lo largo del segmento.
export function wavyPath(a: Pt, b: Pt): string {
  const A = toPx(a)
  const B = toPx(b)
  const dx = B.x - A.x
  const dy = B.y - A.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const nx = -uy // normal unitaria
  const ny = ux
  const amp = 9
  const halfWaves = Math.max(2, Math.round(len / 34)) // nº de medias ondas
  const samples = Math.max(16, halfWaves * 6)
  let d = `M ${A.x.toFixed(1)} ${A.y.toFixed(1)}`
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const along = t * len
    const off = amp * Math.sin(t * Math.PI * halfWaves)
    const px = A.x + ux * along + nx * off
    const py = A.y + uy * along + ny * off
    d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`
  }
  return d
}

// Triángulo de la punta de flecha (en px), orientado de a→b, vértice en b.
export function arrowHead(a: Pt, b: Pt, size = 20): string {
  const A = toPx(a)
  const B = toPx(b)
  const ang = Math.atan2(B.y - A.y, B.x - A.x)
  const a1 = ang + Math.PI - 0.42
  const a2 = ang + Math.PI + 0.42
  const x1 = (B.x + size * Math.cos(a1)).toFixed(1)
  const y1 = (B.y + size * Math.sin(a1)).toFixed(1)
  const x2 = (B.x + size * Math.cos(a2)).toFixed(1)
  const y2 = (B.y + size * Math.sin(a2)).toFixed(1)
  return `${B.x.toFixed(1)},${B.y.toFixed(1)} ${x1},${y1} ${x2},${y2}`
}

// Barra perpendicular al final del trazo (símbolo de bloqueo), en px.
export function blockCap(a: Pt, b: Pt, half = 17): { x1: number; y1: number; x2: number; y2: number } {
  const A = toPx(a)
  const B = toPx(b)
  const ang = Math.atan2(B.y - A.y, B.x - A.x) + Math.PI / 2
  const nx = Math.cos(ang)
  const ny = Math.sin(ang)
  return { x1: B.x + nx * half, y1: B.y + ny * half, x2: B.x - nx * half, y2: B.y - ny * half }
}

// Punto medio (normalizado) de un trazo, para anclar el botón de borrado.
export function midPoint(puntos: Pt[]): Pt {
  if (puntos.length === 0) return { x: 0.5, y: 0.5 }
  const a = puntos[0]
  const b = puntos[puntos.length - 1]
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

let _seq = 0
// Id corto y único para fichas/trazos del cliente.
export function newId(prefix = 'el'): string {
  _seq += 1
  const rnd = Math.random().toString(36).slice(2, 7)
  return `${prefix}_${_seq.toString(36)}${rnd}`
}
