// Login del panel. Formulario funcional: autentica contra el backend vía el
// contexto de auth y redirige al dashboard. Sin styling fino (fuera de alcance).

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('No se pudo iniciar sesión. Verifica tus credenciales y tu acceso al panel.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <h1>Zyfit Performance</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </div>
  )
}
