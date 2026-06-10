// Tarjeta de curso para el catálogo y el área de instructor. Si el curso no tiene
// portada, se usa un placeholder con gradiente navy + emblema (referencial; en
// próximas iteraciones se cargarán portadas reales).

import { Link } from 'react-router-dom'
import { Emblem } from '@/components/Emblem'
import { Icon } from '@/components/Icon'
import { Badge } from './Badge'
import { DISCIPLINA_LABEL, LICENCIA_LABEL, NIVEL_LABEL } from '@/lib/constants'
import type { Course } from '@/types'

export function CourseCard({ course, to }: { course: Course; to: string }) {
  const hasPortada = Boolean(course.portada)
  return (
    <Link
      to={to}
      className="group za-card overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
    >
      {/* Portada */}
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-brand to-brand-deep">
        {hasPortada ? (
          <img
            src={course.portada}
            alt={`Portada del curso ${course.titulo}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="opacity-25 transition-opacity group-hover:opacity-40">
              <Emblem size={64} tone="dark" />
            </div>
          </div>
        )}
        {!course.publicado && (
          <span className="absolute left-3 top-3 rounded-full bg-warn px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Borrador
          </span>
        )}
        {course.licencia && (
          <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            {LICENCIA_LABEL[course.licencia] ?? `Licencia ${course.licencia}`}
          </span>
        )}
      </div>

      {/* Cuerpo */}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {course.disciplina && course.disciplina !== 'general' && (
            <Badge tone="brand">{DISCIPLINA_LABEL[course.disciplina] ?? course.disciplina}</Badge>
          )}
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
