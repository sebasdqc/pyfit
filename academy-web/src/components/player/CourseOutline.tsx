// Temario lateral del reproductor: módulos → lecciones, con ícono por tipo,
// duración, marca de completada y resaltado de la lección actual. Click navega.

import { Icon, type IconName } from '@/components/Icon'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { CourseDetail, LessonTipo } from '@/types'

const LESSON_ICON: Record<LessonTipo, IconName> = {
  video: 'play',
  texto: 'doc',
  quiz: 'quiz',
}

export function CourseOutline({
  course,
  completed,
  currentLessonId,
  progreso,
  onSelect,
}: {
  course: CourseDetail
  completed: Set<number>
  currentLessonId: number | null
  progreso: number
  onSelect: (lessonId: number) => void
}) {
  const totalLecciones = course.modulos.reduce((n, m) => n + m.lecciones.length, 0)
  const hechas = completed.size

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-surface-border p-5">
        <p className="za-eyebrow">Contenido del curso</p>
        <h2 className="mt-1.5 line-clamp-2 text-sm font-semibold text-ink">{course.titulo}</h2>
        <div className="mt-3">
          <ProgressBar value={progreso} />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          {hechas} de {totalLecciones} lecciones completadas
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {course.modulos.map((m, mi) => (
          <div key={m.id} className="mb-4">
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {mi + 1}. {m.titulo}
            </p>
            <ul className="flex flex-col gap-0.5">
              {m.lecciones.map((l) => {
                const done = completed.has(l.id)
                const active = l.id === currentLessonId
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(l.id)}
                      aria-current={active ? 'true' : undefined}
                      className={[
                        'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        active ? 'bg-accent/10 text-brand' : 'text-ink-soft hover:bg-surface-soft',
                      ].join(' ')}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                      )}
                      {/* Estado de completado */}
                      <span
                        className={[
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          done ? 'border-ok bg-ok text-white' : 'border-surface-border text-ink-muted',
                        ].join(' ')}
                      >
                        {done ? <Icon name="check" size={12} /> : <Icon name={LESSON_ICON[l.tipo]} size={11} />}
                        <span className="sr-only">{done ? 'Completada' : 'No completada'}.</span>
                      </span>
                      <span className={`flex-1 line-clamp-2 ${active ? 'font-medium' : ''}`}>{l.titulo}</span>
                      {l.duracion_min > 0 && (
                        <span className="shrink-0 text-[11px] text-ink-muted">{l.duracion_min}m</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}
