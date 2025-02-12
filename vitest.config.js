import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      root: fileURLToPath(new URL('./', import.meta.url)),
      include: ['__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      reporters: [['verbose', { summary: false }]],
      coverage: {
        reporter: ['text', 'json-summary'],
        include: ['**/src/**']
      }
    }
  })
)
