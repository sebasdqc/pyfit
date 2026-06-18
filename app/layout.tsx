import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zyfit',
  description: 'Tu entrenador personal con IA adaptativa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#ffffff' }}>
        {children}
      </body>
    </html>
  )
}
