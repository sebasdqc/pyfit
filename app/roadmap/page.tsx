import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roadmap público — Zyfit',
  description:
    'Lo que estamos construyendo en Zyfit, en abierto. Muy pronto vas a poder seguir aquí cada entrega.',
}

export default function RoadmapPage() {
  return (
    <>
      {/* Ambient background */}
      <div className="bg-canvas" aria-hidden>
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="aurora aurora-3" />
        <div className="noise-overlay" />
      </div>

      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24">
        <div className="max-w-xl text-center">
          <a href="/" className="inline-flex items-center">
            <img src="/logo-zyfit-blanco.png" alt="Zyfit" className="h-7 w-auto mx-auto" />
          </a>

          <p
            className="mt-10 text-xs font-semibold uppercase"
            style={{ color: 'var(--ink-faint)', letterSpacing: '0.18em' }}
          >
            En construcción
          </p>

          <h1 className="section-title mt-4">Roadmap público</h1>

          <p className="mt-5 text-base leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
            Estamos preparando este espacio para contar en abierto qué estamos
            construyendo, qué acaba de salir y qué viene después. Todavía no hay
            nada que mostrar aquí.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/#lista-de-espera"
              className="btn-primary rounded-full px-6 py-3 text-sm font-semibold"
            >
              Unirme a la lista
            </a>
            <a
              href="/"
              className="btn-outline rounded-full px-6 py-3 text-sm font-semibold"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </main>
    </>
  )
}
