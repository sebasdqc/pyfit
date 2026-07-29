// Ficha de curso en la gramática del afiche — SOLO para la landing pública.
//
// No reemplaza a `ui/CourseCard`: esa sirve al catálogo autenticado y a
// /explorar, que siguen el sistema del producto (tarjeta redondeada con sombra).
// Acá los cantos son vivos, no hay sombra y la portada sin imagen se resuelve
// como una composición de planos con el color de la escuela, en vez de un
// degradado con un ícono gigante detrás.

import { Link } from 'react-router-dom'
import { useT } from '@/locale/useT'
import type { Course } from '@/types'
import { planeOfSchool } from './PlaneFigure'

const PAPER = '#f2e8d5'
const INK = '#14110f'

export function PosterCourseCard({ course, to, index = 0 }: { course: Course; to: string; index?: number }) {
  const t = useT()
  const plane = planeOfSchool(course.escuela_slug)
  // Tres composiciones × espejo = seis portadas distintas antes de repetir, para
  // que una grilla de dos filas no se lea como la misma fila calcada.
  const variant = index % 3
  const mirrored = Math.floor(index / 3) % 2 === 1

  return (
    <Link to={to} className="zl-course">
      <div className="zl-course-plate" style={{ background: plane.fill }}>
        {course.portada ? (
          <img src={course.portada} alt="" loading="lazy" />
        ) : (
          <svg
            viewBox="0 0 320 180"
            aria-hidden="true"
            focusable="false"
            style={{ display: 'block', width: '100%', height: '100%', transform: mirrored ? 'scaleX(-1)' : undefined }}
          >
            {variant === 0 && (
              <>
                <path d="M320,180 L320,60 A60,60 0 0 0 200,60 L200,180 Z" fill={PAPER} />
                <path d="M0,180 L0,110 L110,180 Z" fill={INK} />
                <circle cx={260} cy={92} r={26} fill={INK} />
              </>
            )}
            {variant === 1 && (
              <>
                <rect x={188} y={0} width={132} height={180} fill={INK} />
                <path d="M188,120 A66,66 0 0 0 320,120 Z" fill={PAPER} />
                <rect x={40} y={0} width={44} height={180} fill={PAPER} />
              </>
            )}
            {variant === 2 && (
              <>
                <circle cx={240} cy={90} r={90} fill={PAPER} />
                <path d="M240,0 L320,0 L320,180 L240,180 Z" fill={INK} />
                <rect x={0} y={140} width={320} height={40} fill={INK} />
              </>
            )}
          </svg>
        )}
      </div>

      <div className="zl-course-body">
        <div className="zl-course-meta">
          {course.escuela_nombre && <span>{course.escuela_nombre}</span>}
          <span>{t(`level.${course.nivel}`)}</span>
        </div>
        <h3 className="zl-course-title">{course.titulo}</h3>
        {course.resumen && <p className="zl-course-desc">{course.resumen}</p>}
      </div>
    </Link>
  )
}
