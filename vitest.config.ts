import { vendorTransforms } from './scripts/vendor-transforms.mjs'
import { defineConfig } from 'vitest/config'
import solid from '@solidjs/vite-plugin'

export default defineConfig({
  plugins: [vendorTransforms(), solid({ performanceTracks: false })],
  resolve: {
    conditions: [
      ...(process.env.BENCH_DISTRIBUTION ? [] : ['wfe-source']),
      'solid',
      'browser',
      'development|production',
    ],
    dedupe: ['solid-js', '@solidjs/web', '@solidjs/signals'],
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    maxWorkers: 1,
    fileParallelism: false,
  },
})
