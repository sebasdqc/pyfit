// Galería de insignias — unifica visualmente DOS sistemas separados en el
// backend (ver academy.badges_service / academy.grading):
//   • `identidad`   — catálogo global (AcademyBadge/AcademyEarnedBadge): escuela
//                      completada, racha, inicio de recorrido. Soporta estado
//                      bloqueado (no obtenida = aspiracional, en escala de grises).
//   • `cursoBadges` — Check-list de Competencias por curso (CourseBadge/
//                      EarnedBadge, Programa Evolución 360°). Solo llegan las
//                      YA obtenidas (ese catálogo no tiene noción de bloqueado).
// Datos separados, una sola galería — la unificación es puramente visual.

import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { schoolGradient, schoolTheme } from '@/lib/schoolTheme'
import { ShareBadgeModal, type ShareBadgeData } from '@/components/badges/ShareBadgeModal'
import type { AcademyBadgeCatalog, AcademyBadgeItem, DashboardEarnedBadge } from '@/types'

export function BadgeGallery({
  identidad,
  cursoBadges = [],
}: {
  identidad: AcademyBadgeCatalog
  cursoBadges?: DashboardEarnedBadge[]
}) {
  const [shareTarget, setShareTarget] = useState<ShareBadgeData | null>(null)
  const total = identidad.items.length + cursoBadges.length
  if (total === 0) return null

  const obtenidas = identidad.total_obtenidas + cursoBadges.length

  return (
    <div className="za-card p-5">
      <div className="flex items-center justify-between">
        <p className="za-eyebrow">Insignias</p>
        <span className="text-xs font-medium text-ink-muted">
          {obtenidas} de {total} obtenidas
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {identidad.items.map((badge) => (
          <IdentityTile key={`id-${badge.id}`} badge={badge} onShare={setShareTarget} />
        ))}
        {cursoBadges.map((badge) => (
          <button
            key={`curso-${badge.id}`}
            type="button"
            onClick={() =>
              setShareTarget({
                nombre: badge.nombre,
                icono: badge.icono,
                descripcion: badge.descripcion,
                contexto: badge.curso_titulo,
                otorgada_at: badge.otorgada_at,
              })
            }
            title={`Compartir insignia: ${badge.descripcion}`}
            className="flex flex-col items-center gap-2 rounded-lg p-1 text-center transition-colors hover:bg-surface-soft"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-2xl">
              {badge.icono}
            </span>
            <div>
              <p className="text-[11px] font-semibold leading-tight text-ink">{badge.nombre}</p>
              <p className="truncate text-[10px] text-ink-muted">{badge.curso_titulo}</p>
            </div>
          </button>
        ))}
      </div>

      {shareTarget && <ShareBadgeModal badge={shareTarget} onClose={() => setShareTarget(null)} />}
    </div>
  )
}

function IdentityTile({ badge, onShare }: { badge: AcademyBadgeItem; onShare: (badge: ShareBadgeData) => void }) {
  const obtenida = badge.obtenida
  const escuela = badge.criterio_tipo === 'escuela_completada' ? schoolTheme(badge.escuela_slug) : null

  const icon = (
    <span
      className={`relative flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
        obtenida
          ? escuela ? 'text-white' : 'bg-gradient-to-br from-brand to-accent text-white'
          : 'bg-surface-soft grayscale'
      }`}
      style={obtenida && escuela ? { backgroundImage: schoolGradient(escuela) } : undefined}
    >
      <span className={obtenida ? '' : 'opacity-40'}>{badge.icono}</span>
      {!obtenida && (
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-surface-border bg-surface text-ink-muted">
          <Icon name="lock" size={11} />
        </span>
      )}
    </span>
  )

  const label = (
    <p className={`text-[11px] font-semibold leading-tight ${obtenida ? 'text-ink' : 'text-ink-muted'}`}>
      {badge.nombre}
    </p>
  )

  if (!obtenida) {
    return (
      <div className="flex flex-col items-center gap-2 text-center" title={badge.descripcion}>
        {icon}
        {label}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() =>
        onShare({
          nombre: badge.nombre,
          icono: badge.icono,
          descripcion: badge.descripcion,
          otorgada_at: badge.otorgada_at,
        })
      }
      title={`Compartir insignia: ${badge.descripcion}`}
      className="flex flex-col items-center gap-2 rounded-lg p-1 text-center transition-colors hover:bg-surface-soft"
    >
      {icon}
      {label}
    </button>
  )
}
