// Soporte de Zyfit Academy — /soporte. Dos pestañas: FAQ (estática, admin la
// administra vía Django Admin) y Chat con soporte. El chat es REST + polling
// cada 5s (sin WebSockets), mismo criterio que el chat coach↔atleta de la app
// móvil — ver mobile/CLAUDE.md ("Chat por polling de 5s") y
// academy.support_service en el backend.

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getSupportChat, getSupportFAQ, sendSupportMessage } from '@/api/academy'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { useT } from '@/locale/useT'
import type { SupportFAQItem, SupportMessageItem } from '@/types'

const POLL_MS = 5000

type Tab = 'faq' | 'chat'

export function SupportPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('faq')

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header>
        <p className="za-eyebrow">{t('support.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{t('support.title')}</h1>
      </header>

      <div className="flex gap-1 border-b border-surface-border">
        <TabButton active={tab === 'faq'} onClick={() => setTab('faq')} label={t('support.tabFaq')} />
        <TabButton active={tab === 'chat'} onClick={() => setTab('chat')} label={t('support.tabChat')} />
      </div>

      {tab === 'faq' ? <FaqList /> : <SupportChat />}
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function FaqList() {
  const t = useT()
  const [faqs, setFaqs] = useState<SupportFAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    getSupportFAQ()
      .then((data) => active && setFaqs(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={32} />
      </div>
    )
  }
  if (error) {
    return <EmptyState icon="doc" title={t('support.faqErrorTitle')} description={t('support.faqErrorBody')} />
  }
  if (faqs.length === 0) {
    return <EmptyState icon="doc" title={t('support.faqEmptyTitle')} description={t('support.faqEmptyBody')} />
  }

  return (
    <div className="flex flex-col gap-2">
      {faqs.map((f) => {
        const open = openId === f.id
        return (
          <div key={f.id} className="za-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : f.id)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-ink">{f.pregunta}</span>
              <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} className="shrink-0 text-ink-muted" />
            </button>
            {open && (
              <p className="border-t border-surface-border px-5 py-4 text-sm leading-relaxed text-ink-soft">
                {f.respuesta}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SupportChat() {
  const t = useT()
  const [mensajes, setMensajes] = useState<SupportMessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    function reload() {
      return getSupportChat()
        .then((data) => active && setMensajes(data.mensajes))
        .catch(() => active && setError(true))
        .finally(() => active && setLoading(false))
    }
    reload()
    const id = setInterval(reload, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

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
      const msg = await sendSupportMessage(trimmed)
      setMensajes((prev) => [...prev, msg])
    } catch {
      setTexto(trimmed)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="za-card flex h-[60vh] flex-col overflow-hidden">
      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {mensajes.length === 0 && !error && (
          <p className="m-auto max-w-xs text-center text-sm text-ink-muted">{t('support.chatEmpty')}</p>
        )}
        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              m.from_admin ? 'self-start bg-surface-soft text-ink' : 'self-end bg-accent text-white'
            }`}
          >
            {m.texto}
          </div>
        ))}
        {error && <p className="m-auto text-sm text-danger">{t('support.chatError')}</p>}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-surface-border p-3">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t('support.chatPlaceholder')}
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={sending || !texto.trim()}
          aria-label={t('support.chatSend')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white hover:bg-accent-dark disabled:opacity-60"
        >
          <Icon name="send" size={17} />
        </button>
      </form>
    </div>
  )
}
