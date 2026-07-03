// Paywall contextual: se muestra cuando un estudiante Free intenta abrir
// contenido de un módulo pago. Explica QUÉ desbloquea Academy Pro (no solo
// "contenido bloqueado") y enlaza a la pantalla de suscripción. El botón de
// suscribirse todavía no cobra de verdad — ver SubscriptionPage.

import { useNavigate } from 'react-router-dom'
import { Dialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/Icon'

export function PaywallDialog({
  moduloTitulo,
  cursoTitulo,
  onClose,
}: {
  moduloTitulo?: string
  cursoTitulo?: string
  onClose: () => void
}) {
  const navigate = useNavigate()

  return (
    <Dialog onClose={onClose} labelledBy="paywall-titulo" className="za-card w-full max-w-md p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon name="lock" size={26} />
        </span>
        <div>
          <h2 id="paywall-titulo" className="text-lg font-bold text-ink">
            {moduloTitulo ? `"${moduloTitulo}" es contenido Pro` : 'Contenido de Zyfit Academy Pro'}
          </h2>
          {cursoTitulo && (
            <p className="mt-1 text-sm text-ink-soft">del curso "{cursoTitulo}"</p>
          )}
        </div>
        <ul className="w-full space-y-2 rounded-xl bg-surface-soft p-4 text-left text-sm text-ink-soft">
          <li className="flex items-start gap-2">
            <Icon name="check" size={15} className="mt-0.5 shrink-0 text-brand" />
            Catálogo completo: todos los cursos y escuelas, sin límites.
          </li>
          <li className="flex items-start gap-2">
            <Icon name="check" size={15} className="mt-0.5 shrink-0 text-brand" />
            Certificados de cada curso que completes.
          </li>
          <li className="flex items-start gap-2">
            <Icon name="check" size={15} className="mt-0.5 shrink-0 text-brand" />
            Cuota diaria ampliada del tutor IA.
          </li>
        </ul>
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/suscripcion')}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Ver planes de Academy Pro
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
