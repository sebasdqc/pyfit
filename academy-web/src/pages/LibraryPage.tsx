// Biblioteca de recursos. A diferencia del Catálogo (que agrupa cursos por
// escuela), la biblioteca es un catálogo PLANO buscable/filtrable de material
// de apoyo (documentos, plantillas, videos, guías, infografías, herramientas,
// enlaces) — GET /api/academy/library/ ya resuelve `favorito`/`bloqueado`
// para el usuario actual (ver academy.library_service, backend).

import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listLibrary, listSchools, openLibraryResource, toggleLibraryFavorite, type LibraryFilters } from '@/api/academy'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon, type IconName } from '@/components/Icon'
import { LIBRARY_TIPOS } from '@/lib/constants'
import { useT } from '@/locale/useT'
import type { LibraryResource, LibraryTipo, School } from '@/types'

const TYPE_ICON: Record<LibraryTipo, IconName> = {
  documento: 'doc',
  guia: 'doc',
  plantilla: 'layers',
  video: 'play',
  infografia: 'activity',
  herramienta: 'tool',
  enlace: 'external',
}

export function LibraryPage() {
  const t = useT()
  const [schools, setSchools] = useState<School[]>([])
  const [items, setItems] = useState<LibraryResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [tipo, setTipo] = useState<LibraryTipo | ''>('')
  const [schoolId, setSchoolId] = useState('')
  const [destacados, setDestacados] = useState(false)
  const [favoritos, setFavoritos] = useState(false)

  const filtersActive = Boolean(debouncedQ.trim() || tipo || schoolId || destacados || favoritos)

  // Debounce de la búsqueda: evita disparar una request por cada tecla.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  // Escuelas para el filtro — reutiliza el mismo endpoint que el Catálogo.
  useEffect(() => {
    let active = true
    listSchools().then((data) => active && setSchools(data)).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    const filters: LibraryFilters = {
      q: debouncedQ.trim() || undefined,
      tipo: tipo || undefined,
      school: schoolId ? Number(schoolId) : undefined,
      destacados: destacados || undefined,
      favoritos: favoritos || undefined,
    }
    listLibrary(filters)
      .then((data) => active && setItems(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [debouncedQ, tipo, schoolId, destacados, favoritos])

  // Optimista: cambia el estado local de inmediato y revierte si el servidor falla.
  function handleToggleFavorite(id: number) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, favorito: !r.favorito } : r)))
    toggleLibraryFavorite(id).catch(() => {
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, favorito: !r.favorito } : r)))
    })
  }

  async function handleOpen(resource: LibraryResource) {
    if (resource.bloqueado) return
    try {
      const { url } = await openLibraryResource(resource.id)
      setItems((prev) => prev.map((r) => (r.id === resource.id ? { ...r, vistas: r.vistas + 1 } : r)))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // Silencioso: el botón sigue disponible para reintentar.
    }
  }

  function clearFilters() {
    setQ('')
    setTipo('')
    setSchoolId('')
    setDestacados(false)
    setFavoritos(false)
  }

  const isEmpty = !loading && !error && items.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-deep p-6 sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-white/55">{t('library.eyebrow')}</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('library.title')}</h1>
          <p className="mt-2 text-sm text-white/65">{t('library.body')}</p>
        </div>
      </section>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('library.searchPlaceholder')}
            type="search"
            aria-label={t('library.searchAria')}
            className="h-11 w-full rounded-xl border border-surface-border bg-surface pl-11 pr-4 text-sm text-ink transition-colors focus:border-accent"
          />
        </div>
        <FilterSelect value={tipo} onChange={(v) => setTipo(v as LibraryTipo | '')} placeholder={t('library.typePlaceholder')}>
          {LIBRARY_TIPOS.map((tp) => (
            <option key={tp} value={tp}>{t(`library.type.${tp}`)}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={schoolId} onChange={setSchoolId} placeholder={t('library.schoolPlaceholder')}>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </FilterSelect>
        <ToggleChip active={destacados} onClick={() => setDestacados((v) => !v)} icon="star" label={t('library.featuredOnly')} />
        <ToggleChip active={favoritos} onClick={() => setFavoritos((v) => !v)} icon="bookmark" label={t('library.favoritesOnly')} />
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-4 text-sm text-ink-soft transition-colors hover:border-danger hover:text-danger"
          >
            <Icon name="close" size={14} />
            {t('library.clear')}
          </button>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={40} />
        </div>
      ) : error ? (
        <EmptyState icon="library" title={t('library.loadError')} description={t('library.loadErrorBody')} />
      ) : isEmpty ? (
        <EmptyState
          icon="library"
          title={favoritos ? t('library.noFavoritesYet') : q.trim() ? t('library.noResults') : t('library.noResourcesYet')}
          description={
            favoritos
              ? t('library.noFavoritesYetBody')
              : q.trim()
                ? t('library.noResultsBody', { term: q.trim() })
                : t('library.noResourcesYetBody')
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <ResourceCard key={r.id} resource={r} onToggleFavorite={handleToggleFavorite} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children: ReactNode
}) {
  const t = useT()
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className="h-11 w-full appearance-none rounded-xl border border-surface-border bg-surface pl-4 pr-9 text-sm text-ink transition-colors focus:border-accent sm:w-44"
      >
        <option value="">{placeholder}: {t('library.all')}</option>
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
    </div>
  )
}

function ToggleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: IconName
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'flex h-11 items-center gap-1.5 rounded-xl border px-4 text-sm font-medium transition-colors',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-surface-border bg-surface text-ink-soft hover:border-accent/40',
      ].join(' ')}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  )
}

function ResourceCard({
  resource,
  onToggleFavorite,
  onOpen,
}: {
  resource: LibraryResource
  onToggleFavorite: (id: number) => void
  onOpen: (r: LibraryResource) => void
}) {
  const t = useT()
  const hasMiniatura = Boolean(resource.miniatura)
  return (
    <div className="group za-card flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-cardHover">
      {/* Miniatura (o motivo temático del tipo de recurso) */}
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-deep">
        {hasMiniatura ? (
          <img src={resource.miniatura} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="pointer-events-none absolute -right-5 -top-5 text-white/10 transition-transform duration-300 group-hover:scale-110">
            <Icon name={TYPE_ICON[resource.tipo]} size={110} strokeWidth={1.2} />
          </div>
        )}
        <button
          type="button"
          onClick={() => onToggleFavorite(resource.id)}
          aria-label={resource.favorito ? t('library.removeFavoriteAria') : t('library.addFavoriteAria')}
          aria-pressed={resource.favorito}
          className={[
            'absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg backdrop-blur-sm transition-colors',
            resource.favorito ? 'bg-white text-brand' : 'bg-white/15 text-white hover:bg-white/25',
          ].join(' ')}
        >
          <Icon name="bookmark" size={16} fill={resource.favorito ? 'currentColor' : 'none'} />
        </button>
        {resource.destacado && (
          <span className="absolute left-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            ★ {t('library.featuredOnly')}
          </span>
        )}
      </div>

      {/* Cuerpo */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{t(`library.type.${resource.tipo}`)}</Badge>
          {resource.escuela_nombre && <Badge tone="neutral">{resource.escuela_nombre}</Badge>}
          {!resource.es_gratuito && <Badge tone="warn">{t('library.proBadge')}</Badge>}
        </div>

        <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
          {resource.titulo}
        </h3>
        {resource.descripcion && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{resource.descripcion}</p>}
        {resource.fuente && <p className="mt-2 text-xs text-ink-muted">{t('library.source', { source: resource.fuente })}</p>}

        <div className="flex-1" />

        {resource.bloqueado ? (
          <Link
            to="/suscripcion"
            className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-warn/30 bg-warn/10 text-sm font-semibold text-warn transition-colors hover:bg-warn/15"
          >
            <Icon name="lock" size={15} />
            {t('library.proLockedBody')}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(resource)}
            className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            <Icon name="external" size={15} />
            {t('library.openCta')}
          </button>
        )}

        <div className="mt-3 flex items-center gap-1.5 border-t border-surface-border pt-3 text-xs text-ink-muted">
          <Icon name="activity" size={13} />
          {t('library.viewsAbbr', { count: resource.vistas })}
        </div>
      </div>
    </div>
  )
}
