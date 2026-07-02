import { createContext, useContext, type ReactNode } from 'react'
import type { TenantConfig } from '@/types'

// Branding fijo de Zyfit Academy — Ciencias del Deporte.
// Sin llamadas al API, sin tenant system. El color rojo es permanente.
const BRANDING: TenantConfig = {
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
  tagline:     'Ciencia en movimiento',
  logo_url:    '',
  favicon_url: '',
  tema:        'light',
}

const TenantContext = createContext<TenantConfig>(BRANDING)

export function useTenant() {
  return useContext(TenantContext)
}

export function TenantProvider({ children }: { children: ReactNode }) {
  return (
    <TenantContext.Provider value={BRANDING}>
      {children}
    </TenantContext.Provider>
  )
}
