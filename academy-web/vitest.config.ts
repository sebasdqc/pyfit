import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Los tests cubren lógica pura y render estático (renderToStaticMarkup), así que
// corren en node: sin navegador, sin servidor y en pocos segundos.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
)
