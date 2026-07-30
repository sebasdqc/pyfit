'use client'

import { useState } from 'react'

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'No pudimos guardar tu email, intenta de nuevo.')
      }
      setSubmitted(true)
      // Avisa al contador de la landing para que releva el total sin recargar.
      window.dispatchEvent(new Event('zyfit:waitlist-signup'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar tu email, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div
        className="glass-strong rounded-2xl px-6 py-5 text-center w-full max-w-md"
        style={{ borderColor: 'rgba(50,200,150,0.35)' }}
      >
        <p className="font-semibold flex items-center justify-center gap-2" style={{ color: 'var(--green)' }}>
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px]"
            style={{ background: 'rgba(50,200,150,0.18)' }}
          >
            ✓
          </span>
          ¡Listo! Te avisamos apenas Zyfit esté disponible.
        </p>
        <p className="text-sm mt-1.5" style={{ color: 'var(--ink-dim)' }}>
          Guardamos <span style={{ color: 'var(--ink)' }}>{email}</span> en la lista de espera.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none glass transition-all placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)]"
          style={{ color: 'var(--ink)' }}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary rounded-xl px-5 py-3.5 text-sm font-semibold whitespace-nowrap disabled:opacity-60"
        >
          {loading ? 'Enviando...' : 'Unirme a la lista'}
        </button>
      </form>
      {error && (
        <p className="text-sm mt-2" style={{ color: 'var(--orange)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
