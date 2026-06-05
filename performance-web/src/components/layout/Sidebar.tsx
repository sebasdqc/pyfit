// Barra lateral izquierda: los cinco módulos del panel. Las rutas se construyen
// a partir de MODULES (fuente única), anidadas bajo el centro activo.

import { NavLink, useParams } from 'react-router-dom'
import { MODULES } from '@/lib/constants'

export function Sidebar() {
  const { centerId } = useParams()
  const base = centerId ? `/centers/${centerId}` : ''

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Zyfit Performance</div>
      <nav>
        <NavLink to="/dashboard">Inicio</NavLink>
        {MODULES.map((m) => (
          <NavLink key={m.id} to={`${base}/${m.path}`}>
            {m.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
