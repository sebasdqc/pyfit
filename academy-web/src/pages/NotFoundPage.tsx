import { Link } from 'react-router-dom'
import { BrandLockup } from '@/components/Emblem'
import { useAuth } from '@/auth/useAuth'

export function NotFoundPage() {
  const { user } = useAuth()
  const destino = user ? '/catalogo' : '/explorar'
  const etiqueta = user ? 'Volver al catálogo' : 'Explorar cursos'

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-gradient-to-b from-brand to-brand-deep px-6 text-center">
      <BrandLockup size={36} tone="dark" />
      <div>
        <p className="text-6xl font-bold text-white" aria-hidden>404</p>
        <h1 className="mt-2 text-white/65">No encontramos esta página.</h1>
      </div>
      <Link
        to={destino}
        className="inline-flex h-11 items-center rounded-xl bg-white px-6 text-sm font-semibold text-brand transition-colors hover:bg-white/90"
      >
        {etiqueta}
      </Link>
    </div>
  )
}
