// Accesibilidad de diálogos modales (compartido por modales y drawers). Aplica,
// mientras el diálogo está abierto:
//   · foco inicial dentro del diálogo (preferentemente [data-autofocus]),
//   · atrapado de foco con Tab/Shift+Tab (focus trap),
//   · cierre con Escape,
//   · bloqueo del scroll del fondo (scroll-lock del body),
//   · restauración del foco al elemento que abrió el diálogo al cerrarlo.
//
// El consumidor solo debe poner `role="dialog" aria-modal="true"` (+ aria-label
// o aria-labelledby) y `tabIndex={-1}` en el contenedor referenciado.

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function useDialogA11y(
  ref: RefObject<HTMLElement | null>,
  { onClose, open = true }: { onClose: () => void; open?: boolean },
) {
  useEffect(() => {
    if (!open) return
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const getFocusable = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))

    // Foco inicial: el marcado con [data-autofocus], o el primero enfocable, o el
    // propio contenedor.
    const preferred = node.querySelector<HTMLElement>('[data-autofocus]')
    ;(preferred ?? getFocusable()[0] ?? node).focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === first || !node.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !node.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [ref, onClose, open])
}
