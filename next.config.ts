import type { NextConfig } from "next";

/**
 * CSP de la landing. **Cero orígenes externos**: todo lo que carga la página es
 * propio — el video del hero (`/hero-app.mp4`), su poster, el ruido de fondo
 * (SVG en un data: URI dentro de globals.css) y las tres tipografías, que desde
 * que se cargan con `next/font/google` quedan auto-hospedadas en
 * `/_next/static/media` (ver la nota en `app/layout.tsx`).
 *
 * Por eso ya NO están `fonts.googleapis.com` en `style-src` ni
 * `fonts.gstatic.com` en `font-src`: hacían falta para el `@import` remoto que
 * se eliminó. Si alguna vez se vuelve a agregar una fuente por URL, hay que
 * reponerlos o el navegador la bloquea en silencio.
 *
 * ⚠️ `script-src` lleva 'unsafe-inline' porque Next.js inyecta los scripts de
 * hidratación en línea; quitarlo exige nonces por request vía middleware, lo
 * que volvería dinámica toda la página. Aun así la directiva sirve: impide
 * cargar scripts desde cualquier host externo. `style-src` lo lleva por los
 * `style={{...}}` en línea, que la landing usa en todas partes.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          // Redundante con `frame-ancestors` en navegadores modernos, pero
          // cubre a los que no soportan CSP nivel 2.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
};

export default nextConfig;
