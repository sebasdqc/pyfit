// Layout principal del panel. Fondo azul-marino a sangre completa. La sidebar
// flota encima (position fixed, su propio z-index); el contenido ocupa el ancho
// completo y solo lleva padding-izquierdo para no quedar bajo la sidebar en
// escritorio/tablet. En móvil la sidebar se oculta y se abre como drawer.

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-perf-bg text-white">
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      {/* Backdrop del drawer en móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Contenido: ancho completo, con padding para librar la sidebar flotante */}
      <div className="min-h-screen overflow-x-hidden md:pl-[100px] lg:pl-[272px]">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="px-4 pb-12 pt-5 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
