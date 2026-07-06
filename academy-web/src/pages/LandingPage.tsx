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
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'
import type { Course } from '@/types'

const FEATURES: { icon: IconName; titleKey: string; bodyKey: string }[] = [
  { icon: 'certificate', titleKey: 'landing.feature1Title', bodyKey: 'landing.feature1Body' },
  { icon: 'quiz', titleKey: 'landing.feature2Title', bodyKey: 'landing.feature2Body' },
  { icon: 'flame', titleKey: 'landing.feature3Title', bodyKey: 'landing.feature3Body' },
  { icon: 'users', titleKey: 'landing.feature4Title', bodyKey: 'landing.feature4Body' },
]

export function LandingPage() {
  const t = useT()
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
            {t('landing.exploreCourses')}
          </Link>
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent"
          >
            {t('landing.login')}
          </Link>
          <Link
            to="/registro"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            {t('landing.createAccount')}
          </Link>
          <LocaleToggle />
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-deep px-6 py-20 sm:px-10 sm:py-28">
        <div className="pointer-events-none absolute -right-16 -top-20 opacity-[0.07]">
          <Emblem size={440} tone="dark" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
            {t('landing.eyebrow')}
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
            {t('landing.heroTitleLine1')}
            <br />
            {t('landing.heroTitleLine2')}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            {t('landing.heroBody')}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/registro"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-brand transition-colors hover:bg-white/90 sm:w-auto"
            >
              {t('landing.createAccountFree')}
              <Icon name="arrowRight" size={17} />
            </Link>
            <Link
              to="/explorar"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              {t('landing.exploreNoAccount')}
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/55">
            {t('landing.alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-medium text-white underline underline-offset-2 hover:text-white/80">
              {t('landing.loginCta')}
            </Link>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.titleKey} className="za-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon name={f.icon} size={20} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{t(f.titleKey)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t(f.bodyKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cursos destacados */}
      <section className="bg-surface-soft px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="za-eyebrow">{t('landing.catalogEyebrow')}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t('landing.featuredCourses')}</h2>
            </div>
            <Link
              to="/explorar"
              className="hidden shrink-0 items-center gap-1 text-sm font-medium text-accent hover:text-accent-dark sm:inline-flex"
            >
              {t('landing.seeFullCatalog')}
              <Icon name="chevronRight" size={16} />
            </Link>
          </div>

          {loadingCourses ? (
            <div className="flex justify-center py-16">
              <Spinner size={32} />
            </div>
          ) : courses.length === 0 ? (
            <p className="mt-8 text-sm text-ink-soft">{t('landing.comingSoon')}</p>
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
            {t('landing.seeFullCatalog')}
            <Icon name="chevronRight" size={16} />
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-16 text-center sm:px-10">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t('landing.readyTitle')}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          {t('landing.readyBody')}
        </p>
        <Link
          to="/registro"
          className="mx-auto mt-7 flex h-12 w-fit items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          {t('landing.createAccountFree')}
          <Icon name="arrowRight" size={17} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandLockup size={24} />
          <nav className="flex items-center gap-5">
            <Link to="/terminos" className="text-xs font-medium text-ink-soft hover:text-accent">
              {t('landing.termsOfService')}
            </Link>
            <Link to="/privacidad" className="text-xs font-medium text-ink-soft hover:text-accent">
              {t('landing.privacyPolicy')}
            </Link>
          </nav>
          <p className="text-xs text-ink-muted">{t('landing.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  )
}
