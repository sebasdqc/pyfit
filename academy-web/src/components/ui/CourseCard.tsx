// Tarjeta de curso para el catálogo y el área de instructor. Si el curso tiene
// `portada` se muestra la imagen; si no, se genera una portada temática con el
// color y el motivo de su escuela (schoolTheme), en vez de un placeholder genérico.

import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { Badge } from './Badge'
import { NIVEL_LABEL } from '@/lib/constants'
import { schoolTheme, schoolGradient } from '@/lib/schoolTheme'
import type { Course } from '@/types'

export function CourseCard({ course, to }: { course: Course; to: string }) {
  const hasPortada = Boolean(course.portada)
  const theme = schoolTheme(course.escuela_slug)
  return (
    <Link
      to={to}
      className="group za-card overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
    >
      {/* Portada */}
      <div className="relative h-36 overflow-hidden" style={hasPortada ? undefined : { backgroundImage: schoolGradient(theme) }}>
        {hasPortada ? (
          <img
            src={course.portada}
            alt={`Portada del curso ${course.titulo}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            {/* Motivo temático de la escuela: ícono grande, muy tenue. */}
            <div className="pointer-events-none absolute -right-5 -top-5 text-white/10 transition-transform duration-300 group-hover:scale-110">
              <Icon name={theme.icon} size={150} strokeWidth={1.2} />
            </div>
            <div className="relative flex h-full flex-col justify-between p-4">
              {course.escuela_nombre && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  {course.escuela_nombre}
                </span>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
                <Icon name={theme.icon} size={18} />
              </span>
            </div>
          </>
        )}
        {!course.publicado && (
          <span className="absolute right-3 top-3 rounded-full bg-warn px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Borrador
          </span>
        )}
      </div>

      {/* Cuerpo */}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {course.categoria && <Badge tone="accent">{course.categoria}</Badge>}
          <Badge tone="neutral">{NIVEL_LABEL[course.nivel] ?? course.nivel}</Badge>
        </div>

        <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
          {course.titulo}
        </h3>
        {course.resumen && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{course.resumen}</p>}

        <p className="mt-3 text-xs text-ink-muted">Por {course.instructor_nombre || 'Instructor'}</p>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 border-t border-surface-border pt-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="layers" size={14} /> {course.total_modulos} mód.
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="doc" size={14} /> {course.total_lecciones} lec.
          </span>
          {course.carga_horaria_h > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={14} /> {course.carga_horaria_h} h
            </span>
          ) : (
            course.duracion_estimada_min > 0 && (
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size={14} /> {course.duracion_estimada_min} min
              </span>
            )
          )}
        </div>
      </div>
    </Link>
  )
}
