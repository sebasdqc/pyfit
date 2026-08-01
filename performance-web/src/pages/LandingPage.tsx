// Landing pública de Zyfit Performance — vive en "/". Antes esa ruta caía
// directo en el redirect a /login (visitante sin sesión nunca veía de qué
// trata el producto); ahora un usuario ya logueado que entra acá es enviado
// a /dashboard vía useRedirectIfAuthenticated, igual que en Academy.
//
// Identidad: azul único (acento de Zyfit Performance), fondos azul-marino
// planos, SIN GRADIENTES (ver performance-web/CLAUDE.md), fotografía real +
// overlay oscuro + cards de vidrio esmerilado — mismo lenguaje que ya usan
// LoginPage.tsx/ForgotPasswordPage.tsx. Deliberadamente distinta de la
// landing de la APP (video de producto) y de la de Academy (aurora WebGL):
// esta es una herramienta profesional B2B, no un producto de consumo.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import { Icon, type IconName } from '@/components/Icon'
import { Reveal } from '@/components/Reveal'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

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

      {/* Hero — foto real + overlay denso plano (sin gradiente), texto
          directo sobre la foto (a diferencia del Login, que sí usa card por
          ser un formulario chico). */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden px-6 pb-20 pt-32 sm:px-10 sm:pt-36">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${BG_IMAGE}')` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[rgba(6,9,18,0.86)]" aria-hidden />

        <div className="relative z-10 mx-auto max-w-3xl">
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
