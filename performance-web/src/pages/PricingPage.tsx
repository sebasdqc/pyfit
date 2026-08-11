// Página "Precio" — el panel no tiene billing real (el acceso se coordina
// con el equipo, ver FAQ de LandingPage.tsx), así que los 3 planes muestran
// qué incluye cada uno en vez de un número en $ — todos terminan en el mismo
// CTA de contacto que el resto del sitio.
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Reveal } from '@/components/Reveal'
import { CONTACT_HREF } from '@/lib/publicSite'
import { useT } from '@/locale/useT'

type PlanKey = 'atleta' | 'equipo' | 'institucion'

const PLAN_META: { key: PlanKey; featured?: boolean; linkTo: string; featureCount: number }[] = [
  { key: 'atleta', linkTo: '/para-quien/atletas', featureCount: 4 },
  { key: 'equipo', featured: true, linkTo: '/para-quien/equipos', featureCount: 4 },
  { key: 'institucion', linkTo: '/para-quien/instituciones', featureCount: 4 },
]

export function PricingPage() {
  const t = useT()
  const PLANS = PLAN_META.map((meta) => ({
    ...meta,
    name: t(`pricing.plans.${meta.key}.name`),
    audience: t(`pricing.plans.${meta.key}.audience`),
    features: Array.from({ length: meta.featureCount }, (_, i) => t(`pricing.plans.${meta.key}.features.${i}`)),
  }))

  return (
    <div className="min-h-screen bg-perf-bg">
      <PublicHeader />

      <section className="px-6 pb-16 pt-40 sm:px-10 sm:pt-44">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accentLight/80">
            {t('pricing.eyebrow')}
          </p>
          <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            {t('pricing.title')}
            <span className="text-accent">.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
            {t('pricing.subtitle')}
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-20 sm:px-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 90}>
              <div
                className={`flex h-full flex-col rounded-2xl border p-7 backdrop-blur-md ${
                  plan.featured
                    ? 'border-accent/60 bg-white/[0.06] shadow-[0_0_60px_-12px_rgba(20,184,166,0.5)]'
                    : 'border-white/[0.14] bg-white/[0.04]'
                }`}
              >
                {plan.featured && (
                  <span className="mb-4 w-fit rounded-full bg-accent/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-accentLight">
                    {t('pricing.mostElegido')}
                  </span>
                )}
                <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{plan.audience}</p>
                <p className="mt-6 text-2xl font-bold tracking-tight text-white">
                  {t('pricing.aMedida')} <span className="text-sm font-medium text-white/40">{t('pricing.contactanos')}</span>
                </p>
                <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-white/70">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-perf-ok" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={CONTACT_HREF}
                  className={`mt-7 flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors ${
                    plan.featured
                      ? 'bg-accent text-white hover:bg-accentDark'
                      : 'border border-white/15 text-white/85 hover:bg-white/5'
                  }`}
                >
                  {t('pricing.solicitarAcceso')}
                </a>
                <Link
                  to={plan.linkTo}
                  className="mt-3 text-center text-xs font-medium text-white/45 transition-colors hover:text-accentLight"
                >
                  {t('pricing.verMas')}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10">
        <Reveal className="mx-auto max-w-6xl rounded-3xl bg-accent px-6 py-14 text-center sm:px-16 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('pricing.ctaTitle')}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/85">{t('pricing.ctaBody')}</p>
          <a
            href={CONTACT_HREF}
            className="mx-auto mt-7 flex h-12 w-fit items-center justify-center rounded-lg bg-white px-7 text-sm font-semibold text-accentDark transition-colors hover:bg-white/90"
          >
            {t('pricing.solicitarAcceso')}
          </a>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  )
}
