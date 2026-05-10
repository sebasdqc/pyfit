import { Space_Grotesk, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  weight: ['300', '400', '500', '600', '700']
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600']
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400'],
  style: ['normal', 'italic']
})

export const metadata = {
  title: 'PyFit — Entrenamiento adaptativo con IA',
  description: 'Tu entrenador adaptativo con IA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}>
        {children}
      </body>
    </html>
  )
}
