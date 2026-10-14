import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
const inventory = JSON.parse(
  await readFile(
    new URL('../migration/inventory.json', import.meta.url),
    'utf8',
  ),
)
test('migration records unique safe destinations and immutable source hashes', () => {
  assert.match(inventory.commit, /^[a-f0-9]{40}$/)
  assert.ok(inventory.entries.length > 300)
  assert.equal(
    new Set(inventory.entries.map((entry) => entry.source)).size,
    inventory.entries.length,
  )
  assert.equal(
    new Set(inventory.entries.map((entry) => entry.destination)).size,
    inventory.entries.length,
  )
  for (const entry of inventory.entries) {
    assert.match(entry.sourceSha256, /^[a-f0-9]{64}$/)
    assert.ok(
      !entry.destination.startsWith('/') &&
        !entry.destination.split('/').includes('..'),
    )
    assert.ok(
      !entry.destination.includes('solid-ui') &&
        !entry.destination.includes('solid-table'),
    )
  }
})
test('native engine, vendor licenses, and external scroll repair have destinations', () => {
  assert.equal(
    inventory.entries.filter((entry) => entry.kind === 'table-engine').length,
    9,
  )
  const destination = new Set(
    inventory.entries.map((entry) => entry.destination),
  )
  for (const path of [
    'packages/components/src/vendor/kobalte/LICENSE.md',
    'packages/components/src/vendor/kobalte/core/LICENSE.md',
    'packages/components/src/vendor/kobalte/utils/LICENSE.md',
    'packages/components/src/vendor/virtual-core/LICENSE',
    'patches/solid-primitives-scroll-3.0.0-next.4.patch',
  ])
    assert.ok(destination.has(path), path)
})

test('old event aliases and generated WAMN inputs have explicit migration policies', () => {
  assert.equal(
    inventory.importReplacements[
      'examples/solid/virtualized-rows/src/nativeEvents.ts'
    ],
    '@wfe/components/events',
  )
  assert.equal(
    inventory.optionalGeneratedInputs.destination,
    'examples/wamn/.input',
  )
})
