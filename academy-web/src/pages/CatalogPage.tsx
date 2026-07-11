// Catálogo de cursos. Sin filtros activos muestra las escuelas agrupadas
// (GET /api/academy/schools/). Con búsqueda o filtro cae al grid plano
// (GET /api/academy/courses/).

import { useEffect, useState } from 'react'
import { listCourses, listSchools } from '@/api/academy'
import { CourseCard } from '@/components/ui/CourseCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { CATEGORIAS, NIVELES } from '@/lib/constants'
import { schoolTheme, schoolGradient } from '@/lib/schoolTheme'
import { useT } from '@/locale/useT'
import type { Course, School } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const NIVEL_DOT: Record<string, string> = {
  principiante: 'bg-ok',
  intermedio: 'bg-warn',
  avanzado: 'bg-danger',
}

function SchoolTag({ nivel }: { nivel: string }) {
  const t = useT()
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
      <span className={`h-1.5 w-1.5 rounded-full ${NIVEL_DOT[nivel] ?? 'bg-ink-muted'}`} />
      {t(`level.${nivel}`)}
    </span>
  )
}

// ── Vista agrupada por escuela ────────────────────────────────────────────────

function SchoolSection({ school }: { school: School }) {
  const t = useT()
  const theme = schoolTheme(school.slug)
  return (
    <section aria-labelledby={`school-${school.id}`}>
      {/* Cabecera de la escuela (color propio de la escuela) */}
      <div className="mb-4 flex items-start gap-4 border-l-4 pl-4" style={{ borderColor: theme.accent }}>
        <span
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-card"
          style={{ backgroundImage: schoolGradient(theme) }}
        >
          <Icon name={theme.icon} size={22} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id={`school-${school.id}`} className="text-[17px] font-bold tracking-tight text-ink">
            {school.nombre}
          </h2>
          {school.descripcion && <p className="text-sm text-ink-soft">{school.descripcion}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {Array.from(new Set(school.cursos.map((c) => c.nivel))).map((n) => (
              <SchoolTag key={n} nivel={n} />
            ))}
            <span className="text-xs text-ink-muted">
              {t(school.total_cursos === 1 ? 'catalog.coursesCountOne' : 'catalog.coursesCountOther', { count: school.total_cursos })}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de cursos de la escuela */}
      {school.cursos.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('catalog.noCoursesPublished')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {school.cursos.map((c) => (
            <CourseCard key={c.id} course={c} to={`/cursos/${c.id}`} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CatalogPage() {
  const t = useT()
  const [schools, setSchools] = useState<School[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [nivel, setNivel] = useState('')

  const filtersActive = Boolean(debouncedQ.trim() || categoria || nivel)

  // Debounce de la búsqueda: evita disparar una request por cada tecla.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  // Carga escuelas (vista agrupada) al montar — sin filtros.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    listSchools()
      .then((data) => active && setSchools(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  // Carga el catálogo plano cuando hay búsqueda o filtro de categoría/nivel
  // activos. La búsqueda se resuelve en el BACKEND (Course.titulo/resumen,
  // ver academy.views.courses_view) en vez de filtrar en memoria lo ya
  // cargado, para que siga funcionando igual si el catálogo crece o se pagina.
  useEffect(() => {
    if (!filtersActive) return
    let active = true
    setLoading(true)
    setError(false)
    listCourses({
      q: debouncedQ.trim() || undefined,
      categoria: categoria || undefined,
      nivel: nivel || undefined,
    })
      .then((data) => active && setCourses(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [debouncedQ, categoria, nivel, filtersActive])

  const isEmpty = filtersActive
    ? !loading && !error && courses.length === 0
    : !loading && !error && schools.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-deep p-6 sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-white/55">{t('catalog.eyebrow')}</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t('catalog.title')}
          </h1>
          <p className="mt-2 text-sm text-white/65">
            {t('catalog.body')}
          </p>
        </div>
      </section>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('catalog.searchPlaceholder')}
            type="search"
            aria-label={t('catalog.searchAria')}
            className="h-11 w-full rounded-xl border border-surface-border bg-surface pl-11 pr-4 text-sm text-ink transition-colors focus:border-accent"
          />
        </div>
        <FilterSelect value={categoria} onChange={setCategoria} placeholder={t('catalog.categoryPlaceholder')}>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={nivel} onChange={setNivel} placeholder={t('catalog.levelPlaceholder')}>
          {NIVELES.map((n) => (
            <option key={n.id} value={n.id}>{t(`level.${n.id}`)}</option>
          ))}
        </FilterSelect>
        {filtersActive && (
          <button
            onClick={() => { setQ(''); setCategoria(''); setNivel('') }}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-4 text-sm text-ink-soft transition-colors hover:border-danger hover:text-danger"
          >
            <Icon name="close" size={14} />
            {t('catalog.clear')}
          </button>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={40} />
        </div>
      ) : error ? (
        <EmptyState
          icon="catalog"
          title={t('catalog.loadError')}
          description={t('catalog.loadErrorBody')}
        />
      ) : isEmpty ? (
        <EmptyState
          icon="catalog"
          title={q.trim() ? t('catalog.noResults') : t('catalog.noCoursesYet')}
          description={
            q.trim()
              ? t('catalog.noResultsBody', { term: q.trim() })
              : t('catalog.noResultsWithFilters')
          }
        />
      ) : filtersActive ? (
        /* Vista plana cuando hay búsqueda o filtros activos */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} to={`/cursos/${c.id}`} />
          ))}
        </div>
      ) : (
        /* Vista agrupada por escuela */
        <div className="flex flex-col gap-10">
          {schools.map((s) => (
            <SchoolSection key={s.id} school={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children: React.ReactNode
}) {
  const t = useT()
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className="h-11 w-full appearance-none rounded-xl border border-surface-border bg-surface pl-4 pr-9 text-sm text-ink transition-colors focus:border-accent sm:w-44"
      >
        <option value="">{placeholder}: {t('catalog.all')}</option>
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
    </div>
  )
}
