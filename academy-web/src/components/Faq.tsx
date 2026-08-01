// Acordeón de preguntas frecuentes — adaptado del landing de Zyfit APP
// (app/components/Faq.tsx) a los tokens/i18n de Academy. Usado únicamente en
// LandingPage.tsx.
import { useState } from 'react'
import { useT } from '@/locale/useT'
import Reveal from './Reveal'
import './Faq.css'

const FAQS: { qKey: string; aKey: string }[] = [
  { qKey: 'landing.faq1Question', aKey: 'landing.faq1Answer' },
  { qKey: 'landing.faq2Question', aKey: 'landing.faq2Answer' },
  { qKey: 'landing.faq3Question', aKey: 'landing.faq3Answer' },
  { qKey: 'landing.faq4Question', aKey: 'landing.faq4Answer' },
]

export default function Faq() {
  const t = useT()
  // Una sola respuesta abierta a la vez; se puede cerrar todo.
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="mt-8 space-y-3">
      {FAQS.map((f, i) => {
        const isOpen = open === i
        return (
          <Reveal key={f.qKey} delay={i * 70}>
            <div className="faq-item za-card" data-open={isOpen}>
              <span className="faq-bar" aria-hidden />
              <button
                type="button"
                className="faq-q flex w-full items-center gap-4 px-6 py-4 text-left"
                aria-expanded={isOpen}
                aria-controls={`faq-a-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span className="faq-index text-xs font-semibold">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-sm font-medium text-ink sm:text-[15px]">{t(f.qKey)}</span>
                <span className="faq-icon" aria-hidden>
                  <span className="faq-icon-h" />
                  <span className="faq-icon-v" />
                </span>
              </button>
              <div id={`faq-a-${i}`} className="faq-a" role="region">
                <div>
                  <p className="faq-a-text pb-5 pl-14 pr-6 text-sm leading-relaxed text-ink-muted">{t(f.aKey)}</p>
                </div>
              </div>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
