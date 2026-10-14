import { defineConfig } from 'tsdown'
import solid from '@solidjs/vite-plugin'

const shared = {
  entry: ['./src/index.ts'],
  format: ['esm'] as const,
  unbundle: true,
  sourcemap: false,
  clean: true,
  minify: false,
  fixedExtension: false,
  exports: false,
}

export default defineConfig([
  { ...shared, plugins: [solid()], outDir: 'dist/client', dts: true },
  {
    ...shared,
    plugins: [solid({ solid: { generate: 'ssr' } })],
    outDir: 'dist/server',
    dts: false,
  },
])
