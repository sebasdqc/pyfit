// Hilo de soporte de un estudiante puntual, del lado del admin —
// /admin/soporte/:studentId. Mismo criterio de polling (5s) que
// SupportPage.tsx (lado del estudiante).

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSupportThread, sendSupportThreadReply } from '@/api/academy'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/auth/useAuth'
import { useT } from '@/locale/useT'
import type { SupportMessageItem } from '@/types'

const POLL_MS = 5000

export function SupportAdminThreadPage() {
  const t = useT()
  const { user } = useAuth()
  const { studentId } = useParams()
  const id = Number(studentId)

  const [student, setStudent] = useState<{ id: number; nombre: string; email: string } | null>(null)
  const [mensajes, setMensajes] = useState<SupportMessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    function reload() {
      return getSupportThread(id)
        .then((data) => {
          if (!active) return
          setStudent(data.student)
          setMensajes(data.mensajes)
        })
        .catch(() => active && setError(true))
        .finally(() => active && setLoading(false))
    }
    reload()
    const interval = setInterval(reload, POLL_MS)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [id])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = texto.trim()
    if (!trimmed || sending) return
    setSending(true)
    setTexto('')
    try {
      const msg = await sendSupportThreadReply(id, trimmed)
      setMensajes((prev) => [...prev, msg])
    } catch {
      setTexto(trimmed)
    } finally {
      setSending(false)
    }
  }

  if (!user?.is_admin) {
    return (
      <EmptyState
        icon="shield"
        title={t('adminSupport.accessDeniedTitle')}
        description={t('adminSupport.accessDeniedBody')}
      />
    )
  }
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={40} />
      </div>
    )
  }
  if (error || !student) {
    return (
      <EmptyState
        icon="instructor"
        title={t('adminSupport.threadErrorTitle')}
        description={t('adminSupport.threadErrorBody')}
        action={
          <Link to="/admin/soporte" className="text-sm font-medium text-accent hover:text-accent-dark">
            {t('adminSupport.backToInbox')}
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          to="/admin/soporte"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent"
        >
          <Icon name="chevronLeft" size={16} /> {t('adminSupport.backToInbox')}
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">{student.nombre}</h1>
        <p className="mt-1 text-sm text-ink-muted">{student.email}</p>
      </div>

      <div className="za-card flex h-[60vh] flex-col overflow-hidden">
        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {mensajes.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.from_admin ? 'self-end bg-accent text-white' : 'self-start bg-surface-soft text-ink'
              }`}
            >
              {m.texto}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-surface-border p-3">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t('adminSupport.chatPlaceholder')}
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={sending || !texto.trim()}
            aria-label={t('adminSupport.chatSend')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white hover:bg-accent-dark disabled:opacity-60"
          >
            <Icon name="send" size={17} />
          </button>
        </form>
      </div>
    </div>
  )
}
