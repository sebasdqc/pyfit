import type { Metadata } from 'next'
import DataroomLogin from './DataroomLogin'
import LogoutButton from './LogoutButton'
import DataroomContent, { type DataroomDoc } from './DataroomContent'
import { isDataroomAuthed } from '../lib/dataroom'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dataroom — Zyfit',
  robots: { index: false, follow: false },
}

/**
 * Contenido del dataroom. Todo vive acá adentro (nada de links que saquen a
 * otra pestaña/página) — no hay backend ni base de datos detrás, es un array
 * a mano. Las secciones marcadas `pending: true` tienen la estructura
 * correcta pero necesitan cifras/datos reales antes de compartirse: no se
 * inventan números de usuarios, proyecciones ni cap table.
 */
const DOCS: DataroomDoc[] = [
  {
    title: 'Problema y solución',
    description: 'Por qué existe Zyfit.',
    body: [
      'El problema: el entrenamiento deportivo —desde el atleta individual hasta el club de alto rendimiento y la formación de entrenadores— sigue apoyado en herramientas genéricas, planillas sueltas y contenido no adaptado a cada perfil. Falta un sistema que conecte el dato individual con la institución y con la formación de quien entrena.',
      'La solución: Zyfit es un ecosistema de entrenamiento inteligente construido sobre un único backend y una única base de datos, con tres productos que comparten el mismo motor de datos e IA en vez de operar como silos aislados.',
    ],
  },
  {
    title: 'Producto',
    description: 'Los tres productos, la tecnología y el estado actual.',
    body: [
      'Zyfit App (B2C) — app móvil de fitness con IA adaptativa: genera y ajusta rutinas de fuerza y running en cada sesión según el progreso, el feedback y el contexto real del usuario (lesiones, experiencia, estilo de entrenamiento). Incluye el Zyfit Score —un motor de 5 factores que resume el estado del atleta—, el Portal de Coach para que un entrenador vincule y siga a sus atletas, y un sistema propio de racha y logros.',
      'Zyfit Performance (B2B) — panel para centros deportivos de alto rendimiento (fútbol/futsal): más de 25 calculadoras y tests validados —incluye el cuestionario BRUMS de estado de ánimo—, seguimiento de lesiones, planificación de equipo asistida por IA y un módulo psicológico. Pensado para el cuerpo técnico y el departamento médico de un club.',
      'Zyfit Academy (e-learning) — plataforma de formación online para entrenadores, con contenido adaptado al Programa CONMEBOL Evolución: cursos organizados en 7 escuelas temáticas, comunidad, tutor con IA, gamificación propia (racha de estudio, insignias) y modelo freemium con suscripción Academy Pro.',
      'Tecnología: un backend Django + PostgreSQL sirve a los tres productos, con un motor propio de generación de rutinas sobre un catálogo curado de más de 240 ejercicios con evidencia científica y perfil de riesgo de lesión por ejercicio. Los tres frontends (app móvil en React Native/Expo, ambos paneles web en React) comparten estándares de seguridad, con auditorías ya realizadas y corregidas en cada producto.',
      'Estado actual: Zyfit Performance y Zyfit Academy están en producción y en uso real —Academy con contenido alineado a un programa de una confederación continental (CONMEBOL), Performance operando con centros deportivos reales. La app de consumo tiene su ecosistema de funciones completo y está en fase de testing cerrado (Expo dev-client / builds internas de EAS), previo a su publicación en Play Store y App Store.',
      'Por qué importa el ecosistema: el mismo motor de IA que genera rutinas en la app asiste la planificación de equipo en Performance; los datos de rendimiento sirven tanto al atleta individual como al club; la formación en Academy prepara a los mismos entrenadores que después usan el Portal de Coach en la app. Ningún competidor directo cubre las tres capas sobre un mismo dato de fondo.',
    ],
  },
  {
    title: 'Mercado — TAM / SAM / SOM',
    description: 'Tamaño de mercado, con fuentes de research externas.',
    body: [
      'Metodología: Zyfit participa en tres categorías que hoy se reportan por separado —apps de fitness, software de gestión/rendimiento deportivo y e-learning deportivo/corporativo— porque ningún research mide todavía "un ecosistema que conecta las tres". Las cifras de abajo son de firmas de research externas (no de investigación propia de Zyfit) y sirven como referencia direccional del tamaño de la oportunidad, no como proyección de ingresos.',
      'TAM (techo global, las tres categorías): mercado global de apps de fitness, ~USD 13.9B en 2026 con crecimiento anual de doble dígito (Grand View Research); software de gestión y rendimiento deportivo, ~USD 8B–14B en 2026 según la firma (Mordor Intelligence, Grand View Research); e-learning corporativo a nivel global mueve decenas de miles de millones de dólares, del cual la educación deportiva es un nicho específico dentro del total. Zyfit no compite por la totalidad de estos mercados, pero definen el techo teórico de la categoría.',
      'SAM (Latinoamérica, donde Zyfit opera hoy): el mercado de apps de fitness en Latinoamérica se estima en ~USD 0.7B–1.1B en 2025/2026, con el crecimiento anual más alto de cualquier región (15%–28% según la firma) por baja penetración actual y adopción acelerada de smartphones (Grand View Research, MarketDataForecast). El e-learning en Latinoamérica mueve entre ~USD 29B y 38B en 2026, con Brasil y México como los dos mercados de LMS más grandes de la región — la educación de entrenadores es una porción específica de ese total, no el total. No existe un reporte dedicado a software de rendimiento para clubes de fútbol/futsal en Latinoamérica: es la categoría con menos datos públicos y, a la vez, la de menor competencia directa regional identificada.',
      'SOM (lo capturable con el producto actual, 2–3 años): todavía no hay un número comprometido — depende de decisiones de pricing y go-to-market que no están cerradas (ver Modelo financiero). El punto de apoyo más concreto es Zyfit Academy: CONMEBOL agrupa a las federaciones de fútbol de 10 países sudamericanos, y el contenido de Academy ya está alineado a su Programa Evolución — eso da un canal de distribución identificable (federaciones y clubes afiliados) en vez de depender solo de adquisición fría paga. El SOM real se termina de dimensionar cuando haya métricas de conversión propias (ver Métricas y tracción).',
    ],
  },
  {
    title: 'Competencia',
    description: 'Quién compite en cada vertical y por qué Zyfit es distinto.',
    body: [
      'Zyfit App vs. Fitbod (progresión de fuerza adaptativa, sin running ni lado B2B), Freeletics (entrenamiento adaptativo enfocado en peso corporal, sin Portal de Coach) y Trainerize (plataforma para que coaches humanos entreguen planes, no genera con IA de punta a punta). Ninguno combina fuerza + running en un solo motor adaptativo con un Portal de Coach nativo que conecta al atleta con un entrenador real.',
      'Zyfit Performance vs. Kitman Labs (plataforma enterprise de inteligencia de rendimiento, contratos anuales a cotización, pensada para clubes con departamento de ciencia del deporte y datos ya limpios), Catapult (centrado en GPS/sensores wearables, no en tests ni planificación) y TeamBuildr (fuerza y acondicionamiento, sin módulo psicológico ni de lesiones integrado). Zyfit Performance apunta al segmento medio —centros de alto rendimiento de fútbol/futsal sin presupuesto ni datos para un Kitman Labs— con más de 25 calculadoras/tests ya integrados y planificación de equipo asistida por IA.',
      'Zyfit Academy vs. plataformas de certificación de fútbol en español como Construyendo Fútbol o Soccer Leaders/ISSPF (cursos online dictados por entrenadores reconocidos) y plataformas genéricas (Coursera, Udemy) sin contenido deportivo especializado. Academy es la única con contenido explícitamente adaptado al Programa CONMEBOL Evolución, más un motor de aprendizaje adaptativo (grafo de competencias + mastery), tutor con IA y gamificación propia — no es solo un catálogo de video-cursos.',
    ],
  },
  {
    title: 'Diferenciador y MOAT',
    description: 'Por qué el ecosistema es difícil de copiar.',
    body: [
      'El diferenciador no es ninguno de los tres productos por separado —cada categoría ya tiene jugadores especializados y más grandes que Zyfit—. Es que los tres comparten el mismo backend y el mismo dato: el motor de generación de rutinas que usa el atleta en la app asiste la planificación de equipo en Performance; el mismo Zyfit Score que ve un atleta lo puede seguir su entrenador desde el Portal de Coach; el entrenador que se forma en Academy es, potencialmente, el mismo que después opera Performance o el Portal de Coach. Un competidor de una sola categoría necesitaría construir las otras dos para igualar el ecosistema.',
      'MOAT — qué hace esto difícil de copiar: (1) Datos propietarios cruzados: cuantas más sesiones, tests y cursos se acumulan en la misma base, mejor se ajusta el motor de IA para los tres productos a la vez; un competidor de una sola vertical no tiene ese cruce. (2) Relación institucional: el contenido de Academy alineado al Programa CONMEBOL Evolución es una relación de distribución con una confederación, no solo contenido — difícil de replicar sin un acuerdo equivalente. (3) Catálogo curado: el motor de rutinas corre sobre más de 240 ejercicios con evidencia científica y perfil de riesgo de lesión ya tageados a mano, no generados por IA sin curar — es trabajo acumulado, no una feature copiable en un sprint. (4) Costo de cambio para clubes: una vez que un centro carga tests, lesiones y planificación histórica en Performance, migrar esos datos a otra plataforma tiene fricción real.',
      'Lo que todavía NO es un moat probado (a fortalecer, no a asumir): no hay todavía volumen de usuarios que genere un efecto de red clásico, ni patentes, ni exclusividad contractual con CONMEBOL más allá de la alineación de contenido.',
    ],
  },
  {
    title: 'Métricas y tracción',
    description: 'Marco de métricas instrumentado en el producto.',
    pending: true,
    body: [
      'Este dataroom todavía no incluye cifras (usuarios activos, retención, conversión, uso por producto) — se completan con datos reales antes de compartirse con inversionistas. Lo que sigue es el marco de métricas que ya está instrumentado en cada producto.',
      'Zyfit App: activación (onboarding + primera sesión completa), retención D1/D7/D30, racha de entrenamiento, sesiones con feedback registrado (solo cuenta como "día entrenado" una sesión con feedback), uso del módulo de running.',
      'Zyfit Performance: centros activos, usuarios por centro, tests y calculadoras utilizados, planes de equipo generados con IA.',
      'Zyfit Academy: cursos iniciados y completados, racha de estudio, insignias obtenidas, conversión a Academy Pro, uso del tutor con IA.',
    ],
  },
  {
    title: 'Modelo financiero',
    description: 'Modelo de ingresos, proyecciones y uso de fondos.',
    pending: true,
    body: [
      'Modelo de ingresos: Zyfit Academy ya opera con un esquema freemium —suscripción Academy Pro que desbloquea cursos y módulos completos— aunque todavía sin un proveedor de pago real integrado (el control de acceso está implementado, falta el cobro efectivo). Zyfit Performance se piensa como licenciamiento B2B por centro deportivo. La monetización de la app de consumo (B2C) aún no está definida y se resuelve antes de su publicación en tiendas.',
      'Pendiente: proyecciones de ingresos, estructura de costos, monto de la ronda y uso de fondos — se completan con el modelo financiero real.',
    ],
  },
  {
    title: 'Cap table',
    description: 'Estructura societaria.',
    pending: true,
    body: ['Pendiente: estructura societaria real (accionistas y porcentajes).'],
  },
]

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
      <main className="relative z-10 min-h-screen px-6 py-16">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-mono-label text-[11px] uppercase" style={{ color: 'var(--accent-light)' }}>
                Acceso privado
              </span>
              <h1 className="display text-4xl mt-1">Dataroom</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Documentación del proyecto para inversores.
              </p>
            </div>
            <LogoutButton />
          </header>

          <DataroomContent docs={DOCS} />
        </div>
      </main>
    </>
  )
}

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
