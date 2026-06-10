// Set de íconos de línea (inline SVG, sin librería). Usan `currentColor`, así
// que el color se controla con clases de texto (text-accent, text-perf-ok, …).

import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'dashboard'
  | 'plantilla'
  | 'convocatoria'
  | 'rendimiento'
  | 'lesiones'
  | 'tests'
  | 'monitoreo'
  | 'planificacion'
  | 'calendario'
  | 'psicologico'
  | 'reportes'
  | 'ajustes'
  | 'menu'
  | 'bell'
  | 'chevronDown'
  | 'chevronRight'
  | 'report'
  | 'shield'
  | 'alert'
  | 'wellness'
  | 'gauge'
  | 'trendUp'
  | 'trendDown'
  | 'logout'
  | 'close'
  | 'edit'
  | 'camera'
  | 'simulador'
  | 'gps'
  | 'check'

const PATHS: Record<IconName, ReactNode> = {
  check: <path d="m5 12 5 5 9-11" />,
  gps: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
    </>
  ),
  simulador: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3 9h3v6H3M21 9h-3v6h3" />
    </>
  ),
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  plantilla: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  convocatoria: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  rendimiento: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  lesiones: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  tests: (
    <>
      <path d="M9 2h6" />
      <path d="M12 4v3" />
      <circle cx="12" cy="14" r="8" />
      <path d="M12 11v3l2 2" />
    </>
  ),
  monitoreo: <path d="M3 12h3l2 5 4-12 3 9 1.5-2H21" />,
  calendario: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </>
  ),
  planificacion: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  psicologico: (
    <>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.6c.6.5 1 1.3 1 2.1V18h6v-1.3c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </>
  ),
  reportes: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15v3M12 10v8M17 6v12" />
    </>
  ),
  ajustes: (
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  report: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.5 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  wellness: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" />
    </>
  ),
  gauge: (
    <>
      <path d="M3.5 18a9 9 0 1 1 17 0" />
      <path d="m12 14 4-5" />
      <circle cx="12" cy="14" r="1" />
    </>
  ),
  trendUp: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </>
  ),
  trendDown: (
    <>
      <path d="m3 7 6 6 4-4 8 8" />
      <path d="M17 17h4v-4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
}

export function Icon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
