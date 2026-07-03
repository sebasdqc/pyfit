// Formulario de "nueva pregunta" (dentro de un Dialog). El curso es opcional:
// sin selección es una pregunta general de la escuela.

import { useState, type FormEvent } from 'react'
import type { AxiosError } from 'axios'
import { createCommunityPost } from '@/api/community'
import type { CommunityPost, Course } from '@/types'

export function NewPostForm({
  escuelaId,
  cursos,
  onCreated,
  onCancel,
}: {
  escuelaId: number
  cursos: Course[]
  onCreated: (post: CommunityPost) => void
  onCancel: () => void
}) {
  const [cursoId, setCursoId] = useState<number | ''>('')
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !contenido.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const post = await createCommunityPost({
        escuela: escuelaId,
        curso: cursoId || undefined,
        titulo: titulo.trim(),
        contenido: contenido.trim(),
      })
      onCreated(post)
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string }>
      setError(ax.response?.data?.detail ?? 'No se pudo publicar la pregunta. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 id="nueva-pregunta-titulo" className="text-lg font-bold text-ink">Nueva pregunta</h2>

      {cursos.length > 0 && (
        <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
          Curso (opcional)
          <select
            value={cursoId}
            onChange={(e) => setCursoId(e.target.value ? Number(e.target.value) : '')}
            className="input"
          >
            <option value="">Pregunta general de la escuela</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
        Título
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={200}
          required
          className="input"
          placeholder="Resumí tu pregunta en una línea"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
        Detalle
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          maxLength={5000}
          required
          rows={5}
          className="input !h-auto py-3"
          placeholder="Contá con más detalle qué querés preguntar"
        />
      </label>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm text-ink-soft hover:bg-surface-soft"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
    </form>
  )
}
