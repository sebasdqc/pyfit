// Pantalla de carga a viewport completo con la identidad de Zyfit Performance
// (azul de acento sobre azul-marino profundo). Se muestra mientras el panel
// rehidrata la sesión al arrancar. El acento es un glow puntual detrás del
// spinner, no un gradiente de fondo (el fondo se mantiene plano, como el login).

import { Spinner } from './Spinner'

const LOGO_IMAGE = '/Logo-Zyfit-Blanco.png'

export function LoadingScreen({ message = 'Preparando tu portal…' }: { message?: string }) {
  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-perf-bg">
      {/* Glow de acento muy sutil detrás del spinner (latido lento). */}
      <div
        className="pointer-events-none absolute h-80 w-80 animate-pulse rounded-full bg-accent/[0.12] blur-[130px]"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo Zyfit (blanco) + tag de la vertical. */}
        <div className="flex items-end gap-3">
          <img src={LOGO_IMAGE} alt="Zyfit" className="h-7 w-auto" />
          <span className="pb-0.5 text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
            Performance
          </span>
        </div>

        <Spinner size={54} />

        <p className="animate-pulse text-sm font-medium text-white/50">{message}</p>
      </div>
    </div>
  )
}
