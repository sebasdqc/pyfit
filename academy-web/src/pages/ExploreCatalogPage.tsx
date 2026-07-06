// Catálogo público — onboarding sin registro. Un visitante sin cuenta entra
// aquí directo, sin ningún muro previo (ver academy.anon_views, backend).
// Versión simplificada de CatalogPage.tsx (sin agrupar por escuela: el
// endpoint anónimo devuelve el catálogo plano) para no arriesgar la lógica
// ya en producción de la vista autenticada.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublicCourses } from '@/api/academy'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import { CourseCard } from '@/components/ui/CourseCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { Emblem, BrandLockup } from '@/components/Emblem'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'
import type { Course } from '@/types'

export function ExploreCatalogPage() {
  const t = useT()
  const redirecting = useRedirectIfAuthenticated('/catalogo')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    let active = true
    listPublicCourses()
      .then((data) => active && setCourses(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return courses
    return courses.filter(
      (c) => c.titulo.toLowerCase().includes(term) || c.resumen.toLowerCase().includes(term),
    )
  }, [courses, q])

  if (redirecting) return <LoadingScreen />

  return (
    <div className="min-h-[100dvh] bg-surface-soft">
      <header className="flex items-center justify-between border-b border-surface-border bg-white px-6 py-4 sm:px-10">
        <BrandLockup size={28} />
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent"
          >
            {t('explore.login')}
          </Link>
          <LocaleToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-deep p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-10 -top-12 opacity-[0.08]">
            <Emblem size={260} tone="dark" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-white/55">
              {t('explore.eyebrow')}
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t('explore.title')}
            </h1>
            <p className="mt-2 text-sm text-white/65">
              {t('explore.body')}
            </p>
          </div>
        </section>

        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('explore.searchPlaceholder')}
            type="search"
            aria-label={t('explore.searchAria')}
            className="h-11 w-full rounded-xl border border-surface-border bg-white pl-11 pr-4 text-sm text-ink transition-colors focus:border-accent"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size={40} />
          </div>
        ) : error ? (
          <EmptyState
            icon="catalog"
            title={t('explore.loadError')}
            description={t('explore.loadErrorBody')}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="catalog"
            title={q.trim() ? t('explore.noResults') : t('explore.noCoursesYet')}
            description={
              q.trim() ? t('explore.noResultsBody', { term: q.trim() }) : t('explore.comeBackSoon')
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <CourseCard key={c.id} course={c} to={`/explorar/cursos/${c.id}`} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
