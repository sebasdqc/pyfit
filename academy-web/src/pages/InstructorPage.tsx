// Área de instructor: lista mis cursos (GET /courses/?mine=1, incluye borradores)
// y permite crear uno nuevo (POST /courses/). La edición fina del contenido
// (módulos, lecciones, quizzes) se profundizará en próximas iteraciones.

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createCourse, listCourses } from '@/api/academy'
import { CourseCard } from '@/components/ui/CourseCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Dialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/auth/useAuth'
import { CATEGORIAS, NIVELES } from '@/lib/constants'
import { slugify } from '@/lib/slugify'
import type { Course } from '@/types'

export function InstructorPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  function reload() {
    setLoading(true)
    setLoadError(false)
    listCourses({ mine: true })
      .then(setCourses)
      .catch(() => {
        setCourses([])
        setLoadError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  if (!user?.puede_crear_cursos) {
    return (
      <EmptyState
        icon="instructor"
        title="Área de instructores"
        description="Tu cuenta no tiene permisos de instructor. Contacta al administrador para publicar cursos."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="za-eyebrow">Instructor</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Mis cursos</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/instructor/blog"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border px-4 text-sm font-medium text-ink-soft hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="blog" size={16} /> Gestionar blog
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            <Icon name="plus" size={17} /> Crear curso
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={40} />
        </div>
      ) : loadError ? (
        <EmptyState
          icon="instructor"
          title="No se pudieron cargar tus cursos"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={
            <button
              onClick={reload}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              Reintentar
            </button>
          }
        />
      ) : courses.length === 0 ? (
        <EmptyState
          icon="instructor"
          title="Aún no has creado cursos"
          description="Crea tu primer curso para empezar a publicar contenido."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              <Icon name="plus" size={16} /> Crear curso
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <CourseCard course={c} to={`/cursos/${c.id}`} />
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/instructor/cursos/${c.id}/contenido`}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-surface-border text-sm font-medium text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
                >
                  <Icon name="play" size={15} /> Videos
                </Link>
                <Link
                  to={`/instructor/cursos/${c.id}/entregas`}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-surface-border text-sm font-medium text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
                >
                  <Icon name="upload" size={15} /> Entregas
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateCourseModal onClose={() => setShowCreate(false)} onCreated={reload} />}
    </div>
  )
}

function CreateCourseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const navigate = useNavigate()
  const [titulo, setTitulo] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [resumen, setResumen] = useState('')
  const [categoria, setCategoria] = useState<string>(CATEGORIAS[0])
  const [nivel, setNivel] = useState<string>(NIVELES[0].id)
  const [publicado, setPublicado] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveSlug = useMemo(() => (slugTouched ? slug : slugify(titulo)), [slug, slugTouched, titulo])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !effectiveSlug) {
      setError('El título es obligatorio.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const course = await createCourse({
        titulo: titulo.trim(),
        slug: effectiveSlug,
        resumen: resumen.trim(),
        categoria,
        nivel,
        publicado,
      })
      onCreated()
      onClose()
      navigate(`/cursos/${course.id}`)
    } catch {
      setError('No se pudo crear el curso. Puede que el identificador (slug) ya exista.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="create-course-title"
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-surface p-6 shadow-cardHover"
    >
        <div className="flex items-center justify-between">
          <h2 id="create-course-title" className="text-lg font-semibold text-ink">Crear curso</h2>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <Labeled label="Título">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Fundamentos de Fuerza"
              className="input"
              data-autofocus
            />
          </Labeled>
          <Labeled label="Identificador (slug)">
            <input
              value={effectiveSlug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugTouched(true)
              }}
              placeholder="fundamentos-de-fuerza"
              className="input font-mono text-sm"
            />
          </Labeled>
          <Labeled label="Resumen">
            <input
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              placeholder="Una línea que enganche."
              className="input"
            />
          </Labeled>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Labeled label="Categoría">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input">
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Nivel">
              <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="input">
                {NIVELES.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Labeled>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={publicado}
              onChange={(e) => setPublicado(e.target.checked)}
              className="h-4 w-4 rounded border-surface-border text-accent focus:ring-accent"
            />
            Publicar de inmediato (visible en el catálogo)
          </label>

          {error && <p className="text-sm text-danger" role="alert">{error}</p>}

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-medium text-ink-soft hover:bg-surface-soft">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {submitting ? 'Creando…' : 'Crear curso'}
            </button>
          </div>
        </form>
    </Dialog>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
    </label>
  )
}
