import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'

const server = Boolean(process.env.HYDRATION_SERVER)
const built = Boolean(process.env.BENCH_DISTRIBUTION)
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [solid({ ssr: true, observe: true, performanceTracks: false })],
  resolve: {
    conditions: built
      ? ['solid', 'module', 'browser', 'development|production']
      : ['wfe-source', 'solid', 'module', 'browser', 'development|production'],
    dedupe: ['solid-js', '@solidjs/web', '@solidjs/signals'],
  },
  ssr: {
    resolve: {
      conditions: built
        ? ['solid', 'module', 'node', 'development|production']
        : ['wfe-source', 'solid', 'module', 'node', 'development|production'],
    },
  },
  build: {
    outDir: server
      ? built
        ? '.dist-server-package'
        : '.dist-server'
      : built
        ? '.dist-package'
        : '.dist',
    target: 'esnext',
    minify: process.env.BENCH_PROFILE ? false : undefined,
    sourcemap: Boolean(process.env.BENCH_PROFILE),
    ssr: server ? fileURLToPath(new URL('server.tsx', import.meta.url)) : false,
  },
})
