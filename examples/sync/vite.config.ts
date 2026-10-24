import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { exampleConfig } from '../vite-config.ts'

/**
 * Builds the worker entry as sw.js beside index.html and writes the list of
 * built files into it. Both paths are absolute. This is the recipe in
 * packages/sync/README.md.
 */
function precacheManifest(html: string, worker: string): Plugin {
  return {
    name: 'precache-manifest',
    enforce: 'post',
    config: () => ({
      build: {
        rollupOptions: {
          input: { index: html, sw: worker },
          output: {
            entryFileNames: (chunk) =>
              chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
          },
        },
      },
    }),
    generateBundle(_options, bundle) {
      const chunk = bundle['sw.js']
      if (chunk?.type !== 'chunk') throw new Error('sw.js was not built')
      const files = Object.keys(bundle).filter((name) => name !== 'sw.js')
      chunk.code = chunk.code.replace(
        '__PRECACHE_MANIFEST__',
        JSON.stringify(['./', ...files]),
      )
    },
  }
}

const path = (name: string) => fileURLToPath(new URL(name, import.meta.url))

export default exampleConfig(import.meta.url, [
  precacheManifest(path('index.html'), path('sw.ts')),
])
