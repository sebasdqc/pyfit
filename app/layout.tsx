import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zyfit — Tu entrenador personal con IA adaptativa',
  description:
    'Rutinas de fuerza y running que se ajustan a ti en cada sesión, según tu progreso, tu feedback y tu día. Muy pronto en App Store y Google Play.',
  openGraph: {
    title: 'Zyfit — Tu entrenador personal con IA adaptativa',
    description:
      'Rutinas de fuerza y running que se ajustan a ti en cada sesión. Nada de plantillas genéricas.',
    type: 'website',
    locale: 'es_419',
  },
}

export const viewport: Viewport = {
  themeColor: '#08090c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
