/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Acentos azules heredados de la app de consumo (se mantienen).
        accent: '#4f8cff',
        accentDark: '#2563ff',
        // Identidad de Zyfit Performance (vertical B2B): púrpura de acción
        // sobre fondos azul-morado profundo, casi negros.
        perf: {
          purple: '#7c5cff', // color primario de acción (botón, foco, acentos)
          purpleDark: '#6a47e6', // hover del botón primario
          purpleMuted: '#a89bff', // etiquetas/links sobre fondo oscuro
          ink: '#0c0a1c', // fondo de respaldo si la imagen no carga
        },
      },
    },
  },
  plugins: [],
}
