import { defineConfig } from 'vitest/config'
import solid from '@solidjs/vite-plugin'

export default defineConfig({
  plugins: [solid({ performanceTracks: false })],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    maxWorkers: 1,
    fileParallelism: false,
  },
})
