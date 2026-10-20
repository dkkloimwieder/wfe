import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadConfigFromFile } from 'vite'

test('preview optimization retains runtime packages without resolving declaration packages', async () => {
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    fileURLToPath(
      new URL('../../examples/shell/vite.config.ts', import.meta.url),
    ),
  )
  assert.ok(loaded)
  const configuration = loaded.config
  const included = configuration.optimizeDeps.include
  assert.ok(included.includes('@wfe/components > d3-scale'))
  assert.ok(included.includes('@wfe/components > d3-shape'))
  assert.ok(included.includes('solid-js'))
  assert.ok(included.includes('@solidjs/web'))
  assert.ok(included.includes('zod'))
  assert.ok(!included.some((name) => /(?:^| > )@types\//.test(name)))
  const manifest = JSON.parse(
    readFileSync(
      new URL('../../packages/components/package.json', import.meta.url),
      'utf8',
    ),
  )
  assert.ok(
    manifest.dependencies['@types/d3-scale'],
    'Public declarations still require the D3 types',
  )
})
