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
import { CONTACT_HREF, MODULES } from '@/lib/publicSite'

type Segment = 'equipos' | 'atletas' | 'instituciones'

type AudienceContent = {
  eyebrow: string
  title: string
  subtitle: string
  note?: string
  benefits: { icon: IconName; title: string; body: string }[]
  moduleNames: string[]
  closingTitle: string
  closingBody: string
}

const AUDIENCES: Record<Segment, AudienceContent> = {
  equipos: {
    eyebrow: 'Para equipos deportivos',
    title: 'Todo tu cuerpo técnico, coordinado en un solo panel.',
    subtitle:
      'Clubes y centros de fútbol o futsal que necesitan a todo su staff —físico, médico, táctico y psicológico— trabajando sobre los mismos datos, no en planillas sueltas.',
    benefits: [
      {
        icon: 'plantilla',
        title: 'Un plantel, todos los roles',
        body: 'Director técnico, preparador físico, fisioterapeuta, analista, planificador y psicólogo acceden al mismo plantel, cada uno solo a los módulos que le corresponden.',
      },
      {
        icon: 'planificacion',
        title: 'Sesiones de equipo generadas con IA',
        body: 'El planificador arma meso y microciclos por equipo —no por atleta, porque en fútbol y futsal se entrena junto— con un asesor de solo lectura que sugiere ajustes según carga y lesiones.',
      },
      {
        icon: 'lesiones',
        title: 'Riesgo de lesión con contexto, no solo el parte médico',
        body: 'El ACWR y la carga se cruzan automáticamente con el estado de cada jugador, para que el cuerpo técnico decida con datos, no solo con el diagnóstico aislado.',
      },
      {
        icon: 'simulador',
        title: 'Simulador táctico incluido',
        body: 'Pizarra táctica animada para fútbol o futsal, para preparar y compartir jugadas con el plantel — disponible para todo el staff, sin gating de módulo.',
      },
    ],
    moduleNames: ['Rendimiento', 'Lesiones', 'Planificación', 'Simulador táctico', 'Calendario', 'Psicológico'],
    closingTitle: '¿Listo para profesionalizar tu cuerpo técnico?',
    closingBody: 'Contactanos y coordinamos el alta de tu centro deportivo y los roles de tu staff.',
  },
  atletas: {
    eyebrow: 'Para atletas de alto rendimiento',
    title: 'Tu carga, tus test y tu recuperación, en un solo lugar.',
    subtitle:
      'Deportistas individuales que entrenan con un cuerpo técnico propio —preparador físico, fisioterapeuta, psicólogo— y quieren ver sus datos cruzados, no repartidos en apps sueltas.',
    note: 'Vos no cargás tus propios datos: tu preparador o fisioterapeuta te registra dentro de su panel, igual que un club haría con su plantel — así todo tu equipo técnico trabaja sobre la misma información. Los atletas no inician sesión de forma directa.',
    benefits: [
      {
        icon: 'gauge',
        title: 'Tu ACWR y tu forma, siempre al día',
        body: 'Carga interna (sRPE), monotonía, strain y forma (fitness-fatiga) calculadas en el servidor, sesión por sesión — no una planilla que alguien tiene que actualizar a mano.',
      },
      {
        icon: 'tests',
        title: 'Test físicos con fórmulas citadas',
        body: 'Squat Jump, Sprint, RSI y el resto de la batería física con las mismas fórmulas documentadas que usa un club — Sayers, Bangsbo IR2, Draper & Whyte RAST, entre otras.',
      },
      {
        icon: 'psicologico',
        title: 'Lo psicológico, junto a lo físico',
        body: 'BRUMS/POMS, RESTQ-Sport, CSAI-2 y ABQ — tu estado mental al lado de tu carga de entrenamiento, no en una consulta aparte.',
      },
      {
        icon: 'lesiones',
        title: 'Historial de lesiones con contexto',
        body: 'Registro con mapa corporal y seguimiento de recuperación, visible para todo tu equipo técnico — no solo para quien te atendió ese día.',
      },
    ],
    moduleNames: ['Rendimiento', 'Test físicos', 'Psicológico', 'Lesiones'],
    closingTitle: '¿Listo para que tu equipo técnico entrene con datos?',
    closingBody: 'Contactanos y coordinamos el alta tuya y de tu cuerpo técnico dentro del panel.',
  },
  instituciones: {
    eyebrow: 'Para instituciones educativas',
    title: 'Seguimiento objetivo de tus jóvenes atletas, temporada tras temporada.',
    subtitle:
      'Escuelas y academias deportivas que forman jóvenes atletas y necesitan ver su evolución de carga, test y desarrollo a lo largo de varias temporadas — no solo de un torneo.',
    benefits: [
      {
        icon: 'tests',
        title: 'Test físicos comparables en el tiempo',
        body: 'La misma batería de test, con las mismas fórmulas, repetida temporada tras temporada — para ver evolución real de cada alumno, no solo una foto aislada.',
      },
      {
        icon: 'calendario',
        title: 'Toda la temporada en una línea de tiempo',
        body: 'Torneos, concentraciones, partidos y entrenamientos organizados junto con la carga real de cada categoría.',
      },
      {
        icon: 'planificacion',
        title: 'Planificación por categoría',
        body: 'Meso y microciclos por equipo, adaptados a cada categoría formativa, con un asesor de solo lectura que sugiere ajustes según carga y lesiones.',
      },
      {
        icon: 'reportes',
        title: 'Reportes para familias y directivos',
        body: 'Datos objetivos de rendimiento y desarrollo, no solo la percepción del entrenador — útiles puertas adentro y para comunicar resultados.',
      },
    ],
    moduleNames: ['Rendimiento', 'Test físicos', 'Planificación', 'Calendario'],
    closingTitle: '¿Listo para llevar el seguimiento de tu institución a un solo panel?',
    closingBody: 'Contactanos y coordinamos el alta de tu institución y de los roles de tu staff.',
  },
}

export function AudiencePage() {
  const { segment } = useParams<{ segment: string }>()
  const content = segment && segment in AUDIENCES ? AUDIENCES[segment as Segment] : null
  if (!content) return <Navigate to="/" replace />

  const modules = MODULES.filter((m) => content.moduleNames.includes(m.name))

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
                Solicitar acceso
              </a>
              <Link
                to="/precio"
                className="flex h-12 items-center justify-center rounded-lg border border-white/15 px-6 text-sm font-medium text-white/85 transition-colors hover:bg-white/5"
              >
                Ver planes
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Módulos relevantes</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Lo que vas a usar todos los días
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
            Solicitar acceso
          </a>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  )
}
