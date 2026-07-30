'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Formulario de acceso al panel. Envía la clave a /api/admin/login. */
export default function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'No pudimos validar la clave.')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos validar la clave.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4">
      <div>
        <h1 className="display text-2xl">Lista de espera</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
          Panel privado. Ingresá la clave de administración.
        </p>
      </div>

      <input
        type="password"
        required
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Clave"
        className="rounded-xl px-4 py-3.5 text-sm outline-none glass transition-all placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)]"
        style={{ color: 'var(--ink)' }}
      />

      <button
        type="submit"
        disabled={loading}
        className="btn-primary rounded-xl px-5 py-3.5 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? 'Verificando...' : 'Entrar'}
      </button>

      {error && (
        <p className="text-sm" style={{ color: 'var(--orange)' }}>
          {error}
        </p>
      )}
    </form>
  )
}
