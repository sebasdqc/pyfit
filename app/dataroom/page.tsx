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
    title: 'Pitch deck',
    description: 'Visión, producto y estado actual.',
    body: [
      'El problema: el entrenamiento deportivo —desde el atleta individual hasta el club de alto rendimiento y la formación de entrenadores— sigue apoyado en herramientas genéricas, planillas sueltas y contenido no adaptado a cada perfil. Falta un sistema que conecte el dato individual con la institución y con la formación de quien entrena.',
      'La solución: Zyfit es un ecosistema de entrenamiento inteligente construido sobre un único backend y una única base de datos, con tres productos que comparten el mismo motor de datos e IA en vez de operar como silos aislados.',
      'Zyfit App (B2C) — app móvil de fitness con IA adaptativa: genera y ajusta rutinas de fuerza y running en cada sesión según el progreso, el feedback y el contexto real del usuario (lesiones, experiencia, estilo de entrenamiento). Incluye el Zyfit Score —un motor de 5 factores que resume el estado del atleta—, el Portal de Coach para que un entrenador vincule y siga a sus atletas, y un sistema propio de racha y logros.',
      'Zyfit Performance (B2B) — panel para centros deportivos de alto rendimiento (fútbol/futsal): más de 25 calculadoras y tests validados —incluye el cuestionario BRUMS de estado de ánimo—, seguimiento de lesiones, planificación de equipo asistida por IA y un módulo psicológico. Pensado para el cuerpo técnico y el departamento médico de un club.',
      'Zyfit Academy (e-learning) — plataforma de formación online para entrenadores, con contenido adaptado al Programa CONMEBOL Evolución: cursos organizados en 7 escuelas temáticas, comunidad, tutor con IA, gamificación propia (racha de estudio, insignias) y modelo freemium con suscripción Academy Pro.',
      'Tecnología: un backend Django + PostgreSQL sirve a los tres productos, con un motor propio de generación de rutinas sobre un catálogo curado de más de 240 ejercicios con evidencia científica y perfil de riesgo de lesión por ejercicio. Los tres frontends (app móvil en React Native/Expo, ambos paneles web en React) comparten estándares de seguridad, con auditorías ya realizadas y corregidas en cada producto.',
      'Estado actual: Zyfit Performance y Zyfit Academy están en producción y en uso real —Academy con contenido alineado a un programa de una confederación continental (CONMEBOL), Performance operando con centros deportivos reales. La app de consumo tiene su ecosistema de funciones completo y está en fase de testing cerrado (Expo dev-client / builds internas de EAS), previo a su publicación en Play Store y App Store.',
      'Por qué importa el ecosistema: el mismo motor de IA que genera rutinas en la app asiste la planificación de equipo en Performance; los datos de rendimiento sirven tanto al atleta individual como al club; la formación en Academy prepara a los mismos entrenadores que después usan el Portal de Coach en la app. Ningún competidor directo cubre las tres capas sobre un mismo dato de fondo.',
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
