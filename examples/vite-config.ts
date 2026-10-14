import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'
import type { PluginOption } from 'vite'

const dependencies = Object.keys(
  JSON.parse(
    readFileSync(
      new URL('../packages/components/package.json', import.meta.url),
      'utf8',
    ),
  ).dependencies,
)

export function exampleConfig(url: string, extra: PluginOption[] = []) {
  return defineConfig({
    root: fileURLToPath(new URL('.', url)),
    plugins: [
      ...extra,
      solid({
        performanceTracks: process.env.BENCH_TRACE
          ? { minMs: 1, rich: false }
          : false,
      }),
      {
        name: 'example-module-inventory',
        generateBundle(_options, bundle) {
          this.emitFile({
            type: 'asset',
            fileName: 'modules.json',
            source: JSON.stringify(
              Object.values(bundle).flatMap((item) =>
                item.type === 'chunk' ? Object.keys(item.modules) : [],
              ),
              null,
              2,
            ),
          })
        },
      },
    ],
    optimizeDeps: {
      include: [
        'solid-js',
        '@solidjs/web',
        'zod',
        ...dependencies.map((name) => `@wfe/components > ${name}`),
      ],
    },
    resolve: {
      conditions: process.env.BENCH_DISTRIBUTION
        ? ['module', 'browser', 'development|production']
        : ['wfe-source', 'module', 'browser', 'development|production'],
      dedupe: ['solid-js', '@solidjs/web', '@solidjs/signals'],
    },
    server: { fs: { allow: [fileURLToPath(new URL('../', import.meta.url))] } },
    build: {
      outDir: process.env.BENCH_DEVELOPMENT
        ? '.dist-dev'
        : process.env.BENCH_DISTRIBUTION
          ? '.dist-package'
          : '.dist',
      target: 'esnext',
      minify: process.env.BENCH_PROFILE ? false : undefined,
      sourcemap: Boolean(process.env.BENCH_PROFILE),
    },
  })
}
