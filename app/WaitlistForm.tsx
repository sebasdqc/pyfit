'use client'

import { useState } from 'react'

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div
        className="plate-strong rounded-lg px-6 py-5 text-center w-full max-w-md"
        style={{ borderColor: 'rgba(46,139,87,0.4)' }}
      >
        <p className="font-semibold flex items-center justify-center gap-2" style={{ color: 'var(--plate-green)' }}>
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px]"
            style={{ background: 'rgba(46,139,87,0.2)' }}
          >
            ✓
          </span>
          ¡Listo! Te avisamos apenas Zyfit esté disponible.
        </p>
        <p className="text-sm mt-1.5" style={{ color: 'var(--chalk-dim)' }}>
          Guardamos <span style={{ color: 'var(--chalk)' }}>{email}</span> en la lista de espera.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="flex-1 rounded-lg px-4 py-3.5 text-sm outline-none plate transition-all placeholder:text-[color:var(--chalk-dim)] focus:border-[color:var(--plate-red)]"
        style={{ color: 'var(--chalk)' }}
      />
      <button
        type="submit"
        className="btn-primary rounded-lg px-5 py-3.5 text-sm font-semibold whitespace-nowrap"
      >
        Unirme a la lista
      </button>
    </form>
  )
}
