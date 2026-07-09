// Autoría del blog (instructor/admin) — /instructor/blog. Lista "mis
// publicaciones" (borrador + publicadas) y permite crear/editar/borrar un
// post. Mismo patrón que InstructorPage.tsx (lista + modal de creación) y
// CourseContentPage.tsx (modal de edición con confirmación de borrado).

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createBlogPost, deleteBlogPost, getMyBlogPost, listMyBlogPosts, listSchools, updateBlogPost,
} from '@/api/academy'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/auth/useAuth'
import { slugify } from '@/lib/slugify'
import type { BlogPost, School } from '@/types'

const PORTADA_MAX_BYTES = 1_000_000 // ~1 MB de archivo (el data URL en base64 queda bajo el límite del backend, ~1.5 MB)

export function BlogInstructorPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<BlogPost | null>(null)

  function reload() {
    setLoading(true)
    setLoadError(false)
    listMyBlogPosts()
      .then(setPosts)
      .catch(() => {
        setPosts([])
        setLoadError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    listSchools().then(setSchools).catch(() => {})
  }, [])

  if (!user?.puede_crear_cursos) {
    return (
      <EmptyState
        icon="blog"
        title="Área de instructores"
        description="Tu cuenta no tiene permisos de instructor. Contacta al administrador para publicar en el blog."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/instructor" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent">
            <Icon name="chevronLeft" size={16} /> Mis cursos
          </Link>
          <p className="za-eyebrow mt-4">Instructor</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Mis publicaciones del blog</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          <Icon name="plus" size={17} /> Nuevo artículo
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={40} />
        </div>
      ) : loadError ? (
        <EmptyState
          icon="blog"
          title="No se pudieron cargar tus publicaciones"
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
      ) : posts.length === 0 ? (
        <EmptyState
          icon="blog"
          title="Aún no escribiste ningún artículo"
          description="Publica el primer artículo del blog de Zyfit Academy."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              <Icon name="plus" size={16} /> Nuevo artículo
            </button>
          }
        />
      ) : (
        <div className="za-card divide-y divide-surface-border overflow-hidden">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <Icon name="blog" size={17} className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{p.titulo}</span>
              {p.publicado ? <Badge tone="ok">Publicado</Badge> : <Badge tone="warn">Borrador</Badge>}
              {p.escuela_nombre && <Badge tone="neutral">{p.escuela_nombre}</Badge>}
              <span className="text-xs text-ink-muted">{p.vistas} vistas</span>
              {p.publicado && (
                <a
                  href={`/blog/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-soft hover:text-ink"
                  aria-label={`Ver "${p.titulo}" en el blog`}
                  title="Ver en el blog"
                >
                  <Icon name="external" size={15} />
                </a>
              )}
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-soft hover:text-ink"
                aria-label={`Editar "${p.titulo}"`}
                title="Editar"
              >
                <Icon name="edit" size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <PostFormDialog schools={schools} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); reload() }} />
      )}
      {editing && (
        <PostFormDialog
          post={editing}
          schools={schools}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
          onDeleted={() => { setEditing(null); reload() }}
        />
      )}
    </div>
  )
}

function PostFormDialog({
  post, schools, onClose, onSaved, onDeleted,
}: {
  post?: BlogPost
  schools: School[]
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}) {
  const isEdit = !!post
  const [titulo, setTitulo] = useState(post?.titulo ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [resumen, setResumen] = useState(post?.resumen ?? '')
  const [contenido, setContenido] = useState('')
  const [contenidoLoaded, setContenidoLoaded] = useState(!isEdit)
  const [schoolId, setSchoolId] = useState<string>(post?.school ? String(post.school) : '')
  const [etiquetasTexto, setEtiquetasTexto] = useState((post?.etiquetas ?? []).join(', '))
  const [portada, setPortada] = useState(post?.portada ?? '')
  const [publicado, setPublicado] = useState(post?.publicado ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const effectiveSlug = useMemo(() => (slugTouched ? slug : slugify(titulo)), [slug, slugTouched, titulo])

  // El listado "mis publicaciones" no trae `contenido` (payload liviano) — al
  // editar, se carga el detalle completo una sola vez por id (sin sumar vista,
  // a diferencia del detalle público — ver getMyBlogPost).
  useEffect(() => {
    if (!isEdit || contenidoLoaded || !post) return
    getMyBlogPost(post.id)
      .then((full) => setContenido(full.contenido))
      .finally(() => setContenidoLoaded(true))
  }, [isEdit, contenidoLoaded, post])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.')
      return
    }
    if (file.size > PORTADA_MAX_BYTES) {
      setError('La imagen es demasiado grande (máximo ~1 MB).')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setPortada(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !effectiveSlug) {
      setError('El título es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    const etiquetas = etiquetasTexto.split(',').map((tag) => tag.trim()).filter(Boolean)
    const payload = {
      titulo: titulo.trim(),
      slug: effectiveSlug,
      resumen: resumen.trim(),
      contenido,
      portada,
      etiquetas,
      school: schoolId ? Number(schoolId) : null,
      publicado,
    }
    try {
      if (isEdit && post) {
        await updateBlogPost(post.id, payload)
      } else {
        await createBlogPost(payload)
      }
      onSaved()
    } catch {
      setError('No se pudo guardar. Puede que el identificador (slug) ya exista.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!post) return
    setSaving(true)
    setError(null)
    try {
      await deleteBlogPost(post.id)
      onDeleted?.()
    } catch {
      setError('No se pudo eliminar. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="post-form-title"
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-surface-border bg-surface p-6 shadow-cardHover"
    >
      <div className="flex items-center justify-between">
        <h2 id="post-form-title" className="text-lg font-semibold text-ink">
          {isEdit ? 'Editar artículo' : 'Nuevo artículo'}
        </h2>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <Labeled label="Título">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. 5 claves para periodizar la pretemporada"
            className="input"
            data-autofocus
            required
          />
        </Labeled>
        <Labeled label="Identificador (slug)">
          <input
            value={effectiveSlug}
            onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }}
            placeholder="5-claves-para-periodizar-la-pretemporada"
            className="input font-mono text-sm"
          />
        </Labeled>
        <Labeled label="Resumen (bajada para la tarjeta y el buscador)">
          <input
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            placeholder="Una línea que enganche."
            className="input"
          />
        </Labeled>
        <Labeled label="Contenido">
          {!contenidoLoaded ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-surface-border">
              <Spinner size={24} />
            </div>
          ) : (
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={12}
              placeholder="Escribe el artículo. Deja una línea en blanco entre párrafos."
              className="input resize-none"
            />
          )}
        </Labeled>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Labeled label="Escuela (opcional)">
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="input">
              <option value="">Sin escuela</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Etiquetas (separadas por coma)">
            <input
              value={etiquetasTexto}
              onChange={(e) => setEtiquetasTexto(e.target.value)}
              placeholder="fuerza, pretemporada, planificación"
              className="input"
            />
          </Labeled>
        </div>

        <Labeled label="Portada (opcional)">
          <div className="flex items-center gap-3">
            {portada && (
              <img src={portada} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            )}
            <div className="flex flex-1 flex-col gap-1.5">
              <input type="file" accept="image/*" onChange={handleFile} className="text-sm text-ink-soft" />
              {portada && (
                <button
                  type="button"
                  onClick={() => setPortada('')}
                  className="w-fit text-xs font-medium text-danger hover:underline"
                >
                  Quitar portada
                </button>
              )}
            </div>
          </div>
        </Labeled>

        <label className="flex items-center gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
            className="h-4 w-4 rounded border-surface-border text-accent focus:ring-accent"
          />
          Publicar (visible en /blog sin cuenta)
        </label>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        {isEdit && !confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mr-auto text-sm font-medium text-danger hover:underline"
          >
            Eliminar artículo
          </button>
        )}
        {confirmingDelete && (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
            <p className="text-sm text-ink">Esta acción no se puede deshacer.</p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="h-9 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="h-9 rounded-lg px-4 text-sm text-ink-soft hover:bg-surface-soft"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-sm font-medium text-ink-soft hover:bg-surface-soft"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear artículo'}
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
