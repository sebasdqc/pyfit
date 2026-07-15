// Home del estudiante. Consume GET /api/academy/dashboard/ (una sola llamada):
// progreso general, progreso por escuela/curso, racha, insignias, "continuar
// donde lo dejaste"/"siguiente paso" y estadísticas de por vida.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard, listCourses } from '@/api/academy'
import { useAuth } from '@/auth/useAuth'
import { Icon } from '@/components/Icon'
import { Badge } from '@/components/ui/Badge'
import { CourseCard } from '@/components/ui/CourseCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Spinner } from '@/components/ui/Spinner'
import { StreakCard } from '@/components/StreakCard'
import { SchoolPointsBadge } from '@/components/dashboard/SchoolPointsBadge'
import { BadgeGallery } from '@/components/badges/BadgeGallery'
import { PromoZyfitApp } from '@/components/promo/PromoZyfitApp'
import { schoolTheme } from '@/lib/schoolTheme'
import { useT } from '@/locale/useT'
import type {
  AIRecommendation, Course, CourseEstado, DashboardData, DashboardNextStep, DashboardSchool, DashboardStats,
} from '@/types'

export function HomePage() {
  const t = useT()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [recomendados, setRecomendados] = useState<Course[]>([])
  const { user } = useAuth()

  useEffect(() => {
    let active = true
    getDashboard()
      .then((d) => active && setData(d))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  // Sin matrículas, un estudiante nuevo no tiene ninguna señal de por dónde
  // empezar (el catálogo se muestra plano, sin curación). Se destacan los
  // primeros cursos publicados como punto de partida simple — sin ranking ni
  // personalización, solo para no dejar al usuario frente a un catálogo vacío
  // de contexto. Se pide perezosamente, solo cuando realmente hace falta.
  useEffect(() => {
    if (!data || data.tiene_matriculas || user?.is_instructor) return
    let active = true
    listCourses()
      .then((cs) => active && setRecomendados(cs.slice(0, 3)))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [data, user])

  const nombre = (user?.nombre ?? '').split(/\s+/)[0] || t('home.studentFallback')
  const objetivo = data?.continuar ?? data?.siguiente_paso ?? null

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="za-eyebrow">{t('home.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{t('home.greeting', { name: nombre })}</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={40} />
        </div>
      ) : error ? (
        <EmptyState
          icon="learning"
          title={t('home.loadError')}
          description={t('home.loadErrorBody')}
        />
      ) : !data || !data.tiene_matriculas ? (
        <>
          <EmptyState
            icon={user?.is_instructor ? 'instructor' : 'learning'}
            title={
              user?.is_instructor
                ? t('home.noEnrollmentsInstructorTitle')
                : t('home.noEnrollmentsTitle')
            }
            description={
              user?.is_instructor
                ? t('home.noEnrollmentsInstructorBody')
                : t('home.noEnrollmentsBody')
            }
            action={
              <Link
                to={user?.is_instructor ? '/instructor' : '/catalogo'}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
              >
                {user?.is_instructor ? t('home.goToMyCourses') : t('home.goToCatalog')} <Icon name="arrowRight" size={16} />
              </Link>
            }
          />
          {recomendados.length > 0 && (
            <div>
              <p className="za-eyebrow">{t('home.recommendedForYou')}</p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {recomendados.map((c) => (
                  <CourseCard key={c.id} course={c} to={`/cursos/${c.id}`} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="za-card flex items-center gap-4 p-5">
              <SchoolPointsBadge puntos={data.puntos_aprendizaje} accent="rgb(var(--color-accent))" icon="sparkles" size={72} />
              <div>
                <p className="za-eyebrow">{t('home.learningPoints')}</p>
                <p className="mt-1 text-2xl font-bold text-ink">{data.puntos_aprendizaje.toLocaleString()}</p>
              </div>
            </div>
            <StreakCard streak={data.racha} />
          </div>

          {objetivo && <ContinueHero target={objetivo} isResume={!!data.continuar} />}

          {data.recomendacion_ia && <AIRecommendationCard recomendacion={data.recomendacion_ia} />}

          <PromoZyfitApp />

          <div className="flex flex-col gap-4">
            {data.escuelas.map((escuela) => (
              <SchoolSection key={escuela.id} escuela={escuela} />
            ))}
          </div>

          <BadgeGallery identidad={data.insignias_identidad} cursoBadges={data.insignias.recientes} />

          <StatsFooter stats={data.stats} />
        </>
      )}
    </div>
  )
}

function ContinueHero({ target, isResume }: { target: DashboardNextStep; isResume: boolean }) {
  const t = useT()
  return (
    <Link
      to={`/aprender/${target.enrollment_id}`}
      className="group za-card flex items-center gap-4 border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-5 transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
        <Icon name="play" size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="za-eyebrow">{isResume ? t('home.resumeWhereYouLeftOff') : t('home.nextStep')}</p>
        <h3 className="mt-1 truncate text-base font-semibold text-ink">{target.leccion.titulo}</h3>
        <p className="truncate text-sm text-ink-soft">
          {target.curso_titulo}
          {target.escuela_nombre ? ` · ${target.escuela_nombre}` : ''}
        </p>
      </div>
      <Icon
        name="arrowRight"
        size={20}
        className="shrink-0 text-accent transition-transform group-hover:translate-x-1"
      />
    </Link>
  )
}

function AIRecommendationCard({ recomendacion }: { recomendacion: AIRecommendation }) {
  const t = useT()
  const to = recomendacion.enrollment_id
    ? `/aprender/${recomendacion.enrollment_id}`
    : `/cursos/${recomendacion.curso_id}`
  return (
    <Link
      to={to}
      className="group za-card flex items-center gap-4 border-2 border-brand/20 bg-gradient-to-br from-brand/5 to-transparent p-5 transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
        <Icon name="sparkles" size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="za-eyebrow">{t('home.aiRecommendationEyebrow')}</p>
        <h3 className="mt-1 truncate text-base font-semibold text-ink">{recomendacion.leccion_titulo}</h3>
        <p className="truncate text-sm text-ink-soft">
          {recomendacion.curso_titulo}
          {recomendacion.escuela_nombre ? ` · ${recomendacion.escuela_nombre}` : ''}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {t('home.aiRecommendationReason', { competencia: recomendacion.competencia_nombre })}
        </p>
      </div>
      <Icon
        name="arrowRight"
        size={20}
        className="shrink-0 text-brand transition-transform group-hover:translate-x-1"
      />
    </Link>
  )
}

const ESTADO_TONE: Record<CourseEstado, 'ok' | 'accent' | 'neutral'> = {
  completado: 'ok',
  en_progreso: 'accent',
  no_iniciado: 'neutral',
}

function SchoolSection({ escuela }: { escuela: DashboardSchool }) {
  const t = useT()
  const theme = schoolTheme(escuela.slug)
  return (
    <div className="za-card p-5">
      <div className="flex items-center gap-4">
        <SchoolPointsBadge puntos={escuela.puntos} accent={theme.accent} icon={theme.icon} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-ink">{escuela.nombre}</h3>
          <p className="text-xs text-ink-muted">
            {t('home.completedCoursesInSchool', { count: escuela.cursos_completados })} ·{' '}
            {t('home.inProgressInSchool', { count: escuela.cursos_en_progreso })} ·{' '}
            {t('home.notStartedInSchool', { count: escuela.cursos_no_iniciados })}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {escuela.cursos.map((curso) => (
          <div key={curso.id} className="flex items-center gap-3">
            <Badge tone={ESTADO_TONE[curso.estado]}>{t(`courseEstado.${curso.estado}`)}</Badge>
            <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{curso.titulo}</span>
            <div className="w-28 shrink-0">
              <ProgressBar value={curso.progreso} showLabel={false} label={t('home.progressOfCourse', { course: curso.titulo })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsFooter({ stats }: { stats: DashboardStats }) {
  const t = useT()
  const items: { label: string; value: string | number }[] = [
    { label: t('home.coursesCompleted'), value: stats.cursos_completados },
    { label: t('home.coursesInProgress'), value: stats.cursos_activos },
    { label: t('home.bestStreak'), value: t('home.days', { count: stats.mejor_racha }) },
    { label: t('home.estimatedTime'), value: formatMinutos(stats.minutos_estimados_invertidos) },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="za-card p-4 text-center">
          <p className="text-xl font-bold text-ink">{it.value}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-muted">{it.label}</p>
        </div>
      ))}
    </div>
  )
}

function formatMinutos(min: number): string {
  if (!min) return '—'
  if (min < 60) return `${min} min`
  return `${Math.round(min / 60)} h`
}
