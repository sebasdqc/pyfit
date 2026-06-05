/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Único acento del portal: el azul de Zyfit Performance.
        accent: '#4f8cff',
        accentDark: '#2563ff',
        accentLight: '#7ab6ff', // azul claro: etiquetas, links, label flotante
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
          // (El púrpura #7C5CFF es de Zyfit Coach — app RN, coachTheme.ts —, no
          //  de Zyfit Performance. Aquí el único acento es el azul.)
        },
      },
    },
  },
  plugins: [],
}
