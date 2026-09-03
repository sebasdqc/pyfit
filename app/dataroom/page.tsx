import type { Metadata } from 'next'
import DataroomLogin from './DataroomLogin'
import LogoutButton from './LogoutButton'
import { isDataroomAuthed } from '../lib/dataroom'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dataroom — Zyfit',
  robots: { index: false, follow: false },
}

type DataroomDoc = {
  title: string
  description: string
  href: string
}

/**
 * Documentos del dataroom. Reemplazar los `href` de ejemplo por los links
 * reales (Google Drive, Notion, PDF alojado donde sea) — no hay backend ni
 * base de datos detrás de esta lista, es un array a mano.
 */
const DOCS: DataroomDoc[] = [
  {
    title: 'Pitch deck',
    description: 'Visión, producto, mercado y tracción.',
    href: '#',
  },
  {
    title: 'Métricas y tracción',
    description: 'Usuarios, retención y métricas clave actualizadas.',
    href: '#',
  },
  {
    title: 'Modelo financiero',
    description: 'Proyecciones y uso de fondos.',
    href: '#',
  },
  {
    title: 'Cap table',
    description: 'Estructura societaria actual.',
    href: '#',
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

          <div className="flex flex-col gap-3">
            {DOCS.map((doc) => (
              <a
                key={doc.title}
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-strong rounded-2xl px-5 py-4 flex items-center justify-between gap-4 transition-all hover:border-[color:var(--accent)]"
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {doc.title}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                    {doc.description}
                  </p>
                </div>
                <span className="font-mono-label text-[11px] uppercase whitespace-nowrap" style={{ color: 'var(--accent-light)' }}>
                  Abrir →
                </span>
              </a>
            ))}
          </div>
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
