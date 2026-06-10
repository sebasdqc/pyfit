// Catálogo de cursos publicados. Consume GET /api/academy/courses/ con filtros
// de categoría, nivel y búsqueda. Hero de marca + grilla de tarjetas.

import { useEffect, useMemo, useState } from 'react'
import { listCourses } from '@/api/academy'
import { CourseCard } from '@/components/ui/CourseCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { Emblem } from '@/components/Emblem'
import { CATEGORIAS, DISCIPLINAS, LICENCIAS, NIVELES } from '@/lib/constants'
import type { Course } from '@/types'

export function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [nivel, setNivel] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [licencia, setLicencia] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    listCourses({
      categoria: categoria || undefined,
      nivel: nivel || undefined,
      disciplina: disciplina || undefined,
      licencia: licencia || undefined,
    })
      .then((data) => active && setCourses(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [categoria, nivel, disciplina, licencia])

  // La búsqueda por texto se filtra en cliente sobre lo ya cargado (rápida).
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return courses
    return courses.filter(
      (c) => c.titulo.toLowerCase().includes(term) || c.resumen.toLowerCase().includes(term),
    )
  }, [courses, q])

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-deep p-7 sm:p-9">
        <div className="pointer-events-none absolute -right-10 -top-12 opacity-[0.08]">
          <Emblem size={260} tone="dark" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-white/55">Catálogo</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Explora los cursos de la academia
          </h1>
          <p className="mt-2 text-sm text-white/65">
            Aprende a tu ritmo, supera las evaluaciones y obtén tu certificado.
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
            placeholder="Buscar cursos…"
            type="search"
            aria-label="Buscar cursos"
            className="h-11 w-full rounded-xl border border-surface-border bg-white pl-11 pr-4 text-sm text-ink transition-colors focus:border-accent"
          />
        </div>
        <Select value={disciplina} onChange={setDisciplina} placeholder="Disciplina">
          {DISCIPLINAS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </Select>
        <Select value={licencia} onChange={setLicencia} placeholder="Licencia">
          {LICENCIAS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </Select>
        <Select value={categoria} onChange={setCategoria} placeholder="Categoría">
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={nivel} onChange={setNivel} placeholder="Nivel">
          {NIVELES.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={40} />
        </div>
      ) : error ? (
        <EmptyState
          icon="catalog"
          title="No se pudo cargar el catálogo"
          description="Revisa tu conexión e inténtalo de nuevo."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="catalog"
          title={q.trim() ? 'Sin resultados' : 'Sin cursos por ahora'}
          description={
            q.trim()
              ? `No encontramos cursos que coincidan con “${q.trim()}”.`
              : 'Aún no hay cursos publicados con estos filtros.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <CourseCard key={c.id} course={c} to={`/cursos/${c.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function Select({
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
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className="h-11 w-full appearance-none rounded-xl border border-surface-border bg-white pl-4 pr-9 text-sm text-ink transition-colors focus:border-accent sm:w-44"
      >
        <option value="">{placeholder}: todas</option>
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
