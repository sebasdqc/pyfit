// Landing pública de Zyfit Academy — vive en "/". Reemplaza el redirect directo
// a /login para visitantes sin sesión. Usuarios ya logueados son enviados a
// /inicio (mismo patrón que /registro y /explorar vía useRedirectIfAuthenticated).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublicCourses } from '@/api/academy'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import { BrandLockup, Emblem } from '@/components/Emblem'
import { Icon, type IconName } from '@/components/Icon'
import { CourseCard } from '@/components/ui/CourseCard'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Spinner } from '@/components/ui/Spinner'
import type { Course } from '@/types'

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'certificate',
    title: 'Certificados verificables',
    body: 'Al completar un curso obtienes un certificado con código único que cualquiera puede verificar.',
  },
  {
    icon: 'quiz',
    title: 'Evaluaciones calificadas',
    body: 'Quizzes corregidos en el servidor con feedback pregunta por pregunta y reintentos.',
  },
  {
    icon: 'flame',
    title: 'Racha de estudio',
    body: 'Un sistema de rachas e insignias que premia la constancia, no solo terminar un curso.',
  },
  {
    icon: 'users',
    title: 'Comunidad',
    body: 'Preguntas y respuestas entre alumnos, moderadas automáticamente para mantener la calidad.',
  },
]

export function LandingPage() {
  const redirecting = useRedirectIfAuthenticated('/inicio')
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  useEffect(() => {
    let active = true
    listPublicCourses()
      .then((data) => active && setCourses(data.slice(0, 6)))
      .catch(() => {})
      .finally(() => active && setLoadingCourses(false))
    return () => {
      active = false
    }
  }, [])

  if (redirecting) return <LoadingScreen />

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border bg-white/90 px-6 py-4 backdrop-blur sm:px-10">
        <BrandLockup size={30} />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/explorar"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent sm:inline-block"
          >
            Explorar cursos
          </Link>
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/registro"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-deep px-6 py-20 sm:px-10 sm:py-28">
        <div className="pointer-events-none absolute -right-16 -top-20 opacity-[0.07]">
          <Emblem size={440} tone="dark" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
            Academia digital · Ciencia en movimiento
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
            Formación de élite,
            <br />
            al alcance de todos.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            Cursos, evaluaciones y certificaciones con base científica real para llevar tu
            conocimiento del entrenamiento al siguiente nivel.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/registro"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-brand transition-colors hover:bg-white/90 sm:w-auto"
            >
              Crear cuenta gratis
              <Icon name="arrowRight" size={17} />
            </Link>
            <Link
              to="/explorar"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              Explorar catálogo sin cuenta
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/55">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-white underline underline-offset-2 hover:text-white/80">
              Inicia sesión
            </Link>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="za-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon name={f.icon} size={20} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cursos destacados */}
      <section className="bg-surface-soft px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="za-eyebrow">Catálogo</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Cursos destacados</h2>
            </div>
            <Link
              to="/explorar"
              className="hidden shrink-0 items-center gap-1 text-sm font-medium text-accent hover:text-accent-dark sm:inline-flex"
            >
              Ver todo el catálogo
              <Icon name="chevronRight" size={16} />
            </Link>
          </div>

          {loadingCourses ? (
            <div className="flex justify-center py-16">
              <Spinner size={32} />
            </div>
          ) : courses.length === 0 ? (
            <p className="mt-8 text-sm text-ink-soft">Muy pronto vas a encontrar cursos aquí.</p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} to={`/explorar/cursos/${c.id}`} />
              ))}
            </div>
          )}

          <Link
            to="/explorar"
            className="mt-8 flex items-center justify-center gap-1 text-sm font-medium text-accent hover:text-accent-dark sm:hidden"
          >
            Ver todo el catálogo
            <Icon name="chevronRight" size={16} />
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-16 text-center sm:px-10">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">¿Listo para empezar?</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          Crea tu cuenta gratis y arranca hoy mismo con el primer módulo de cada escuela.
        </p>
        <Link
          to="/registro"
          className="mx-auto mt-7 flex h-12 w-fit items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Crear cuenta gratis
          <Icon name="arrowRight" size={17} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandLockup size={24} />
          <p className="text-xs text-ink-muted">© {new Date().getFullYear()} Zyfit Academy</p>
        </div>
      </footer>
    </div>
  )
}
