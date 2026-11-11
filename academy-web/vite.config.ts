import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Las librerías cambian poco y las páginas mucho: separarlas deja que el
        // navegador reutilice de caché el vendor entre deploys.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react-vendor'
          if (id.includes('@sentry')) return 'sentry'
          if (id.includes('/ogl/')) return 'ogl'
          if (id.includes('axios')) return 'axios'
          return undefined
        },
      },
    },
  },
  server: {
    // Puerto propio (5181) para no chocar con el panel Performance (5180).
    port: 5181,
  },
})
