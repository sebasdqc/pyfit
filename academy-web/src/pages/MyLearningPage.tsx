// Mis matrículas. Consume GET /api/academy/enrollments/. Muestra cada curso con
// su progreso y estado, y enlaza al detalle del curso.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyEnrollments } from '@/api/academy'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Emblem } from '@/components/Emblem'
import { Icon } from '@/components/Icon'
import type { Enrollment } from '@/types'

export function MyLearningPage() {
  const [items, setItems] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    listMyEnrollments()
      .then((d) => active && setItems(d))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="za-eyebrow">Mi aprendizaje</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Continúa donde lo dejaste</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={40} />
        </div>
      ) : error ? (
        <EmptyState icon="learning" title="No se pudo cargar tu progreso" />
      ) : items.length === 0 ? (
        <EmptyState
          icon="learning"
          title="Todavía no te has inscrito a ningún curso"
          description="Explora el catálogo y empieza tu primera formación."
          action={
            <Link
              to="/catalogo"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              Ir al catálogo <Icon name="arrowRight" size={16} />
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((e) => (
            <Link
              key={e.id}
              to={`/cursos/${e.course}`}
              className="group za-card flex gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
            >
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-deep">
                <Emblem size={36} tone="dark" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 text-[15px] font-semibold text-ink group-hover:text-accent">
                    {e.curso_titulo}
                  </h3>
                  <Badge tone={e.estado === 'completada' ? 'ok' : 'accent'}>
                    {e.estado === 'completada' ? 'Completado' : 'En curso'}
                  </Badge>
                </div>
                <div className="mt-4">
                  <ProgressBar value={e.progreso} />
                </div>
                {e.certificado && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ok">
                    <Icon name="certificate" size={14} /> Certificado {e.certificado}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
