// Las 3 páginas del dropdown "Para quién" (Equipos deportivos / Atletas de
// alto rendimiento / Instituciones educativas) comparten exactamente la
// misma estructura — solo cambia el copy y qué módulos se destacan — así que
// viven en un único componente data-driven sobre /para-quien/:segment, en vez
// de 3 archivos casi idénticos.
import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Reveal } from '@/components/Reveal'
import { CONTACT_HREF, MODULES, type ModuleId } from '@/lib/publicSite'
import { useT } from '@/locale/useT'

type Segment = 'equipos' | 'atletas' | 'instituciones'

// Solo la estructura (íconos por beneficio + ids de módulos relevantes) vive
// acá — el copy (eyebrow/title/benefits/closing) se resuelve con `t()` en el
// componente, indexado por `segment`, así se traduce sin duplicar la
// estructura. `moduleIds` reemplaza los antiguos `moduleNames` en español:
// filtrar por nombre traducido rompía en inglés, filtrar por id no.
const AUDIENCE_META: Record<
  Segment,
  { icons: IconName[]; hasNote?: boolean; moduleIds: ModuleId[] }
> = {
  equipos: {
    icons: ['plantilla', 'planificacion', 'lesiones', 'simulador'],
    moduleIds: ['rendimiento', 'lesiones', 'planificacion', 'simulador', 'calendario', 'psicologico'],
  },
  atletas: {
    icons: ['gauge', 'tests', 'psicologico', 'lesiones'],
    hasNote: true,
    moduleIds: ['rendimiento', 'tests', 'psicologico', 'lesiones'],
  },
  instituciones: {
    icons: ['tests', 'calendario', 'planificacion', 'reportes'],
    moduleIds: ['rendimiento', 'tests', 'planificacion', 'calendario'],
  },
}

export function AudiencePage() {
  const t = useT()
  const { segment } = useParams<{ segment: string }>()
  const meta = segment && segment in AUDIENCE_META ? AUDIENCE_META[segment as Segment] : null
  if (!meta || !segment) return <Navigate to="/" replace />

  const content = {
    eyebrow: t(`audience.segments.${segment}.eyebrow`),
    title: t(`audience.segments.${segment}.title`),
    subtitle: t(`audience.segments.${segment}.subtitle`),
    note: meta.hasNote ? t(`audience.segments.${segment}.note`) : undefined,
    benefits: meta.icons.map((icon, i) => ({
      icon,
      title: t(`audience.segments.${segment}.benefits.${i}.title`),
      body: t(`audience.segments.${segment}.benefits.${i}.body`),
    })),
    closingTitle: t(`audience.segments.${segment}.closingTitle`),
    closingBody: t(`audience.segments.${segment}.closingBody`),
  }

  const modules = MODULES.filter((m) => meta.moduleIds.includes(m.id)).map((m) => ({
    ...m,
    name: t(`modules.${m.id}.name`),
    body: t(`modules.${m.id}.body`),
  }))

  return (
    <div className="min-h-screen bg-perf-bg">
      <PublicHeader />

      <section className="px-6 pb-16 pt-40 sm:px-10 sm:pt-44">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accentLight/80">
              {content.eyebrow}
            </p>
            <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
              {content.title}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
              {content.subtitle}
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={CONTACT_HREF}
                className="flex h-12 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accentDark"
              >
                {t('audience.solicitarAcceso')}
              </a>
              <Link
                to="/precio"
                className="flex h-12 items-center justify-center rounded-lg border border-white/15 px-6 text-sm font-medium text-white/85 transition-colors hover:bg-white/5"
              >
                {t('audience.verPlanes')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {content.note && (
        <section className="px-6 sm:px-10">
          <Reveal className="mx-auto max-w-3xl rounded-2xl border border-accent/25 bg-accent/[0.06] px-6 py-5 text-sm leading-relaxed text-white/70">
            {content.note}
          </Reveal>
        </section>
      )}

      <section className="px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-6xl grid grid-cols-1 gap-4 sm:grid-cols-2">
          {content.benefits.map((b, i) => (
            <Reveal key={b.title} delay={(i % 2) * 80}>
              <div className="h-full rounded-2xl border border-white/[0.14] bg-white/[0.05] p-6 backdrop-blur-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accentLight">
                  <Icon name={b.icon} size={22} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-perf-surface px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              {t('audience.modulosRelevantes')}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t('audience.loQueVasAUsar')}
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((m, i) => (
              <Reveal key={m.name} delay={(i % 4) * 70}>
                <div className="h-full rounded-2xl border border-perf-border bg-perf-bg p-5 transition-colors hover:border-accent/40">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon name={m.icon} size={20} />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-white">{m.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/50">{m.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10">
        <Reveal className="mx-auto max-w-6xl rounded-3xl bg-accent px-6 py-14 text-center sm:px-16 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{content.closingTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/85">{content.closingBody}</p>
          <a
            href={CONTACT_HREF}
            className="mx-auto mt-7 flex h-12 w-fit items-center justify-center rounded-lg bg-white px-7 text-sm font-semibold text-accentDark transition-colors hover:bg-white/90"
          >
            {t('audience.solicitarAcceso')}
          </a>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  )
}
