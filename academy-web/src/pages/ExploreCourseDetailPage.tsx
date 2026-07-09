// Detalle de un curso — vista pública (onboarding sin registro). Muestra el
// mismo árbol bloqueado/no-oculto que ve un estudiante Free autenticado (el
// backend resuelve nivel='starter' para cualquier visitante anónimo). Clic en
// lección gratis → reproductor público; clic en lección paga → prompt de
// registro (nunca el paywall de suscripción: a un anónimo primero hay que
// pedirle cuenta, no plan — eso llega después, ya logueado).

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAnonSessionStatus, getPublicCourse } from '@/api/academy'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import { clearAnonSession, getAnonSessionId } from '@/lib/anonSession'
import { Badge } from '@/components/ui/Badge'
import { ExploreHeader } from '@/components/layout/ExploreHeader'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { RegisterPromptDialog } from '@/components/academy/RegisterPromptDialog'
import { Icon, type IconName } from '@/components/Icon'
import { schoolTheme, schoolGradient } from '@/lib/schoolTheme'
import { useT } from '@/locale/useT'
import type { CourseDetail, Lesson } from '@/types'

const LESSON_ICON: Record<Lesson['tipo'], IconName> = {
  video: 'play',
  texto: 'doc',
  audio: 'audio',
  quiz: 'quiz',
  en_vivo: 'live',
  practica: 'pitch',
  entregable: 'upload',
}

export function ExploreCourseDetailPage() {
  const t = useT()
  const { courseId } = useParams()
  const id = Number(courseId)
  const redirecting = useRedirectIfAuthenticated(`/cursos/${id}`)
  const navigate = useNavigate()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [completadas, setCompletadas] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [prompt, setPrompt] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getPublicCourse(id)
      .then((c) => active && setCourse(c))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    getAnonSessionStatus()
      .then((s) => active && setCompletadas(s.lecciones_completadas))
      .catch(() => {
        // Id guardado localmente vencido/inexistente (barrido por expiración)
        // — se descarta; la próxima acción de completar crea uno nuevo.
        if (getAnonSessionId()) clearAnonSession()
      })
    return () => {
      active = false
    }
  }, [id])

  if (redirecting) return <LoadingScreen />
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-surface-soft">
        <ExploreHeader />
        <div className="flex justify-center py-24">
          <Spinner size={40} />
        </div>
      </div>
    )
  }
  if (error || !course) {
    return (
      <div className="min-h-[100dvh] bg-surface-soft">
        <ExploreHeader />
        <EmptyState
          icon="catalog"
          title={t('exploreCourseDetail.courseNotAvailable')}
          description={t('exploreCourseDetail.couldNotLoad')}
          action={
            <Link to="/explorar" className="text-sm font-medium text-accent hover:text-accent-dark">
              {t('exploreCourseDetail.backToCatalog')}
            </Link>
          }
        />
      </div>
    )
  }

  const totalLecciones = course.modulos.reduce((n, m) => n + m.lecciones.length, 0)
  const theme = schoolTheme(course.escuela_slug)

  return (
    <div className="min-h-[100dvh] bg-surface-soft">
      <ExploreHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8 sm:px-10">
        <Link
          to="/explorar"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent"
        >
          <Icon name="chevronLeft" size={16} /> {t('exploreCourseDetail.catalog')}
        </Link>

        <section
          className="relative overflow-hidden rounded-2xl p-6 sm:p-9"
          style={{ backgroundImage: schoolGradient(theme) }}
        >
          <div className="pointer-events-none absolute -right-10 -top-12 text-white/10">
            <Icon name={theme.icon} size={300} strokeWidth={1} />
          </div>
          <div className="relative z-10 max-w-2xl">
            {course.escuela_nombre && (
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                {course.escuela_nombre}
              </p>
            )}
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
              {t(`level.${course.nivel}`)}
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">{course.titulo}</h1>
            {course.resumen && <p className="mt-2 text-[15px] text-white/70">{course.resumen}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="layers" size={15} /> {t('exploreCourseDetail.modules', { count: course.modulos.length })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="doc" size={15} /> {t('exploreCourseDetail.lessons', { count: totalLecciones })}
              </span>
            </div>
          </div>
        </section>

        <p className="rounded-xl bg-brand/5 px-4 py-3 text-sm text-ink-soft">
          {t('exploreCourseDetail.exploringNoAccount')}{' '}
          <Link to="/registro" className="font-medium text-accent hover:text-accent-dark">
            {t('exploreCourseDetail.createAccount')}
          </Link>
          .
        </p>

        <section className="za-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{t('exploreCourseDetail.content')}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {course.modulos.length === 0 && (
              <p className="text-sm text-ink-muted">{t('exploreCourseDetail.noModulesYet')}</p>
            )}
            {course.modulos.map((m, i) => (
              <ModuleBlock
                key={m.id}
                index={i + 1}
                titulo={m.titulo}
                descripcion={m.descripcion}
                esGratuito={m.es_gratuito}
                lecciones={m.lecciones}
                completadas={completadas}
                onSelect={(l) => {
                  if (l.bloqueado) {
                    setPrompt(true)
                  } else {
                    navigate(`/explorar/cursos/${id}/lecciones/${l.id}`)
                  }
                }}
              />
            ))}
          </div>
        </section>
      </main>

      {prompt && <RegisterPromptDialog reason="contenido_pago" onClose={() => setPrompt(false)} />}
    </div>
  )
}

function ModuleBlock({
  index,
  titulo,
  descripcion,
  esGratuito,
  lecciones,
  completadas,
  onSelect,
}: {
  index: number
  titulo: string
  descripcion: string
  esGratuito: boolean
  lecciones: Lesson[]
  completadas: number[]
  onSelect: (l: Lesson) => void
}) {
  const [open, setOpen] = useState(index === 1)
  const t = useT()
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`explore-module-panel-${index}`}
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
          <span className="block text-xs text-ink-muted">{t('exploreCourseDetail.lessons', { count: lecciones.length })}</span>
        </span>
        <Icon name="chevronDown" size={18} className={`text-ink-muted transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div id={`explore-module-panel-${index}`} className="divide-y divide-surface-border">
          {descripcion && <p className="px-4 py-3 text-sm text-ink-soft">{descripcion}</p>}
          {lecciones.map((l) => {
            const hecha = completadas.includes(l.id)
            return (
              <div
                key={l.id}
                onClick={() => onSelect(l)}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-soft"
              >
                <Icon
                  name={l.bloqueado ? 'lock' : hecha ? 'check' : LESSON_ICON[l.tipo]}
                  size={17}
                  className={`shrink-0 ${l.bloqueado ? 'text-ink-muted' : hecha ? 'text-ok' : 'text-accent'}`}
                />
                <span className={`flex-1 text-sm ${l.bloqueado ? 'text-ink-muted' : 'text-ink'}`}>{l.titulo}</span>
                <span className="text-xs text-ink-muted">{t(`lessonType.${l.tipo}`)}</span>
              </div>
            )
          })}
          {lecciones.length === 0 && <p className="px-4 py-3 text-sm text-ink-muted">{t('exploreCourseDetail.noLessonsYet')}</p>}
        </div>
      )}
    </div>
  )
}
