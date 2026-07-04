// Tarjeta resumen de una pregunta en el listado de Comunidad.

import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { timeAgo } from '@/lib/timeAgo'
import type { CommunityPost } from '@/types'

export function PostCard({ post }: { post: CommunityPost }) {
  return (
    <Link
      to={`/comunidad/${post.id}`}
      className="za-card flex flex-col gap-3 p-5 transition-shadow hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-[15px] font-semibold text-ink">{post.titulo}</h3>
        {post.mejor_respuesta && <Badge tone="ok">Resuelta</Badge>}
      </div>
      <p className="line-clamp-2 break-words text-sm text-ink-soft">{post.contenido}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Avatar name={post.autor_nombre} size={20} />
        <span>{post.autor_nombre}</span>
        <span>·</span>
        <span>{timeAgo(post.created_at)}</span>
        {post.curso_titulo && (
          <>
            <span>·</span>
            <Badge tone="accent">{post.curso_titulo}</Badge>
          </>
        )}
        <span className="ml-auto font-medium text-ink-soft">
          {post.respuestas_count} {post.respuestas_count === 1 ? 'respuesta' : 'respuestas'}
        </span>
      </div>
    </Link>
  )
}
