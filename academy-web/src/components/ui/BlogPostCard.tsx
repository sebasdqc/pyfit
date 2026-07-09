// Tarjeta de artículo del blog. Si el post tiene `portada` se muestra la
// imagen; si no, se genera una portada temática con el color/motivo de su
// escuela (schoolTheme) — mismo criterio que CourseCard.

import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { Badge } from './Badge'
import { schoolTheme, schoolGradient } from '@/lib/schoolTheme'
import { useLocale } from '@/locale/useLocale'
import { useT } from '@/locale/useT'
import type { BlogPost } from '@/types'

export function BlogPostCard({ post, to }: { post: BlogPost; to: string }) {
  const t = useT()
  const { locale } = useLocale()
  const hasPortada = Boolean(post.portada)
  const theme = schoolTheme(post.escuela_slug)
  const fecha = post.publicado_en ?? post.created_at
  const fechaFmt = new Date(fecha).toLocaleDateString(locale === 'en' ? 'en' : 'es', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <Link
      to={to}
      className="group za-card overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
    >
      <div className="relative h-36 overflow-hidden" style={hasPortada ? undefined : { backgroundImage: schoolGradient(theme) }}>
        {hasPortada ? (
          <img src={post.portada} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <>
            <div className="pointer-events-none absolute -right-5 -top-5 text-white/10 transition-transform duration-300 group-hover:scale-110">
              <Icon name={theme.icon} size={150} strokeWidth={1.2} />
            </div>
            <div className="relative flex h-full flex-col justify-between p-4">
              {post.escuela_nombre && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  {post.escuela_nombre}
                </span>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
                <Icon name="blog" size={18} />
              </span>
            </div>
          </>
        )}
        {!post.publicado && (
          <span className="absolute right-3 top-3 rounded-full bg-warn px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            {t('blog.draftBadge')}
          </span>
        )}
      </div>

      <div className="p-4">
        {post.etiquetas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {post.etiquetas.slice(0, 3).map((tag) => (
              <Badge key={tag} tone="accent">{tag}</Badge>
            ))}
          </div>
        )}

        <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
          {post.titulo}
        </h3>
        {post.resumen && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{post.resumen}</p>}

        <div className="mt-3 flex items-center justify-between border-t border-surface-border pt-3 text-xs text-ink-muted">
          <span>{t('blog.byAuthor', { author: post.autor_nombre })}</span>
          <span>{fechaFmt}</span>
        </div>
      </div>
    </Link>
  )
}
