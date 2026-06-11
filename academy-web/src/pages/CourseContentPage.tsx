// Contenido del curso (instructor/admin): árbol módulos→lecciones enfocado en
// los VIDEOS — anexar/cambiar/quitar la URL del video de una lección de video,
// el enlace de reunión de una sesión en vivo, o convertir una lectura en
// lección de video (queda con placeholder hasta anexar la URL). Consume
// GET /courses/:id/ (el autor ve el árbol completo) y PATCH de la lección.

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCourse, updateLesson } from '@/api/academy'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon, type IconName } from '@/components/Icon'
import { useAuth } from '@/auth/useAuth'
import { toEmbedUrl } from '@/lib/videoEmbed'
import type { CourseDetail, Lesson, LessonTipo } from '@/types'

const TYPE_LABEL: Record<LessonTipo, string> = {
  video: 'Video',
  texto: 'Lectura',
  quiz: 'Evaluación',
  en_vivo: 'Sesión en vivo',
  practica: 'Práctica presencial',
  entregable: 'Entregable',
}
const TYPE_ICON: Record<LessonTipo, IconName> = {
  video: 'play',
  texto: 'doc',
  quiz: 'quiz',
  en_vivo: 'live',
  practica: 'pitch',
  entregable: 'upload',
}

// Qué edita el modal según la lección: el video de una lección de video, el
// enlace de la reunión de una sesión en vivo, o la conversión lectura→video.
type EditMode = 'video' | 'en_vivo' | 'convertir'

interface Editing {
  moduleId: number
  lesson: Lesson
  mode: EditMode
}

export function CourseContentPage() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const id = Number(courseId)

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getCourse(id)
      .then((c) => active && setCourse(c))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  // Reemplaza la lección actualizada dentro del árbol local (sin recargar todo).
  function onLessonSaved(updated: Lesson, msg: string) {
    setCourse((prev) =>
      prev
        ? {
            ...prev,
            modulos: prev.modulos.map((m) =>
              m.id === updated.module
                ? { ...m, lecciones: m.lecciones.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)) }
                : m,
            ),
          }
        : prev,
    )
    setSavedMsg(msg)
    setEditing(null)
  }

  if (!user?.puede_crear_cursos) {
    return (
      <EmptyState
        icon="instructor"
        title="Área de instructores"
        description="Tu cuenta no tiene permisos de instructor. Contacta al administrador para gestionar contenido."
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
  if (error || !course) {
    return (
      <EmptyState
        icon="instructor"
        title="No se pudo cargar el contenido"
        description="Verifica que el curso exista y que tengas permisos de instructor sobre él."
        action={
          <Link to="/instructor" className="text-sm font-medium text-accent hover:text-accent-dark">
            ← Mis cursos
          </Link>
        }
      />
    )
  }

  const videoLessons = course.modulos.flatMap((m) => m.lecciones).filter((l) => l.tipo === 'video')
  const sinVideo = videoLessons.filter((l) => !l.video_url).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/instructor"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent"
        >
          <Icon name="chevronLeft" size={16} /> Mis cursos
        </Link>
        <p className="za-eyebrow mt-4">Contenido · {course.titulo}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Videos del curso</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {videoLessons.length === 0
            ? 'Este curso aún no tiene lecciones de video. Puedes convertir una lectura en lección de video.'
            : sinVideo === 0
              ? 'Todas las lecciones de video tienen su video anexado.'
              : `${sinVideo} de ${videoLessons.length} lección${videoLessons.length !== 1 ? 'es' : ''} de video sin video anexado — los estudiantes ven un placeholder hasta que lo publiques.`}
        </p>
      </div>

      {/* Resultado de la última acción (para lectores de pantalla y como confirmación) */}
      <p aria-live="polite" className={savedMsg ? 'text-sm font-medium text-ok' : 'sr-only'}>
        {savedMsg}
      </p>

      <div className="flex flex-col gap-4">
        {course.modulos.length === 0 && (
          <p className="text-sm text-ink-muted">Este curso aún no tiene módulos.</p>
        )}
        {course.modulos.map((m, i) => (
          <section key={m.id} className="za-card overflow-hidden">
            <header className="flex items-center gap-3 border-b border-surface-border bg-surface-soft px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
                {i + 1}
              </span>
              <h2 className="text-sm font-semibold text-ink">{m.titulo}</h2>
            </header>
            <div className="divide-y divide-surface-border">
              {m.lecciones.map((l) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  onEdit={(mode) => {
                    setSavedMsg('')
                    setEditing({ moduleId: m.id, lesson: l, mode })
                  }}
                />
              ))}
              {m.lecciones.length === 0 && (
                <p className="px-4 py-3 text-sm text-ink-muted">Sin lecciones aún.</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <AttachVideoDialog
          courseId={id}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={onLessonSaved}
        />
      )}
    </div>
  )
}

function LessonRow({ lesson, onEdit }: { lesson: Lesson; onEdit: (mode: EditMode) => void }) {
  const editable = lesson.tipo === 'video' || lesson.tipo === 'en_vivo' || lesson.tipo === 'texto'
  const mode: EditMode = lesson.tipo === 'video' ? 'video' : lesson.tipo === 'en_vivo' ? 'en_vivo' : 'convertir'
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <Icon name={TYPE_ICON[lesson.tipo]} size={17} className="shrink-0 text-accent" />
      <span className="min-w-0 flex-1 text-sm text-ink">{lesson.titulo}</span>
      <span className="text-xs text-ink-muted">{TYPE_LABEL[lesson.tipo]}</span>

      {lesson.tipo === 'video' &&
        (lesson.video_url ? <Badge tone="ok">Video anexado</Badge> : <Badge tone="warn">Sin video</Badge>)}
      {lesson.tipo === 'en_vivo' &&
        (lesson.video_url ? <Badge tone="ok">Enlace listo</Badge> : <Badge tone="warn">Sin enlace</Badge>)}

      {editable && (
        <button
          onClick={() => onEdit(mode)}
          className={[
            'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors',
            mode === 'convertir'
              ? 'text-ink-muted hover:bg-surface-soft hover:text-ink'
              : 'border border-surface-border text-ink-soft hover:bg-surface-soft hover:text-ink',
          ].join(' ')}
        >
          <Icon name={mode === 'convertir' ? 'play' : 'plus'} size={14} />
          {mode === 'convertir'
            ? 'Convertir a video'
            : lesson.video_url
              ? mode === 'en_vivo'
                ? 'Cambiar enlace'
                : 'Cambiar video'
              : mode === 'en_vivo'
                ? 'Anexar enlace'
                : 'Anexar video'}
        </button>
      )}
    </div>
  )
}

// ── Modal para anexar/quitar el video (o el enlace de la sesión en vivo) ──────

const COPY: Record<EditMode, { title: string; help: string; placeholder: string }> = {
  video: {
    title: 'Anexar video a la lección',
    help: 'Pega la URL del video (YouTube o Vimeo se reproducen embebidos; otras URLs se abren en pestaña nueva). Déjala vacía para mostrar el placeholder de "video en producción".',
    placeholder: 'https://www.youtube.com/watch?v=…',
  },
  en_vivo: {
    title: 'Enlace de la sesión en vivo',
    help: 'Pega el enlace de la reunión (Zoom, Meet, etc.). Los estudiantes verán el botón "Unirse a la sesión".',
    placeholder: 'https://meet.google.com/…',
  },
  convertir: {
    title: 'Convertir en lección de video',
    help: 'La lección pasará a ser de video y su texto quedará como material de apoyo. Puedes anexar la URL ahora o dejarla vacía (placeholder de "video en producción").',
    placeholder: 'https://www.youtube.com/watch?v=… (opcional)',
  },
}

function AttachVideoDialog({
  courseId,
  editing,
  onClose,
  onSaved,
}: {
  courseId: number
  editing: Editing
  onClose: () => void
  onSaved: (lesson: Lesson, msg: string) => void
}) {
  const { lesson, moduleId, mode } = editing
  const [url, setUrl] = useState(lesson.video_url)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = url.trim()
  const embed = useMemo(() => toEmbedUrl(trimmed), [trimmed])
  const urlValida = !trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!urlValida) {
      setError('La URL debe empezar con http:// o https://')
      return
    }
    await save({ video_url: trimmed, ...(mode === 'convertir' ? { tipo: 'video' as const } : {}) },
      mode === 'convertir'
        ? `"${lesson.titulo}" ahora es una lección de video.`
        : trimmed
          ? `Video de "${lesson.titulo}" guardado.`
          : `Video de "${lesson.titulo}" quitado: los estudiantes verán el placeholder.`)
  }

  // Una lección de video sin URL puede volver a ser lectura (deshacer).
  async function volverALectura() {
    await save({ tipo: 'texto', video_url: '' }, `"${lesson.titulo}" volvió a ser una lectura.`)
  }

  async function save(payload: { tipo?: LessonTipo; video_url?: string }, msg: string) {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateLesson(courseId, moduleId, lesson.id, payload)
      onSaved(updated, msg)
    } catch {
      setError('No se pudo guardar. Revisa la URL y tu conexión, e inténtalo de nuevo.')
      setSaving(false)
    }
  }

  const copy = COPY[mode]

  return (
    <Dialog
      onClose={onClose}
      labelledBy="attach-video-title"
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-white p-6 shadow-cardHover"
    >
      <div className="flex items-center justify-between">
        <h2 id="attach-video-title" className="text-lg font-semibold text-ink">
          {copy.title}
        </h2>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{lesson.titulo}</p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
            URL del {mode === 'en_vivo' ? 'enlace' : 'video'}
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={copy.placeholder}
            className="input"
            inputMode="url"
            data-autofocus
          />
        </label>
        <p className="text-xs text-ink-muted">{copy.help}</p>

        {/* Vista previa del embed para confirmar que la URL es la correcta */}
        {embed ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-surface-border bg-black">
            <iframe src={embed} title={`Vista previa de ${lesson.titulo}`} className="h-full w-full" allowFullScreen />
          </div>
        ) : (
          trimmed &&
          urlValida &&
          mode !== 'en_vivo' && (
            <p className="rounded-xl border border-surface-border bg-surface-soft px-4 py-3 text-xs text-ink-soft">
              No es una URL de YouTube/Vimeo: los estudiantes la abrirán en una pestaña nueva.
            </p>
          )
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
          {mode === 'video' && (
            <button
              type="button"
              onClick={volverALectura}
              disabled={saving}
              className="mr-auto h-10 rounded-xl px-3 text-sm font-medium text-ink-muted hover:bg-surface-soft hover:text-ink disabled:opacity-60"
            >
              Volver a lectura
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-sm font-medium text-ink-soft hover:bg-surface-soft"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
