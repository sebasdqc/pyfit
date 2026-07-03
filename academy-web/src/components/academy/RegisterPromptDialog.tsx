// Prompt de registro contextual del onboarding sin registro. Aparece SOLO en
// los momentos de mayor intención (nunca un interstitial genérico al abrir
// la app): terminar todo el contenido gratis, tocar contenido pago, o intentar
// usar una función que exige cuenta (streak/badges/certificados/tutor/comunidad).

import { useNavigate } from 'react-router-dom'
import { Dialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/Icon'

export type RegisterPromptReason = 'completo_gratis' | 'contenido_pago' | 'funcion_cuenta'

const COPY: Record<RegisterPromptReason, { titulo: string; descripcion: string }> = {
  completo_gratis: {
    titulo: '¡Completaste todo el contenido gratis!',
    descripcion: 'Crea tu cuenta gratis para seguir avanzando en el resto de la academia.',
  },
  contenido_pago: {
    titulo: 'Esto requiere una cuenta',
    descripcion: 'Regístrate gratis para continuar (algunos cursos son solo para Zyfit Academy Pro).',
  },
  funcion_cuenta: {
    titulo: 'Esto requiere una cuenta',
    descripcion:
      'La racha de estudio, las insignias, los certificados, el tutor IA y la comunidad solo están disponibles con una cuenta.',
  },
}

export function RegisterPromptDialog({
  reason,
  onClose,
}: {
  reason: RegisterPromptReason
  onClose: () => void
}) {
  const navigate = useNavigate()
  const copy = COPY[reason]

  return (
    <Dialog onClose={onClose} labelledBy="register-prompt-titulo" className="za-card w-full max-w-md p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon name="star" size={26} />
        </span>
        <div>
          <h2 id="register-prompt-titulo" className="text-lg font-bold text-ink">
            {copy.titulo}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{copy.descripcion}</p>
        </div>
        <p className="w-full rounded-xl bg-surface-soft p-3 text-xs text-ink-soft">
          Tu progreso ya avanzado se conserva — no perderás nada al registrarte.
        </p>
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/registro')}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Crear cuenta gratis
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-ink-soft hover:bg-surface-soft"
          >
            Ahora no
          </button>
        </div>
      </div>
    </Dialog>
  )
}
