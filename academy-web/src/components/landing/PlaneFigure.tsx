// Figura de planos — el componente firma de la landing pública de Academy.
//
// Mundo "Retrato de Planos" (Ikko Tanaka): una figura reconstruida con pocos
// planos geométricos llenos, sin contornos. Acá cada plano corresponde a una de
// las 7 escuelas de especialización, así que la tesis de la página —un
// profesional se compone por planos— queda DEMOSTRADA y no afirmada: al enfocar
// una escuela se enciende su plano, y en "Cómo funciona" la figura se arma paso
// a paso hasta el certificado.
//
// La figura completa es el estado de reposo: sin JS y con `prefers-reduced-
// motion` ya se ve entera. La animación de entrada solo la reordena.

const INK = '#14110f'
const PAPER = '#f2e8d5'
const VERMILION = '#cc1f36'
const INDIGO = '#1e3a8a'
const GOLD = '#c8a24b'

export type PlaneShape = 'disc' | 'arch' | 'halfdisc' | 'column' | 'dome' | 'bar' | 'strip'

interface Plane {
  id: string
  /** Escuela a la que pertenece el plano; `null` = plano estructural (la persona). */
  slug: string | null
  fill: string
  shape: PlaneShape
  el: React.ReactNode
}

/* Geometría sobre un lienzo de 480 × 660. El orden del arreglo es a la vez el
   orden de apilado y el orden en que la figura se arma en los 3 pasos. */
const PLANES: Plane[] = [
  {
    id: 'halo',
    slug: 'recuperacion-prevencion-y-wellness',
    fill: INDIGO,
    shape: 'disc',
    el: <circle cx={306} cy={210} r={176} />,
  },
  {
    id: 'head',
    slug: null,
    fill: PAPER,
    shape: 'arch',
    el: <path d="M158,412 L158,222 A96,96 0 0 1 350,222 L350,412 Z" />,
  },
  {
    id: 'mind',
    slug: 'psicologia-del-rendimiento',
    fill: INK,
    shape: 'arch',
    el: <path d="M158,412 L158,222 A96,96 0 0 1 254,126 L254,412 Z" />,
  },
  {
    id: 'eye',
    slug: 'analitica-y-rendimiento-deportivo',
    fill: VERMILION,
    shape: 'halfdisc',
    el: <path d="M262,238 A34,34 0 0 0 330,238 Z" />,
  },
  {
    id: 'channel',
    slug: 'fisiologia-y-nutricion-aplicada',
    fill: GOLD,
    shape: 'column',
    el: <rect x={254} y={412} width={76} height={92} />,
  },
  {
    id: 'trunk',
    slug: 'ciencia-del-entrenamiento',
    fill: VERMILION,
    shape: 'dome',
    el: <path d="M44,660 A238,168 0 0 1 464,660 Z" />,
  },
  {
    id: 'reach',
    slug: 'negocio-coaching-y-marca-profesional',
    fill: INDIGO,
    shape: 'bar',
    el: <rect x={356} y={498} width={78} height={162} />,
  },
  {
    id: 'ground',
    slug: 'poblaciones-especiales-y-salud-clinica',
    fill: GOLD,
    shape: 'strip',
    el: <rect x={0} y={616} width={480} height={44} />,
  },
]

/** Cuántos planos hay puestos al final de cada uno de los 3 pasos. */
export const STEP_REVEALS = [2, 5, PLANES.length]

/** Color y forma con que cada escuela se presenta en las listas de la página. */
export function planeOfSchool(slug: string | null | undefined): { fill: string; shape: PlaneShape } {
  const plane = PLANES.find((p) => p.slug === slug)
  return plane ? { fill: plane.fill, shape: plane.shape } : { fill: GOLD, shape: 'disc' }
}

export function PlaneFigure({
  label,
  activeSlug = null,
  revealCount,
  animateOnMount = false,
  /** `bleed` recorta para sangrar (hero); `whole` muestra la figura completa. */
  fit = 'whole',
  className,
}: {
  /** Nombre accesible de la figura (viene del diccionario, ya traducido). */
  label: string
  activeSlug?: string | null
  /** Cuántos planos mostrar; por defecto, todos. */
  revealCount?: number
  animateOnMount?: boolean
  fit?: 'bleed' | 'whole'
  className?: string
}) {
  const shown = revealCount ?? PLANES.length

  return (
    <svg
      viewBox="0 0 480 660"
      preserveAspectRatio={fit === 'bleed' ? 'xMidYMid slice' : 'xMidYMid meet'}
      role="img"
      aria-label={label}
      className={`zl-figure${animateOnMount ? ' zl-figure--enter' : ''}${className ? ` ${className}` : ''}`}
    >
      <rect x={0} y={0} width={480} height={660} fill={INK} />
      {PLANES.map((plane, i) => {
        const hidden = i >= shown
        // El plano de la cabeza es la persona: nunca se atenúa, es la constante
        // contra la que se leen los demás.
        const dimmed = Boolean(activeSlug) && plane.slug !== activeSlug && plane.slug !== null
        return (
          <g
            key={plane.id}
            fill={plane.fill}
            style={{ ['--zl-i' as string]: i }}
            className={`zl-plane${hidden ? ' zl-plane--hidden' : ''}${dimmed ? ' zl-plane--dim' : ''}`}
          >
            {plane.el}
          </g>
        )
      })}
    </svg>
  )
}

/** La misma forma del plano, en miniatura, para marcar una escuela o una
    prestación en las listas. Decorativa: el texto de al lado ya la nombra. */
export function PlaneMark({
  shape,
  fill,
  className,
}: {
  shape: PlaneShape
  fill: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
      {shape === 'disc' && <circle cx={24} cy={24} r={22} fill={fill} />}
      {shape === 'arch' && <path d="M2,46 L2,24 A22,22 0 0 1 46,24 L46,46 Z" fill={fill} />}
      {shape === 'halfdisc' && <path d="M2,17 A22,22 0 0 0 46,17 Z" fill={fill} />}
      {shape === 'column' && <rect x={15} y={2} width={18} height={44} fill={fill} />}
      {shape === 'dome' && <path d="M1,46 A23,23 0 0 1 47,46 Z" fill={fill} />}
      {shape === 'bar' && <rect x={2} y={14} width={44} height={20} fill={fill} />}
      {shape === 'strip' && <rect x={2} y={30} width={44} height={14} fill={fill} />}
    </svg>
  )
}
