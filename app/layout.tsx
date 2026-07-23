import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zyfit — Tu entrenador personal con IA adaptativa',
  description: 'Rutinas de fuerza y running que se ajustan a vos en cada sesión, según tu progreso, tu feedback y tu día.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
