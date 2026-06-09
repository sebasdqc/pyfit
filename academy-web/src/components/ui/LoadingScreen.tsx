// Pantalla de carga a viewport completo con la identidad CONMEBOL (navy + azul).
// Se muestra mientras la academia rehidrata la sesión al arrancar.

import { BrandLockup } from '@/components/Emblem'
import { Spinner } from './Spinner'

export function LoadingScreen({ message = 'Preparando tu academia…' }: { message?: string }) {
  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-brand to-brand-deep">
      <div className="relative z-10 flex flex-col items-center gap-8">
        <BrandLockup size={40} tone="dark" showTagline />
        <Spinner size={48} className="[&_.stroke-surface-border]:stroke-white/15 [&_.stroke-accent]:stroke-white" />
        <p className="animate-pulse text-sm font-medium text-white/60">{message}</p>
      </div>
    </div>
  )
}
