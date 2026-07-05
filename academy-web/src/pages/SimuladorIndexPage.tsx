// Índice de simuladores: práctica pedagógica sobre motores REALES de PyFit
// (Zyfit Performance / motor de generación), cada uno namespaced a su escuela.

import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'

interface SimuladorCard {
  to: string
  icon: IconName
  escuela: string
  titulo: string
  descripcion: string
}

const SIMULADORES: SimuladorCard[] = [
  {
    to: '/simulador/carga',
    icon: 'activity',
    escuela: 'Entrenamiento y Rendimiento Deportivo',
    titulo: 'Carga interna y ACWR',
    descripcion: 'Ajusta la carga diaria de un atleta y observa en vivo la carga semanal y el ACWR.',
  },
  {
    to: '/simulador/sesion',
    icon: 'layers',
    escuela: 'Entrenamiento y Rendimiento Deportivo',
    titulo: 'Planificación de sesión',
    descripcion: 'Resuelve un caso: calcula fatiga y RPE objetivo, y elige ejercicios seguros.',
  },
  {
    to: '/simulador/prevencion',
    icon: 'heart',
    escuela: 'Readaptación Deportiva y Prevención de Lesiones',
    titulo: 'Return-to-play y decisiones en partido',
    descripcion: 'Decide si autorizas la vuelta al juego o sacas a un jugador, con los tests reales.',
  },
]

export function SimuladorIndexPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="za-eyebrow">Simuladores</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Practica con el motor real</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">
          Cada simulador reutiliza el mismo cálculo que corre en producción — no es una
          aproximación de práctica.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SIMULADORES.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="za-card flex flex-col gap-3 p-5 transition-colors hover:bg-surface-soft"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon name={s.icon} size={20} />
            </span>
            <div>
              <p className="za-eyebrow">{s.escuela}</p>
              <p className="mt-1 text-base font-bold tracking-tight text-ink">{s.titulo}</p>
              <p className="mt-1 text-sm text-ink-soft">{s.descripcion}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
