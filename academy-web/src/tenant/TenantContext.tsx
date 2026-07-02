import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { TenantConfig } from '@/types'
import { API_URL, TENANT_SLUG } from '@/lib/constants'

// ── Defaults (Zyfit Academy — Ciencias del Deporte) ──────────────────────────
// Usados solo mientras carga el branding del tenant vía API, o si la llamada
// falla. Cada site desplegado recibe su branding correcto desde el backend.

const DEFAULT_CONFIG: TenantConfig = {
  nombre_plataforma: 'Zyfit Academy',
  color_brand:        '#cc1f36',
  color_brand_dark:   '#a61729',
  color_brand_deep:   '#7a0f1d',
  color_accent:       '#e63950',
  color_accent_light: '#f06272',
  color_accent_dark:  '#b8182e',
  color_ok:     '#16a34a',
  color_warn:   '#d97706',
  color_danger: '#dc2626',
  fuente:      'Inter',
  tagline:     '',
  logo_url:    '',
  favicon_url: '',
  tema:        'light',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `${r} ${g} ${b}`
}

function applyBranding(cfg: TenantConfig) {
  const root = document.documentElement

  // RGB channels (para soportar bg-brand/10, bg-accent/5, etc. en Tailwind)
  root.style.setProperty('--color-brand',        hexToRgbChannels(cfg.color_brand))
  root.style.setProperty('--color-brand-dark',   hexToRgbChannels(cfg.color_brand_dark))
  root.style.setProperty('--color-brand-deep',   hexToRgbChannels(cfg.color_brand_deep))
  root.style.setProperty('--color-accent',       hexToRgbChannels(cfg.color_accent))
  root.style.setProperty('--color-accent-light', hexToRgbChannels(cfg.color_accent_light))
  root.style.setProperty('--color-accent-dark',  hexToRgbChannels(cfg.color_accent_dark))
  root.style.setProperty('--color-ok',     hexToRgbChannels(cfg.color_ok))
  root.style.setProperty('--color-warn',   hexToRgbChannels(cfg.color_warn))
  root.style.setProperty('--color-danger', hexToRgbChannels(cfg.color_danger))

  // Tipografía
  root.style.setProperty('--font-sans', `'${cfg.fuente}'`)

  // Metadata del documento
  document.title = cfg.nombre_plataforma

  if (cfg.favicon_url) {
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (link) link.href = cfg.favicon_url
  }
}

async function fetchTenantConfig(): Promise<TenantConfig | null> {
  try {
    const headers: Record<string, string> = {}
    if (TENANT_SLUG) headers['X-Tenant-Slug'] = TENANT_SLUG
    const res = await fetch(`${API_URL}/api/academy/tenant/config/`, { headers })
    if (!res.ok) return null
    const data: TenantConfig & { slug?: string } = await res.json()
    // Si el backend no resolvió ningún tenant (sin campo slug en la respuesta)
    // ignoramos el branding devuelto para mantener el DEFAULT_CONFIG. Ocurre
    // cuando el backend tiene código viejo, el tenant no está sembrado, o
    // VITE_TENANT_SLUG no llegó a la build. En todos esos casos el DEFAULT_CONFIG
    // (rojo) es el fallback correcto.
    if (!data.slug) return null
    return data
  } catch {
    return null
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantConfig>(DEFAULT_CONFIG)

export function useTenant() {
  return useContext(TenantContext)
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    fetchTenantConfig().then(cfg => {
      if (cfg) {
        setConfig(cfg)
        applyBranding(cfg)
      }
    })
  }, [])

  return (
    <TenantContext.Provider value={config}>
      {children}
    </TenantContext.Provider>
  )
}
