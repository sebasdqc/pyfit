'use client'

import { useState } from 'react'

export type DataroomDoc = {
  title: string
  description: string
  body: string[]
}

/** Acordeón: cada sección se expande dentro de la misma página, sin navegar afuera. */
export default function DataroomContent({ docs }: { docs: DataroomDoc[] }) {
  const [open, setOpen] = useState<string | null>(docs[0]?.title ?? null)

  return (
    <div className="flex flex-col gap-3">
      {docs.map((doc) => {
        const isOpen = open === doc.title
        return (
          <div key={doc.title} className="glass-strong rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : doc.title)}
              aria-expanded={isOpen}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left transition-all"
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {doc.title}
                </p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                  {doc.description}
                </p>
              </div>
              <span
                className="font-mono-label text-[11px] uppercase whitespace-nowrap transition-transform"
                style={{ color: 'var(--accent-light)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
              >
                ▾
              </span>
            </button>

            {isOpen && (
              <div
                className="px-5 pb-5 flex flex-col gap-3"
                style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}
              >
                {doc.body.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
