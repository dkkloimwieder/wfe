import { defineConfig } from 'tsdown'
import solid from '@solidjs/vite-plugin'
const shared = {
  entry: ['./src/index.ts', './src/chart/index.ts'],
  format: ['esm'] as const,
  fixedExtension: false,
  clean: true,
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
