import { cp, mkdir, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'tsdown'
import solid from '@solidjs/vite-plugin'

async function copyAssets(outDir: string) {
  await cp('src/styles', resolve(outDir, 'styles'), {
    recursive: true,
    filter: (path) => !/\.tsx?$/.test(path),
  })
  for (const file of await readdir('src/vendor', { recursive: true })) {
    if (!/\/LICENSE[^/]*$/.test(file)) continue
    const destination = resolve(outDir, 'vendor', file)
    await mkdir(dirname(destination), { recursive: true })
    await cp(resolve('src/vendor', file), destination)
  }
}

const shared = {
  entry: [
    './src/chart/index.ts',
    './src/icons/index.ts',
    './src/search/index.ts',
    './src/theme/index.ts',
    './src/components/FileInput.tsx',
    './src/components/Resizable.tsx',
    './src/components/Accordion.tsx',
    './src/components/AlertDialog.tsx',
    './src/components/Checkbox.tsx',
    './src/components/Combobox.tsx',
    './src/components/Collapsible.tsx',
    './src/components/Dialog.tsx',
    './src/components/Display.tsx',
    './src/components/DropdownMenu.tsx',
    './src/components/NativeFields.tsx',
    './src/components/NumberInput.tsx',
    './src/components/Popover.tsx',
    './src/components/RadioGroup.tsx',
    './src/components/Select.tsx',
    './src/components/Sheet.tsx',
    './src/components/Switch.tsx',
    './src/components/Toast.tsx',
    './src/components/Tooltip.tsx',
    './src/components/Tabs.tsx',
    './src/components/Breadcrumbs.tsx',
    './src/index.ts',
    './src/layout/index.ts',
    './src/styles/density.ts',
    './src/table/index.ts',
    './src/utils/nativeEvents.ts',
    './src/virtual/index.ts',
  ],
  format: ['esm'] as const,
  unbundle: true,
  sourcemap: false,
  clean: false,
  minify: false,
  fixedExtension: false,
  exports: false,
}

export default defineConfig([
  // tsdown cleans once before any config writes; only the client owns cleanup.
  {
    ...shared,
    plugins: [solid()],
    outDir: 'dist',
    clean: true,
    dts: true,
    hooks: { 'build:done': () => copyAssets('dist') },
  },
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
    hooks: { 'build:done': () => copyAssets('dist/server') },
  },
])
