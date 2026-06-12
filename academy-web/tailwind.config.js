/** @type {import('tailwindcss').Config} */
// Colores definidos como CSS variables para soportar white-label multi-tenant.
// Los valores por defecto (CONMEBOL) se fijan en :root en index.css; el
// TenantProvider los sobreescribe en runtime según la config del tenant activo.
//
// brand/accent/ok/warn/danger usan canales RGB ("R G B") para que los
// modificadores de opacidad de Tailwind funcionen: bg-brand/10, bg-accent/5, etc.
// ink/surface se mantienen como hex: no tienen modificadores de opacidad en el UI.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          dark:    'rgb(var(--color-brand-dark) / <alpha-value>)',
          deep:    'rgb(var(--color-brand-deep) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          light:   'rgb(var(--color-accent-light) / <alpha-value>)',
          dark:    'rgb(var(--color-accent-dark) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          soft:    'var(--color-ink-soft)',
          muted:   'var(--color-ink-muted)',
          faint:   'var(--color-ink-faint)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          soft:    'var(--color-surface-soft)',
          border:  'var(--color-surface-border)',
        },
        ok:     'rgb(var(--color-ok) / <alpha-value>)',
        warn:   'rgb(var(--color-warn) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card:      '0 1px 2px rgba(16,40,80,0.04), 0 8px 24px rgba(16,40,80,0.06)',
        cardHover: '0 4px 10px rgba(16,40,80,0.08), 0 16px 40px rgba(16,40,80,0.12)',
      },
    },
  },
  plugins: [],
}
