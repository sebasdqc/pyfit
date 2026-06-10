// Check-list de Competencias (Programa Evolución 360°): los hitos del curso con
// su insignia (Aplicador / Analista / Estratega…) y el hito final, el Certificado
// Digital. Las insignias las otorga SIEMPRE el servidor al aprobarse el hito;
// aquí solo se visualiza el estado y se navega a la lección de cada hito.

import { Icon } from '@/components/Icon'
import type { CourseBadge } from '@/types'

export function CompetencyChecklist({
  insignias,
  earned,
  certEmitido,
  onGoToLesson,
}: {
  insignias: CourseBadge[]
  earned: Set<number>
  certEmitido: boolean
  onGoToLesson?: (lessonId: number) => void
}) {
  if (insignias.length === 0) return null
  const ordenadas = [...insignias].sort((a, b) => a.orden - b.orden)

  return (
    <section aria-label="Check-list de competencias" className="border-b border-surface-border p-5">
      <p className="za-eyebrow">Check-list de competencias</p>
      <ul className="mt-3 flex flex-col gap-2">
        {ordenadas.map((b) => {
          const ganada = earned.has(b.id)
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={onGoToLesson ? () => onGoToLesson(b.lesson) : undefined}
                disabled={!onGoToLesson}
                title={b.descripcion || undefined}
                className={[
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  onGoToLesson ? 'hover:bg-surface-soft' : '',
                  ganada ? 'text-ink' : 'text-ink-muted',
                ].join(' ')}
              >
                <span aria-hidden className={`text-base leading-none ${ganada ? '' : 'opacity-40 grayscale'}`}>
                  {b.icono || '🏅'}
                </span>
                <span className={`flex-1 ${ganada ? 'font-medium' : ''}`}>{b.nombre}</span>
                {ganada ? (
                  <>
                    <Icon name="check" size={14} className="shrink-0 text-ok" />
                    <span className="sr-only">Obtenida.</span>
                  </>
                ) : (
                  <span className="sr-only">Pendiente.</span>
                )}
              </button>
            </li>
          )
        })}
        <li
          className={`flex items-center gap-2.5 px-2 py-1.5 text-sm ${certEmitido ? 'text-ink' : 'text-ink-muted'}`}
        >
          <span aria-hidden className={`text-base leading-none ${certEmitido ? '' : 'opacity-40 grayscale'}`}>
            🎓
          </span>
          <span className={`flex-1 ${certEmitido ? 'font-medium' : ''}`}>Certificado Digital</span>
          {certEmitido ? (
            <>
              <Icon name="check" size={14} className="shrink-0 text-ok" />
              <span className="sr-only">Emitido.</span>
            </>
          ) : (
            <span className="sr-only">Pendiente.</span>
          )}
        </li>
      </ul>
    </section>
  )
}
