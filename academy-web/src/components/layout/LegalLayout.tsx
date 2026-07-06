// Shell compartido por las páginas legales públicas (Términos, Privacidad).
// Mismo header/footer que LandingPage.tsx para que se sientan parte del mismo
// sitio público, con una columna de lectura angosta para las secciones largas.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/components/Emblem'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { useT } from '@/locale/useT'

export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string
  lastUpdated: string
  children: ReactNode
}) {
  const t = useT()
  return (
    <div className="min-h-[100dvh] bg-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border bg-white/90 px-6 py-4 backdrop-blur sm:px-10">
        <Link to="/">
          <BrandLockup size={30} />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm font-medium text-ink-soft transition-colors hover:text-accent">
            {t('legal.backHome')}
          </Link>
          <LocaleToggle />
        </div>
      </header>

      <div className="mx-auto max-w-[680px] px-6 py-14 sm:px-10">
        <p className="za-eyebrow">{t('legal.eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          {t('legal.lastUpdated', { date: lastUpdated })}
        </p>
        <div className="mt-10 flex flex-col gap-8">{children}</div>
      </div>

      <footer className="border-t border-surface-border px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandLockup size={24} />
          <p className="text-xs text-ink-muted">© {new Date().getFullYear()} Zyfit Academy</p>
        </div>
      </footer>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-soft">{children}</div>
    </section>
  )
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-0.5 text-accent">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
