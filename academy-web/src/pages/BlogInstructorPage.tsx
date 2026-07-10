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
import { useT } from '@/locale/useT'
import type { BlogPost, School } from '@/types'

const PORTADA_MAX_BYTES = 1_000_000 // ~1 MB de archivo (el data URL en base64 queda bajo el límite del backend, ~1.5 MB)

export function BlogInstructorPage() {
  const t = useT()
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
        title={t('blogInstructor.accessDeniedTitle')}
        description={t('blogInstructor.accessDeniedBody')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/instructor" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent">
            <Icon name="chevronLeft" size={16} /> {t('blogInstructor.myCourses')}
          </Link>
          <p className="za-eyebrow mt-4">{t('blogInstructor.eyebrow')}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{t('blogInstructor.title')}</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          <Icon name="plus" size={17} /> {t('blogInstructor.newPost')}
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={40} />
        </div>
      ) : loadError ? (
        <EmptyState
          icon="blog"
          title={t('blogInstructor.loadErrorTitle')}
          description={t('blogInstructor.loadErrorBody')}
          action={
            <button
              onClick={reload}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              {t('blogInstructor.retry')}
            </button>
          }
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="blog"
          title={t('blogInstructor.emptyTitle')}
          description={t('blogInstructor.emptyBody')}
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              <Icon name="plus" size={16} /> {t('blogInstructor.newPost')}
            </button>
          }
        />
      ) : (
        <div className="za-card divide-y divide-surface-border overflow-hidden">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <Icon name="blog" size={17} className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{p.titulo}</span>
              {p.publicado ? <Badge tone="ok">{t('blogInstructor.published')}</Badge> : <Badge tone="warn">{t('blogInstructor.draft')}</Badge>}
              {p.escuela_nombre && <Badge tone="neutral">{p.escuela_nombre}</Badge>}
              <span className="text-xs text-ink-muted">{t('blogInstructor.viewsCount', { count: p.vistas })}</span>
              {p.publicado && (
                <a
                  href={`/blog/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-soft hover:text-ink"
                  aria-label={t('blogInstructor.viewAria', { titulo: p.titulo })}
                  title={t('blogInstructor.viewTitle')}
                >
                  <Icon name="external" size={15} />
                </a>
              )}
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-soft hover:text-ink"
                aria-label={t('blogInstructor.editAria', { titulo: p.titulo })}
                title={t('blogInstructor.editTitle')}
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
  const t = useT()
  const isEdit = !!post
  const [titulo, setTitulo] = useState(post?.titulo ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [resumen, setResumen] = useState(post?.resumen ?? '')
  const [metaTitulo, setMetaTitulo] = useState(post?.meta_titulo ?? '')
  const [metaDescripcion, setMetaDescripcion] = useState(post?.meta_descripcion ?? '')
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
      setError(t('blogInstructor.errorFileType'))
      return
    }
    if (file.size > PORTADA_MAX_BYTES) {
      setError(t('blogInstructor.errorFileSize'))
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
      setError(t('blogInstructor.errorTitleRequired'))
      return
    }
    setSaving(true)
    setError(null)
    const etiquetas = etiquetasTexto.split(',').map((tag) => tag.trim()).filter(Boolean)
    const payload = {
      titulo: titulo.trim(),
      slug: effectiveSlug,
      resumen: resumen.trim(),
      meta_titulo: metaTitulo.trim(),
      meta_descripcion: metaDescripcion.trim(),
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
      setError(t('blogInstructor.errorSave'))
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
      setError(t('blogInstructor.errorDelete'))
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
          {isEdit ? t('blogInstructor.editTitle2') : t('blogInstructor.newPost')}
        </h2>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label={t('blogInstructor.close')}>
          <Icon name="close" size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <Labeled label={t('blogInstructor.fieldTitle')}>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={t('blogInstructor.fieldTitlePlaceholder')}
            className="input"
            data-autofocus
            required
          />
        </Labeled>
        <Labeled label={t('blogInstructor.fieldSlug')}>
          <input
            value={effectiveSlug}
            onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }}
            placeholder="5-claves-para-periodizar-la-pretemporada"
            className="input font-mono text-sm"
          />
        </Labeled>
        <Labeled label={t('blogInstructor.fieldSummary')}>
          <input
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            placeholder={t('blogInstructor.fieldSummaryPlaceholder')}
            className="input"
          />
        </Labeled>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Labeled label={t('blogInstructor.fieldMetaTitle', { count: metaTitulo.length })}>
            <input
              value={metaTitulo}
              onChange={(e) => setMetaTitulo(e.target.value)}
              maxLength={70}
              placeholder={t('blogInstructor.fieldMetaTitlePlaceholder')}
              className="input"
            />
          </Labeled>
          <Labeled label={t('blogInstructor.fieldMetaDescription', { count: metaDescripcion.length })}>
            <input
              value={metaDescripcion}
              onChange={(e) => setMetaDescripcion(e.target.value)}
              maxLength={170}
              placeholder={t('blogInstructor.fieldMetaDescriptionPlaceholder')}
              className="input"
            />
          </Labeled>
        </div>

        <Labeled label={t('blogInstructor.fieldContent')}>
          {!contenidoLoaded ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-surface-border">
              <Spinner size={24} />
            </div>
          ) : (
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={12}
              placeholder={t('blogInstructor.fieldContentPlaceholder')}
              className="input resize-none font-mono text-sm"
            />
          )}
        </Labeled>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Labeled label={t('blogInstructor.fieldSchool')}>
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="input">
              <option value="">{t('blogInstructor.fieldSchoolNone')}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </Labeled>
          <Labeled label={t('blogInstructor.fieldTags')}>
            <input
              value={etiquetasTexto}
              onChange={(e) => setEtiquetasTexto(e.target.value)}
              placeholder={t('blogInstructor.fieldTagsPlaceholder')}
              className="input"
            />
          </Labeled>
        </div>

        <Labeled label={t('blogInstructor.fieldCover')}>
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
                  {t('blogInstructor.removeCover')}
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
          {t('blogInstructor.publishCheckbox')}
        </label>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        {isEdit && !confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mr-auto text-sm font-medium text-danger hover:underline"
          >
            {t('blogInstructor.deletePost')}
          </button>
        )}
        {confirmingDelete && (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
            <p className="text-sm text-ink">{t('blogInstructor.deleteConfirmBody')}</p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="h-9 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {t('blogInstructor.deleteConfirmYes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="h-9 rounded-lg px-4 text-sm text-ink-soft hover:bg-surface-soft"
              >
                {t('blogInstructor.cancel')}
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
            {t('blogInstructor.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? t('blogInstructor.saving') : isEdit ? t('blogInstructor.saveChanges') : t('blogInstructor.createPost')}
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
