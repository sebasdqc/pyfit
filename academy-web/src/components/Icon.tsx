// Set de íconos de línea (inline SVG, sin librería). Usan `currentColor`, así que
// el color se controla con clases de texto (text-accent, text-brand, …).

import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'catalog'
  | 'learning'
  | 'certificate'
  | 'instructor'
  | 'profile'
  | 'menu'
  | 'close'
  | 'chevronDown'
  | 'chevronRight'
  | 'chevronLeft'
  | 'search'
  | 'play'
  | 'doc'
  | 'audio'
  | 'quiz'
  | 'clock'
  | 'users'
  | 'layers'
  | 'check'
  | 'logout'
  | 'plus'
  | 'mail'
  | 'lock'
  | 'star'
  | 'arrowRight'
  | 'live'
  | 'pitch'
  | 'upload'
  | 'activity'
  | 'heart'
  | 'flame'
  | 'snowflake'
  | 'sparkles'
  | 'send'
  | 'thumbUp'
  | 'thumbDown'
  | 'flag'
  | 'trash'
  | 'edit'
  | 'sun'
  | 'moon'
  | 'library'
  | 'bookmark'
  | 'external'
  | 'tool'

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </>
  ),
  catalog: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>
  ),
  learning: (
    <>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5" />
    </>
  ),
  certificate: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 13.5-1.5 7 5-3 5 3-1.5-7" />
    </>
  ),
  instructor: (
    <>
      <path d="M2 3h20v14H2z" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  play: <path d="M6 4v16l13-8z" />,
  doc: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </>
  ),
  audio: (
    <>
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <path d="M21 16a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 16a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z" />
    </>
  ),
  quiz: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" />
      <path d="M12 17h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  check: <path d="m5 12 5 5 9-11" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  star: <path d="m12 3 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3 1.2-6.5L2.5 9.9 9 9z" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  // Sesión sincrónica en vivo (Programa 360°): punto emisor con ondas.
  live: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path d="M5 19a10 10 0 0 1 0-14M19 5a10 10 0 0 1 0 14" />
    </>
  ),
  // Práctica presencial: cancha con línea media y círculo central.
  pitch: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  // Entregable: subir un archivo/contenido.
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  // Analítica / rendimiento: pulso de electrocardiograma.
  activity: <path d="M3 12h4l3 8 4-16 3 8h4" />,
  // Recuperación / wellness: corazón.
  heart: <path d="M12 20s-7-4.5-9.5-9A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9Z" />,
  // Racha de estudio: llama.
  flame: <path d="M12 3c1 3-1.5 4-1.5 6.5a3.5 3.5 0 0 0 7 0c0-1.2-.5-2.3-1.2-3 .2 2-1 3-2 3 .8-2.3-2.3-4.7-2.3-6.5ZM12 3C8 5 6 8.5 6 12a6 6 0 0 0 12 0" />,
  // Freeze de racha: copo de nieve.
  snowflake: (
    <>
      <path d="M12 2v20M4.2 7l15.6 10M19.8 7 4.2 17" />
      <path d="M12 5.5 9.5 4M12 5.5 14.5 4M12 18.5 9.5 20M12 18.5l2.5 1.5" />
    </>
  ),
  // Tutor IA: destellos (respuesta generada).
  sparkles: (
    <>
      <path d="M12 3l1.7 4.6L18.3 9.3 13.7 11 12 15.6 10.3 11 5.7 9.3l4.6-1.7z" />
      <path d="M18.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  // Enviar: avión de papel.
  send: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </>
  ),
  thumbUp: (
    <>
      <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
      <path d="M7 10 11 3a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16 21H7z" />
    </>
  ),
  thumbDown: (
    <>
      <path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1z" />
      <path d="M17 14 13 21a2 2 0 0 1-3-2l1-5H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 8 3h9z" />
    </>
  ),
  // Reportar contenido (Comunidad): bandera.
  flag: (
    <>
      <path d="M5 3v18" />
      <path d="M5 4h13l-3 4 3 4H5" />
    </>
  ),
  // Borrar módulo/lección (CourseContentPage).
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  // Editar título/contenido de módulo/lección (CourseContentPage).
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  // Toggle de tema: modo claro.
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  // Toggle de tema: modo oscuro.
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  // Biblioteca: pila de libros.
  library: (
    <>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v14.5" />
      <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19a1.5 1.5 0 0 0 1.5-1.5" />
      <path d="M8 3v18M12 3v6l2-1.3L16 9V3" />
    </>
  ),
  // Favorito de un recurso de la biblioteca (relleno vía fill en el consumidor).
  bookmark: <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16.4a.4.4 0 0 1-.62.34L12 16.5l-5.88 4.24A.4.4 0 0 1 5.5 20.4V4a.5.5 0 0 1 .5-.5Z" />,
  // Abrir recurso externo (documento/link fuera de la app).
  external: (
    <>
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </>
  ),
  // Recurso tipo "herramienta" de la biblioteca.
  tool: (
    <path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2 2-2.5-.5-.5-2.5Z" />
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
