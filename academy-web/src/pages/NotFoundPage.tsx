import { Link } from 'react-router-dom'
import { BrandLockup } from '@/components/Emblem'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-brand to-brand-deep px-6 text-center">
      <BrandLockup size={36} tone="dark" />
      <div>
        <p className="text-6xl font-bold text-white">404</p>
        <p className="mt-2 text-white/65">No encontramos esta página.</p>
      </div>
      <Link
        to="/catalogo"
        className="inline-flex h-11 items-center rounded-xl bg-white px-6 text-sm font-semibold text-brand transition-colors hover:bg-white/90"
      >
        Volver al catálogo
      </Link>
    </div>
  )
}
