import type { Metadata, Viewport } from 'next'
import { Big_Shoulders, JetBrains_Mono, Public_Sans } from 'next/font/google'
import './globals.css'

/**
 * Las tres familias se cargan con `next/font/google`, NO con un
 * `@import url(...)` en `globals.css`.
 *
 * Por qué: Tailwind v4 procesa `globals.css` con Lightning CSS, que **elimina
 * del build** el `@import` remoto que estaba en la primera línea del archivo.
 * El CSS que se servía en producción declaraba `font-family: "Big Shoulders
 * Display"` con **cero `@font-face` y cero `@import`**: ninguna de las tres
 * fuentes cargaba y la página se veía con la tipografía de sistema. Verificado
 * en el CSS compilado, no deducido.
 *
 * `next/font` además las auto-hospeda (sin salto a fonts.googleapis.com, sin
 * FOUT por red de terceros) y por eso la CSP ya no necesita esos dos orígenes.
 * Los pesos son exactamente los que pedía el `@import` que se borró.
 */
// Google renombró la familia: "Big Shoulders Display" hoy se publica como
// "Big Shoulders", y bajo ese nombre **solo tiene corte normal, sin itálica**
// (el `@import` viejo pedía ital 700/800 de un nombre que ya no existe). Por eso
// no se declara `style: ['normal','italic']`: rompe el build con "Unknown font".
// `.font-accent` en globals.css sigue pidiendo `font-style: italic` y el
// navegador la sintetiza como oblicua — que es lo que se venía viendo, solo que
// ahora sobre la tipografía correcta en vez de sobre la de sistema.
const display = Big_Shoulders({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-display-src',
  display: 'swap',
})

const body = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body-src',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-src',
  display: 'swap',
})

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
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
