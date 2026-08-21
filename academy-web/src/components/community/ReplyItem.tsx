// Una respuesta dentro del hilo de una pregunta: voto, indicador de "mejor
// respuesta" y acciones (marcar mejor respuesta / reportar) discretas.

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/Icon'
import { timeAgo } from '@/lib/timeAgo'
import type { CommunityReply } from '@/types'

export function ReplyItem({
  reply,
  canMarkBest,
  isOwn,
  onVote,
  onMarkBest,
  onReport,
}: {
  reply: CommunityReply
  canMarkBest: boolean
  isOwn: boolean
  onVote: () => void
  onMarkBest: () => void
  onReport: () => void
}) {
  return (
    <div className={`za-card flex flex-col gap-2.5 p-4 ${reply.es_mejor_respuesta ? 'ring-2 ring-ok/40' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Avatar name={reply.autor_nombre} size={22} />
          <span className="font-medium text-ink-soft">{reply.autor_nombre}</span>
          <span>·</span>
          <span>{timeAgo(reply.created_at)}</span>
        </div>
        {reply.es_mejor_respuesta && (
          <Badge tone="ok">
            <Icon name="check" size={12} />
            Mejor respuesta
          </Badge>
        )}
      </div>

      <p className="whitespace-pre-wrap break-words text-sm text-ink">{reply.contenido}</p>

      <div className="flex items-center gap-3 pt-1 text-xs">
        <button
          type="button"
          onClick={onVote}
          disabled={isOwn}
          title={isOwn ? 'No puedes votar tu propia respuesta' : 'Votar como útil'}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-ink-soft transition-colors hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="thumbUp" size={14} />
          {reply.votos_count}
        </button>

        {canMarkBest && !reply.es_mejor_respuesta && (
          <button
            type="button"
            onClick={onMarkBest}
            className="rounded-lg px-2.5 py-2 font-medium text-accent transition-colors hover:bg-accent/10"
          >
            Marcar como mejor respuesta
          </button>
        )}

        {!isOwn && (
          <button
            type="button"
            onClick={onReport}
            className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-2 text-ink-muted transition-colors hover:text-danger"
          >
            <Icon name="flag" size={13} />
            Reportar
          </button>
        )}
      </div>
    </div>
  )
}
