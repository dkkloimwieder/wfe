import { vendorTransforms } from '../../scripts/vendor-transforms.mjs'
import { cssProvenance } from '../../scripts/css-provenance.mjs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'

const server = Boolean(process.env.HYDRATION_SERVER)
const built = Boolean(process.env.BENCH_DISTRIBUTION)
const suffix = process.env.BENCH_DEVELOPMENT ? '-dev' : built ? '-package' : ''
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
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
  plugins: [
    vendorTransforms(),
    cssProvenance(fileURLToPath(new URL('../../', import.meta.url)), built),
    solid({ ssr: true, observe: true, performanceTracks: false }),
    {
      name: 'grid-hydration-inventory',
      generateBundle(_options, bundle) {
        this.emitFile({
          type: 'asset',
          fileName: 'modules.json',
          source: JSON.stringify(
            Object.values(bundle).flatMap((chunk) =>
              chunk.type === 'chunk' ? Object.keys(chunk.modules) : [],
            ),
            null,
            2,
          ),
        })
      },
    },
  ],
  build: {
    outDir: `.dist-hydration${server ? '-server' : ''}${suffix}`,
    rolldownOptions: server
      ? undefined
      : { input: fileURLToPath(new URL('hydration.html', import.meta.url)) },
    target: 'esnext',
    minify: process.env.BENCH_PROFILE ? false : undefined,
    sourcemap: Boolean(process.env.BENCH_PROFILE),
    ssr: server ? fileURLToPath(new URL('server.tsx', import.meta.url)) : false,
  },
})
