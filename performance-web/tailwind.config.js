/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Único acento del portal: verde azulado (teal), identidad propia de
        // Zyfit Performance — antes era azul #4f8cff, que colisionaba en el
        // mismo hex exacto con el acento de la landing de la APP. No confundir
        // con el rojo de Academy ni con el color del Portal de Coach (otro
        // producto, con su propia identidad en mobile/lib/coachTheme.ts).
        accent: '#14b8a6',
        accentDark: '#0d9488',
        accentLight: '#5eead4', // verde azulado claro: etiquetas, links, label flotante
        perf: {
          // Fondos azul-marino profundo (no negro puro) — diferencias sutiles.
          bg: '#0a0e1a', // fondo general de la página
          surface: '#0f1525', // cards / sidebar — ligeramente más claros
          surface2: '#141c30', // hover / elementos internos
          border: '#1c2740', // borde muy oscuro, casi invisible
          // Sistema semántico (estados): disponible / monitoreo / riesgo.
          ok: '#32c896', // verde — disponible / positivo
          warn: '#ffaa32', // ámbar — duda / monitoreo
          danger: '#ff4444', // rojo — baja / riesgo crítico
        },
      },
    },
  },
  plugins: [],
}
