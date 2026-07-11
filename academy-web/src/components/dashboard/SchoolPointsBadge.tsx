// Insignia circular de puntos de aprendizaje (Home) — reemplaza al viejo
// SchoolProgressRing (anillo de % de progreso): en un producto de
// suscripción continua un "% completado" implica una meta que se termina,
// mientras que los puntos son un acumulado que nunca tiene techo. Círculo
// sólido con el color de marca de la escuela + ícono + número de puntos.

import { Icon, type IconName } from '@/components/Icon'
import { useT } from '@/locale/useT'

export function SchoolPointsBadge({
  puntos,
  accent,
  icon,
  size = 64,
}: {
  puntos: number
  accent: string
  icon: IconName
  size?: number
}) {
  const t = useT()
  return (
    <div
      className="flex shrink-0 flex-col items-center justify-center rounded-full text-white"
      style={{ width: size, height: size, backgroundColor: accent }}
      role="img"
      aria-label={t('schoolPointsBadge.ariaLabel', { puntos })}
    >
      <Icon name={icon} size={size * 0.28} />
      <span className="text-[11px] font-bold tabular-nums">{puntos}</span>
    </div>
  )
}
