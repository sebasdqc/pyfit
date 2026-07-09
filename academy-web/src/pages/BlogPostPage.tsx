// Detalle público de un artículo del blog — /blog/:slug. Un borrador solo lo
// puede abrir su autor o un admin (preview antes de publicar, ver
// academy.blog_views.blog_detail_view); cualquier otro visitante recibe 404.
//
// Identidad visual: mismo shell dark-mode que BlogPage.tsx/LandingPage.tsx
// (BlogHeader/BlogFooter + data-theme="dark") — ver ese comentario para el
// porqué.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBlogPost } from '@/api/academy'
import { BlogFooter } from '@/components/blog/BlogFooter'
import { BlogHeader } from '@/components/blog/BlogHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { schoolGradient, schoolTheme } from '@/lib/schoolTheme'
import { useLocale } from '@/locale/useLocale'
import { useT } from '@/locale/useT'
import type { BlogPostDetail } from '@/types'

function ArticleBody({ text }: { text: string }) {
  // Texto plano — mismo criterio que Lesson.contenido: se divide en párrafos
  // reales por líneas en blanco, no renderiza markdown.
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="flex max-w-prose flex-col gap-4 text-[15px] leading-relaxed text-ink-soft">
      {(paragraphs.length > 0 ? paragraphs : [text]).map((p, i) => (
        <p key={i} className="whitespace-pre-line">{p}</p>
      ))}
    </div>
  )
}

export function BlogPostPage() {
  const t = useT()
  const { locale } = useLocale()
  const { slug } = useParams()
  const [post, setPost] = useState<BlogPostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let active = true
    setLoading(true)
    setNotFound(false)
    getBlogPost(slug)
      .then((data) => active && setPost(data))
      .catch(() => active && setNotFound(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [slug])

  const theme = schoolTheme(post?.escuela_slug ?? null)
  const fecha = post ? (post.publicado_en ?? post.created_at) : null
  const fechaFmt = fecha
    ? new Date(fecha).toLocaleDateString(locale === 'en' ? 'en' : 'es', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  return (
    <div data-theme="dark" className="min-h-[100dvh] bg-surface-soft text-ink">
      <BlogHeader />

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-28 sm:px-10 sm:pt-32">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent">
          {t('blog.backToBlog')}
        </Link>

        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner size={40} />
          </div>
        ) : notFound || !post ? (
          <div className="mt-6">
            <EmptyState icon="blog" title={t('blog.notFoundTitle')} description={t('blog.notFoundBody')} />
          </div>
        ) : (
          <article className="mt-6">
            {!post.publicado && (
              <div className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm font-medium text-warn">
                {t('blog.draftBadge')}
              </div>
            )}

            <div
              className="relative h-52 overflow-hidden rounded-2xl sm:h-72"
              style={post.portada ? undefined : { backgroundImage: schoolGradient(theme) }}
            >
              {post.portada ? (
                <img src={post.portada} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="pointer-events-none absolute -right-6 -top-6 text-white/10">
                  <Icon name={theme.icon} size={200} strokeWidth={1.2} />
                </div>
              )}
            </div>

            {post.etiquetas.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {post.etiquetas.map((tag) => <Badge key={tag} tone="accent">{tag}</Badge>)}
                {post.escuela_nombre && <Badge tone="neutral">{post.escuela_nombre}</Badge>}
              </div>
            )}

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{post.titulo}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
              <span>{t('blog.byAuthor', { author: post.autor_nombre })}</span>
              <span aria-hidden>·</span>
              <span>{t('blog.publishedOn', { date: fechaFmt })}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="activity" size={13} /> {t('blog.viewsAbbr', { count: post.vistas })}
              </span>
            </div>

            <div className="mt-8">
              <ArticleBody text={post.contenido} />
            </div>
          </article>
        )}
      </main>

      <BlogFooter />
    </div>
  )
}
