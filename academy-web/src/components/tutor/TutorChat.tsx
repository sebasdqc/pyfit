// Panel del Tutor IA de Zyfit Academy. Vive como drawer lateral sobre el
// reproductor de lecciones (no saca al alumno del flujo de estudio). Arranca con
// el contexto del curso/lección activos y muestra, en cada respuesta, las fuentes
// citadas (clicables si la lección pertenece a este curso) y feedback útil/no útil.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AxiosError } from 'axios'
import { Icon } from '@/components/Icon'
import { useDialogA11y } from '@/lib/useDialogA11y'
import {
  sendTutorMessage,
  sendTutorFeedback,
  type TutorFeedback,
  type TutorSource,
} from '@/api/tutor'

interface ChatMsg {
  key: string
  id?: number
  role: 'user' | 'assistant'
  contenido: string
  fuentes?: TutorSource[]
  redirigido?: boolean
  feedback?: TutorFeedback
  isError?: boolean
}

interface TutorChatProps {
  open: boolean
  onClose: () => void
  courseId: number
  cursoTitulo: string
  cursoActivo: string
  /** Ids de lección del curso actual — habilita el salto desde una fuente citada. */
  courseLessonIds?: Set<number>
  onSourceClick?: (lessonId: number) => void
}

let _keySeq = 0
const nextKey = () => `m${++_keySeq}`

export function TutorChat({
  open,
  onClose,
  courseId,
  cursoTitulo,
  cursoActivo,
  courseLessonIds,
  onSourceClick,
}: TutorChatProps) {
  const panelRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [cuota, setCuota] = useState<{ usados: number; limite: number; restantes: number } | null>(null)
  const [limitReached, setLimitReached] = useState(false)

  useDialogA11y(panelRef, { onClose, open })

  // Saludo inicial con el contexto del curso (no se persiste; es local).
  const greeting = useMemo<ChatMsg>(
    () => ({
      key: 'greeting',
      role: 'assistant',
      contenido: cursoTitulo
        ? `¡Hola! 👋 Soy tu tutor de Zyfit Academy. Puedo resolver dudas conceptuales sobre «${cursoTitulo}» y el resto del material. Pregúntame lo que quieras.`
        : '¡Hola! 👋 Soy tu tutor de Zyfit Academy. Pregúntame cualquier duda conceptual sobre el material de tus cursos.',
    }),
    [cursoTitulo],
  )

  useEffect(() => {
    if (open && messages.length === 0) setMessages([greeting])
  }, [open, greeting, messages.length])

  // Autofoco al abrir y autoscroll al fondo con cada mensaje / typing.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = useCallback(async () => {
    const texto = input.trim()
    if (!texto || sending) return
    setInput('')
    setMessages((prev) => [...prev, { key: nextKey(), role: 'user', contenido: texto }])
    setSending(true)
    try {
      const res = await sendTutorMessage({
        mensaje: texto,
        conversation_id: conversationId,
        course_id: courseId || null,
        curso_activo: cursoActivo,
      })
      setConversationId(res.conversation_id)
      setCuota(res.cuota)
      setMessages((prev) => [
        ...prev,
        {
          key: nextKey(),
          id: res.mensaje.id,
          role: 'assistant',
          contenido: res.mensaje.contenido,
          fuentes: res.mensaje.fuentes,
          redirigido: res.mensaje.redirigido,
          feedback: res.mensaje.feedback,
        },
      ])
    } catch (err) {
      const ax = err as AxiosError<{ code?: string; error?: string; cuota?: typeof cuota }>
      if (ax.response?.status === 429 && ax.response.data?.code === 'daily_limit') {
        setLimitReached(true)
        if (ax.response.data.cuota) setCuota(ax.response.data.cuota)
        setMessages((prev) => [
          ...prev,
          {
            key: nextKey(),
            role: 'assistant',
            isError: true,
            contenido:
              'Alcanzaste tu límite de preguntas por hoy. Vuelve mañana o mejora tu plan para seguir preguntando al tutor.',
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            key: nextKey(),
            role: 'assistant',
            isError: true,
            contenido: 'No pude responder ahora mismo. Revisa tu conexión e inténtalo de nuevo.',
          },
        ])
      }
    } finally {
      setSending(false)
    }
  }, [input, sending, conversationId, courseId, cursoActivo])

  const onFeedback = useCallback(async (msg: ChatMsg, value: 'util' | 'no_util') => {
    if (msg.id == null) return
    // Toggle optimista; revierte si falla.
    const anterior: TutorFeedback = msg.feedback ?? ''
    const nuevo: TutorFeedback = anterior === value ? '' : value
    setMessages((prev) => prev.map((m) => (m.key === msg.key ? { ...m, feedback: nuevo } : m)))
    try {
      await sendTutorFeedback(msg.id, nuevo || value)
    } catch {
      setMessages((prev) => prev.map((m) => (m.key === msg.key ? { ...m, feedback: anterior } : m)))
    }
  }, [])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-brand-deep/40" onClick={onClose} aria-hidden />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tutor de Zyfit Academy"
        tabIndex={-1}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-cardHover"
      >
        {/* Cabecera */}
        <header className="flex items-center gap-3 border-b border-surface-border px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Icon name="sparkles" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Tutor de Academy</p>
            <p className="truncate text-xs text-ink-muted">
              {cursoTitulo ? `Contexto: ${cursoTitulo}` : 'Dudas conceptuales de tus cursos'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar tutor"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <MessageBubble
              key={m.key}
              msg={m}
              courseLessonIds={courseLessonIds}
              onSourceClick={onSourceClick}
              onFeedback={onFeedback}
            />
          ))}
          {sending && <TypingDots />}
        </div>

        {/* Cuota */}
        {cuota && (
          <div className="border-t border-surface-border px-4 pt-2 text-center text-[11px] text-ink-muted">
            {cuota.restantes > 0
              ? `${cuota.restantes} de ${cuota.limite} preguntas restantes hoy`
              : 'Sin preguntas restantes hoy'}
          </div>
        )}

        {/* Entrada */}
        <div className="flex items-end gap-2 border-t border-surface-border px-4 py-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            disabled={sending || limitReached}
            placeholder={limitReached ? 'Alcanzaste tu límite de hoy' : 'Escribe tu duda…'}
            aria-label="Escribe tu pregunta al tutor"
            className="h-11 flex-1 rounded-xl border border-surface-border bg-surface-soft px-3.5 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={sending || limitReached || !input.trim()}
            aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Burbuja de mensaje ──────────────────────────────────────────────────────

function MessageBubble({
  msg,
  courseLessonIds,
  onSourceClick,
  onFeedback,
}: {
  msg: ChatMsg
  courseLessonIds?: Set<number>
  onSourceClick?: (lessonId: number) => void
  onFeedback: (msg: ChatMsg, value: 'util' | 'no_util') => void
}) {
  const isUser = msg.role === 'user'
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-sm bg-accent px-3.5 py-2.5 text-sm text-white">
          {msg.contenido}
        </div>
      </div>
    )
  }

  // Fuentes únicas por (lección) para no repetir el mismo módulo.
  const fuentes = dedupeSources(msg.fuentes ?? [])

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div
        className={`max-w-[90%] whitespace-pre-line rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm ${
          msg.isError ? 'bg-danger/10 text-danger' : 'bg-surface-soft text-ink'
        }`}
      >
        {msg.contenido}
      </div>

      {fuentes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {fuentes.map((f) => {
            const clickable = onSourceClick && courseLessonIds?.has(f.lesson_id)
            const label = f.modulo ? `${f.modulo}` : f.leccion
            const chipClass =
              'inline-flex items-center gap-1 rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-soft'
            return clickable ? (
              <button
                key={f.chunk_id}
                onClick={() => onSourceClick!(f.lesson_id)}
                className={`${chipClass} transition-colors hover:border-accent hover:text-accent`}
                title={`Ir a: ${f.leccion}`}
              >
                <Icon name="doc" size={12} /> {label}
              </button>
            ) : (
              <span key={f.chunk_id} className={chipClass} title={f.leccion}>
                <Icon name="doc" size={12} /> {label}
              </span>
            )
          })}
        </div>
      )}

      {/* Feedback útil/no útil (solo respuestas persistidas de la IA). */}
      {msg.id != null && !msg.isError && (
        <div className="flex items-center gap-1 pl-1">
          <button
            onClick={() => onFeedback(msg, 'util')}
            aria-label="Respuesta útil"
            aria-pressed={msg.feedback === 'util'}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-soft ${
              msg.feedback === 'util' ? 'text-ok' : 'text-ink-muted'
            }`}
          >
            <Icon name="thumbUp" size={14} />
          </button>
          <button
            onClick={() => onFeedback(msg, 'no_util')}
            aria-label="Respuesta no útil"
            aria-pressed={msg.feedback === 'no_util'}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-soft ${
              msg.feedback === 'no_util' ? 'text-danger' : 'text-ink-muted'
            }`}
          >
            <Icon name="thumbDown" size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 pl-1" role="status" aria-label="El tutor está escribiendo">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-ink-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function dedupeSources(sources: TutorSource[]): TutorSource[] {
  const seen = new Set<number>()
  const out: TutorSource[] = []
  for (const s of sources) {
    if (seen.has(s.lesson_id)) continue
    seen.add(s.lesson_id)
    out.push(s)
  }
  return out
}
