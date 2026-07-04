// Comunidad: foro Q&A asíncrono entre alumnos. Capa de engagement OPCIONAL —
// accesible desde la navegación principal, pero no forzada en el flujo de
// estudio (a diferencia del tutor IA, que sí vive dentro de la lección).
// Toda la moderación es automática en el servidor (ver
// academy/community_service.py); esta pantalla solo lista y publica.

import { useEffect, useState } from 'react'
import { listSchools } from '@/api/academy'
import { listCommunityPosts } from '@/api/community'
import { NewPostForm } from '@/components/community/NewPostForm'
import { PostCard } from '@/components/community/PostCard'
import { Icon } from '@/components/Icon'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import type { CommunityPost, School } from '@/types'

type Orden = 'recientes' | 'top'

export function CommunityPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [schoolsError, setSchoolsError] = useState(false)

  const [escuelaId, setEscuelaId] = useState<number | null>(null)
  const [cursoId, setCursoId] = useState<number | ''>('')
  const [orden, setOrden] = useState<Orden>('recientes')

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [showNewPost, setShowNewPost] = useState(false)

  useEffect(() => {
    let active = true
    listSchools()
      .then((data) => {
        if (!active) return
        setSchools(data)
        if (data.length > 0) setEscuelaId(data[0].id)
      })
      .catch(() => active && setSchoolsError(true))
      .finally(() => active && setSchoolsLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (escuelaId == null) return
    let active = true
    setLoading(true)
    setError(false)
    listCommunityPosts({ escuela: escuelaId, curso: cursoId || undefined, orden })
      .then((data) => active && setPosts(data.results))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [escuelaId, cursoId, orden])

  const escuelaActual = schools.find((s) => s.id === escuelaId)

  function handleCreated(post: CommunityPost) {
    setShowNewPost(false)
    if (post.escuela === escuelaId && (cursoId === '' || post.curso === cursoId)) {
      setPosts((prev) => [post, ...prev])
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="za-eyebrow">Comunidad</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Preguntas y respuestas</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Compartí dudas y experiencias con otros alumnos. Es opcional: no afecta tu progreso ni tu racha.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewPost(true)}
          disabled={escuelaId == null}
          className="flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          <Icon name="plus" size={16} />
          Nueva pregunta
        </button>
      </section>

      {schoolsLoading ? (
        <div className="flex justify-center py-20"><Spinner size={40} /></div>
      ) : schoolsError ? (
        <EmptyState
          icon="catalog"
          title="No se pudo cargar la Comunidad"
          description="Revisa tu conexión e inténtalo de nuevo."
        />
      ) : schools.length === 0 ? (
        <EmptyState
          icon="catalog"
          title="Sin escuelas disponibles"
          description="Todavía no hay escuelas publicadas en la academia."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={escuelaId ?? ''}
              onChange={(e) => { setEscuelaId(Number(e.target.value)); setCursoId('') }}
              aria-label="Escuela"
              className="input sm:w-56"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <select
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value ? Number(e.target.value) : '')}
              aria-label="Curso"
              className="input sm:w-56"
            >
              <option value="">Todos los cursos</option>
              {escuelaActual?.cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.titulo}</option>
              ))}
            </select>
            <div className="flex gap-1 rounded-xl border border-surface-border bg-white p-1">
              {(['recientes', 'top'] as Orden[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-selected={orden === o}
                  onClick={() => setOrden(o)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    orden === o ? 'bg-accent/10 font-medium text-accent' : 'text-ink-soft hover:bg-surface-soft'
                  }`}
                >
                  {o === 'recientes' ? 'Recientes' : 'Más respondidas'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Spinner size={40} /></div>
          ) : error ? (
            <EmptyState
              icon="catalog"
              title="No se pudieron cargar las preguntas"
              description="Revisa tu conexión e inténtalo de nuevo."
            />
          ) : posts.length === 0 ? (
            <EmptyState
              icon="catalog"
              title="Todavía no hay preguntas"
              description="Sé el primero en preguntarle algo a la comunidad."
              action={
                <button
                  type="button"
                  onClick={() => setShowNewPost(true)}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                >
                  Hacer una pregunta
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </>
      )}

      {showNewPost && escuelaId != null && (
        <Dialog
          onClose={() => setShowNewPost(false)}
          labelledBy="nueva-pregunta-titulo"
          className="za-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
        >
          <NewPostForm
            escuelaId={escuelaId}
            cursos={escuelaActual?.cursos ?? []}
            onCreated={handleCreated}
            onCancel={() => setShowNewPost(false)}
          />
        </Dialog>
      )}
    </div>
  )
}
