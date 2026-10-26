import { defineConfig } from 'tsdown'
import solid from '@solidjs/vite-plugin'
const shared = {
  entry: ['./src/index.ts', './src/chart/index.ts'],
  format: ['esm'] as const,
  unbundle: true,
  fixedExtension: false,
  clean: false,
  exports: false,
}
export default defineConfig([
  // tsdown cleans once before any config writes; only the client owns cleanup.
  { ...shared, plugins: [solid()], outDir: 'dist', clean: true, dts: true },
  {
    ...shared,
    outDir: 'dist',
    dts: false,
    inputOptions: { transform: { jsx: 'preserve' } },
    outExtensions: () => ({ js: '.jsx' }),
  },
  {
    ...shared,
    plugins: [solid({ solid: { generate: 'ssr' } })],
    outDir: 'dist/server',
    dts: false,
  },
])
