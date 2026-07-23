import WaitlistForm from './WaitlistForm'

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#funciones', label: 'Funciones' },
  { href: '#score', label: 'Zyfit Score' },
  { href: '#faq', label: 'FAQ' },
]

const STEPS = [
  {
    n: '01',
    title: 'Check-in diario',
    text: 'Antes de entrenar contás cómo dormiste, tu ánimo, tu tiempo disponible y cualquier molestia. 30 segundos.',
  },
  {
    n: '02',
    title: 'La IA arma tu sesión',
    text: 'Con tu perfil, tu historial y el check-in de hoy, el motor genera una rutina de fuerza o running a tu medida.',
  },
  {
    n: '03',
    title: 'Entrenás y das feedback',
    text: 'Registrás peso, repeticiones y RPE. Al terminar, calificás cómo te sentiste y qué tan bien cumpliste.',
  },
  {
    n: '04',
    title: 'La próxima sesión se ajusta',
    text: 'Ese feedback entra al motor: si veníamos fuerte, subimos la carga; si hubo fatiga, la próxima se adapta.',
  },
]

const FEATURES = [
  {
    icon: '⚡',
    color: 'var(--accent)',
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
    text: 'Mantené tu racha de entrenamiento, subí de nivel y desbloqueá logros que reconocen tu constancia, no solo tus PRs.',
  },
  {
    icon: '🧭',
    color: 'var(--green)',
    title: 'Free Run con GPS',
    text: 'Salí a correr y trackeamos distancia, ritmo, velocidad y desnivel en tiempo real, sin depender de otra app.',
  },
  {
    icon: '🤝',
    color: 'var(--accent-light)',
    title: 'Portal de Coach',
    text: 'Si entrenás con un coach, puede ver tu progreso real y dejar directivas que la IA integra en tu próxima rutina.',
  },
  {
    icon: '🔒',
    color: 'var(--ink-dim)',
    title: 'Tus datos, protegidos',
    text: 'Cifrado en tránsito y en reposo, sin venta de datos a terceros ni publicidad dirigida con tu información de entrenamiento.',
  },
]

const FAQS = [
  {
    q: '¿Necesito experiencia previa para usar Zyfit?',
    a: 'No. El motor de IA arma tu plan según tu nivel de experiencia, objetivo y disponibilidad, sea tu primera vez entrenando o lleves años en esto.',
  },
  {
    q: '¿Necesito un coach para usar la app?',
    a: 'No es obligatorio. Podés entrenar de forma completamente autónoma. Si ya tenés coach, podés vincularlo desde el Portal de Coach para que vea tu progreso.',
  },
  {
    q: '¿Qué datos usa la IA para generar mi rutina?',
    a: 'Tu perfil físico, objetivos, historial de sesiones y el check-in del día (ánimo, sueño, molestias). Nunca compartimos tu nombre ni email con el motor de IA.',
  },
  {
    q: '¿Cuándo está disponible en Play Store y App Store?',
    a: 'Estamos en etapa final de pruebas. Sumate a la lista de espera y te avisamos apenas esté disponible para descargar.',
  },
]

export default function LandingPage() {
  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(13,13,13,0.75)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <img src="/logo-zyfit-blanco.png" alt="Zyfit" className="h-6 w-auto" />
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium transition-colors hover:text-white"
                style={{ color: 'var(--ink-dim)' }}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <a
            href="#lista-de-espera"
            className="rounded-full px-4 py-2 text-sm font-semibold transition-transform hover:scale-[1.04]"
            style={{ background: 'var(--accent)', color: '#04101f' }}
          >
            Unirme
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden glow-top">
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span
              className="font-mono-label inline-block text-xs uppercase px-3 py-1 rounded-full glass"
              style={{ color: 'var(--accent-light)' }}
            >
              IA adaptativa · fuerza + running
            </span>
            <h1 className="mt-6 text-5xl sm:text-6xl font-semibold leading-[1.05] tracking-tight">
              Un entrenador que{' '}
              <span className="font-serif-accent" style={{ color: 'var(--accent-light)' }}>
                se adapta
              </span>{' '}
              a vos, no al revés.
            </h1>
            <p className="mt-6 text-lg max-w-lg" style={{ color: 'var(--ink-dim)' }}>
              Zyfit genera tu rutina de fuerza o running en base a tu progreso real, tu feedback de cada
              sesión y cómo llegás ese día. Nada de plantillas genéricas.
            </p>
            <div className="mt-10 flex flex-col gap-4" id="lista-de-espera">
              <WaitlistForm />
              <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                Muy pronto en App Store y Google Play. Sin spam.
              </p>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <div
              className="animate-float w-[280px] rounded-[2.25rem] p-5 glass shadow-2xl"
              style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.55)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono-label text-[10px] uppercase" style={{ color: 'var(--ink-dim)' }}>
                  Sesión de hoy
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,140,255,0.15)', color: 'var(--accent-light)' }}>
                  Fuerza · Tren superior
                </span>
              </div>

              <div className="flex items-center justify-center my-6">
                <ScoreRing value={82} />
              </div>

              <div className="space-y-2">
                {[
                  { name: 'Press banca', sets: '4×6 · RPE 8' },
                  { name: 'Remo con barra', sets: '4×8 · RPE 7' },
                  { name: 'Press militar', sets: '3×10 · RPE 8' },
                ].map((ex) => (
                  <div
                    key={ex.name}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-xs font-medium">{ex.name}</span>
                    <span className="font-mono-label text-[10px]" style={{ color: 'var(--ink-dim)' }}>
                      {ex.sets}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="mt-5 rounded-xl px-3 py-2.5 flex items-center gap-2"
                style={{ background: 'rgba(255,170,50,0.1)', border: '1px solid rgba(255,170,50,0.25)' }}
              >
                <span>🔥</span>
                <span className="text-xs font-medium" style={{ color: 'var(--orange)' }}>
                  Racha de 12 días
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-24">
        <SectionHeading
          eyebrow="Cómo funciona"
          title="Cada sesión se construye en base a la anterior"
        />
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="glass rounded-2xl p-6">
              <span className="font-mono-label text-sm" style={{ color: 'var(--accent-light)' }}>
                {s.n}
              </span>
              <h3 className="mt-3 font-semibold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Funciones */}
      <section id="funciones" className="max-w-6xl mx-auto px-6 py-24">
        <SectionHeading eyebrow="Funciones" title="Todo lo que necesitás para entrenar mejor" />
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 transition-transform hover:-translate-y-1">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: 'rgba(255,255,255,0.05)' }}
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
          ))}
        </div>
      </section>

      {/* Zyfit Score */}
      <section id="score" className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <SectionHeading eyebrow="Zyfit Score" title="Tu progreso, resumido en un número" align="left" />
            <p className="mt-6 text-base leading-relaxed max-w-lg" style={{ color: 'var(--ink-dim)' }}>
              El Zyfit Score cruza cinco señales de tu entrenamiento en un puntaje de 0 a 100:
              consistencia, rendimiento, adherencia, recuperación y tu momentum reciente. Así sabés,
              de un vistazo, si vas por buen camino.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                ['Consistencia', 'var(--accent)'],
                ['Rendimiento', 'var(--cyan)'],
                ['Adherencia', 'var(--green)'],
                ['Recuperación', 'var(--orange)'],
              ].map(([label, color]) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ background: color as string }} />
                  <span style={{ color: 'var(--ink-dim)' }}>{label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="glass rounded-3xl p-12">
              <ScoreRing value={82} size={220} stroke={14} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div
          className="glass rounded-3xl px-8 py-16 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(79,140,255,0.12), rgba(0,0,0,0))' }}
        >
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl mx-auto">
            Empezá a entrenar con un plan que{' '}
            <span className="font-serif-accent" style={{ color: 'var(--accent-light)' }}>
              te conoce
            </span>
            .
          </h2>
          <p className="mt-4 max-w-lg mx-auto" style={{ color: 'var(--ink-dim)' }}>
            Sumate a la lista de espera y sé de los primeros en probar Zyfit.
          </p>
          <div className="mt-8 flex justify-center">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <SectionHeading eyebrow="FAQ" title="Preguntas frecuentes" />
        <div className="mt-12 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="glass rounded-2xl px-6 py-4 group">
              <summary className="flex items-center justify-between cursor-pointer font-medium">
                {f.q}
                <span className="ml-4 shrink-0 transition-transform group-open:rotate-45" style={{ color: 'var(--accent-light)' }}>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: 'var(--border)' }}>
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
          <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            © {new Date().getFullYear()} Zyfit. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </main>
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
      <span className="font-mono-label text-xs uppercase" style={{ color: 'var(--accent-light)' }}>
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h2>
    </div>
  )
}

function ScoreRing({ value, size = 120, stroke = 10 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - value / 100)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold" style={{ fontSize: size * 0.28 }}>
          {value}
        </span>
        <span className="font-mono-label text-[10px] uppercase" style={{ color: 'var(--ink-dim)' }}>
          Zyfit Score
        </span>
      </div>
    </div>
  )
}
