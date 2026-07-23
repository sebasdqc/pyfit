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
        className="glass rounded-2xl px-6 py-5 text-center"
        style={{ borderColor: 'rgba(50,200,150,0.35)' }}
      >
        <p className="font-semibold" style={{ color: 'var(--green)' }}>
          ¡Listo! Te avisamos apenas Zyfit esté disponible.
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
          Guardamos {email} en la lista de espera.
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
        className="flex-1 rounded-xl px-4 py-3 text-sm outline-none glass placeholder:text-[color:var(--ink-dim)]"
        style={{ color: 'var(--ink)' }}
      />
      <button
        type="submit"
        className="rounded-xl px-5 py-3 text-sm font-semibold whitespace-nowrap transition-transform hover:scale-[1.03]"
        style={{ background: 'var(--accent)', color: '#04101f' }}
      >
        Unirme a la lista de espera
      </button>
    </form>
  )
}
