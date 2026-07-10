// Prototipo: tarjeta de insignia compartible en redes. Al tocar una insignia
// YA OBTENIDA en BadgeGallery se abre este modal con una tarjeta 9:16 (formato
// story) que se rasteriza a PNG y se entrega vía el share sheet nativo o como
// descarga — mismo patrón que el certificado (ver src/lib/shareImage.ts) y
// que WorkoutShareCard en mobile, adaptado a los tokens de marca del tenant.

import { useRef, useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/Icon'
import { BRAND } from '@/lib/constants'
import { shareOrDownloadCard } from '@/lib/shareImage'
import { useT } from '@/locale/useT'
import { useTenant } from '@/tenant/TenantContext'
import { useAuth } from '@/auth/useAuth'

export interface ShareBadgeData {
  nombre: string
  icono: string
  descripcion: string
  /** Curso o escuela asociada, si aplica (se muestra debajo del nombre). */
  contexto?: string | null
  otorgada_at?: string | null
}

export function ShareBadgeModal({ badge, onClose }: { badge: ShareBadgeData; onClose: () => void }) {
  const t = useT()
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [result, setResult] = useState<'downloaded' | null>(null)
  const { user } = useAuth()
  const tenant = useTenant()

  const dateLabel = badge.otorgada_at
    ? new Date(badge.otorgada_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  async function handleShare() {
    if (!cardRef.current || sharing) return
    setSharing(true)
    setResult(null)
    try {
      const r = await shareOrDownloadCard(cardRef.current, {
        filename: `insignia-${badge.nombre.toLowerCase().replace(/\s+/g, '-')}.png`,
        title: t('shareBadge.shareTitle', { nombre: badge.nombre, brand: `${BRAND.name} ${BRAND.product}` }),
        text: t('shareBadge.shareText', { nombre: badge.nombre, plataforma: tenant.nombre_plataforma }),
      })
      setResult(r === 'downloaded' ? 'downloaded' : null)
    } catch {
      // Falla silenciosa: no bloquea la UI si la captura no se pudo generar.
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog
      onClose={onClose}
      ariaLabel={t('shareBadge.dialogAria', { nombre: badge.nombre })}
      className="za-card max-h-[90vh] w-full max-w-xs overflow-y-auto p-6"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Tarjeta capturable (formato story 9:16) */}
        <div
          ref={cardRef}
          className="relative flex w-[240px] flex-col overflow-hidden rounded-[24px] bg-[#0d0d0d] px-6 py-7"
          style={{ aspectRatio: '9 / 16' }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-60"
            style={{ background: `radial-gradient(circle, ${tenant.color_brand} 0%, transparent 70%)` }}
          />

          <div className="relative z-10 flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-white">{BRAND.name}</span>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tenant.color_accent }} />
            <span className="text-base font-bold tracking-tight text-white/60">{BRAND.product}</span>
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <span
              className="flex h-20 w-20 items-center justify-center rounded-full text-4xl"
              style={{ backgroundColor: `${tenant.color_brand}33`, border: `1px solid ${tenant.color_brand}66` }}
            >
              {badge.icono}
            </span>
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: tenant.color_accent }}
              >
                {t('shareBadge.earnedLabel')}
              </p>
              <p className="mt-1.5 line-clamp-2 text-lg font-bold leading-tight text-white">{badge.nombre}</p>
              {badge.contexto && <p className="mt-1 truncate text-[11px] text-white/50">{badge.contexto}</p>}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 text-[10px]">
            <span className="truncate font-medium text-white/60">{user?.nombre ?? t('shareBadge.studentFallback')}</span>
            {dateLabel && <span className="shrink-0 text-white/40">{dateLabel}</span>}
          </div>
        </div>

        <p className="text-center text-sm text-ink-soft">{badge.descripcion}</p>

        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          <Icon name="send" size={16} />
          {sharing ? t('shareBadge.generating') : t('shareBadge.shareImage')}
        </button>
        {result === 'downloaded' && (
          <p className="text-xs text-ink-muted">{t('shareBadge.downloaded')}</p>
        )}
      </div>
    </Dialog>
  )
}
