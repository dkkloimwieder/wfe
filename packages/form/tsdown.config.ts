import { defineConfig } from 'tsdown'
export default defineConfig({
  entry: ['./src/index.ts'],
  unbundle: true,
  format: ['esm'],
  fixedExtension: false,
  dts: true,
  clean: true,
  exports: false,
})
