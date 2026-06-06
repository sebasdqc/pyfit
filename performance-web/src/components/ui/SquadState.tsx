// Placeholder compartido por los módulos que dependen de la plantilla, para los
// tres estados sin contenido del roster del centro activo: cargando, error de
// carga y centro sin atletas (con CTA a Equipo). Devuelve null cuando hay datos,
// de modo que las páginas hacen: `const ph = <SquadState .../>; if (ph) return ph`.

import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from './Spinner'

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-perf-border bg-perf-surface/50 px-6 py-16 text-center">
      {children}
    </div>
  )
}

export function SquadState({
  loading,
  error,
  empty,
}: {
  loading: boolean
  error: boolean
  empty: boolean
}): ReactElement | null {
  if (loading) {
    return (
      <Card>
        <Spinner size={22} />
        <p className="text-sm text-white/45">Cargando plantilla…</p>
      </Card>
    )
  }
  if (error) {
    return (
      <Card>
        <p className="text-sm font-medium text-perf-danger">No se pudo cargar la plantilla.</p>
        <p className="text-sm text-white/45">Revisa tu conexión o tu sesión e inténtalo de nuevo.</p>
      </Card>
    )
  }
  if (empty) {
    return (
      <Card>
        <p className="text-sm font-medium text-white/80">Este centro aún no tiene atletas.</p>
        <p className="max-w-sm text-sm text-white/45">
          Registra a tus atletas para verlos aquí y en el resto de módulos.
        </p>
        <Link
          to="/equipo"
          className="mt-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark"
        >
          Ir a Equipo
        </Link>
      </Card>
    )
  }
  return null
}
