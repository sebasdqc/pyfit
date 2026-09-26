import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getInstructorAnalytics, listCourses } from '@/api/academy'
import { Icon } from '@/components/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/auth/useAuth'
import type { Course, InstructorAnalyticsData, InstructorAnalyticsLessonProgress } from '@/types'

const LESSON_LABEL: Record<InstructorAnalyticsLessonProgress['tipo'], string> = {
  texto: 'Lectura', video: 'Video', audio: 'Audio', quiz: 'Quiz',
  en_vivo: 'En vivo', practica: 'Práctica', entregable: 'Entregable',
}

export function InstructorAnalyticsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedCourseId = useRef(Number(searchParams.get('curso')))
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [data, setData] = useState<InstructorAnalyticsData | null>(null)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState(false)
  const [reloadCourses, setReloadCourses] = useState(0)
  const [reloadData, setReloadData] = useState(0)

  useEffect(() => {
    setLoadingCourses(true)
    setError(false)
    listCourses({ mine: true })
      .then((items) => {
        setCourses(items)
        const requested = requestedCourseId.current
        const initial = items.some((course) => course.id === requested) ? requested : items[0]?.id
        setSelectedCourseId(initial ?? null)
      })
      .catch(() => setError(true))
      .finally(() => setLoadingCourses(false))
  }, [reloadCourses]) // La selección inicial solo debe leer el enlace de entrada una vez.

  useEffect(() => {
    if (!selectedCourseId) return
    setLoadingData(true)
    setError(false)
    setData(null)
    getInstructorAnalytics(selectedCourseId)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoadingData(false))
  }, [selectedCourseId, reloadData])

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )

  function selectCourse(courseId: number) {
    setSelectedCourseId(courseId)
    setSearchParams({ curso: String(courseId) })
  }

  if (!user?.puede_crear_cursos) {
    return <EmptyState icon="instructor" title="Área de instructores" description="Tu cuenta no tiene permisos para consultar analítica académica." />
  }

  if (loadingCourses) {
    return <div className="flex justify-center py-20"><Spinner size={40} /></div>
  }

  if (error && courses.length === 0) {
    return (
      <EmptyState
        icon="activity"
        title="No se pudieron cargar tus cursos"
        description="Revisa tu conexión e inténtalo de nuevo."
        action={<button onClick={() => setReloadCourses((value) => value + 1)} className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark">Reintentar</button>}
      />
    )
  }

  if (courses.length === 0) {
    return (
      <EmptyState
        icon="activity"
        title="Aún no hay cursos para analizar"
        description="Cuando publiques o crees un curso, aquí podrás revisar su avance y resultados de aprendizaje."
        action={<Link to="/instructor" className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark">Ir a mis cursos</Link>}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <header className="flex flex-col justify-between gap-4 border-b border-surface-border pb-5 sm:flex-row sm:items-end">
        <div>
          <Link to="/instructor" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent">
            <Icon name="chevronLeft" size={16} /> Mis cursos
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">Analítica académica</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            Señales agregadas para decidir qué contenido reforzar y dónde acompañar el aprendizaje.
          </p>
        </div>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-ink-soft sm:w-80">
          Curso
          <select
            className="input h-10 text-sm"
            value={selectedCourseId ?? ''}
            onChange={(event) => selectCourse(Number(event.target.value))}
            aria-label="Curso que se analizará"
          >
            {courses.map((course) => <option key={course.id} value={course.id}>{course.titulo}</option>)}
          </select>
        </label>
      </header>

      {loadingData && !data ? (
        <div className="flex justify-center py-20"><Spinner size={40} /></div>
      ) : error ? (
        <EmptyState
          icon="activity"
          title="No se pudo cargar la analítica"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={<button onClick={() => setReloadData((value) => value + 1)} className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark">Reintentar</button>}
        />
      ) : data ? (
        <AnalyticsReport data={data} course={selectedCourse} loading={loadingData} />
      ) : null}
    </div>
  )
}

function AnalyticsReport({ data, course, loading }: { data: InstructorAnalyticsData; course: Course | null; loading: boolean }) {
  const { summary } = data
  return (
    <>
      <section aria-label="Resumen de aprendizaje" className={`za-card overflow-hidden transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
        <div className="grid divide-y divide-surface-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <Metric label="Matrículas" value={summary.matriculas} detail={`${summary.en_progreso} en progreso`} icon="users" />
          <Metric label="Finalización" value={`${summary.tasa_finalizacion}%`} detail={`${summary.completadas} curso(s) completado(s)`} icon="check" />
          <Metric label="Progreso promedio" value={`${summary.progreso_promedio}%`} detail={`${summary.sin_iniciar} sin iniciar`} icon="layers" />
          <Metric label="Actividad detenida" value={summary.sin_actividad} detail={`${summary.dias_inactividad} días sin señal`} icon="clock" tone={summary.sin_actividad ? 'warn' : 'neutral'} />
        </div>
        <div className="grid border-t border-surface-border bg-surface-soft/60 px-5 py-3 text-sm text-ink-soft sm:grid-cols-3 sm:gap-5">
          <span><strong className="font-semibold text-ink">{summary.intentos_quiz}</strong> intentos de quiz</span>
          <span><strong className="font-semibold text-ink">{summary.promedio_quiz}%</strong> promedio de quiz</span>
          <span><strong className="font-semibold text-ink">{summary.tasa_aprobacion_quiz}%</strong> de intentos aprobados</span>
        </div>
      </section>

      {data.alerts.length > 0 && (
        <section aria-labelledby="alerts-title" className="grid gap-3 lg:grid-cols-2">
          <h2 id="alerts-title" className="sr-only">Alertas del curso</h2>
          {data.alerts.map((alert) => (
            <Link
              key={alert.id}
              to={`/instructor/cursos/${data.course.id}/contenido`}
              className={`group flex gap-3 rounded-2xl border p-4 transition-colors ${alert.severity === 'danger' ? 'border-danger/30 bg-danger/5 hover:bg-danger/10' : 'border-warn/30 bg-warn/5 hover:bg-warn/10'}`}
            >
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${alert.severity === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn'}`}><Icon name="flag" size={16} /></span>
              <span>
                <span className="block text-sm font-semibold text-ink">{alert.title} <span className="text-ink-muted">· {alert.count}</span></span>
                <span className="mt-1 block text-sm leading-5 text-ink-soft">{alert.detail}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:text-accent-dark">Revisar contenido <Icon name="arrowRight" size={13} /></span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
        <LessonCompletion lessons={data.lesson_progress} totalEnrollments={summary.matriculas} />
        <ConceptPerformance data={data} />
      </section>

      <QuestionPerformance data={data} course={course} />
    </>
  )
}

function Metric({ label, value, detail, icon, tone = 'neutral' }: { label: string; value: string | number; detail: string; icon: 'users' | 'check' | 'layers' | 'clock'; tone?: 'neutral' | 'warn' }) {
  return (
    <div className="flex min-w-0 items-start gap-3 px-5 py-5">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone === 'warn' ? 'bg-warn/10 text-warn' : 'bg-accent/10 text-accent'}`}><Icon name={icon} size={18} /></span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
        <p className="mt-1 truncate text-xs text-ink-muted">{detail}</p>
      </div>
    </div>
  )
}

function LessonCompletion({ lessons, totalEnrollments }: { lessons: InstructorAnalyticsLessonProgress[]; totalEnrollments: number }) {
  return (
    <section className="za-card overflow-hidden" aria-labelledby="completion-title">
      <header className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
        <div>
          <h2 id="completion-title" className="text-base font-semibold text-ink">Avance por lección</h2>
          <p className="mt-1 text-sm text-ink-soft">Qué partes del recorrido se completan con menor frecuencia.</p>
        </div>
        <span className="shrink-0 text-xs text-ink-muted">{totalEnrollments} matrícula(s)</span>
      </header>
      {lessons.length === 0 ? <PanelEmpty message="Este curso todavía no tiene lecciones." /> : (
        <ol className="max-h-[34rem] divide-y divide-surface-border overflow-y-auto">
          {lessons.map((lesson) => (
            <li key={lesson.lesson_id} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{lesson.titulo}</p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">{lesson.modulo_titulo} · {LESSON_LABEL[lesson.tipo]}</p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft" aria-label={`${lesson.tasa_completado}% completada`}>
                <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${lesson.tasa_completado}%` }} />
              </div>
              <span className="text-right text-sm font-semibold tabular-nums text-ink">{lesson.tasa_completado}%</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function ConceptPerformance({ data }: { data: InstructorAnalyticsData }) {
  return (
    <section className="za-card" aria-labelledby="concepts-title">
      <header className="border-b border-surface-border px-5 py-4">
        <h2 id="concepts-title" className="text-base font-semibold text-ink">Conceptos a reforzar</h2>
        <p className="mt-1 text-sm text-ink-soft">Agrupación por competencias etiquetadas.</p>
      </header>
      {!data.competency_mapping_active ? (
        <PanelEmpty message="Este curso aún no tiene competencias etiquetadas. Cuando se mapeen, aquí verás los conceptos con menor acierto." />
      ) : data.concepts.length === 0 ? (
        <PanelEmpty message="Todavía no hay respuestas de quiz para estimar el dominio por concepto." />
      ) : (
        <ol className="divide-y divide-surface-border">
          {data.concepts.map((concept) => (
            <li key={concept.competencia} className="px-5 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">{concept.competencia}</span>
                <span className="text-sm font-semibold tabular-nums text-ink">{concept.tasa_acierto}%</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">{concept.respuestas} respuesta(s) analizada(s)</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function QuestionPerformance({ data, course }: { data: InstructorAnalyticsData; course: Course | null }) {
  return (
    <section className="za-card overflow-hidden" aria-labelledby="questions-title">
      <header className="flex flex-col justify-between gap-3 border-b border-surface-border px-5 py-4 sm:flex-row sm:items-end">
        <div>
          <h2 id="questions-title" className="text-base font-semibold text-ink">Preguntas que conviene revisar</h2>
          <p className="mt-1 text-sm text-ink-soft">Ordenadas por menor tasa de acierto; el resultado no identifica a ningún alumno.</p>
        </div>
        <Link to={course ? `/instructor/cursos/${course.id}/contenido` : '/instructor'} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-dark">Editar preguntas <Icon name="arrowRight" size={15} /></Link>
      </header>
      {data.difficult_questions.length === 0 ? (
        <PanelEmpty message="Aún no hay respuestas de quiz. La primera cohorte activará esta lectura." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[42rem] w-full text-left text-sm">
            <thead className="bg-surface-soft/70 text-xs font-medium text-ink-muted">
              <tr><th className="px-5 py-3">Pregunta</th><th className="px-4 py-3">Lección</th><th className="px-4 py-3 text-right">Respuestas</th><th className="px-5 py-3 text-right">Acierto</th></tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.difficult_questions.map((question) => (
                <tr key={question.question_id} className="align-top hover:bg-surface-soft/60">
                  <td className="max-w-xl px-5 py-4 font-medium leading-5 text-ink">{question.enunciado}</td>
                  <td className="max-w-[14rem] px-4 py-4 text-ink-soft"><span className="block truncate">{question.leccion_titulo}</span><span className="mt-1 block truncate text-xs text-ink-muted">{question.modulo_titulo}</span></td>
                  <td className="px-4 py-4 text-right tabular-nums text-ink-soft">{question.respuestas}</td>
                  <td className="px-5 py-4 text-right"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${question.tasa_acierto < 50 ? 'bg-danger/10 text-danger' : question.tasa_acierto < 70 ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'}`}>{question.tasa_acierto}%</span>{!question.muestra_suficiente && <span className="mt-1 block text-[11px] text-ink-muted">muestra inicial</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.difficult_questions.length > 0 && <p className="border-t border-surface-border px-5 py-3 text-xs leading-5 text-ink-muted">Las tasas se vuelven comparables a partir de {data.minimum_question_sample} respuestas. Antes de cambiar contenido, revisa también el tamaño de muestra y la claridad del enunciado.</p>}
    </section>
  )
}

function PanelEmpty({ message }: { message: string }) {
  return <p className="px-5 py-10 text-center text-sm leading-6 text-ink-soft">{message}</p>
}
