// Detalle de una pregunta de Comunidad: respuestas (mejor respuesta primero),
// voto, marcar mejor respuesta (solo el autor original de la pregunta) y
// reportar contenido. CTA opcional hacia el tutor IA si nadie respondió aún.

import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { useAuth } from '@/auth/useAuth'
import { createCommunityReply, getCommunityPost, markBestAnswer, voteCommunityReply } from '@/api/community'
import { ReplyItem } from '@/components/community/ReplyItem'
import { ReportDialog } from '@/components/community/ReportDialog'
import { Icon } from '@/components/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { timeAgo } from '@/lib/timeAgo'
import type { CommunityPostDetail } from '@/types'

export function QuestionDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const { user } = useAuth()

  const [post, setPost] = useState<CommunityPostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState('')

  const [contenido, setContenido] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')

  const [reportTarget, setReportTarget] = useState<{ postId?: number; replyId?: number } | null>(null)

  function fetchPost() {
    if (!postId) return Promise.resolve()
    return getCommunityPost(Number(postId)).then(setPost).catch(() => setLoadError(true))
  }

  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    fetchPost().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  async function handleReply(e: FormEvent) {
    e.preventDefault()
    if (!post || !contenido.trim()) return
    setSubmitting(true)
    setReplyError('')
    try {
      await createCommunityReply(post.id, contenido.trim())
      setContenido('')
      await fetchPost()
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string }>
      setReplyError(ax.response?.data?.detail ?? 'No se pudo publicar la respuesta.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVote(replyId: number) {
    setActionError('')
    try {
      await voteCommunityReply(replyId)
      await fetchPost()
    } catch {
      setActionError('No se pudo registrar el voto.')
    }
  }

  async function handleMarkBest(replyId: number) {
    if (!post) return
    setActionError('')
    try {
      const updated = await markBestAnswer(post.id, replyId)
      setPost(updated)
    } catch {
      setActionError('No se pudo marcar la mejor respuesta.')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={40} /></div>

  if (loadError || !post) {
    return (
      <EmptyState
        icon="catalog"
        title="No se pudo cargar la pregunta"
        description="Puede que ya no esté disponible."
        action={<Link to="/comunidad" className="text-sm font-medium text-accent">Volver a Comunidad</Link>}
      />
    )
  }

  const esAutor = user?.id === post.autor
  const sinRespuestas = post.respuestas.length === 0

  return (
    <div className="flex flex-col gap-6">
      <Link to="/comunidad" className="flex w-fit items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <Icon name="chevronLeft" size={16} />
        Comunidad
      </Link>

      <div className="za-card flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {post.curso_titulo && <Badge tone="accent">{post.curso_titulo}</Badge>}
          {post.mejor_respuesta && <Badge tone="ok">Resuelta</Badge>}
        </div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{post.titulo}</h1>
        <p className="whitespace-pre-wrap text-sm text-ink-soft">{post.contenido}</p>
        <div className="flex items-center gap-2 pt-1 text-xs text-ink-muted">
          <Avatar name={post.autor_nombre} size={22} />
          <span className="font-medium text-ink-soft">{post.autor_nombre}</span>
          <span>·</span>
          <span>{timeAgo(post.created_at)}</span>
          {!esAutor && (
            <button
              type="button"
              onClick={() => setReportTarget({ postId: post.id })}
              className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-ink-muted transition-colors hover:text-danger"
            >
              <Icon name="flag" size={13} />
              Reportar
            </button>
          )}
        </div>
      </div>

      {sinRespuestas && post.curso && (
        <div className="za-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">¿Nadie respondió todavía? Probá con el tutor IA del curso.</p>
          <Link
            to={`/cursos/${post.curso}`}
            className="flex w-fit shrink-0 items-center gap-1.5 rounded-xl bg-accent/10 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20"
          >
            <Icon name="sparkles" size={15} />
            Preguntarle al tutor
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {post.respuestas.length} {post.respuestas.length === 1 ? 'respuesta' : 'respuestas'}
        </h2>

        {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}

        {post.respuestas.length === 0 ? (
          <p className="text-sm text-ink-muted">Todavía no hay respuestas. ¡Sé el primero!</p>
        ) : (
          post.respuestas.map((r) => (
            <ReplyItem
              key={r.id}
              reply={r}
              canMarkBest={esAutor}
              isOwn={user?.id === r.autor}
              onVote={() => handleVote(r.id)}
              onMarkBest={() => handleMarkBest(r.id)}
              onReport={() => setReportTarget({ replyId: r.id })}
            />
          ))
        )}
      </section>

      <form onSubmit={handleReply} className="za-card flex flex-col gap-3 p-5">
        <label className="flex flex-col gap-1.5 text-sm text-ink-soft" htmlFor="nueva-respuesta">
          Tu respuesta
        </label>
        <textarea
          id="nueva-respuesta"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={3}
          maxLength={3000}
          className="input !h-auto py-3"
          placeholder="Compartí tu experiencia o ayudá a resolver la duda…"
        />
        {replyError && <p role="alert" className="text-sm text-danger">{replyError}</p>}
        <button
          type="submit"
          disabled={submitting || !contenido.trim()}
          className="self-end rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting ? 'Publicando…' : 'Responder'}
        </button>
      </form>

      {reportTarget && (
        <ReportDialog
          postId={reportTarget.postId}
          replyId={reportTarget.replyId}
          onClose={() => setReportTarget(null)}
          onReported={() => setReportTarget(null)}
        />
      )}
    </div>
  )
}
