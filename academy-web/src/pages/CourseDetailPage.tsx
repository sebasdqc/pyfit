// Detalle de un curso: portada/hero, metadatos, árbol de módulos→lecciones y la
// acción de inscripción. Consume GET /courses/:id/, GET /enrollments/ (para saber
// si ya estoy inscrito) y POST /courses/:id/enroll/. El reproductor de lecciones
// queda como placeholder para próximas iteraciones.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { enroll, getCourse, listMyEnrollments } from '@/api/academy'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaywallDialog } from '@/components/academy/PaywallDialog'
import { Icon, type IconName } from '@/components/Icon'
import { NIVEL_LABEL } from '@/lib/constants'
import { schoolTheme, schoolGradient } from '@/lib/schoolTheme'
import type { CourseDetail, Enrollment, Lesson } from '@/types'

const LESSON_ICON: Record<Lesson['tipo'], IconName> = {
  video: 'play',
  texto: 'doc',
  audio: 'audio',
  quiz: 'quiz',
  en_vivo: 'live',
  practica: 'pitch',
  entregable: 'upload',
}
const LESSON_LABEL: Record<Lesson['tipo'], string> = {
  video: 'Video',
  texto: 'Lectura',
  audio: 'Audio',
  quiz: 'Evaluación',
  en_vivo: 'Sesión en vivo',
  practica: 'Práctica presencial',
  entregable: 'Entregable',
}

export function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const id = Number(courseId)

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState(false)
  const [paywallModulo, setPaywallModulo] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    Promise.all([getCourse(id), listMyEnrollments().catch(() => [] as Enrollment[])])
      .then(([c, mine]) => {
        if (!active) return
        setCourse(c)
        setEnrollment(mine.find((e) => e.course === id) ?? null)
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  async function handleEnroll() {
    setEnrolling(true)
    setEnrollError(false)
    try {
      const e = await enroll(id)
      setEnrollment(e)
      // Tras inscribirse, entra directo al reproductor.
      navigate(`/aprender/${e.id}`)
    } catch {
      setEnrollError(true)
    } finally {
      setEnrolling(false)
    }
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
        icon="catalog"
        title="Curso no disponible"
        description="No pudimos cargar este curso."
        action={
          <Link to="/catalogo" className="text-sm font-medium text-accent hover:text-accent-dark">
            ← Volver al catálogo
          </Link>
        }
      />
    )
  }

  const totalLecciones = course.modulos.reduce((n, m) => n + m.lecciones.length, 0)
  const theme = schoolTheme(course.escuela_slug)

  return (
    <div className="flex flex-col gap-6">
      <Link to="/catalogo" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent">
        <Icon name="chevronLeft" size={16} /> Catálogo
      </Link>

      {/* Hero (color propio de la escuela) */}
      <section className="relative overflow-hidden rounded-2xl p-6 sm:p-9" style={{ backgroundImage: schoolGradient(theme) }}>
        <div className="pointer-events-none absolute -right-10 -top-12 text-white/10">
          <Icon name={theme.icon} size={300} strokeWidth={1} />
        </div>
        <div className="relative z-10 max-w-2xl">
          {course.escuela_nombre && (
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              {course.escuela_nombre}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {course.categoria && (
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
                {course.categoria}
              </span>
            )}
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
              {NIVEL_LABEL[course.nivel] ?? course.nivel}
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">{course.titulo}</h1>
          {course.resumen && <p className="mt-2 text-[15px] text-white/70">{course.resumen}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/60">
            <span>Por {course.instructor_nombre || 'Instructor'}</span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="layers" size={15} /> {course.modulos.length} módulos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="doc" size={15} /> {totalLecciones} lecciones
            </span>
            {course.duracion_estimada_min > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={15} /> {course.duracion_estimada_min} min
              </span>
            )}
            {course.carga_horaria_h > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={15} /> {course.carga_horaria_h} horas
              </span>
            )}
          </div>
          {course.acredita_renovacion && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/80">
              <Icon name="check" size={14} /> Acredita horas de actualización para renovar la licencia
            </p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Contenido */}
        <div className="flex flex-col gap-6">
          {course.descripcion && (
            <section className="za-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Sobre el curso</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
                {course.descripcion}
              </p>
            </section>
          )}

          {/* Check-list de Competencias (Programa 360°): hitos con insignia + certificado */}
          {course.insignias.length > 0 && (
            <section className="za-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
                Check-list de competencias
              </h2>
              <p className="mt-2 text-sm text-ink-soft">
                Este programa se evalúa por hitos: cada entrega aprobada por tu instructor
                desbloquea una insignia, y la evaluación final emite tu Certificado Digital.
              </p>
              <ol className="mt-4 flex flex-col gap-3">
                {[...course.insignias]
                  .sort((a, b) => a.orden - b.orden)
                  .map((b, i) => (
                    <li key={b.id} className="flex items-start gap-3">
                      <span aria-hidden className="text-xl leading-none">{b.icono || '🏅'}</span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">
                          Hito {i + 1} · {b.nombre}
                        </span>
                        {b.descripcion && (
                          <span className="block text-sm text-ink-soft">{b.descripcion}</span>
                        )}
                      </span>
                    </li>
                  ))}
                <li className="flex items-start gap-3">
                  <span aria-hidden className="text-xl leading-none">🎓</span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      Hito final · Certificado Digital
                    </span>
                    <span className="block text-sm text-ink-soft">
                      Completa todas las lecciones y aprueba las evaluaciones para emitirlo.
                    </span>
                  </span>
                </li>
              </ol>
            </section>
          )}

          <section className="za-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Contenido</h2>
            <div className="mt-4 flex flex-col gap-3">
              {course.modulos.length === 0 && (
                <p className="text-sm text-ink-muted">Este curso aún no tiene módulos.</p>
              )}
              {course.modulos.map((m, i) => (
                <ModuleBlock
                  key={m.id}
                  index={i + 1}
                  titulo={m.titulo}
                  descripcion={m.descripcion}
                  esGratuito={m.es_gratuito}
                  lecciones={m.lecciones}
                  onLockedLessonClick={() => setPaywallModulo(m.titulo)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Tarjeta de acción */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="za-card overflow-hidden">
            <div
              className="flex h-32 items-center justify-center"
              style={course.portada ? undefined : { backgroundImage: schoolGradient(theme) }}
            >
              {course.portada ? (
                <img
                  src={course.portada}
                  alt={`Portada de ${course.titulo}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-white/85">
                  <Icon name={theme.icon} size={48} strokeWidth={1.3} />
                </span>
              )}
            </div>
            <div className="p-5">
              {enrollment ? (
                <>
                  <Badge tone={enrollment.estado === 'completada' ? 'ok' : 'accent'}>
                    {enrollment.estado === 'completada' ? 'Completado' : 'Inscrito'}
                  </Badge>
                  <div className="mt-4">
                    <ProgressBar value={enrollment.progreso} label={`Progreso de ${course.titulo}`} />
                  </div>
                  <button
                    onClick={() => navigate(`/aprender/${enrollment.id}`)}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
                  >
                    Continuar aprendiendo <Icon name="arrowRight" size={16} />
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-soft">
                    Inscríbete gratis y empieza a aprender a tu ritmo.
                  </p>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
                  >
                    {enrolling ? 'Inscribiendo…' : 'Inscribirme'}
                  </button>
                  {enrollError && (
                    <p role="alert" className="mt-2 text-xs text-danger">
                      No se pudo completar la inscripción. Inténtalo de nuevo.
                    </p>
                  )}
                </>
              )}
              <ul className="mt-5 flex flex-col gap-2.5 text-sm text-ink-soft">
                <li className="flex items-center gap-2">
                  <Icon name="check" size={16} className="text-ok" /> Acceso completo al contenido
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" size={16} className="text-ok" /> Evaluaciones con calificación
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" size={16} className="text-ok" /> Certificado al completar
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {paywallModulo && (
        <PaywallDialog
          moduloTitulo={paywallModulo}
          cursoTitulo={course.titulo}
          onClose={() => setPaywallModulo(null)}
        />
      )}
    </div>
  )
}

function ModuleBlock({
  index,
  titulo,
  descripcion,
  esGratuito,
  lecciones,
  onLockedLessonClick,
}: {
  index: number
  titulo: string
  descripcion: string
  esGratuito: boolean
  lecciones: Lesson[]
  onLockedLessonClick: () => void
}) {
  const [open, setOpen] = useState(index === 1)
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`module-panel-${index}`}
        className="flex w-full items-center gap-3 bg-surface-soft px-4 py-3 text-left transition-colors hover:bg-surface-border/40"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
          {index}
        </span>
        <span className="flex-1">
          <span className="flex items-center gap-2">
            <span className="block text-sm font-semibold text-ink">{titulo}</span>
            {!esGratuito && <Badge tone="brand">PRO</Badge>}
          </span>
          <span className="block text-xs text-ink-muted">{lecciones.length} lecciones</span>
        </span>
        <Icon name="chevronDown" size={18} className={`text-ink-muted transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div id={`module-panel-${index}`} className="divide-y divide-surface-border">
          {descripcion && <p className="px-4 py-3 text-sm text-ink-soft">{descripcion}</p>}
          {lecciones.map((l) => (
            <div
              key={l.id}
              onClick={l.bloqueado ? onLockedLessonClick : undefined}
              className={`flex items-center gap-3 px-4 py-3 ${l.bloqueado ? 'cursor-pointer hover:bg-surface-soft' : ''}`}
            >
              <Icon
                name={l.bloqueado ? 'lock' : LESSON_ICON[l.tipo]}
                size={17}
                className={`shrink-0 ${l.bloqueado ? 'text-ink-muted' : 'text-accent'}`}
              />
              <span className={`flex-1 text-sm ${l.bloqueado ? 'text-ink-muted' : 'text-ink'}`}>{l.titulo}</span>
              <span className="text-xs text-ink-muted">{LESSON_LABEL[l.tipo]}</span>
              {l.duracion_min > 0 && <span className="text-xs text-ink-muted">{l.duracion_min} min</span>}
            </div>
          ))}
          {lecciones.length === 0 && <p className="px-4 py-3 text-sm text-ink-muted">Sin lecciones aún.</p>}
        </div>
      )}
    </div>
  )
}
