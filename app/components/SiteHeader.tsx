'use client'

import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#funciones', label: 'Funciones' },
  { href: '#score', label: 'Zyfit Score' },
  { href: '#faq', label: 'FAQ' },
]

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(8,9,12,0.72)' : 'transparent',
        backdropFilter: scrolled ? 'blur(18px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(18px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center">
          <img src="/logo-zyfit-blanco.png" alt="Zyfit" className="h-6 w-auto" />
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--ink-dim)' }}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#lista-de-espera"
            className="btn-primary rounded-full px-5 py-2 text-sm font-semibold"
          >
            Unirme
          </a>
          <a
            href="/roadmap"
            className="btn-outline hidden sm:inline-flex rounded-full px-5 py-2 text-sm font-semibold"
          >
            Roadmap público
          </a>
        </div>
      </div>
    </header>
  )
}
