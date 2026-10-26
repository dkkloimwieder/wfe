import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [solid({ performanceTracks: false })],
  build: { target: 'esnext' },
})
