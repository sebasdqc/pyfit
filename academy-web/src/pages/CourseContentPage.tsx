// Contenido del curso (instructor/admin): árbol módulos→lecciones editable.
// Crear/editar/borrar/reordenar módulos y lecciones (texto/video), más el
// flujo ya existente de anexar/cambiar/quitar video o convertir una lectura
// en lección de video. Consume GET /courses/:id/ (el autor ve el árbol
// completo) + los endpoints de autoría anidados de módulos/lecciones.
//
// Fuera de alcance a propósito (queda para una iteración aparte): el editor
// de quiz/preguntas — el backend ya lo soporta (`lessons/<id>/quiz/`,
// `quizzes/<id>/questions/`) pero el banco de preguntas con clave oculta es
// una pieza de UI bastante más grande que módulos/lecciones.

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createLesson, createModule, deleteLesson, deleteModule, getCourse, updateLesson, updateModule,
} from '@/api/academy'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon, type IconName } from '@/components/Icon'
import { useAuth } from '@/auth/useAuth'
import { toEmbedUrl } from '@/lib/videoEmbed'
import type { CourseDetail, Lesson, LessonTipo, Module } from '@/types'

const TYPE_LABEL: Record<LessonTipo, string> = {
  video: 'Video',
  texto: 'Lectura',
  audio: 'Audio',
  quiz: 'Evaluación',
  en_vivo: 'Sesión en vivo',
  practica: 'Práctica presencial',
  entregable: 'Entregable',
}
const TYPE_ICON: Record<LessonTipo, IconName> = {
  video: 'play',
  texto: 'doc',
  audio: 'audio',
  quiz: 'quiz',
  en_vivo: 'live',
  practica: 'pitch',
  entregable: 'upload',
}

// El editor de creación solo ofrece los dos tipos que puede producir de punta
// a punta (texto/video); el resto de tipos (quiz, en_vivo, práctica,
// entregable) siguen dependiendo de comandos de seed o del admin.
const TIPOS_CREABLES: LessonTipo[] = ['texto', 'video']

function nextOrden(items: { orden: number }[]): number {
  return items.length ? Math.max(...items.map((i) => i.orden)) + 1 : 1
}

// Qué edita el modal de video según la lección: el video de una lección de
// video, el enlace de la reunión de una sesión en vivo, o la conversión
// lectura→video.
type VideoEditMode = 'video' | 'en_vivo' | 'convertir'

interface VideoEditing {
  moduleId: number
  lesson: Lesson
  mode: VideoEditMode
}

export function CourseContentPage() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const id = Number(courseId)

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const [videoEditing, setVideoEditing] = useState<VideoEditing | null>(null)
  const [showCreateModule, setShowCreateModule] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [creatingLessonIn, setCreatingLessonIn] = useState<Module | null>(null)
  const [editingLessonInfo, setEditingLessonInfo] = useState<{ moduleId: number; lesson: Lesson } | null>(null)

  function reload() {
    setLoading(true)
    setError(false)
    return getCourse(id)
      .then(setCourse)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [id])

  async function onMutated(msg: string) {
    setSavedMsg(msg)
    await reload()
  }

  // Reordenar = intercambiar `orden` con el vecino adyacente (arriba/abajo).
  // Sin drag-and-drop: dos PATCH y se recarga el árbol desde el backend, que
  // es la fuente de verdad del orden real. `busy` se mantiene true hasta que
  // el reload completa (no solo los PATCH) para que un doble clic no dispare
  // un segundo swap sobre el array `modules`/`lecciones` todavía desactualizado.
  async function moveModule(modules: Module[], index: number, dir: -1 | 1) {
    const other = modules[index + dir]
    if (!other || busy) return
    setBusy(true)
    try {
      const a = modules[index]
      await Promise.all([
        updateModule(id, a.id, { orden: other.orden }),
        updateModule(id, other.id, { orden: a.orden }),
      ])
      await onMutated('Orden actualizado.')
    } catch {
      window.alert('No se pudo reordenar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function moveLesson(lecciones: Lesson[], moduleId: number, index: number, dir: -1 | 1) {
    const other = lecciones[index + dir]
    if (!other || busy) return
    setBusy(true)
    try {
      const a = lecciones[index]
      await Promise.all([
        updateLesson(id, moduleId, a.id, { orden: other.orden }),
        updateLesson(id, moduleId, other.id, { orden: a.orden }),
      ])
      await onMutated('Orden actualizado.')
    } catch {
      window.alert('No se pudo reordenar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/instructor"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent"
          >
            <Icon name="chevronLeft" size={16} /> Mis cursos
          </Link>
          <p className="za-eyebrow mt-4">Contenido · {course.titulo}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Módulos y lecciones</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {videoLessons.length === 0
              ? 'Agrega módulos y lecciones para construir el temario del curso.'
              : sinVideo === 0
                ? 'Todas las lecciones de video tienen su video anexado.'
                : `${sinVideo} de ${videoLessons.length} lección${videoLessons.length !== 1 ? 'es' : ''} de video sin video anexado.`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModule(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          <Icon name="plus" size={16} /> Agregar módulo
        </button>
      </div>

      {/* Resultado de la última acción (para lectores de pantalla y como confirmación) */}
      <p aria-live="polite" className={savedMsg ? 'text-sm font-medium text-ok' : 'sr-only'}>
        {savedMsg}
      </p>

      <div className="flex flex-col gap-4">
        {course.modulos.length === 0 && (
          <EmptyState
            icon="layers"
            title="Este curso aún no tiene módulos"
            description="Agrega el primer módulo para empezar a construir el temario."
          />
        )}
        {course.modulos.map((m, i) => (
          <section key={m.id} className="za-card overflow-hidden">
            <header className="flex items-center gap-3 border-b border-surface-border bg-surface-soft px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
                {i + 1}
              </span>
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{m.titulo}</h2>
              {m.es_gratuito && <Badge tone="ok">Gratis</Badge>}
              <ReorderButtons
                disabled={busy}
                canUp={i > 0}
                canDown={i < course.modulos.length - 1}
                onUp={() => moveModule(course.modulos, i, -1)}
                onDown={() => moveModule(course.modulos, i, 1)}
              />
              <IconButton icon="edit" label={`Editar módulo "${m.titulo}"`} onClick={() => setEditingModule(m)} />
            </header>
            <div className="divide-y divide-surface-border">
              {m.lecciones.map((l, li) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  busy={busy}
                  canUp={li > 0}
                  canDown={li < m.lecciones.length - 1}
                  onMoveUp={() => moveLesson(m.lecciones, m.id, li, -1)}
                  onMoveDown={() => moveLesson(m.lecciones, m.id, li, 1)}
                  onEditInfo={() => setEditingLessonInfo({ moduleId: m.id, lesson: l })}
                  onEditVideo={(mode) => {
                    setSavedMsg('')
                    setVideoEditing({ moduleId: m.id, lesson: l, mode })
                  }}
                />
              ))}
              {m.lecciones.length === 0 && (
                <p className="px-4 py-3 text-sm text-ink-muted">Sin lecciones aún.</p>
              )}
              <div className="px-4 py-3">
                <button
                  onClick={() => setCreatingLessonIn(m)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-accent hover:bg-accent/10"
                >
                  <Icon name="plus" size={15} /> Agregar lección
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      {showCreateModule && (
        <ModuleFormDialog
          courseId={id}
          onClose={() => setShowCreateModule(false)}
          onSaved={(msg) => {
            setShowCreateModule(false)
            onMutated(msg)
          }}
          existingOrders={course.modulos}
        />
      )}
      {editingModule && (
        <ModuleFormDialog
          courseId={id}
          module={editingModule}
          onClose={() => setEditingModule(null)}
          onSaved={(msg) => {
            setEditingModule(null)
            onMutated(msg)
          }}
          onDeleted={(msg) => {
            setEditingModule(null)
            onMutated(msg)
          }}
        />
      )}
      {creatingLessonIn && (
        <LessonFormDialog
          courseId={id}
          module={creatingLessonIn}
          onClose={() => setCreatingLessonIn(null)}
          onSaved={(msg) => {
            setCreatingLessonIn(null)
            onMutated(msg)
          }}
        />
      )}
      {editingLessonInfo && (
        <LessonInfoDialog
          courseId={id}
          moduleId={editingLessonInfo.moduleId}
          lesson={editingLessonInfo.lesson}
          onClose={() => setEditingLessonInfo(null)}
          onSaved={(msg) => {
            setEditingLessonInfo(null)
            onMutated(msg)
          }}
          onDeleted={(msg) => {
            setEditingLessonInfo(null)
            onMutated(msg)
          }}
        />
      )}
      {videoEditing && (
        <AttachVideoDialog
          courseId={id}
          editing={videoEditing}
          onClose={() => setVideoEditing(null)}
          onSaved={(msg) => {
            setVideoEditing(null)
            onMutated(msg)
          }}
        />
      )}
    </div>
  )
}

// ── Botones de reordenar (flechas arriba/abajo) ───────────────────────────────

function ReorderButtons({
  disabled, canUp, canDown, onUp, onDown,
}: {
  disabled: boolean; canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onUp}
        disabled={disabled || !canUp}
        aria-label="Mover arriba"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-white hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <Icon name="chevronDown" size={16} className="rotate-180" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={disabled || !canDown}
        aria-label="Mover abajo"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-white hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <Icon name="chevronDown" size={16} />
      </button>
    </div>
  )
}

function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-white hover:text-ink"
    >
      <Icon name={icon} size={16} />
    </button>
  )
}

// ── Fila de lección ────────────────────────────────────────────────────────────

function LessonRow({
  lesson, busy, canUp, canDown, onMoveUp, onMoveDown, onEditInfo, onEditVideo,
}: {
  lesson: Lesson
  busy: boolean
  canUp: boolean
  canDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onEditInfo: () => void
  onEditVideo: (mode: VideoEditMode) => void
}) {
  const videoEditable = lesson.tipo === 'video' || lesson.tipo === 'en_vivo' || lesson.tipo === 'texto'
  const mode: VideoEditMode = lesson.tipo === 'video' ? 'video' : lesson.tipo === 'en_vivo' ? 'en_vivo' : 'convertir'
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3">
      <ReorderButtons disabled={busy} canUp={canUp} canDown={canDown} onUp={onMoveUp} onDown={onMoveDown} />
      <Icon name={TYPE_ICON[lesson.tipo]} size={17} className="shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{lesson.titulo}</span>
      <span className="text-xs text-ink-muted">{TYPE_LABEL[lesson.tipo]}</span>

      {lesson.tipo === 'video' &&
        (lesson.video_url ? <Badge tone="ok">Video anexado</Badge> : <Badge tone="warn">Sin video</Badge>)}
      {lesson.tipo === 'en_vivo' &&
        (lesson.video_url ? <Badge tone="ok">Enlace listo</Badge> : <Badge tone="warn">Sin enlace</Badge>)}

      <IconButton icon="edit" label={`Editar "${lesson.titulo}"`} onClick={onEditInfo} />

      {videoEditable && (
        <button
          onClick={() => onEditVideo(mode)}
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

// ── Crear/editar módulo ─────────────────────────────────────────────────────────

function ModuleFormDialog({
  courseId, module, existingOrders, onClose, onSaved, onDeleted,
}: {
  courseId: number
  module?: Module
  existingOrders?: Module[]
  onClose: () => void
  onSaved: (msg: string) => void
  onDeleted?: (msg: string) => void
}) {
  const isEdit = !!module
  const [titulo, setTitulo] = useState(module?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(module?.descripcion ?? '')
  const [esGratuito, setEsGratuito] = useState(module?.es_gratuito ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) {
      setError('El título es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isEdit && module) {
        await updateModule(courseId, module.id, { titulo: titulo.trim(), descripcion, es_gratuito: esGratuito })
        onSaved(`Módulo "${titulo.trim()}" actualizado.`)
      } else {
        await createModule(courseId, {
          titulo: titulo.trim(), descripcion, es_gratuito: esGratuito,
          orden: nextOrden(existingOrders ?? []),
        })
        onSaved(`Módulo "${titulo.trim()}" creado.`)
      }
    } catch {
      setError('No se pudo guardar. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!module) return
    setSaving(true)
    setError(null)
    try {
      await deleteModule(courseId, module.id)
      onDeleted?.(`Módulo "${module.titulo}" eliminado.`)
    } catch {
      setError('No se pudo eliminar. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="module-form-title"
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-white p-6 shadow-cardHover"
    >
      <div className="flex items-center justify-between">
        <h2 id="module-form-title" className="text-lg font-semibold text-ink">
          {isEdit ? 'Editar módulo' : 'Agregar módulo'}
        </h2>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Título</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="input"
            data-autofocus
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
            Descripción (opcional)
          </span>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            className="input resize-none"
          />
        </label>
        <label className="flex items-center gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={esGratuito}
            onChange={(e) => setEsGratuito(e.target.checked)}
            className="h-4 w-4 rounded border-surface-border text-accent focus:ring-accent"
          />
          Módulo gratuito (accesible sin Academy Pro)
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {isEdit && !confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mr-auto text-sm font-medium text-danger hover:underline"
          >
            Eliminar módulo
          </button>
        )}
        {confirmingDelete && (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
            <p className="text-sm text-ink">
              Se eliminará el módulo y sus {module?.lecciones.length ?? 0} lección(es). Esta acción no se puede deshacer.
            </p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="h-9 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="h-9 rounded-lg px-4 text-sm text-ink-soft hover:bg-surface-soft"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
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
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear módulo'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

// ── Crear lección ──────────────────────────────────────────────────────────────

function LessonFormDialog({
  courseId, module, onClose, onSaved,
}: {
  courseId: number
  module: Module
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<LessonTipo>('texto')
  const [contenido, setContenido] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) {
      setError('El título es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createLesson(courseId, module.id, {
        titulo: titulo.trim(), tipo, contenido,
        video_url: tipo === 'video' ? videoUrl.trim() : '',
        orden: nextOrden(module.lecciones),
      })
      onSaved(`Lección "${titulo.trim()}" creada en "${module.titulo}".`)
    } catch {
      setError('No se pudo crear la lección. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="lesson-form-title"
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-white p-6 shadow-cardHover"
    >
      <div className="flex items-center justify-between">
        <h2 id="lesson-form-title" className="text-lg font-semibold text-ink">
          Agregar lección
        </h2>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-soft">En «{module.titulo}»</p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Título</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input" data-autofocus required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as LessonTipo)} className="input">
            {TIPOS_CREABLES.map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-ink-muted">
            Otros tipos (evaluación, sesión en vivo, práctica, entregable) se configuran desde el admin.
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
            {tipo === 'video' ? 'Material de apoyo (opcional)' : 'Contenido'}
          </span>
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={6}
            className="input resize-none"
          />
        </label>
        {tipo === 'video' && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              URL del video (opcional, se puede anexar después)
            </span>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="input"
              inputMode="url"
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
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
            {saving ? 'Creando…' : 'Crear lección'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

// ── Editar título/contenido de una lección + eliminarla ─────────────────────────

function LessonInfoDialog({
  courseId, moduleId, lesson, onClose, onSaved, onDeleted,
}: {
  courseId: number
  moduleId: number
  lesson: Lesson
  onClose: () => void
  onSaved: (msg: string) => void
  onDeleted: (msg: string) => void
}) {
  const [titulo, setTitulo] = useState(lesson.titulo)
  const [contenido, setContenido] = useState(lesson.contenido)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) {
      setError('El título es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateLesson(courseId, moduleId, lesson.id, { titulo: titulo.trim(), contenido })
      onSaved(`"${titulo.trim()}" actualizada.`)
    } catch {
      setError('No se pudo guardar. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    setError(null)
    try {
      await deleteLesson(courseId, moduleId, lesson.id)
      onDeleted(`"${lesson.titulo}" eliminada.`)
    } catch {
      setError('No se pudo eliminar. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="lesson-info-title"
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-white p-6 shadow-cardHover"
    >
      <div className="flex items-center justify-between">
        <h2 id="lesson-info-title" className="text-lg font-semibold text-ink">
          Editar lección
        </h2>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Título</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input" data-autofocus required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
            {lesson.tipo === 'texto' ? 'Contenido' : 'Material de apoyo'}
          </span>
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={8}
            className="input resize-none"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mr-auto text-sm font-medium text-danger hover:underline"
          >
            Eliminar lección
          </button>
        ) : (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
            <p className="text-sm text-ink">Esta acción no se puede deshacer.</p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="h-9 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="h-9 rounded-lg px-4 text-sm text-ink-soft hover:bg-surface-soft"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
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
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

// ── Modal para anexar/quitar el video (o el enlace de la sesión en vivo) ──────

const COPY: Record<VideoEditMode, { title: string; help: string; placeholder: string }> = {
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
  editing: VideoEditing
  onClose: () => void
  onSaved: (msg: string) => void
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
      await updateLesson(courseId, moduleId, lesson.id, payload)
      onSaved(msg)
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
