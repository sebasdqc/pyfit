// Ajustes de un curso (instructor/admin) — /instructor/cursos/:courseId/ajustes.
// Edita los campos del propio Course (portada, escuela, metadatos, ejes
// CONMEBOL Evolución, publicación) que hasta ahora solo se podían tocar desde
// Django Admin. Módulos/lecciones/videos se editan aparte en
// CourseContentPage.tsx; entregas en SubmissionsPage.tsx — esta pantalla es
// solo el "encabezado" del curso.

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteCourse, getCourse, listSchools, updateCourse } from '@/api/academy'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/auth/useAuth'
import { CATEGORIAS, DISCIPLINAS, LICENCIAS, MODALIDADES, NIVELES } from '@/lib/constants'
import type { CourseDetail, School } from '@/types'

const PORTADA_MAX_BYTES = 1_000_000 // ~1 MB de archivo (el data URL en base64 queda bajo el límite del backend, ~1.5 MB)

export function CourseSettingsPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const id = Number(courseId)

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getCourse(id)
      .then((c) => active && setCourse(c))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    listSchools().then((s) => active && setSchools(s)).catch(() => {})
    return () => {
      active = false
    }
  }, [id])

  if (!user?.puede_crear_cursos) {
    return (
      <EmptyState
        icon="instructor"
        title="Área de instructores"
        description="Tu cuenta no tiene permisos de instructor. Contacta al administrador para gestionar cursos."
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
        title="No se pudo cargar el curso"
        description="Verifica que el curso exista y que tengas permisos de instructor sobre él."
        action={
          <Link to="/instructor" className="text-sm font-medium text-accent hover:text-accent-dark">
            ← Mis cursos
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          to="/instructor"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent"
        >
          <Icon name="chevronLeft" size={16} /> Mis cursos
        </Link>
        <p className="za-eyebrow mt-4">Ajustes · {course.titulo}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Configuración del curso</h1>
      </div>

      <CourseSettingsForm
        course={course}
        schools={schools}
        onSaved={setCourse}
        onDeleted={() => navigate('/instructor')}
      />
    </div>
  )
}

function CourseSettingsForm({
  course, schools, onSaved, onDeleted,
}: {
  course: CourseDetail
  schools: School[]
  onSaved: (c: CourseDetail) => void
  onDeleted: () => void
}) {
  const [titulo, setTitulo] = useState(course.titulo)
  const [resumen, setResumen] = useState(course.resumen)
  const [descripcion, setDescripcion] = useState(course.descripcion)
  const [categoria, setCategoria] = useState(course.categoria || CATEGORIAS[0])
  const [nivel, setNivel] = useState(course.nivel)
  const [schoolId, setSchoolId] = useState(course.school ? String(course.school) : '')
  const [portada, setPortada] = useState(course.portada)
  const [duracionMin, setDuracionMin] = useState(course.duracion_estimada_min)
  const [publicado, setPublicado] = useState(course.publicado)

  const [showEvolucion, setShowEvolucion] = useState(
    course.disciplina !== 'general' || course.licencia !== '' || course.carga_horaria_h > 0,
  )
  const [disciplina, setDisciplina] = useState(course.disciplina)
  const [licencia, setLicencia] = useState(course.licencia)
  const [modalidad, setModalidad] = useState(course.modalidad)
  const [cargaHorariaH, setCargaHorariaH] = useState(course.carga_horaria_h)
  const [acreditaRenovacion, setAcreditaRenovacion] = useState(course.acredita_renovacion)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState('')

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmTitulo, setConfirmTitulo] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.')
      return
    }
    if (file.size > PORTADA_MAX_BYTES) {
      setError('La imagen es muy pesada (máx. 1 MB).')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setPortada(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) {
      setError('El título es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    setSavedMsg('')
    try {
      const updated = await updateCourse(course.id, {
        titulo: titulo.trim(),
        resumen: resumen.trim(),
        descripcion: descripcion.trim(),
        categoria,
        nivel,
        school: schoolId ? Number(schoolId) : null,
        portada,
        duracion_estimada_min: duracionMin,
        publicado,
        disciplina,
        licencia,
        modalidad,
        carga_horaria_h: cargaHorariaH,
        acredita_renovacion: acreditaRenovacion,
      })
      onSaved(updated)
      setSavedMsg('Cambios guardados.')
    } catch {
      setError('No se pudo guardar. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteCourse(course.id)
      onDeleted()
    } catch {
      setDeleteError('No se pudo eliminar el curso. Inténtalo de nuevo.')
      setDeleting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="za-card flex flex-col gap-4 p-6">
        <p aria-live="polite" className={savedMsg ? 'text-sm font-medium text-ok' : 'sr-only'}>
          {savedMsg}
        </p>

        <Labeled label="Título">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input" required />
        </Labeled>

        <Labeled label="Identificador (slug)">
          <input value={course.slug} disabled className="input font-mono text-sm opacity-60" />
          <span className="mt-1 block text-xs text-ink-muted">
            No editable — cambiarlo podría romper enlaces ya compartidos.
          </span>
        </Labeled>

        <Labeled label="Resumen">
          <input
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            placeholder="Una línea que enganche."
            className="input"
          />
        </Labeled>

        <Labeled label="Descripción">
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
            className="input resize-none"
          />
        </Labeled>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Labeled label="Categoría">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input">
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Nivel">
            <select value={nivel} onChange={(e) => setNivel(e.target.value as typeof nivel)} className="input">
              {NIVELES.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </Labeled>
        </div>

        <Labeled label="Escuela">
          <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="input">
            <option value="">Sin escuela</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </Labeled>

        <Labeled label="Portada">
          <div className="flex items-center gap-3">
            {portada && (
              <img src={portada} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            )}
            <div className="flex flex-1 flex-col gap-1.5">
              <input type="file" accept="image/*" onChange={handleFile} className="text-sm text-ink-soft" />
              {portada && (
                <button
                  type="button"
                  onClick={() => setPortada('')}
                  className="w-fit text-xs font-medium text-danger hover:underline"
                >
                  Quitar portada
                </button>
              )}
            </div>
          </div>
        </Labeled>

        <Labeled label="Duración estimada (minutos)">
          <input
            type="number"
            min={0}
            value={duracionMin}
            onChange={(e) => setDuracionMin(Number(e.target.value))}
            className="input"
          />
        </Labeled>

        <label className="flex items-center gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
            className="h-4 w-4 rounded border-surface-border text-accent focus:ring-accent"
          />
          Publicado (visible en el catálogo)
        </label>

        <div className="mt-2 border-t border-surface-border pt-4">
          <button
            type="button"
            onClick={() => setShowEvolucion((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-ink-soft"
          >
            Formación CONMEBOL Evolución (opcional)
            <Icon name={showEvolucion ? 'chevronDown' : 'chevronRight'} size={16} className="text-ink-muted" />
          </button>
          {showEvolucion && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Labeled label="Disciplina">
                  <select value={disciplina} onChange={(e) => setDisciplina(e.target.value as typeof disciplina)} className="input">
                    {DISCIPLINAS.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Licencia">
                  <select value={licencia} onChange={(e) => setLicencia(e.target.value as typeof licencia)} className="input">
                    {LICENCIAS.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </Labeled>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Labeled label="Modalidad">
                  <select value={modalidad} onChange={(e) => setModalidad(e.target.value as typeof modalidad)} className="input">
                    {MODALIDADES.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Carga horaria (horas)">
                  <input
                    type="number"
                    min={0}
                    value={cargaHorariaH}
                    onChange={(e) => setCargaHorariaH(Number(e.target.value))}
                    className="input"
                  />
                </Labeled>
              </div>
              <label className="flex items-center gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={acreditaRenovacion}
                  onChange={(e) => setAcreditaRenovacion(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-border text-accent focus:ring-accent"
                />
                Acredita horas para renovación de licencia
              </label>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">{error}</p>
        )}

        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border-2 border-danger/20 bg-danger/5 p-6">
        <h2 className="text-sm font-semibold text-danger">Zona de peligro</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Eliminar este curso borra también sus {course.total_modulos} módulo(s) y las{' '}
          {course.total_inscritos} inscripción(es) de estudiantes, incluyendo su progreso y certificados.
          Esta acción no se puede deshacer.
        </p>

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 h-9 rounded-lg border border-danger/40 px-4 text-sm font-semibold text-danger hover:bg-danger/10"
          >
            Eliminar curso
          </button>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                Escribe «{course.titulo}» para confirmar
              </span>
              <input
                value={confirmTitulo}
                onChange={(e) => setConfirmTitulo(e.target.value)}
                className="input"
                autoFocus
              />
            </label>
            {deleteError && <p role="alert" className="text-sm text-danger">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || confirmTitulo.trim() !== course.titulo}
                className="h-9 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                {deleting ? 'Eliminando…' : 'Sí, eliminar definitivamente'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false)
                  setConfirmTitulo('')
                  setDeleteError(null)
                }}
                className="h-9 rounded-lg px-4 text-sm text-ink-soft hover:bg-surface-soft"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
    </label>
  )
}
