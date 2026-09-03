'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await fetch('/api/dataroom/login', { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
    >
      {loading ? 'Saliendo...' : 'Salir'}
    </button>
  )
}
