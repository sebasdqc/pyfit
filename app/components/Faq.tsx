'use client'

import { useState } from 'react'
import Reveal from './Reveal'

const FAQS = [
  {
    q: '¿Necesito experiencia previa para usar Zyfit?',
    a: 'No. El motor de IA arma tu plan según tu nivel de experiencia, objetivo y disponibilidad, sea tu primera vez entrenando o lleves años en esto.',
  },
  {
    q: '¿Necesito un coach para usar la app?',
    a: 'No es obligatorio. Puedes entrenar de forma completamente autónoma. Si ya tienes coach, puedes vincularlo desde el Portal de Coach para que vea tu progreso.',
  },
  {
    q: '¿Qué datos usa la IA para generar mi rutina?',
    a: 'Tu perfil físico, objetivos, historial de sesiones y el check-in del día (ánimo, sueño, molestias). Nunca compartimos tu nombre ni email con el motor de IA.',
  },
  {
    q: '¿Cuándo está disponible en Play Store y App Store?',
    a: 'Estamos en etapa final de pruebas. Súmate a la lista de espera y te avisamos apenas esté disponible para descargar.',
  },
]

export default function Faq() {
  // Acordeón: una sola respuesta abierta a la vez, y se puede cerrar todo.
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="mt-12 space-y-3">
      {FAQS.map((f, i) => {
        const isOpen = open === i
        return (
          <Reveal key={f.q} delay={i * 70}>
            <div className="faq-item glass rounded-2xl" data-open={isOpen}>
              <span className="faq-bar" aria-hidden />
              <button
                type="button"
                className="faq-q flex w-full items-center gap-4 px-6 py-4 text-left"
                aria-expanded={isOpen}
                aria-controls={`faq-a-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span className="faq-index font-mono-label text-[10px]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 font-medium">{f.q}</span>
                <span className="faq-icon" aria-hidden>
                  <span className="faq-icon-h" />
                  <span className="faq-icon-v" />
                </span>
              </button>
              <div id={`faq-a-${i}`} className="faq-a" role="region">
                <div>
                  {/* pl-14 alinea la respuesta con el texto de la pregunta,
                      salteando el índice y el gap del botón. */}
                  <p className="faq-a-text pr-6 pb-5 pl-14 text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                    {f.a}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
