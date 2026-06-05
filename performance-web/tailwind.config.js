/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Paleta base de Zyfit (acentos azules sobre fondo oscuro). El styling
      // fino del panel queda fuera del alcance de este andamiaje.
      colors: {
        accent: '#4f8cff',
        accentDark: '#2563ff',
      },
    },
  },
  plugins: [],
}
