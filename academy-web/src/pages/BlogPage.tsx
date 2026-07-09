// Blog público de Zyfit Academy — /blog. A diferencia de /explorar (onboarding
// sin registro, redirige a un usuario logueado a /catalogo), el blog es
// contenido de marketing/SEO visible con O sin cuenta: un estudiante logueado
// llega aquí desde el Sidebar y no se lo redirige a ningún otro lado. El
// header adapta su CTA según haya sesión activa (ver useAuth).

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listBlogPosts } from '@/api/academy'
import { useAuth } from '@/auth/useAuth'
import { BlogPostCard } from '@/components/ui/BlogPostCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { Emblem, BrandLockup } from '@/components/Emblem'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'
import type { BlogPost } from '@/types'

export function BlogPage() {
  const t = useT()
  const { user } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  // Facetas de escuela derivadas del catálogo público (no de /academy/schools/,
  // que requiere sesión — el blog debe filtrar por escuela también sin cuenta).
  const [allPosts, setAllPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const escuelaId = searchParams.get('escuela')

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    let active = true
    listBlogPosts().then((data) => active && setAllPosts(data)).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    listBlogPosts({ school: escuelaId ? Number(escuelaId) : undefined, q: debouncedQ.trim() || undefined })
      .then((data) => active && setPosts(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [debouncedQ, escuelaId])

  const schools = useMemo(() => {
    const map = new Map<number, string>()
    allPosts.forEach((p) => {
      if (p.school && p.escuela_nombre) map.set(p.school, p.escuela_nombre)
    })
    return Array.from(map, ([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [allPosts])

  const escuelaNombre = useMemo(
    () => (escuelaId ? schools.find((s) => String(s.id) === escuelaId)?.nombre : null),
    [schools, escuelaId],
  )

  return (
    <div className="min-h-[100dvh] bg-surface-soft">
      <header className="flex items-center justify-between border-b border-surface-border bg-white px-6 py-4 sm:px-10">
        <Link to="/"><BrandLockup size={28} /></Link>
        <div className="flex items-center gap-3">
          <Link
            to={user ? '/inicio' : '/login'}
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent"
          >
            {user ? t('blog.goToDashboard') : t('blog.login')}
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
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-white/55">{t('blog.eyebrow')}</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('blog.title')}</h1>
            <p className="mt-2 text-sm text-white/65">{t('blog.body')}</p>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('blog.searchPlaceholder')}
              type="search"
              aria-label={t('blog.searchAria')}
              className="h-11 w-full rounded-xl border border-surface-border bg-white pl-11 pr-4 text-sm text-ink transition-colors focus:border-accent"
            />
          </div>
          <div className="relative">
            <select
              value={escuelaId ?? ''}
              onChange={(e) => setSearchParams((prev) => {
                if (e.target.value) prev.set('escuela', e.target.value)
                else prev.delete('escuela')
                return prev
              })}
              aria-label={t('blog.schoolPlaceholder')}
              className="h-11 w-full appearance-none rounded-xl border border-surface-border bg-white pl-4 pr-9 text-sm text-ink transition-colors focus:border-accent sm:w-52"
            >
              <option value="">{t('blog.schoolPlaceholder')}: {t('blog.all')}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          </div>
          {escuelaId && (
            <button
              type="button"
              onClick={() => setSearchParams((prev) => { prev.delete('escuela'); return prev })}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-surface-border bg-white px-4 text-sm text-ink-soft transition-colors hover:border-danger hover:text-danger"
            >
              <Icon name="close" size={14} />
              {escuelaNombre ?? t('blog.clear')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size={40} />
          </div>
        ) : error ? (
          <EmptyState icon="blog" title={t('blog.loadError')} description={t('blog.loadErrorBody')} />
        ) : posts.length === 0 ? (
          <EmptyState
            icon="blog"
            title={q.trim() ? t('blog.noResults') : t('blog.noPostsYet')}
            description={q.trim() ? t('blog.noResultsBody', { term: q.trim() }) : t('blog.noPostsYetBody')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <BlogPostCard key={p.id} post={p} to={`/blog/${p.slug}`} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
