// Landing pública de Zyfit Performance — vive en "/". Antes esa ruta caía
// directo en el redirect a /login (visitante sin sesión nunca veía de qué
// trata el producto); ahora un usuario ya logueado que entra acá es enviado
// a /dashboard vía useRedirectIfAuthenticated, igual que en Academy.
//
// Identidad: verde azulado único (acento de Zyfit Performance — antes azul,
// cambiado por colisionar en el mismo hex con la landing de la APP), fondos
// azul-marino planos, SIN GRADIENTES (ver performance-web/CLAUDE.md), fotografía real +
// overlay oscuro + cards de vidrio esmerilado — mismo lenguaje que ya usan
// LoginPage.tsx/ForgotPasswordPage.tsx. Deliberadamente distinta de la
// landing de la APP (video de producto) y de la de Academy (aurora WebGL) —
// con una excepción puntual: el Hero de escritorio usa un efecto WebGL propio
// (LaserFlow, ver más abajo) contenido en un recuadro angosto, no full-bleed
// como la aurora de Academy, para no terminar pareciendo el mismo producto.

import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import { Icon, type IconName } from '@/components/Icon'
import { Reveal } from '@/components/Reveal'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

// three.js pesa ~500-600kB — se separa en su propio chunk y solo se pide
// cuando el Hero de escritorio realmente lo necesita (ver `showLaser` abajo).
const LaserFlow = lazy(() => import('@/components/LaserFlow').then((m) => ({ default: m.LaserFlow })))

const BG_IMAGE = '/FVF.jpg'
const SECOND_IMAGE = '/high-angle-man-tying-shoelaces.jpg'
const LOGO_IMAGE = '/Logo-Zyfit-Blanco.png'
const CONTACT_HREF = 'https://pyfit.app'

const MODULES: { name: string; icon: IconName; body: string }[] = [
  {
    name: 'Rendimiento',
    icon: 'rendimiento',
    body: 'Carga interna, forma (fitness-fatiga) y ACWR con seguimiento por atleta y por equipo.',
  },
  {
    name: 'Lesiones',
    icon: 'lesiones',
    body: 'Registro con mapa corporal, seguimiento de recuperación y contexto de riesgo para el resto del panel.',
  },
  {
    name: 'Test físicos',
    icon: 'tests',
    body: 'Baterías con las fórmulas de siempre —Bangsbo IR2, Draper & Whyte RAST, entre otras— calculadas en el servidor.',
  },
  {
    name: 'Planificación',
    icon: 'planificacion',
    body: 'Meso y microciclos por equipo, con un asesor de solo lectura que sugiere ajustes según carga y lesiones.',
  },
  {
    name: 'Psicológico',
    icon: 'psicologico',
    body: 'BRUMS/POMS, RESTQ-Sport, CSAI-2 y ABQ — psicometría deportiva junto al resto de los datos del atleta.',
  },
  {
    name: 'Simulador táctico',
    icon: 'simulador',
    body: 'Pizarra táctica animada, fútbol o futsal, para preparar y compartir jugadas con el plantel.',
  },
  {
    name: 'Calendario',
    icon: 'calendario',
    body: 'Torneos, concentraciones, partidos y entrenamientos de toda la temporada en una sola línea de tiempo.',
  },
]

const STEPS = [
  {
    title: 'El director registra el centro',
    body: 'Se da de alta el centro deportivo y se suma al staff con su rol correspondiente — director técnico, preparador físico, fisioterapeuta, analista, planificador o psicólogo.',
  },
  {
    title: 'Cada rol carga sus datos',
    body: 'Test, sesiones, lesiones y evaluaciones psicológicas se registran donde ocurren, no en una planilla aparte al final de la semana.',
  },
  {
    title: 'El panel devuelve contexto, no solo números',
    body: 'ACWR, forma, riesgo y planificación se cruzan automáticamente para que el cuerpo técnico decida con datos, no solo con percepción.',
  },
]

const FAQS = [
  {
    q: '¿El panel es para atletas o para el cuerpo técnico?',
    a: 'Es para el staff: director técnico, preparador físico, fisioterapeuta, analista, planificador y psicólogo. Los atletas no inician sesión — el director o el staff los registra dentro de cada centro.',
  },
  {
    q: '¿Funciona para fútbol y futsal?',
    a: 'Sí, el simulador táctico y la carga de datos contemplan ambas disciplinas desde el diseño del panel.',
  },
  {
    q: '¿Quién ve los datos de cada atleta?',
    a: 'El acceso es por módulo y por rol dentro de cada centro — un preparador físico, por ejemplo, no ve las evaluaciones psicológicas si ese módulo no está habilitado para su rol.',
  },
  {
    q: '¿Cómo se suma un centro nuevo al panel?',
    a: 'Contactanos y coordinamos el alta del centro y de los roles de tu cuerpo técnico — hoy el acceso se gestiona directamente con nuestro equipo, no es autoservicio.',
  },
]

export function LandingPage() {
  const redirecting = useRedirectIfAuthenticated('/dashboard')
  if (redirecting) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-perf-bg">
      {/* Header — barra flotante de vidrio, siempre visible (a diferencia de
          la APP no depende del scroll: ya es suficientemente distinta). */}
      <header className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/[0.14] bg-white/[0.05] px-5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md sm:inset-x-8 sm:top-6">
        <div className="flex items-center gap-2.5">
          <img src={LOGO_IMAGE} alt="Zyfit" className="h-5 w-auto sm:h-6" />
          <span className="pb-0.5 text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
            Performance
          </span>
        </div>
        <nav className="hidden items-center gap-1 sm:flex">
          <a href="#modulos" className="rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white">
            Módulos
          </a>
          <a href="#metodologia" className="rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white">
            Metodología
          </a>
          <a href="#motor" className="rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white">
            Motor de cálculo
          </a>
          <a href="#preguntas" className="rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white">
            Preguntas frecuentes
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/75 transition-colors hover:text-white sm:px-3">
            Ingresar
          </Link>
          <a
            href={CONTACT_HREF}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark sm:px-3.5"
          >
            Solicitar acceso
          </a>
        </div>
      </header>

      {/* Hero — dos versiones deliberadamente distintas, no una sola responsiva:
          Mobile (lg:hidden) conserva el diseño original (foto real + overlay
          denso plano, sin gradiente, texto directo sobre la foto) — sin
          LaserFlow, por batería/rendimiento en celulares.
          Desktop (hidden lg:flex) reemplaza la foto por un layout de 2
          columnas: texto alineado a la izquierda + un recuadro angosto con
          LaserFlow (no full-bleed) mostrando la Batería de test. */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden px-6 pb-20 pt-32 sm:px-10 sm:pt-36 lg:hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${BG_IMAGE}')` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[rgba(6,9,18,0.86)]" aria-hidden />
        <div className="relative z-10 mx-auto max-w-3xl">
          <HeroCopy />
        </div>
      </section>

      <section className="hidden min-h-[92vh] items-center bg-perf-bg px-10 pb-20 pt-36 lg:flex">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-16">
          <div>
            <HeroCopy />
          </div>
          <HeroLaserBox />
        </div>
      </section>

      {/* Para quién es */}
      <section className="px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Para quién es</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pensado para quien mide el rendimiento en serio
            </h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Reveal>
              <div className="h-full rounded-2xl border border-white/[0.14] bg-white/[0.05] p-6 backdrop-blur-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accentLight">
                  <Icon name="plantilla" size={22} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">Equipos deportivos</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                  Clubes y centros de fútbol o futsal que necesitan a todo su cuerpo técnico —físico, médico,
                  táctico y psicológico— coordinado en un solo panel.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="h-full rounded-2xl border border-white/[0.14] bg-white/[0.05] p-6 backdrop-blur-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accentLight">
                  <GraduationIcon />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">Instituciones educativas</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                  Escuelas y academias deportivas que forman jóvenes atletas y necesitan seguimiento objetivo de
                  carga, test y evolución a lo largo de las temporadas.
                </p>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="h-full rounded-2xl border border-white/[0.14] bg-white/[0.05] p-6 backdrop-blur-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accentLight">
                  <Icon name="gauge" size={22} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">Atletas de alto rendimiento</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                  Deportistas individuales que entrenan con un cuerpo técnico propio y quieren sus datos de carga,
                  test y recuperación en un solo lugar.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section id="modulos" className="px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Módulos</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Todo el cuerpo técnico, en un solo lugar
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Cada rol —director técnico, preparador físico, fisioterapeuta, analista, planificador, psicólogo—
              accede solo a lo que le corresponde.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m, i) => (
              <Reveal key={m.name} delay={(i % 4) * 70}>
                <div className="h-full rounded-2xl border border-perf-border bg-perf-surface p-5 transition-colors hover:border-accent/40">
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

      {/* Metodología */}
      <section id="metodologia" className="bg-perf-surface px-6 py-20 sm:px-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Metodología</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              25 calculadoras con la ciencia citada, no una caja negra
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              Cada fórmula del panel —sRPE, monotonía y strain de Foster, ACWR (agudo:crónico) en sus variantes de
              rolling average y EWMA, TRIMP de Edwards, forma (fitness-fatiga estilo Banister)— está documentada y se
              calcula siempre en el servidor. El staff nunca depende de una planilla aparte.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              Somos honestos con los límites: el ACWR es un indicador contextual de carga, no un predictor causal de
              lesión. El panel da el número y el contexto — la decisión sigue siendo del cuerpo técnico.
            </p>
            <ul className="mt-6 flex flex-col gap-2.5 text-sm text-white/70">
              <li className="flex items-start gap-2.5">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-perf-ok" />
                25 calculadoras + batería psicométrica completa (BRUMS/POMS/RESTQ-Sport/CSAI-2/ABQ)
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-perf-ok" />
                Todo el cálculo vive en el servidor — el panel nunca improvisa un número
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-perf-ok" />
                Roles de staff independientes por centro, con acceso por módulo
              </li>
            </ul>
          </Reveal>
          <Reveal delay={100} className="overflow-hidden rounded-2xl border border-perf-border">
            <img src={SECOND_IMAGE} alt="" className="h-full max-h-[420px] w-full object-cover" />
          </Reveal>
        </div>
      </section>

      {/* Motor de cálculo — demo interactiva, el diferenciador de la landing:
          ningún otro producto del ecosistema deja probar el motor real desde
          el marketing. Misma estética (glass, sin gradientes, tokens
          semánticos perf-ok/warn/danger ya existentes). */}
      <section id="motor" className="px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <Reveal className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Motor de cálculo</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ninguna fórmula es una caja negra — probalas vos mismo
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/55">
              Elegí una calculadora, cargá tus números y mirá el resultado — las mismas fórmulas que usa el panel
              real para cada atleta.
            </p>
          </Reveal>
          <Reveal delay={100} className="mt-8">
            <CalculatorDemo />
          </Reveal>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Cómo funciona</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              De centro nuevo a decisiones con datos
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="bg-perf-surface px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <Reveal className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Preguntas frecuentes</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Lo que más nos preguntan los centros
            </h2>
          </Reveal>
          <div className="mt-8 space-y-3">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <FaqItem q={f.q} a={f.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final — banda sólida bg-accent, sin gradiente. */}
      <section className="px-6 py-20 sm:px-10">
        <Reveal className="mx-auto max-w-6xl rounded-3xl bg-accent px-6 py-14 text-center sm:px-16 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            ¿Listo para profesionalizar tu cuerpo técnico?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/85">
            Contactanos y coordinamos el alta de tu centro deportivo y los roles de tu staff.
          </p>
          <a
            href={CONTACT_HREF}
            className="mx-auto mt-7 flex h-12 w-fit items-center justify-center rounded-lg bg-white px-7 text-sm font-semibold text-accentDark transition-colors hover:bg-white/90"
          >
            Solicitar acceso
          </a>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-perf-border px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img src={LOGO_IMAGE} alt="Zyfit" className="h-5 w-auto opacity-80" />
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Performance</span>
          </div>
          <a href={CONTACT_HREF} className="text-xs font-medium text-white/45 transition-colors hover:text-accentLight">
            Contacto
          </a>
          <p className="text-xs text-white/35">© {new Date().getFullYear()} Zyfit Performance</p>
        </div>
      </footer>
    </div>
  )
}

// Texto + CTAs del Hero — compartido entre la versión mobile (sin LaserFlow)
// y la de escritorio (2 columnas), para no duplicar copy en dos lugares.
function HeroCopy() {
  return (
    <>
      <Reveal>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accentLight/80">
          Panel B2B · Alto rendimiento deportivo
        </p>
        <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
          Ciencia deportiva,
          <br />
          en un solo panel<span className="text-accent">.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
          Rendimiento, lesiones, test físicos, planificación y psicológico — un panel para equipos deportivos,
          instituciones educativas y atletas de alto rendimiento.
        </p>
      </Reveal>
      <Reveal delay={120}>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a
            href={CONTACT_HREF}
            className="flex h-12 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accentDark"
          >
            Solicitar acceso
          </a>
          <Link
            to="/login"
            className="flex h-12 items-center justify-center rounded-lg border border-white/15 px-6 text-sm font-medium text-white/85 transition-colors hover:bg-white/5"
          >
            Ya tengo acceso · Ingresar
          </Link>
        </div>
      </Reveal>
    </>
  )
}

// Hook chico para gatear tanto el layout (solo desktop) como la carga del
// chunk de `three` (nunca se pide en mobile) y el respeto a prefers-reduced-
// motion. Sin librería: un matchMedia + listener, suficiente para este uso.
function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = () => setMatches(mql.matches)
    handler()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

// Recuadro del Hero de escritorio: LaserFlow (WebGL) detrás de una card con
// la Batería de test. La card NO va centrada en el frame — su borde superior
// se ancla justo donde el láser converge (top-1/2, sin -translate-y), igual
// que el patrón oficial de React Bits (el ejemplo de "reveal" posiciona su
// caja con `top: 50%` sin centrar verticalmente, a propósito). Se degrada con
// elegancia en 2 escenarios sin dejar de mostrar la card: prefers-reduced-
// motion (no se monta el canvas) y mientras se descarga el chunk de `three`
// (fallback de Suspense = sin canvas).
function HeroLaserBox() {
  const reducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)')
  const showLaser = !reducedMotion

  return (
    <Reveal delay={100} className="relative h-[560px] overflow-hidden rounded-2xl border border-perf-border bg-perf-bg">
      {showLaser && (
        <Suspense fallback={null}>
          <LaserFlow color="#14b8a6" horizontalBeamOffset={0.1} verticalBeamOffset={0.0} />
        </Suspense>
      )}
      <div
        className="absolute left-1/2 top-1/2 w-[86%] max-w-[300px] -translate-x-1/2 rounded-2xl border-2 border-accent/70 bg-perf-bg/90 p-5 shadow-[0_0_50px_-10px_rgba(20,184,166,0.5)]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <TestBatteryCard />
      </div>
    </Reveal>
  )
}

// Vista de ejemplo de la Batería de test — 3 tests reales del módulo Test
// (Squat Jump/Sprint 10m/RSI). Estáticos a propósito: la calculadora
// interactiva de verdad ya vive en la sección "Motor de cálculo" más abajo;
// esto es una vista tipo screenshot, marcada como tal (mismo criterio que
// `DemoBadge` en el panel real: nunca mostrar datos de ejemplo sin avisar).
// Sin borde/fondo propio — ya los aporta el recuadro de `HeroLaserBox`.
function TestBatteryCard() {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Batería de test</p>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-perf-warn/30 bg-perf-warn/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-perf-warn">
          <span className="h-1.5 w-1.5 rounded-full bg-perf-warn" />
          Ejemplo
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        <TestRow icon="tests" label="Squat Jump" value="38 cm · 3.5 kW" />
        <TestRow icon="trendUp" label="Sprint 10 m" value="1.72 s" />
        <TestRow icon="gauge" label="RSI (Drop Jump)" value="1.9" />
      </div>
    </>
  )
}

function TestRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accentLight">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white/60">{label}</p>
        <p className="truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  )
}

// Demo interactiva de 3 calculadoras reales (chips para elegir cuál probar).
// Cálculo hecho en el cliente a propósito, con las mismas fórmulas/zonas
// documentadas en el backend (backend/performance/calculators/) — es una
// demo de marketing, no reemplaza el cálculo real del panel (que sí vive
// siempre en el servidor, por atleta y por equipo).
type CalcKey = 'acwr' | 'srpe' | 'sayers'

const CALCULATORS: { key: CalcKey; chip: string }[] = [
  { key: 'acwr', chip: 'ACWR' },
  { key: 'srpe', chip: 'Carga de sesión (sRPE)' },
  { key: 'sayers', chip: 'Potencia de salto (Sayers)' },
]

// Input compartido por las 3 calculadoras — misma altura de label (2 líneas
// reservadas) para que ambas columnas del grid siempre alineen, sin importar
// si el texto de una etiqueta es más corto que el de la otra.
function CalcField({
  label,
  unit,
  value,
  onChange,
  max,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  max?: number
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="min-h-[2rem] text-xs font-medium uppercase leading-tight tracking-wide text-white/50">
        {label} <span className="normal-case tracking-normal text-white/35">({unit})</span>
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-lg border border-white/10 bg-white/5 px-4 text-lg font-semibold text-white outline-none transition-colors focus:border-accent"
      />
    </label>
  )
}

function CalculatorDemo() {
  const [calc, setCalc] = useState<CalcKey>('acwr')

  // ACWR — zonas de performance-web/CLAUDE.md (0.8-1.3 sweet spot / >1.5 peligro).
  const [aguda, setAguda] = useState('420')
  const [cronica, setCronica] = useState('380')
  const agudaNum = Number(aguda) || 0
  const cronicaNum = Number(cronica) || 0
  const ratio = cronicaNum > 0 ? agudaNum / cronicaNum : 0
  const markerPct = (Math.min(Math.max(ratio, 0), 2) / 2) * 100
  const zone =
    cronicaNum <= 0
      ? { label: 'Cargá ambos valores', color: 'text-white/40' }
      : ratio > 1.5
        ? { label: 'Riesgo elevado', color: 'text-perf-danger' }
        : ratio > 1.3
          ? { label: 'Zona de atención', color: 'text-perf-warn' }
          : ratio >= 0.8
            ? { label: 'Zona óptima (sweet spot)', color: 'text-perf-ok' }
            : { label: 'Por debajo del rango óptimo', color: 'text-accentLight' }

  // sRPE — carga = RPE (Borg CR-10) × duración (backend/performance/calculators/carga.py).
  const [rpe, setRpe] = useState('6')
  const [duracion, setDuracion] = useState('75')
  const rpeNum = Math.min(Math.max(Number(rpe) || 0, 0), 10)
  const duracionNum = Number(duracion) || 0
  const cargaUa = rpeNum * duracionNum

  // Squat Jump — potencia de Sayers et al. 1999 (backend/performance/calculators/fisicos.py).
  const [alturaCm, setAlturaCm] = useState('38')
  const [masaKg, setMasaKg] = useState('72')
  const alturaNum = Number(alturaCm) || 0
  const masaNum = Number(masaKg) || 0
  const potenciaW = 60.7 * alturaNum + 45.3 * masaNum - 2055

  return (
    <div className="rounded-2xl border border-white/[0.14] bg-white/[0.05] p-6 backdrop-blur-md sm:p-8">
      <div className="flex flex-wrap justify-center gap-2">
        {CALCULATORS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCalc(c.key)}
            aria-pressed={calc === c.key}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              calc === c.key ? 'bg-accent text-white' : 'bg-white/5 text-white/55 hover:bg-white/10 hover:text-white'
            }`}
          >
            {c.chip}
          </button>
        ))}
      </div>

      {calc === 'acwr' && (
        <div className="mt-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <CalcField label="Carga aguda" unit="7 días" value={aguda} onChange={setAguda} />
            <CalcField label="Carga crónica" unit="prom. 4 semanas" value={cronica} onChange={setCronica} />
          </div>

          <div className="mt-7">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-3xl font-bold tracking-tight text-white">
                ACWR {cronicaNum > 0 ? ratio.toFixed(2) : '—'}
              </p>
              <p className={`text-sm font-semibold ${zone.color}`}>{zone.label}</p>
            </div>

            <div className="relative mt-5 h-2.5 w-full">
              <div className="flex h-full w-full overflow-hidden rounded-full">
                <div className="h-full bg-accentLight/25" style={{ width: '40%' }} />
                <div className="h-full bg-perf-ok" style={{ width: '25%' }} />
                <div className="h-full bg-perf-warn" style={{ width: '10%' }} />
                <div className="h-full bg-perf-danger" style={{ width: '25%' }} />
              </div>
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-perf-bg bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-[left] duration-300"
                style={{ left: `${markerPct}%` }}
              />
            </div>
            <div className="relative mt-2 h-4 text-[10px] font-medium uppercase tracking-wide text-white/35">
              <span className="absolute left-0">0</span>
              <span className="absolute -translate-x-1/2" style={{ left: '40%' }}>0.8</span>
              <span className="absolute -translate-x-1/2" style={{ left: '65%' }}>1.3</span>
              <span className="absolute -translate-x-1/2" style={{ left: '75%' }}>1.5</span>
              <span className="absolute right-0">2.0+</span>
            </div>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-white/40">
            Vista simplificada con fines demostrativos — en el panel real, el ACWR se calcula por atleta y por equipo,
            en variantes de rolling average y EWMA, y se cruza automáticamente con lesiones y planificación. No
            sustituye el seguimiento diario del cuerpo técnico.
          </p>
        </div>
      )}

      {calc === 'srpe' && (
        <div className="mt-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <CalcField label="RPE percibido" unit="0–10, Borg CR-10" value={rpe} onChange={setRpe} max={10} />
            <CalcField label="Duración" unit="minutos" value={duracion} onChange={setDuracion} />
          </div>

          <div className="mt-7">
            <p className="text-3xl font-bold tracking-tight text-white">
              {duracionNum > 0 ? Math.round(cargaUa) : '—'} <span className="text-lg font-semibold text-white/50">UA</span>
            </p>
            <p className="mt-1 text-sm font-medium text-white/55">Carga interna de la sesión</p>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-white/40">
            RPE × duración (Foster/Borg CR-10) — la misma cuenta que registra el módulo de Carga interna, sesión por
            sesión. El panel real la acumula día a día para calcular monotonía, strain y ACWR.
          </p>
        </div>
      )}

      {calc === 'sayers' && (
        <div className="mt-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <CalcField label="Altura del salto" unit="cm" value={alturaCm} onChange={setAlturaCm} />
            <CalcField label="Masa corporal" unit="kg" value={masaKg} onChange={setMasaKg} />
          </div>

          <div className="mt-7">
            <p className="text-3xl font-bold tracking-tight text-white">
              {alturaNum > 0 && masaNum > 0 ? Math.round(potenciaW) : '—'}{' '}
              <span className="text-lg font-semibold text-white/50">W</span>
            </p>
            <p className="mt-1 text-sm font-medium text-white/55">Potencia pico estimada (Squat Jump)</p>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-white/40">
            Fórmula de Sayers et al. (1999): 60.7 × altura(cm) + 45.3 × masa(kg) − 2055. El panel también puede
            calcular la altura directo desde el tiempo de vuelo del salto.
          </p>
        </div>
      )}
    </div>
  )
}

// "Instituciones educativas" no tiene ícono equivalente en el registro
// compartido (@/components/Icon) — se agrega acá, uso exclusivo de esta
// sección, con la misma convención (viewBox 24x24, stroke 1.7).
function GraduationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 9 10-5 10 5-10 5-10-5Z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
      <path d="M22 9v7" />
    </svg>
  )
}

// Acordeón de FAQ — abre/cierra vía grid-template-rows (Tailwind arbitrario),
// sin CSS nuevo: el bloque global de prefers-reduced-motion en index.css ya
// neutraliza la transición para quienes prefieren menos movimiento.
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`overflow-hidden rounded-2xl border backdrop-blur-md transition-colors ${
        open ? 'border-accent/40 bg-white/[0.05]' : 'border-white/[0.14] bg-white/[0.03]'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-6 py-4 text-left"
      >
        <span className={`flex-1 text-sm font-medium sm:text-[15px] ${open ? 'text-white' : 'text-white/85'}`}>{q}</span>
        <Icon
          name="chevronDown"
          size={18}
          className={`shrink-0 text-white/40 transition-transform duration-300 ${open ? 'rotate-180 text-accent' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-sm leading-relaxed text-white/55">{a}</p>
        </div>
      </div>
    </div>
  )
}
