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

// Subset de markdown deliberadamente chico — NO es un parser genérico (ver
// project_academy_web_no_markdown: Lesson.contenido sigue siendo texto plano
// puro, esto es SOLO para el blog). Soporta lo mínimo que pide un post
// editorial con SEO real: "## " H2, "### " H3, tablas con "|" y enlaces
// [texto](url)/**negrita** inline. Cualquier otra línea sigue siendo un
// párrafo de texto plano, igual que antes — compatible con posts viejos.
function renderInline(text: string, keyPrefix: string) {
  const parts: React.ReactNode[] = []
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    if (match[1] !== undefined) {
      parts.push(
        <a
          key={`${keyPrefix}-${i++}`}
          href={match[2]}
          className="font-medium text-accent underline underline-offset-2 hover:text-accent-dark"
        >
          {match[1]}
        </a>,
      )
    } else {
      parts.push(<strong key={`${keyPrefix}-${i++}`} className="font-semibold text-ink">{match[3]}</strong>)
    }
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function isTableSeparatorRow(cells: string[]) {
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()))
}

function parseTableRows(block: string) {
  return block.split('\n').map((l) => l.trim()).filter(Boolean)
    .map((line) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
}

function ArticleBlock({ block, index }: { block: string; index: number }) {
  if (block.startsWith('### ')) {
    return <h3 className="mt-6 text-lg font-semibold text-ink">{renderInline(block.slice(4), `h3-${index}`)}</h3>
  }
  if (block.startsWith('## ')) {
    return <h2 className="mt-8 text-xl font-bold tracking-tight text-ink">{renderInline(block.slice(3), `h2-${index}`)}</h2>
  }

  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length >= 2 && lines.every((l) => l.includes('|'))) {
    const [header, ...rest] = parseTableRows(block)
    const rows = rest.filter((r) => !isTableSeparatorRow(r))
    return (
      <div className="my-2 overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-soft">
              {header.map((cell, i) => (
                <th key={i} className="border-b border-surface-border px-4 py-2.5 text-left font-semibold text-ink">
                  {renderInline(cell, `th-${index}-${i}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b border-surface-border last:border-0">
                {row.map((cell, c) => (
                  <td key={c} className="px-4 py-2.5 align-top text-ink-soft">{renderInline(cell, `td-${index}-${r}-${c}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return <p className="whitespace-pre-line">{renderInline(block, `p-${index}`)}</p>
}

function ArticleBody({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className="flex max-w-prose flex-col gap-4 text-[15px] leading-relaxed text-ink-soft">
      {(blocks.length > 0 ? blocks : [text]).map((b, i) => <ArticleBlock key={i} block={b} index={i} />)}
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

  // SEO real: <title>/<meta description>/JSON-LD Article. Manipulación directa
  // del DOM en vez de una lib (react-helmet, etc.) — es la única pantalla del
  // sitio que lo necesita, no justifica una dependencia nueva. Se restaura el
  // estado previo al desmontar/cambiar de post para no filtrar metadata de un
  // artículo a la siguiente ruta.
  useEffect(() => {
    if (!post || !post.publicado) return

    const prevTitle = document.title
    document.title = `${post.meta_titulo || post.titulo} — Zyfit Academy Blog`

    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    let createdMetaDesc = false
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
      createdMetaDesc = true
    }
    const prevDesc = metaDesc.getAttribute('content')
    metaDesc.setAttribute('content', post.meta_descripcion || post.resumen)

    const ldJson = document.createElement('script')
    ldJson.type = 'application/ld+json'
    ldJson.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.titulo,
      description: post.meta_descripcion || post.resumen,
      ...(post.portada ? { image: post.portada } : {}),
      author: {
        '@type': post.autor_nombre ? 'Person' : 'Organization',
        name: post.autor_nombre || 'Zyfit Academy',
      },
      publisher: { '@type': 'Organization', name: 'Zyfit Academy' },
      datePublished: post.publicado_en ?? post.created_at,
      dateModified: post.updated_at,
      ...(post.etiquetas.length > 0 ? { keywords: post.etiquetas.join(', ') } : {}),
      mainEntityOfPage: window.location.href,
    })
    document.head.appendChild(ldJson)

    return () => {
      document.title = prevTitle
      if (createdMetaDesc) metaDesc?.remove()
      else if (prevDesc !== null) metaDesc?.setAttribute('content', prevDesc)
      ldJson.remove()
    }
  }, [post])

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
              {post.autor_nombre && (
                <>
                  <span>{t('blog.byAuthor', { author: post.autor_nombre })}</span>
                  <span aria-hidden>·</span>
                </>
              )}
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
