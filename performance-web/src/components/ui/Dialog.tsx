// Diálogo modal accesible del panel. Envuelve cualquier contenido en un backdrop
// con cierre por clic-fuera y delega en useDialogA11y el foco/Escape/scroll-lock.
// El contenido (cabecera, cuerpo, pie) lo aporta quien lo usa.
//
// Uso típico:
//   <Dialog onClose={cerrar} labelledBy="titulo-x" className="… max-w-md …">
//     <h2 id="titulo-x">Título</h2>
//     …
//   </Dialog>

import { useRef, type ReactNode } from 'react'
import { useDialogA11y } from '@/lib/useDialogA11y'

export function Dialog({
  onClose,
  labelledBy,
  ariaLabel,
  children,
  className = '',
  backdropClassName = 'bg-black/65',
  center = true,
}: {
  onClose: () => void
  /** id del encabezado que titula el diálogo (preferido). */
  labelledBy?: string
  /** Alternativa a labelledBy cuando no hay un encabezado visible. */
  ariaLabel?: string
  children: ReactNode
  /** Clases del panel del diálogo. */
  className?: string
  /** Clases del backdrop (color/opacidad). */
  backdropClassName?: string
  /** Centrar el panel (modal). `false` para drawers que se posicionan solos. */
  center?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDialogA11y(ref, { onClose })

  return (
    <div
      // onMouseDown (no onClick): evita cerrar al soltar fuera tras seleccionar texto.
      onMouseDown={onClose}
      className={[
        'fixed inset-0 z-50',
        center ? 'flex items-center justify-center p-4' : '',
        backdropClassName,
      ].join(' ')}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={className}
      >
        {children}
      </div>
    </div>
  )
}
