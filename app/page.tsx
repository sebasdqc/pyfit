import WaitlistForm from './WaitlistForm'
import SiteHeader from './components/SiteHeader'
import Hero from './components/Hero'
import Reveal from './components/Reveal'
import ScoreRing from './components/ScoreRing'
import FactorBars from './components/FactorBars'
import LoopSteps from './components/LoopSteps'

const FEATURES = [
  {
    icon: '⚡',
    color: 'var(--accent-light)',
    title: 'IA adaptativa, fuerza + running',
    text: 'Una sola app genera tus rutinas de fuerza y tus sesiones de running, ajustándose sesión a sesión según tu feedback real.',
  },
  {
    icon: '🎯',
    color: 'var(--cyan)',
    title: 'Zyfit Score',
    text: 'Un puntaje de 0 a 100 que resume consistencia, rendimiento, adherencia y recuperación, para que veas tu evolución de un vistazo.',
  },
  {
    icon: '🔥',
    color: 'var(--orange)',
    title: 'Racha y logros',
    text: 'Mantén tu racha de entrenamiento, sube de nivel y desbloquea logros que reconocen tu constancia, no solo tus PRs.',
  },
  {
    icon: '🛰️',
    color: 'var(--green)',
    title: 'Free Run con GPS',
    text: 'Sal a correr y trackeamos distancia, ritmo, velocidad y desnivel en tiempo real, sin depender de otra app.',
  },
  {
    icon: '🤝',
    color: 'var(--violet)',
    title: 'Portal de Coach',
    text: 'Si entrenas con un coach, puede ver tu progreso real y dejar directivas que la IA integra en tu próxima rutina.',
  },
  {
    icon: '🔒',
    color: 'var(--ink-dim)',
    title: 'Tus datos, protegidos',
    text: 'Cifrado en tránsito y en reposo, sin venta de datos a terceros ni publicidad dirigida con tu información de entrenamiento.',
  },
]

const STATS = [
  { value: '2', unit: 'motores', label: 'Fuerza y running en una sola app' },
  { value: '0–100', unit: '', label: 'Zyfit Score que resume tu evolución' },
  { value: '5', unit: 'señales', label: 'Cruzadas en cada recomendación' },
  { value: '∞', unit: '', label: 'Sesiones únicas — cero plantillas' },
]

const MARQUEE = [
  'Entrenamiento en casa', 'Gimnasio', 'Calistenia', 'Running',
  'Ciclismo', 'CrossFit', 'Funcionales', 'Trail',
]

const FAQS = [
  {
    q: '¿Necesito experiencia previa para usar Zyfit?',
    a: 'No. El motor de IA arma tu plan según tu nivel de experiencia, objetivo y disponibilidad, sea tu primera vez entrenando o lleves años en esto.',
  },
  {
    q: '¿Necesito un coach para usar la app?',
    a: 'No es obligatorio. Puedes entrenar de forma completamente autónoma. Si ya tienes coach, puedes vincularlo desde el Portal de Coach para que vea tu progreso.',
  },
  {
    q: '¿Qué datos usa la IA para generar mi rutina?',
    a: 'Tu perfil físico, objetivos, historial de sesiones y el check-in del día (ánimo, sueño, molestias). Nunca compartimos tu nombre ni email con el motor de IA.',
  },
  {
    q: '¿Cuándo está disponible en Play Store y App Store?',
    a: 'Estamos en etapa final de pruebas. Súmate a la lista de espera y te avisamos apenas esté disponible para descargar.',
  },
]

export default function LandingPage() {
  return (
    <>
      {/* Ambient background */}
      <div className="bg-canvas" aria-hidden>
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="aurora aurora-3" />
        <div className="noise-overlay" />
      </div>

      <SiteHeader />

      <main className="relative z-10">
        <Hero />

        {/* Marquee trust strip */}
        <div className="relative overflow-hidden py-6 border-y" style={{ borderColor: 'var(--border)' }}>
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                'linear-gradient(90deg, var(--bg) 0%, transparent 12%, transparent 88%, var(--bg) 100%)',
            }}
          />
          <div className="marquee-track">
            {[...MARQUEE, ...MARQUEE].map((word, i) => (
              <span
                key={i}
                className="font-mono-label text-xs uppercase px-6 flex items-center gap-6"
                style={{ color: 'var(--ink-faint)' }}
              >
                {word}
                <span style={{ color: 'var(--accent)' }}>◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* Stats band */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 90}>
                <div className="glass rounded-2xl p-6 h-full">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight gradient-text">{s.value}</span>
                    {s.unit && (
                      <span className="font-mono-label text-[10px] uppercase" style={{ color: 'var(--ink-dim)' }}>
                        {s.unit}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-snug" style={{ color: 'var(--ink-dim)' }}>
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-24">
          <Reveal>
            <SectionHeading eyebrow="Cómo funciona" title="Cada sesión se construye en base a la anterior" />
          </Reveal>
          <Reveal>
            <LoopSteps />
          </Reveal>
        </section>

        {/* Funciones */}
        <section id="funciones" className="max-w-6xl mx-auto px-6 py-24">
          <Reveal>
            <SectionHeading eyebrow="Funciones" title="Todo lo que necesitas para entrenar mejor" />
          </Reveal>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <div className="glass card-lift rounded-2xl p-6 h-full group">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 transition-transform group-hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', boxShadow: `0 0 24px -12px ${f.color}` }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-lg" style={{ color: f.color }}>
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                    {f.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Zyfit Score */}
        <section id="score" className="relative glow-soft">
          <div className="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
            <Reveal className="order-2 lg:order-1">
              <SectionHeading eyebrow="Zyfit Score" title="Tu progreso, resumido en un número" align="left" />
              <p className="mt-6 text-base leading-relaxed max-w-lg" style={{ color: 'var(--ink-dim)' }}>
                El Zyfit Score cruza cinco señales de tu entrenamiento en un puntaje de 0 a 100:
                consistencia, rendimiento, adherencia, recuperación y tu momentum reciente. Así sabes,
                de un vistazo, si vas por buen camino.
              </p>
              <FactorBars />
            </Reveal>

            <Reveal className="order-1 lg:order-2 flex justify-center" delay={120}>
              <div className="glass-strong rounded-[2rem] p-14 floaty-slow" style={{ boxShadow: 'var(--shadow-lift)' }}>
                <ScoreRing value={82} size={240} stroke={16} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <Reveal>
            <div
              className="glass-strong rounded-[2rem] px-8 py-16 sm:py-20 text-center relative overflow-hidden"
              style={{ boxShadow: 'var(--shadow-lift)' }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 60% 90% at 50% 0%, rgba(79,140,255,0.18), transparent 70%)' }}
              />
              <div className="relative z-10">
                <h2 className="section-title max-w-2xl mx-auto">
                  Empieza a entrenar con un plan que{' '}
                  <span className="font-accent gradient-text">te conoce</span>.
                </h2>
                <p className="mt-4 max-w-lg mx-auto" style={{ color: 'var(--ink-dim)' }}>
                  Súmate a la lista de espera y sé de los primeros en probar Zyfit.
                </p>
                <div className="mt-8 flex justify-center">
                  <WaitlistForm />
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
          <Reveal>
            <SectionHeading eyebrow="FAQ" title="Preguntas frecuentes" />
          </Reveal>
          <div className="mt-12 space-y-3">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <details className="glass rounded-2xl px-6 py-4 group">
                  <summary className="flex items-center justify-between cursor-pointer font-medium">
                    {f.q}
                    <span
                      className="ml-4 shrink-0 text-lg transition-transform duration-300 group-open:rotate-45"
                      style={{ color: 'var(--accent-light)' }}
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                    {f.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/logo-zyfit-blanco.png" alt="Zyfit" className="h-5 w-auto opacity-80" />
          <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--ink-dim)' }}>
            <a href="/privacy" className="hover:text-white transition-colors">
              Privacidad
            </a>
            <a href="mailto:privacidad@zyfit.app" className="hover:text-white transition-colors">
              Contacto
            </a>
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
            © 2026 Zyfit. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </>
  )
}

function SectionHeading({
  eyebrow,
  title,
  align = 'center',
}: {
  eyebrow: string
  title: string
  align?: 'center' | 'left'
}) {
  return (
    <div className={align === 'center' ? 'text-center max-w-2xl mx-auto' : ''}>
      <span
        className="font-mono-label text-xs uppercase inline-block px-3 py-1 rounded-full glass"
        style={{ color: 'var(--accent-light)' }}
      >
        {eyebrow}
      </span>
      <h2 className="section-title mt-4">{title}</h2>
    </div>
  )
}
