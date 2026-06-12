import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { TenantConfig } from '@/types'
import { API_URL } from '@/lib/constants'

// ── Defaults (identidad CONMEBOL / Zyfit Academy) ────────────────────────────

const DEFAULT_CONFIG: TenantConfig = {
  nombre_plataforma: 'Zyfit Academy',
  color_brand:        '#1a3e72',
  color_brand_dark:   '#13294d',
  color_brand_deep:   '#0c1a30',
  color_accent:       '#0066b3',
  color_accent_light: '#2a82d6',
  color_accent_dark:  '#004a87',
  color_ok:     '#1f9d6b',
  color_warn:   '#e08a00',
  color_danger: '#d64545',
  fuente:      'Ubuntu',
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

async function fetchTenantConfig(): Promise<TenantConfig> {
  try {
    const res = await fetch(`${API_URL}/api/academy/tenant/config/`)
    if (!res.ok) return DEFAULT_CONFIG
    return await res.json()
  } catch {
    return DEFAULT_CONFIG
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
      setConfig(cfg)
      applyBranding(cfg)
    })
  }, [])

  return (
    <TenantContext.Provider value={config}>
      {children}
    </TenantContext.Provider>
  )
}
