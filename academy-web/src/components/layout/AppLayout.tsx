// Layout principal de la academia. Fondo claro a sangre completa. La sidebar flota
// (fixed); el contenido ocupa el ancho con padding-izquierdo para librarla en
// escritorio/tablet. En móvil la sidebar se abre como drawer.

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-soft text-ink">
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-brand-deep/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div className="min-h-screen md:pl-[104px] lg:pl-[272px]">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
