// Blog público de Zyfit Academy — /blog. A diferencia de /explorar (onboarding
// sin registro, redirige a un usuario logueado a /catalogo), el blog es
// contenido de marketing/SEO visible con O sin cuenta: un estudiante logueado
// llega aquí desde el Sidebar y no se lo redirige a ningún otro lado. El
// header (BlogHeader) adapta su CTA según haya sesión activa.
//
// Identidad visual: deliberadamente calcada de LandingPage.tsx (dark mode fijo
// vía data-theme="dark", header/footer/Aurora/BorderGlow compartidos en look)
// para que /blog se sienta la misma marca, no una pantalla aparte — ver
// project_academy_landing_redesign en memoria antes de tocar esto.

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listBlogPosts } from '@/api/academy'
import Aurora from '@/components/Aurora'
import { BlogFooter } from '@/components/blog/BlogFooter'
import { BlogHeader } from '@/components/blog/BlogHeader'
import BorderGlow from '@/components/effects/BorderGlow'
import { BlogPostCard } from '@/components/ui/BlogPostCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { cssVarToHex } from '@/lib/themeColor'
import { useT } from '@/locale/useT'
import type { BlogPost } from '@/types'

// Mismo glow de marca que CARD_GLOW en LandingPage.tsx — se repite acá (en
// vez de importarse) para no acoplar el blog a cambios futuros del hero de
// la landing; si el valor deriva, es intencional mantenerlos en sync a mano.
const CARD_GLOW = {
  borderRadius: 16,
  glowColor: '353 82 62',
  colors: ['#f0626f', '#e63950', '#cc1f36'],
  glowRadius: 28,
  glowIntensity: 0.85,
  coneSpread: 32,
  minGlow: 0.5,
}

export function BlogPage() {
  const t = useT()
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

  // Mismos colores de aurora que el Hero de la landing: derivados de las
  // variables CSS del tenant activo, no hardcodeados.
  const auroraColors = useMemo<[string, string, string]>(
    () => [
      cssVarToHex('--color-accent-light', '#f0626f'),
      cssVarToHex('--color-accent', '#e63950'),
      cssVarToHex('--color-brand', '#cc1f36'),
    ],
    [],
  )

  return (
    <div data-theme="dark" className="min-h-[100dvh] bg-surface-soft text-ink">
      <BlogHeader />

      {/* Hero — mismo tratamiento que el Hero de la landing: gradiente radial
          oscuro + Aurora, recortada a un <div> interno (no al <section>) para
          que el panel de búsqueda pueda "flotar" sobre el borde inferior. */}
      <section
        className="relative overflow-hidden px-6 pb-16 pt-28 sm:px-10 sm:pb-20 sm:pt-32"
        style={{ background: 'radial-gradient(120% 100% at 50% -10%, rgb(var(--color-brand-deep) / 0.6), #040406 65%)' }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Aurora colorStops={auroraColors} blend={0.55} amplitude={2} speed={0.9} />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#040406] to-transparent" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">{t('blog.eyebrow')}</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('blog.title')}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">{t('blog.body')}</p>
        </div>
      </section>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-16 sm:px-10">
        <div className="za-card za-fade-up relative z-10 -mt-10 flex flex-col gap-3 rounded-3xl p-4 sm:-mt-12 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
          <div className="relative flex-1">
            <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('blog.searchPlaceholder')}
              type="search"
              aria-label={t('blog.searchAria')}
              className="input pl-11"
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
              className="input appearance-none pr-9 sm:w-52"
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
              className="flex h-11 items-center gap-1.5 rounded-xl border border-surface-border bg-surface-soft px-4 text-sm text-ink-soft transition-colors hover:border-danger hover:text-danger"
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
              <BorderGlow
                key={p.id}
                {...CARD_GLOW}
                backgroundColor="transparent"
                className="transition-transform hover:-translate-y-0.5"
              >
                <BlogPostCard post={p} to={`/blog/${p.slug}`} />
              </BorderGlow>
            ))}
          </div>
        )}
      </main>

      <BlogFooter />
    </div>
  )
}
