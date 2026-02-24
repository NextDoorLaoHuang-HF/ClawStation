import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/'],
      // Keep thresholds modest but enforced; raise over time as coverage improves.
      thresholds: {
        lines: 55,
        functions: 30,
        branches: 60,
        statements: 55,
      },
    }
  }
})
