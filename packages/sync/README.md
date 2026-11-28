# Sync

`@wfe/sync` supplies change-feed collections, Solid read adapters, and a durable queue for writes. Import `precache` separately from `@wfe/sync/worker`. Applications own feed transport, authorization, persistence policy, and service worker registration choices.

Read the [Sync guide](../../docs/sync.md) for collection, outbox, and worker behavior. Use the [Sync example](../../examples/README.md#sync) for a mock feed.

## Worker recipe

Use this Vite recipe to write the application asset list into the worker entry.

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

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

export default defineConfig({
  plugins: [precacheManifest(path('index.html'), path('sw.ts'))],
})
```

```ts
// sw.ts
import { precache } from '@wfe/sync/worker'
declare const __PRECACHE_MANIFEST__: string[]
precache(__PRECACHE_MANIFEST__)
```

Call `shell({ workerUrl: import.meta.env.BASE_URL + 'sw.js' })` from the page. The Vite base provides the worker URL on deep routes.
