/** @type {import('tailwindcss').Config} */
// Identidad de Zyfit Academy basada en el MANUAL DE MARCA CONMEBOL:
//  · Azul oficial del símbolo  #1a3e72 (RGB 26/62/114) → `brand`.
//  · Azul flat para fondos      #0066b3 (RGB 0/102/179) → `accent`.
//  · Fondos oficiales: blanco y azul → tema CLARO institucional (a diferencia
//    del panel Performance, que es oscuro). Tipografía digital oficial: Ubuntu.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a3e72', // azul CONMEBOL (símbolo)
          dark: '#13294d',
          deep: '#0c1a30', // navy profundo para gradientes / hero
        },
        accent: {
          DEFAULT: '#0066b3', // azul flat CONMEBOL (interacción)
          light: '#2a82d6',
          dark: '#004a87',
        },
        ink: {
          DEFAULT: '#1a3e72', // texto principal (navy)
          soft: '#475569',
          muted: '#7b8aa0',
          faint: '#aab4c5',
        },
        surface: {
          DEFAULT: '#ffffff',
          soft: '#f4f7fc', // fondo general muy claro
          border: '#e3e9f2',
        },
        // Sistema semántico (estados de progreso / alertas).
        ok: '#1f9d6b',
        warn: '#e08a00',
        danger: '#d64545',
      },
      fontFamily: {
        // Ubuntu: tipografía oficial CONMEBOL para plataformas digitales (Google Fonts).
        sans: ['Ubuntu', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,40,80,0.04), 0 8px 24px rgba(16,40,80,0.06)',
        cardHover: '0 4px 10px rgba(16,40,80,0.08), 0 16px 40px rgba(16,40,80,0.12)',
      },
    },
  },
  plugins: [],
}
