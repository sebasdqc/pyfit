// Mis matrículas. Consume GET /api/academy/enrollments/. Muestra SOLO las
// matrículas activas (en curso) en un carrusel horizontal — antes se listaban
// TODAS las matrículas (incluidas completadas) en una grilla vertical, lo que
// obligaba a mucho scroll con varios cursos. Las completadas ya viven en
// /certificados, con su certificado.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyEnrollments } from '@/api/academy'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/Icon'
import { StreakCard } from '@/components/StreakCard'
import { useStreak } from '@/lib/useStreak'
import { useT } from '@/locale/useT'
import type { Enrollment } from '@/types'

export function MyLearningPage() {
  const t = useT()
  const [items, setItems] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { streak } = useStreak()

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

  const activos = items.filter((e) => e.estado === 'activa')

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="za-eyebrow">{t('myLearning.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{t('myLearning.title')}</h1>
      </header>

      <StreakCard streak={streak} />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={40} />
        </div>
      ) : error ? (
        <EmptyState
          icon="learning"
          title={t('myLearning.loadError')}
          description={t('myLearning.loadErrorBody')}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="learning"
          title={t('myLearning.noEnrollmentsTitle')}
          description={t('myLearning.noEnrollmentsBody')}
          action={
            <Link
              to="/catalogo"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              {t('myLearning.goToCatalog')} <Icon name="arrowRight" size={16} />
            </Link>
          }
        />
      ) : activos.length === 0 ? (
        <EmptyState
          icon="certificate"
          title={t('myLearning.allCompletedTitle')}
          description={t('myLearning.allCompletedBody')}
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/catalogo"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
              >
                {t('myLearning.goToCatalog')} <Icon name="arrowRight" size={16} />
              </Link>
              <Link
                to="/certificados"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border px-5 text-sm font-medium text-ink-soft hover:bg-surface-soft hover:text-ink"
              >
                {t('myLearning.goToCertificates')}
              </Link>
            </div>
          }
        />
      ) : (
        <div>
          <p className="za-eyebrow">{t('myLearning.activeCoursesLabel')}</p>
          <div className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {activos.map((e) => (
              <Link
                key={e.id}
                to={`/aprender/${e.id}`}
                className="group za-card flex w-72 shrink-0 snap-start flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand to-brand-deep">
                  {e.curso_portada ? (
                    <img src={e.curso_portada} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="learning" size={26} className="text-white" />
                  )}
                </div>
                <h3 className="line-clamp-2 text-[15px] font-semibold text-ink group-hover:text-accent">
                  {e.curso_titulo}
                </h3>
                <ProgressBar value={e.progreso} label={t('myLearning.progressOfCourse', { course: e.curso_titulo })} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
