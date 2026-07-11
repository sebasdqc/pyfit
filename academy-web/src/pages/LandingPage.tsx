// Landing pública de Zyfit Academy — vive en "/". Reemplaza el redirect directo
// a /login para visitantes sin sesión. Usuarios ya logueados son enviados a
// /inicio (mismo patrón que /registro y /explorar vía useRedirectIfAuthenticated).

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublicCourses } from '@/api/academy'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import Aurora from '@/components/Aurora'
import { Wordmark } from '@/components/Emblem'
import BorderGlow from '@/components/effects/BorderGlow'
import StarBorder from '@/components/effects/StarBorder'
import { Icon, type IconName } from '@/components/Icon'
import { CourseCard } from '@/components/ui/CourseCard'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Spinner } from '@/components/ui/Spinner'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { schoolGradient, schoolTheme } from '@/lib/schoolTheme'
import { cssVarToHex } from '@/lib/themeColor'
import { useT } from '@/locale/useT'
import type { Course } from '@/types'

const FEATURES: { icon: IconName; titleKey: string; bodyKey: string }[] = [
  { icon: 'certificate', titleKey: 'landing.feature1Title', bodyKey: 'landing.feature1Body' },
  { icon: 'quiz', titleKey: 'landing.feature2Title', bodyKey: 'landing.feature2Body' },
  { icon: 'flame', titleKey: 'landing.feature3Title', bodyKey: 'landing.feature3Body' },
  { icon: 'activity', titleKey: 'landing.feature5Title', bodyKey: 'landing.feature5Body' },
]

const HOW_STEPS: { icon: IconName; titleKey: string; bodyKey: string }[] = [
  { icon: 'profile', titleKey: 'landing.howStep1Title', bodyKey: 'landing.howStep1Body' },
  { icon: 'learning', titleKey: 'landing.howStep2Title', bodyKey: 'landing.howStep2Body' },
  { icon: 'certificate', titleKey: 'landing.howStep3Title', bodyKey: 'landing.howStep3Body' },
]

interface SchoolSummary {
  slug: string
  nombre: string
  count: number
}

// Estilo del glow compartido por los 3 tipos de card de la landing — colores
// derivados de la marca (accent-light/accent/brand) en vez de la paleta
// morado/rosa/celeste genérica del componente original.
const CARD_GLOW = {
  borderRadius: 16,
  glowColor: '353 82 62',
  colors: ['#f0626f', '#e63950', '#cc1f36'],
  glowRadius: 28,
  glowIntensity: 0.85,
  coneSpread: 32,
  minGlow: 0.5,
}

export function LandingPage() {
  const t = useT()
  const redirecting = useRedirectIfAuthenticated('/inicio')
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  useEffect(() => {
    let active = true
    listPublicCourses()
      .then((data) => active && setAllCourses(data))
      .catch(() => {})
      .finally(() => active && setLoadingCourses(false))
    return () => {
      active = false
    }
  }, [])

  // Colores de la aurora del Hero: derivados de las variables CSS del tenant
  // activo (no hardcodeados) para que el efecto respete el white-labeling.
  const auroraColors = useMemo<[string, string, string]>(
    () => [
      cssVarToHex('--color-accent-light', '#f0626f'),
      cssVarToHex('--color-accent', '#e63950'),
      cssVarToHex('--color-brand', '#cc1f36'),
    ],
    [],
  )

  const featuredCourses = useMemo(() => allCourses.slice(0, 6), [allCourses])

  const schools = useMemo<SchoolSummary[]>(() => {
    const bySlug = new Map<string, SchoolSummary>()
    for (const c of allCourses) {
      if (!c.escuela_slug || !c.escuela_nombre) continue
      const existing = bySlug.get(c.escuela_slug)
      if (existing) existing.count += 1
      else bySlug.set(c.escuela_slug, { slug: c.escuela_slug, nombre: c.escuela_nombre, count: 1 })
    }
    return Array.from(bySlug.values()).sort((a, b) => b.count - a.count)
  }, [allCourses])

  const totalHoras = useMemo(() => {
    const horas = allCourses.reduce(
      (sum, c) => sum + (c.carga_horaria_h > 0 ? c.carga_horaria_h : c.duracion_estimada_min / 60),
      0,
    )
    return Math.round(horas)
  }, [allCourses])

  const stats = [
    { icon: 'catalog' as const, value: allCourses.length, label: t('landing.statsCoursesLabel') },
    { icon: 'layers' as const, value: schools.length, label: t('landing.statsSchoolsLabel') },
    { icon: 'clock' as const, value: totalHoras, label: t('landing.statsHoursLabel') },
  ]
  const showStats = !loadingCourses && allCourses.length > 0

  if (redirecting) return <LoadingScreen />

  return (
    <div data-theme="dark" className="min-h-[100dvh] bg-surface-soft text-ink">
      {/* Header — barra de navegación flotante, siempre oscura (ya lo era antes;
          ahora coincide con el resto de la landing, que también es fija en oscuro) */}
      <header className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-black/55 px-4 py-3 shadow-lg shadow-black/30 backdrop-blur-xl sm:inset-x-6 sm:top-5 sm:px-6">
        <Link to="/" className="shrink-0">
          <Wordmark tone="dark" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/explorar"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white sm:inline-block"
          >
            {t('landing.exploreCourses')}
          </Link>
          <Link
            to="/blog"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white sm:inline-block"
          >
            {t('blog.eyebrow')}
          </Link>
          <Link
            to="/login"
            className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white sm:px-3"
          >
            {t('landing.login')}
          </Link>
          <Link
            to="/registro"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-white/90 sm:px-4"
          >
            {t('landing.createAccount')}
          </Link>
          <LocaleToggle className="!border-white/15 !bg-white/10 !text-white/75 hover:!bg-white/15 hover:!text-white" />
        </nav>
      </header>

      {/* Hero — altura de pantalla completa; el fondo aurora se mueve más que
          antes y la barra de estadísticas vive dentro de este mismo frame,
          tanto en desktop como en mobile */}
      <section
        className="relative flex min-h-[100dvh] flex-col px-6 pb-24 pt-28 sm:px-10 sm:pb-32 sm:pt-32"
        style={{ background: 'radial-gradient(120% 100% at 50% -10%, rgb(var(--color-brand-deep) / 0.6), #040406 65%)' }}
      >
        {/* overflow-hidden queda acá, y no en el <section>, para que el fondo
            aurora se recorte a este frame pero la barra de estadísticas de más
            abajo pueda seguir "flotando" fuera de este límite sin ser clipeada */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Aurora colorStops={auroraColors} blend={0.6} amplitude={2.6} speed={1.1} />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#040406] to-transparent" />
        </div>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
            {t('landing.eyebrow')}
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
            {t('landing.heroTitleLine1')}
            <br />
            {t('landing.heroTitleLine2')}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            {t('landing.heroBody')}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <StarBorder as={Link} to="/registro" color="#f0626f" speed="5s" thickness={3} className="w-full sm:w-fit">
              {t('landing.createAccountFree')}
              <Icon name="arrowRight" size={17} />
            </StarBorder>
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

        {/* Barra de estadísticas — flota sobre el borde inferior del Hero,
            pero sigue viviendo dentro del mismo frame de pantalla completa */}
        {showStats && (
          <div className="relative z-10 mx-auto -mb-24 w-full max-w-4xl sm:-mb-28">
            <div className="za-card za-fade-up grid grid-cols-1 divide-y divide-surface-border overflow-hidden rounded-3xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3 px-6 py-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon name={s.icon} size={19} />
                  </span>
                  <div>
                    <p className="text-2xl font-bold leading-none tracking-tight text-ink">{s.value}</p>
                    <p className="mt-1 text-xs text-ink-soft">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className={`mx-auto max-w-6xl px-6 sm:px-10 ${showStats ? 'pb-16 pt-14' : 'py-16'}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <BorderGlow
              key={f.titleKey}
              {...CARD_GLOW}
              backgroundColor="#1f2937"
              className="group h-full transition-transform hover:-translate-y-0.5"
            >
              <div className="flex h-full flex-col p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                  <Icon name={f.icon} size={20} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{t(f.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t(f.bodyKey)}</p>
              </div>
            </BorderGlow>
          ))}
        </div>
      </section>

      {/* Escuelas de especialización */}
      {schools.length > 0 && (
        <section className="bg-surface-soft px-6 py-16 sm:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <p className="za-eyebrow">{t('landing.schoolsEyebrow')}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {t('landing.schoolsTitle')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t('landing.schoolsBody')}</p>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {schools.map((s) => {
                const theme = schoolTheme(s.slug)
                return (
                  <div
                    key={s.slug}
                    className="w-[calc((100%-1rem)/2)] sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
                  >
                    <BorderGlow
                      {...CARD_GLOW}
                      backgroundColor="#1f2937"
                      className="group h-full transition-transform hover:-translate-y-0.5"
                    >
                      <Link
                        to={`/explorar?escuela=${s.slug}`}
                        className="relative flex h-full flex-col overflow-hidden p-5"
                      >
                        <div
                          className="pointer-events-none absolute -right-6 -top-6 opacity-[0.07] transition-transform duration-300 group-hover:scale-110"
                          style={{ color: theme.accent }}
                        >
                          <Icon name={theme.icon} size={110} strokeWidth={1.2} />
                        </div>
                        <span
                          className="relative flex h-11 w-11 items-center justify-center rounded-xl text-white"
                          style={{ backgroundImage: schoolGradient(theme) }}
                        >
                          <Icon name={theme.icon} size={20} />
                        </span>
                        <h3 className="relative mt-4 text-[14px] font-semibold leading-snug text-ink">{s.nombre}</h3>
                        <p className="relative mt-1 text-xs text-ink-muted">
                          {t(s.count === 1 ? 'catalog.coursesCountOne' : 'catalog.coursesCountOther', {
                            count: s.count,
                          })}
                        </p>
                      </Link>
                    </BorderGlow>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Cursos destacados */}
      <section className="px-6 py-16 sm:px-10">
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
          ) : featuredCourses.length === 0 ? (
            <p className="mt-8 text-sm text-ink-soft">{t('landing.comingSoon')}</p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCourses.map((c) => (
                <BorderGlow
                  key={c.id}
                  {...CARD_GLOW}
                  backgroundColor="transparent"
                  className="transition-transform hover:-translate-y-0.5"
                >
                  <CourseCard course={c} to={`/explorar/cursos/${c.id}`} />
                </BorderGlow>
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

      {/* Cómo funciona */}
      <section className="bg-surface-soft px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <p className="za-eyebrow">{t('landing.howEyebrow')}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t('landing.howTitle')}</h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {HOW_STEPS.map((s, i) => (
              <div key={s.titleKey}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{t(s.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t(s.bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-brand-deep px-6 py-14 text-center sm:px-16 sm:py-16">
          <div className="pointer-events-none absolute -left-16 -bottom-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('landing.readyTitle')}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70">{t('landing.readyBody')}</p>
            <StarBorder as={Link} to="/registro" color="#f0626f" speed="5s" thickness={3} className="mx-auto mt-7 w-fit">
              {t('landing.createAccountFree')}
              <Icon name="arrowRight" size={17} />
            </StarBorder>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Wordmark size={16} />
          <nav className="flex items-center gap-5">
            <Link to="/blog" className="text-xs font-medium text-ink-soft hover:text-accent">
              {t('landing.blogLink')}
            </Link>
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
