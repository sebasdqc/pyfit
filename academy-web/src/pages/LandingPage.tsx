// Landing pública de Zyfit Academy — vive en "/". Los visitantes con sesión van
// a /inicio (mismo patrón que /registro y /explorar vía useRedirectIfAuthenticated).
//
// ── CONTRATO DE DIRECCIÓN ────────────────────────────────────────────────────
// THESIS: un profesional se compone por planos, y la página lo arma a la vista.
//   Rechaza el hero oscuro con aurora y las cuatro tarjetas iguales con ícono
//   que envía todo e-learning (era, literalmente, la versión anterior de esto).
// OWN-WORLD: afiche de Ikko Tanaka. Papel washi #F2E8D5, tinta cálida #14110F y
//   cuatro planos llenos SIN contorno: bermellón = rojo de marca #cc1f36,
//   índigo #1E3A8A, oro #C8A24B, negro. Archivo variable (el ancho hace la
//   jerarquía), radio 0, cero sombras, cero degradados, cero blur. El color
//   toma regiones enteras; un filete de 1px es la única división.
// STORY: veo una figura hecha de planos → entiendo que cada plano es una
//   escuela → compruebo que se arma paso a paso hasta un certificado
//   verificable → creo mi cuenta gratis.
// FIRST VIEWPORT: izquierda sobre papel — rótulo, titular monumental, cuerpo y
//   dos acciones (bermellón sólido + filete). Derecha a sangre: la figura sobre
//   negro. Debajo, tres cifras reales separadas por filetes.
// FORM: "Retrato de Planos", challenger fusionado que el usuario eligió por
//   encima de la tirada (asignada: Pizarra de Análisis, #6 de mi lista; seed
//   d3baf49b). Descartado el staging "barrido rotatorio": la puesta en escena
//   es la del propio mundo — la figura como eje fijo y las regiones de color
//   turnándose el ancho completo.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublicCourses } from '@/api/academy'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import { Wordmark } from '@/components/Emblem'
import { Icon } from '@/components/Icon'
import { PlaneFigure, PlaneMark, STEP_REVEALS, planeOfSchool, type PlaneShape } from '@/components/landing/PlaneFigure'
import { PosterCourseCard } from '@/components/landing/PosterCourseCard'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'
import type { Course } from '@/types'
import './landing.css'

const PAPER = '#f2e8d5'
const VERMILION = '#cc1f36'
const GOLD = '#c8a24b'

// Cada prestación entra con su propio plano, no con un ícono dentro de un
// cuadrado redondeado repetido cuatro veces.
const FEATURES: { shape: PlaneShape; fill: string; titleKey: string; bodyKey: string }[] = [
  { shape: 'halfdisc', fill: VERMILION, titleKey: 'landing.feature1Title', bodyKey: 'landing.feature1Body' },
  { shape: 'column', fill: GOLD, titleKey: 'landing.feature2Title', bodyKey: 'landing.feature2Body' },
  { shape: 'disc', fill: PAPER, titleKey: 'landing.feature3Title', bodyKey: 'landing.feature3Body' },
  { shape: 'bar', fill: VERMILION, titleKey: 'landing.feature5Title', bodyKey: 'landing.feature5Body' },
]

const HOW_STEPS = [
  { titleKey: 'landing.howStep1Title', bodyKey: 'landing.howStep1Body' },
  { titleKey: 'landing.howStep2Title', bodyKey: 'landing.howStep2Body' },
  { titleKey: 'landing.howStep3Title', bodyKey: 'landing.howStep3Body' },
]

// Precios de Zyfit Academy Pro — deben coincidir con
// backend/promos/payments.py PRECIOS[PRODUCTO_ACADEMY_PRO].
const PRICING_PLANS: {
  id: 'mensual' | 'trimestral' | 'anual'
  nameKey: string
  price: number
  months: number
  billedKey: string
  saveKey?: string
  highlighted?: boolean
}[] = [
  { id: 'mensual', nameKey: 'landing.pricingMonthlyName', price: 25, months: 1, billedKey: 'landing.pricingBilledMonthly' },
  {
    id: 'trimestral', nameKey: 'landing.pricingQuarterlyName', price: 50, months: 3,
    billedKey: 'landing.pricingBilledQuarterly', saveKey: 'landing.pricingSaveQuarterly',
  },
  {
    id: 'anual', nameKey: 'landing.pricingYearlyName', price: 150, months: 12,
    billedKey: 'landing.pricingBilledYearly', saveKey: 'landing.pricingSaveYearly', highlighted: true,
  },
]
const PRICING_FEATURES = [
  'landing.pricingFeature1', 'landing.pricingFeature2', 'landing.pricingFeature3', 'landing.pricingFeature4',
]

function monthlyEquivalent(price: number, months: number): string {
  const perMonth = price / months
  return Number.isInteger(perMonth) ? `${perMonth}` : perMonth.toFixed(2)
}

interface SchoolSummary {
  slug: string
  nombre: string
  count: number
}

/** Rótulo de región: cuadro de color + versalitas. Es el mismo gesto en las 6
 *  regiones, así que funciona como clave de color de la página. */
function Rotulo({ children, fill }: { children: React.ReactNode; fill: string }) {
  return (
    <span className="zl-label">
      <span aria-hidden="true" style={{ width: 10, height: 10, background: fill, display: 'block' }} />
      {children}
    </span>
  )
}

/** Cabecera de región: rótulo + título anclados al borde izquierdo de la grilla,
 *  con el cuerpo (o una acción) a la derecha, alineados por la base. */
function RegionHead({
  rotulo,
  fill,
  title,
  aside,
}: {
  rotulo: string
  fill: string
  title: string
  aside?: React.ReactNode
}) {
  return (
    <div className="zl-head">
      <div className="zl-head-lead">
        <Rotulo fill={fill}>{rotulo}</Rotulo>
        <h2 className="zl-title">{title}</h2>
      </div>
      {aside && <div className="zl-head-aside">{aside}</div>}
    </div>
  )
}

export function LandingPage() {
  const t = useT()
  const redirecting = useRedirectIfAuthenticated('/inicio')
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [activeSchool, setActiveSchool] = useState<string | null>(null)
  // Paso mostrado por la figura de "Cómo funciona". Arranca en el último: quien
  // no interactúa ve el resultado, y quien interactúa puede rebobinar el armado.
  const [step, setStep] = useState(HOW_STEPS.length - 1)

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
    { value: allCourses.length, label: t('landing.statsCoursesLabel') },
    { value: schools.length, label: t('landing.statsSchoolsLabel') },
    { value: totalHoras, label: t('landing.statsHoursLabel') },
  ]
  const showStats = !loadingCourses && allCourses.length > 0
  const activeSchoolName = schools.find((s) => s.slug === activeSchool)?.nombre

  if (redirecting) return <LoadingScreen />

  return (
    <div className="zl">
      {/* Navegación — filete inferior y una última celda de color que sangra
          hasta el borde derecho: el remate del afiche, no una píldora flotante */}
      <nav className="zl-nav" aria-label={t('landing.navLabel')}>
        <div className="zl-nav-inner">
          <Link to="/" className="zl-nav-brand">
            <Wordmark />
          </Link>
          <div className="zl-nav-links">
            <Link to="/explorar" className="zl-nav-link">{t('landing.exploreCourses')}</Link>
            <a href="#precios" className="zl-nav-link">{t('landing.pricingNavLink')}</a>
            <Link to="/blog" className="zl-nav-link">{t('blog.eyebrow')}</Link>
            <Link to="/login" className="zl-nav-link">{t('landing.login')}</Link>
            <span className="zl-nav-tail">
              <LocaleToggle className="!h-9 !min-w-9 !rounded-none !border-[#14110f]/35 !bg-transparent !text-[#5a524a] hover:!bg-[#14110f]/10 hover:!text-[#14110f]" />
            </span>
            <Link to="/registro" className="zl-nav-cta">{t('landing.createAccount')}</Link>
          </div>
        </div>
      </nav>

      {/* Hero — tipografía sobre papel a la izquierda, la figura a sangre sobre
          negro a la derecha. La figura es el argumento, no una ilustración */}
      <header className="zl-hero">
        <div className="zl-hero-grid">
          <div className="zl-hero-type">
            <Rotulo fill={VERMILION}>{t('landing.eyebrow')}</Rotulo>
            <h1 className="zl-display">
              {t('landing.heroTitleLine1')}
              <br />
              {t('landing.heroTitleLine2')}
            </h1>
            <p className="zl-body">{t('landing.heroBody')}</p>
            <div className="zl-hero-actions">
              <Link to="/registro" className="zl-btn zl-btn--primary">
                {t('landing.createAccountFree')}
                <Icon name="arrowRight" size={16} />
              </Link>
              <Link to="/explorar" className="zl-btn zl-btn--ghost">
                {t('landing.exploreNoAccount')}
              </Link>
            </div>
            <p className="zl-hero-note">
              {t('landing.alreadyHaveAccount')}{' '}
              <Link to="/login">{t('landing.loginCta')}</Link>
            </p>
          </div>
          <div className="zl-hero-figure">
            <PlaneFigure label={t('landing.figureLabel')} fit="bleed" animateOnMount />
          </div>
        </div>
      </header>

      {/* Cifras reales del catálogo, en una tira dividida por filetes */}
      {showStats && (
        <div className="zl-stats">
          <div className="zl-stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="zl-stat">
                <span className="zl-num zl-stat-value">{s.value}</span>
                <span className="zl-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prestaciones — cuadrantes de una grilla continua sobre índigo */}
      <section className="zl-region zl-region--indigo">
        <div className="zl-wrap">
          <RegionHead rotulo={t('landing.featuresEyebrow')} fill={GOLD} title={t('landing.featuresTitle')} />
          <div className="zl-quads">
            {FEATURES.map((f) => (
              <div key={f.titleKey} className="zl-quad">
                <PlaneMark shape={f.shape} fill={f.fill} className="zl-quad-mark" />
                <div>
                  <h3 className="zl-subtitle">{t(f.titleKey)}</h3>
                  <p className="zl-body zl-body--sm" style={{ marginTop: '0.5rem' }}>{t(f.bodyKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Escuelas — la demostración de la tesis: cada escuela es un plano de la
          figura, y enfocarla lo enciende */}
      {schools.length > 0 && (
        <section className="zl-region zl-region--paper">
          <div className="zl-wrap">
            <RegionHead
              rotulo={t('landing.schoolsEyebrow')}
              fill={VERMILION}
              title={t('landing.schoolsTitle')}
              aside={<p className="zl-body">{t('landing.schoolsBody')}</p>}
            />

            <div className="zl-schools">
              <div className="zl-schools-figure">
                <PlaneFigure label={t('landing.figureLabel')} activeSlug={activeSchool} />
                <p className="zl-figure-caption">
                  <span
                    aria-hidden="true"
                    className="zl-figure-dot"
                    style={{ background: activeSchool ? planeOfSchool(activeSchool).fill : PAPER }}
                  />
                  {activeSchoolName ?? t('landing.schoolsHint')}
                </p>
              </div>

              <ul className="zl-school-list" onMouseLeave={() => setActiveSchool(null)}>
                {schools.map((s) => {
                  const plane = planeOfSchool(s.slug)
                  return (
                    <li key={s.slug}>
                      <Link
                        to={`/explorar?escuela=${s.slug}`}
                        className="zl-school"
                        onMouseEnter={() => setActiveSchool(s.slug)}
                        onFocus={() => setActiveSchool(s.slug)}
                        onBlur={() => setActiveSchool(null)}
                      >
                        <PlaneMark shape={plane.shape} fill={plane.fill} className="zl-school-mark" />
                        <span className="zl-school-name">{s.nombre}</span>
                        <span className="zl-school-count">
                          {t(s.count === 1 ? 'catalog.coursesCountOne' : 'catalog.coursesCountOther', {
                            count: s.count,
                          })}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Cursos destacados */}
      <section className="zl-region zl-region--paper2">
        <div className="zl-wrap">
          <RegionHead
            rotulo={t('landing.catalogEyebrow')}
            fill={VERMILION}
            title={t('landing.featuredCourses')}
            aside={
              <Link to="/explorar" className="zl-link">
                {t('landing.seeFullCatalog')}
                <Icon name="arrowRight" size={14} />
              </Link>
            }
          />

          {loadingCourses ? (
            <div className="zl-courses" aria-busy="true" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <div key={i} className="zl-course" style={{ opacity: 0.5 }}>
                  <div className="zl-course-plate" style={{ background: 'rgba(20,17,15,0.12)' }} />
                  <div className="zl-course-body">
                    <span className="zl-course-meta">{t('landing.loadingCourses')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredCourses.length === 0 ? (
            <p className="zl-body">{t('landing.comingSoon')}</p>
          ) : (
            <div className="zl-courses">
              {featuredCourses.map((c, i) => (
                <PosterCourseCard key={c.id} course={c} index={i} to={`/explorar/cursos/${c.id}`} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cómo funciona — la figura se arma paso a paso y termina en el papel del
          certificado, que es la única prueba concreta que la página promete */}
      <section className="zl-region zl-region--ink">
        <div className="zl-wrap">
          <RegionHead rotulo={t('landing.howEyebrow')} fill={GOLD} title={t('landing.howTitle')} />

          <div className="zl-steps">
            <ul className="zl-step-list">
              {HOW_STEPS.map((s, i) => (
                <li key={s.titleKey}>
                  <button
                    type="button"
                    className="zl-step"
                    aria-pressed={step === i}
                    onClick={() => setStep(i)}
                    onMouseEnter={() => setStep(i)}
                    onFocus={() => setStep(i)}
                  >
                    <span className="zl-num zl-step-num">{i + 1}</span>
                    <span>
                      <span className="zl-subtitle" style={{ display: 'block' }}>{t(s.titleKey)}</span>
                      <span className="zl-body zl-body--sm" style={{ display: 'block', marginTop: '0.5rem' }}>
                        {t(s.bodyKey)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div>
              <div className="zl-steps-figure">
                <PlaneFigure label={t('landing.figureLabel')} revealCount={STEP_REVEALS[step]} />
              </div>
              <div className="zl-cert" style={{ marginTop: '1.5rem' }}>
                <div className="zl-cert-rule" />
                <span className="zl-label">{t('landing.certLabel')}</span>
                <p className="zl-cert-code zl-num">ZA-XXXXXXXX</p>
                <p className="zl-body zl-body--sm" style={{ margin: 0 }}>{t('landing.certNote')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="zl-region zl-region--paper" style={{ scrollMarginTop: '4rem' }}>
        <div className="zl-wrap">
          <RegionHead
            rotulo={t('landing.pricingEyebrow')}
            fill={VERMILION}
            title={t('landing.pricingTitle')}
            aside={<p className="zl-body">{t('landing.pricingBody')}</p>}
          />

          <div className="zl-plans">
            {PRICING_PLANS.map((p) => (
              <div key={p.id} className={`zl-plan${p.highlighted ? ' zl-plan--featured' : ''}`}>
                <span className="zl-plan-name">{t(p.nameKey)}</span>
                <p className="zl-plan-price zl-num">
                  <span>USD {monthlyEquivalent(p.price, p.months)}</span>
                  <span className="zl-plan-per">{t('landing.pricingPerMonth')}</span>
                </p>
                <p className="zl-plan-billed">{t(p.billedKey, { price: p.price })}</p>
                {p.saveKey && <span className="zl-plan-tag">{t(p.saveKey)}</span>}

                <ul className="zl-plan-features">
                  {PRICING_FEATURES.map((f) => (
                    <li key={f} className="zl-plan-feature">
                      <span
                        aria-hidden="true"
                        style={{
                          width: 10,
                          height: 10,
                          marginTop: '0.4rem',
                          background: p.highlighted ? GOLD : VERMILION,
                          display: 'block',
                        }}
                      />
                      {t(f)}
                    </li>
                  ))}
                </ul>

                <Link to="/registro" className={`zl-btn ${p.highlighted ? 'zl-btn--primary' : 'zl-btn--ghost'}`}>
                  {t('landing.pricingCta')}
                </Link>
              </div>
            ))}
          </div>

          <p className="zl-body zl-body--sm" style={{ marginTop: '2rem', maxWidth: 'none' }}>
            {t('landing.pricingFootnote')}
          </p>
        </div>
      </section>

      {/* Cierre — una región bermellón entera, sin tarjeta que la contenga */}
      <section className="zl-region zl-region--vermilion">
        <div className="zl-wrap zl-close">
          <div>
            <h2 className="zl-display" style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}>
              {t('landing.readyTitle')}
            </h2>
            <p className="zl-body" style={{ marginTop: '1.25rem' }}>{t('landing.readyBody')}</p>
          </div>
          <Link to="/registro" className="zl-btn zl-btn--primary">
            {t('landing.createAccountFree')}
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </section>

      <footer className="zl-foot">
        <div className="zl-wrap zl-foot-inner">
          <Wordmark size={16} tone="dark" />
          <nav className="zl-foot-nav" aria-label={t('landing.footerNavLabel')}>
            <Link to="/blog" className="zl-foot-link">{t('landing.blogLink')}</Link>
            <Link to="/terminos" className="zl-foot-link">{t('landing.termsOfService')}</Link>
            <Link to="/privacidad" className="zl-foot-link">{t('landing.privacyPolicy')}</Link>
          </nav>
          <p className="zl-foot-copy">{t('landing.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  )
}
