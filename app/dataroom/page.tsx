import type { Metadata } from 'next'
import DataroomLogin from './DataroomLogin'
import LogoutButton from './LogoutButton'
import DataroomNav from './DataroomNav'
import { isDataroomAuthed } from '../lib/dataroom'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dataroom — Zyfit',
  robots: { index: false, follow: false },
}

const PERFORMANCE_COLOR = '#14b8a6'
const ACADEMY_COLOR = '#cc1f36'

export default async function DataroomPage() {
  if (!(await isDataroomAuthed())) {
    return (
      <>
        <Backdrop />
        <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20">
          <DataroomLogin />
        </main>
      </>
    )
  }

  return (
    <>
      <Backdrop />
      <main className="relative z-10 min-h-screen">
        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-10">
          <div className="spotlight" aria-hidden />
          <header className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-mono-label uppercase glass"
                style={{ color: 'var(--accent-light)' }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{ width: 6, height: 6, background: 'var(--accent-light)' }}
                />
                Acceso privado
              </span>
              <h1 className="display text-5xl mt-3">Dataroom</h1>
              <p className="text-sm mt-2 max-w-[46ch]" style={{ color: 'var(--ink-dim)' }}>
                Zyfit — ecosistema de entrenamiento inteligente. Documentación para inversores.
              </p>
            </div>
            <LogoutButton />
          </header>

          <TractionChips />
        </div>

        <DataroomNav />

        <div className="max-w-3xl mx-auto px-6 flex flex-col gap-24 py-16">
          {/* ── Problema y solución ─────────────────────────── */}
          <section id="problema" className="scroll-mt-20 flex flex-col gap-8">
            <h2 className="section-title text-3xl">Problema y solución</h2>
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-mono-label uppercase" style={{ color: 'var(--ink-faint)' }}>
                  El problema
                </p>
                <p className="text-lg leading-snug" style={{ color: 'var(--ink)' }}>
                  El entrenamiento deportivo sigue apoyado en herramientas genéricas, planillas sueltas y contenido
                  no adaptado a cada perfil.
                </p>
                <p className="text-sm leading-relaxed max-w-[60ch]" style={{ color: 'var(--ink-dim)' }}>
                  Pasa en las tres capas a la vez: el atleta individual, el club de alto rendimiento y la formación
                  de quien entrena. Falta un sistema que conecte el dato de una capa con las otras dos.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:border-l sm:pl-8" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-mono-label uppercase" style={{ color: 'var(--accent-light)' }}>
                  La solución
                </p>
                <p className="text-lg leading-snug gradient-text font-semibold">
                  Un ecosistema, un solo backend, un solo dato.
                </p>
                <p className="text-sm leading-relaxed max-w-[60ch]" style={{ color: 'var(--ink-dim)' }}>
                  Zyfit conecta tres productos —app de consumo, panel B2B y plataforma de e-learning— sobre un único
                  backend y una única base de datos, en vez de operar como silos aislados.
                </p>
              </div>
            </div>
          </section>

          {/* ── Producto ─────────────────────────────────────── */}
          <section id="producto" className="scroll-mt-20 flex flex-col gap-10">
            <h2 className="section-title text-3xl">Producto</h2>

            <ProductRow
              name="Zyfit App"
              tag="B2C · app móvil"
              color="var(--accent-light)"
              gradient
              statValue="117"
              statLabel="en lista de espera · Beta Tester"
            >
              Fitness con IA adaptativa: genera y ajusta rutinas de fuerza y running en cada sesión según el
              progreso, el feedback y el contexto real del usuario (lesiones, experiencia, estilo de entrenamiento).
              Incluye el Zyfit Score —motor de 5 factores que resume el estado del atleta—, el Portal de Coach para
              vincular a un entrenador, y racha y logros propios.
            </ProductRow>

            <ProductRow
              name="Zyfit Performance"
              tag="B2B · panel web"
              color={PERFORMANCE_COLOR}
              statValue="FVF"
              statLabel="en conversaciones · Federación Venezolana de Fútbol"
            >
              Panel para centros deportivos de alto rendimiento (fútbol/futsal): más de 25 calculadoras y tests
              validados —incluye el cuestionario BRUMS de estado de ánimo—, seguimiento de lesiones, planificación
              de equipo asistida por IA y un módulo psicológico. Pensado para el cuerpo técnico y el departamento
              médico de un club. Hoy en conversaciones con la FVF (Federación Venezolana de Fútbol) — todavía sin
              acuerdo cerrado. También hay contacto abierto con proveedores de hardware para desarrollar una banda
              inteligente propia, en la línea de Whoop y Coros — etapa de conversación, sin proveedor ni diseño
              cerrado todavía.
            </ProductRow>

            <ProductRow
              name="Zyfit Academy"
              tag="E-learning"
              color={ACADEMY_COLOR}
              statValue="7"
              statLabel="escuelas · Programa CONMEBOL Evolución"
            >
              Plataforma de formación online para entrenadores, con contenido adaptado al Programa CONMEBOL
              Evolución: cursos organizados en 7 escuelas temáticas, comunidad, tutor con IA, gamificación propia
              (racha de estudio, insignias) y modelo freemium con suscripción Academy Pro.
            </ProductRow>

            <div
              className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 pt-2"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <p className="text-xs font-mono-label uppercase pt-6 sm:pt-6 shrink-0" style={{ color: 'var(--ink-faint)' }}>
                Stack &amp; estado
              </p>
              <p className="text-sm leading-relaxed max-w-[65ch] pt-6 sm:pt-6" style={{ color: 'var(--ink-dim)' }}>
                Backend Django + PostgreSQL compartido por los tres productos, motor propio de generación de
                rutinas sobre un catálogo curado de +240 ejercicios con evidencia científica y perfil de riesgo de
                lesión. Performance y Academy están en producción y en uso real; la app de consumo tiene su
                ecosistema de funciones completo y está en testing cerrado (Expo dev-client / EAS), previo a su
                publicación en tiendas.
              </p>
            </div>
          </section>

          {/* ── Mercado ──────────────────────────────────────── */}
          <section id="mercado" className="scroll-mt-20 flex flex-col gap-8">
            <div>
              <h2 className="section-title text-3xl">Mercado</h2>
              <p className="text-sm mt-2 max-w-[65ch]" style={{ color: 'var(--ink-dim)' }}>
                Zyfit cruza tres categorías que hoy se reportan por separado. Las cifras son de firmas de research
                externas —referencia direccional del tamaño de la oportunidad, no proyección de ingresos propia.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <MarketBand
                label="TAM"
                width="100%"
                intensity={0.16}
                headline="≈ US$25–30B+ combinado (2026)"
                source="Grand View Research · Mordor Intelligence, 2026"
              >
                Mercado global de apps de fitness (~US$13.9B) + software de gestión y rendimiento deportivo
                (~US$8–14B), más una porción del e-learning corporativo global donde la educación deportiva es un
                nicho. Zyfit no compite por la totalidad, pero esto define el techo teórico de la categoría.
              </MarketBand>
              <FunnelConnector />
              <MarketBand
                label="SAM"
                width="74%"
                intensity={0.26}
                headline="≈ US$1B+ cuantificado, LatAm"
                source="Grand View Research · MarketDataForecast, 2025–2026"
              >
                Apps de fitness en Latinoamérica: ~US$0.7–1.1B, con el crecimiento anual más alto de cualquier
                región (15%–28%). El e-learning en LatAm mueve ~US$29–38B, pero la educación de entrenadores es una
                porción específica de ese total —sin reporte dedicado— igual que el software de rendimiento para
                clubes de fútbol/futsal regional.
              </MarketBand>
              <FunnelConnector />
              <MarketBand
                label="SOM"
                width="48%"
                intensity={0}
                dashed
                headline="Por definir"
                source={null}
              >
                Depende de decisiones de pricing y go-to-market que no están cerradas. El punto de apoyo más
                concreto: CONMEBOL agrupa a las federaciones de 10 países sudamericanos, y Academy ya tiene
                contenido alineado a su Programa Evolución — un canal de distribución identificable en vez de
                adquisición fría.
              </MarketBand>
            </div>
          </section>

          {/* ── Competencia ──────────────────────────────────── */}
          <section id="competencia" className="scroll-mt-20 flex flex-col gap-6">
            <h2 className="section-title text-3xl">Competencia</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[560px]">
                <thead>
                  <tr>
                    {['Producto', 'Competidor', 'Qué hace bien', 'Brecha frente a Zyfit'].map((h) => (
                      <th
                        key={h}
                        className="font-mono-label text-[11px] uppercase text-left px-4 py-3"
                        style={{ color: 'var(--ink-faint)', borderBottom: '1px solid var(--border-strong)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPETITORS.map((row, i) => (
                    <tr key={i}>
                      {i === 0 || COMPETITORS[i - 1].product !== row.product ? (
                        <td
                          className="px-4 py-3 align-top font-semibold"
                          style={{ color: row.color, borderBottom: '1px solid var(--border)' }}
                          rowSpan={COMPETITORS.filter((r) => r.product === row.product).length}
                        >
                          {row.product}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 align-top" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--border)' }}>
                        {row.competitor}
                      </td>
                      <td className="px-4 py-3 align-top" style={{ color: 'var(--ink-dim)', borderBottom: '1px solid var(--border)' }}>
                        {row.strength}
                      </td>
                      <td className="px-4 py-3 align-top" style={{ color: 'var(--ink-dim)', borderBottom: '1px solid var(--border)' }}>
                        {row.gap}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Diferenciador y MOAT ─────────────────────────── */}
          <section id="moat" className="scroll-mt-20 flex flex-col gap-10">
            <h2 className="section-title text-3xl">Diferenciador y MOAT</h2>

            <EcosystemDiagram />

            <p className="text-sm leading-relaxed max-w-[68ch]" style={{ color: 'var(--ink-dim)' }}>
              El diferenciador no es ninguno de los tres productos por separado —cada categoría ya tiene jugadores
              especializados y más grandes que Zyfit—. Es que comparten el mismo backend y el mismo dato: el motor
              que genera rutinas en la app asiste la planificación de equipo en Performance; el entrenador que se
              forma en Academy es, potencialmente, el mismo que después opera Performance o el Portal de Coach.

            </p>

            <dl className="flex flex-col gap-5">
              {MOAT_PILLARS.map((p) => (
                <div key={p.term} className="flex flex-col sm:flex-row gap-1 sm:gap-6">
                  <dt className="text-sm font-semibold shrink-0 sm:w-48" style={{ color: 'var(--ink)' }}>
                    {p.term}
                  </dt>
                  <dd className="text-sm leading-relaxed max-w-[58ch]" style={{ color: 'var(--ink-dim)' }}>
                    {p.desc}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="text-sm leading-relaxed max-w-[68ch]" style={{ color: 'var(--ink-faint)' }}>
              Lo que todavía NO es un moat probado: no hay volumen de usuarios que genere un efecto de red clásico,
              ni patentes, ni exclusividad contractual con CONMEBOL más allá de la alineación de contenido.
            </p>
          </section>

          {/* ── Pendiente ────────────────────────────────────── */}
          <section id="pendiente" className="scroll-mt-20 flex flex-col gap-4">
            <h2 className="text-sm font-mono-label uppercase" style={{ color: 'var(--ink-faint)' }}>
              Pendiente — sin cifras inventadas
            </h2>
            <div className="flex flex-col gap-3">
              {PENDING.map((p) => (
                <div
                  key={p.title}
                  className="rounded-xl px-5 py-4"
                  style={{ border: '1px dashed var(--border-strong)' }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink-dim)' }}>
                    {p.title}
                  </p>
                  <p className="text-sm mt-1 max-w-[65ch]" style={{ color: 'var(--ink-faint)' }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

/** Fila de producto: nombre grande en el color real de marca + copy + una tarjeta con el dato real. */
function ProductRow({
  name,
  tag,
  color,
  gradient,
  statValue,
  statLabel,
  children,
}: {
  name: string
  tag: string
  color: string
  gradient?: boolean
  statValue: string
  statLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="grid sm:grid-cols-[1.1fr_1.6fr_auto] gap-5 sm:gap-8 items-start">
      <div>
        <p
          className={`display text-3xl leading-none ${gradient ? 'gradient-text' : ''}`}
          style={gradient ? undefined : { color }}
        >
          {name}
        </p>
        <p className="text-xs font-mono-label uppercase mt-2" style={{ color: 'var(--ink-faint)' }}>
          {tag}
        </p>
      </div>
      <p className="text-sm leading-relaxed max-w-[58ch]" style={{ color: 'var(--ink-dim)' }}>
        {children}
      </p>
      <div
        className="glass-strong rounded-2xl px-5 py-4 flex flex-col gap-1 w-full sm:w-44 shrink-0"
        style={{ boxShadow: 'var(--shadow-lift)' }}
      >
        <p className="display text-3xl leading-none" style={{ color }}>
          {statValue}
        </p>
        <p className="text-xs leading-snug" style={{ color: 'var(--ink-dim)' }}>
          {statLabel}
        </p>
      </div>
    </div>
  )
}

const TRACTION_CHIPS = [
  '117 en lista de espera · Beta Tester',
  'En conversaciones con la FVF',
  'Contenido alineado a CONMEBOL Evolución',
  '+240 ejercicios con evidencia científica',
  '2 de 3 productos en producción',
]

/** Franja de hechos reales verificables — nunca logos ni cifras inventadas. */
function TractionChips() {
  return (
    <div className="relative flex flex-wrap gap-2 mt-8">
      {TRACTION_CHIPS.map((c) => (
        <span
          key={c}
          className="glass rounded-full px-3.5 py-1.5 text-xs font-medium"
          style={{ color: 'var(--ink-dim)' }}
        >
          {c}
        </span>
      ))}
    </div>
  )
}

function FunnelConnector() {
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        height: 20,
        background: 'linear-gradient(var(--border-strong), transparent)',
      }}
    />
  )
}

function MarketBand({
  label,
  width,
  intensity,
  headline,
  source,
  dashed,
  children,
}: {
  label: string
  width: string
  intensity: number
  headline: string
  source: string | null
  dashed?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl px-6 py-5 flex flex-col gap-2 text-center"
      style={{
        width,
        maxWidth: '100%',
        background: dashed ? 'transparent' : `rgba(79, 140, 255, ${intensity})`,
        border: dashed ? '1px dashed var(--border-strong)' : '1px solid var(--border)',
      }}
    >
      <p className="text-xs font-mono-label uppercase" style={{ color: 'var(--accent-light)' }}>
        {label}
      </p>
      <p className="section-title text-xl" style={{ color: dashed ? 'var(--ink-dim)' : 'var(--ink)' }}>
        {headline}
      </p>
      <p className="text-sm leading-relaxed mx-auto max-w-[60ch]" style={{ color: 'var(--ink-dim)' }}>
        {children}
      </p>
      {source && (
        <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
          Fuente: {source}
        </p>
      )}
    </div>
  )
}

const NODE_COLOR_APP = 'var(--accent-light)'

function EcosystemDiagram() {
  const nodes = [
    { x: 90, y: 40, label: 'Zyfit App', color: NODE_COLOR_APP },
    { x: 90, y: 200, label: 'Performance', color: PERFORMANCE_COLOR },
    { x: 350, y: 120, label: 'Academy', color: ACADEMY_COLOR },
  ]
  const center = { x: 220, y: 120 }
  return (
    <svg viewBox="0 0 440 240" className="w-full max-w-md" role="img" aria-label="Los tres productos conectados por un backend y un dato compartido">
      {nodes.map((n) => (
        <line key={n.label} x1={n.x} y1={n.y} x2={center.x} y2={center.y} stroke="var(--border-strong)" strokeWidth={1.5} />
      ))}
      <circle cx={center.x} cy={center.y} r={34} fill="var(--card)" stroke="var(--border-strong)" strokeWidth={1.5} />
      <text x={center.x} y={center.y - 4} textAnchor="middle" fontSize={10} fill="var(--ink)" fontWeight={600}>
        Backend
      </text>
      <text x={center.x} y={center.y + 10} textAnchor="middle" fontSize={10} fill="var(--ink-dim)">
        dato compartido
      </text>
      {nodes.map((n) => (
        <g key={n.label}>
          <circle cx={n.x} cy={n.y} r={26} fill="var(--card)" stroke={n.color} strokeWidth={2} />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={10.5} fill="var(--ink)" fontWeight={600}>
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

const COMPETITORS: { product: string; color: string; competitor: string; strength: string; gap: string }[] = [
  {
    product: 'Zyfit App',
    color: 'var(--accent-light)',
    competitor: 'Fitbod',
    strength: 'Progresión de fuerza adaptativa muy pulida.',
    gap: 'Sin running ni lado B2B (Coach/club).',
  },
  {
    product: 'Zyfit App',
    color: 'var(--accent-light)',
    competitor: 'Freeletics',
    strength: 'Entrenamiento adaptativo de peso corporal.',
    gap: 'Sin Portal de Coach ni conexión a un club.',
  },
  {
    product: 'Zyfit App',
    color: 'var(--accent-light)',
    competitor: 'Trainerize',
    strength: 'Coaches humanos entregan planes a escala.',
    gap: 'No genera rutinas con IA de punta a punta.',
  },
  {
    product: 'Performance',
    color: PERFORMANCE_COLOR,
    competitor: 'Kitman Labs',
    strength: 'Inteligencia de rendimiento enterprise.',
    gap: 'Contratos anuales a cotización; pensado para clubes con datos ya limpios.',
  },
  {
    product: 'Performance',
    color: PERFORMANCE_COLOR,
    competitor: 'Catapult',
    strength: 'GPS y sensores wearables en tiempo real.',
    gap: 'No cubre tests, planificación ni psicología.',
  },
  {
    product: 'Performance',
    color: PERFORMANCE_COLOR,
    competitor: 'TeamBuildr',
    strength: 'Fuerza y acondicionamiento.',
    gap: 'Sin módulo psicológico ni de lesiones integrado.',
  },
  {
    product: 'Academy',
    color: ACADEMY_COLOR,
    competitor: 'Construyendo Fútbol / Soccer Leaders',
    strength: 'Cursos de fútbol en español, dictados por entrenadores reconocidos.',
    gap: 'Sin alineación a un programa de confederación ni motor de aprendizaje adaptativo.',
  },
  {
    product: 'Academy',
    color: ACADEMY_COLOR,
    competitor: 'Coursera / Udemy',
    strength: 'Catálogo genérico masivo.',
    gap: 'Sin contenido deportivo especializado.',
  },
]

const MOAT_PILLARS = [
  {
    term: 'Datos cruzados',
    desc: 'Cuantas más sesiones, tests y cursos se acumulan en la misma base, mejor se ajusta el motor de IA para los tres productos a la vez — un competidor de una sola vertical no tiene ese cruce.',
  },
  {
    term: 'Relación institucional',
    desc: 'El contenido de Academy alineado al Programa CONMEBOL Evolución es una relación de distribución con una confederación, no solo contenido — difícil de replicar sin un acuerdo equivalente.',
  },
  {
    term: 'Catálogo curado',
    desc: 'El motor de rutinas corre sobre +240 ejercicios con evidencia científica y riesgo de lesión tageados a mano, no generados por IA sin curar — trabajo acumulado, no una feature copiable en un sprint.',
  },
  {
    term: 'Costo de cambio',
    desc: 'Una vez que un centro carga tests, lesiones y planificación histórica en Performance, migrar esos datos a otra plataforma tiene fricción real.',
  },
]

const PENDING = [
  {
    title: 'Métricas y tracción',
    desc: 'Lo único con dato real hoy: 117 personas en lista de espera de Beta Tester (App). Falta usuarios activos, retención, conversión y uso por producto.',
  },
  {
    title: 'Modelo financiero',
    desc: 'Proyecciones de ingresos, estructura de costos, monto de la ronda y uso de fondos.',
  },
  {
    title: 'Cap table',
    desc: 'Estructura societaria real (accionistas y porcentajes).',
  },
]

/**
 * Capa decorativa de fondo. `bg-canvas` es `position: fixed` + `pointer-events:
 * none`: va como hermana del contenido, NUNCA como contenedor de la página
 * —si envuelve al `<main>`, nada recibe clics y la página parece congelada.
 */
function Backdrop() {
  return (
    <div className="bg-canvas" aria-hidden>
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
      <div className="noise-overlay" />
    </div>
  )
}
