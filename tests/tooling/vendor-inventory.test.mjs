import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { vendorInventory } from '../../scripts/lib/vendor-inventory.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const inventory = await vendorInventory(root)
const source = 'packages/components/src/'

for (const family of [
  'kobalte',
  'virtual',
  'calendar',
  'matching',
  'charts',
  'icons',
  'dnd',
]) {
  test(`${family}: source and distributed artifacts retain identical provenance`, () => {
    const artifact = inventory.artifacts.find(
      (entry) => entry.family === family && entry.kind !== 'license',
    )
    assert.ok(artifact)
    const original = inventory.classify(resolve(root, artifact.path))
    assert.equal(original.origin, family)
    assert.equal(original.artifact, artifact)
    for (const mode of ['source', 'client', 'server']) {
      const built = artifact.path
        .replace('/src/', `/dist/${mode}/`)
        .replace(
          /\.tsx?$/,
          mode === 'source' && artifact.path.endsWith('.tsx') ? '.jsx' : '.js',
        )
      assert.equal(
        inventory.classify(resolve(root, built) + '?v=review').artifact,
        artifact,
      )
    }
    assert.equal(
      inventory.classify(resolve(root, artifact.path).replaceAll('/', '\\'))
        .artifact,
      artifact,
    )
  })
}

test('all captured raw manifests remain intact, including their repair and license evidence', async () => {
  const directories = {
    kobalte: 'kobalte',
    virtual: 'virtual-core',
    calendar: 'corvu-calendar',
    matching: 'match-sorter',
    charts: 'charts',
    icons: 'icons',
    dnd: 'dnd-kit',
  }
  for (const [family, directory] of Object.entries(directories)) {
    const raw = JSON.parse(
      await readFile(
        resolve(root, `${source}vendor/${directory}/provenance.json`),
        'utf8',
      ),
    )
    assert.deepEqual(inventory.origins[family], raw)
    assert.ok(
      inventory.artifacts.some(
        (entry) => entry.family === family && entry.kind === 'license',
      ),
    )
  }
})

test('generated icon definitions reference all original SVGs and the exact generator, not a fictional source file', () => {
  const artifact = inventory.classify(`${source}icons/index.ts`).artifact
  assert.equal(artifact.kind, 'generated')
  assert.equal(artifact.localSha256, inventory.origins.icons.generatedSha256)
  assert.equal(
    artifact.generator.sha256,
    inventory.origins.icons.generatorSha256,
  )
  assert.deepEqual(
    Object.fromEntries(
      artifact.originals.map((entry) => [entry.key, entry.sha256]),
    ),
    inventory.origins.icons.icons,
  )
  assert.ok(artifact.originals.every((entry) => entry.path === undefined))
  assert.equal(
    inventory.classify(`${source}components/Icon.tsx`).origin,
    'components',
  )
})

test('extracted calendar source and secondary matching origin retain their distinct identity', () => {
  const calendar = inventory.classify(
    `${source}vendor/corvu-calendar/navigation.ts`,
  ).artifact
  assert.equal(calendar.kind, 'extracted')
  assert.equal(
    calendar.originals[0].path,
    inventory.origins.calendar.sources['navigation.ts'].upstreamPath,
  )
  const accents = inventory.classify(
    `${source}vendor/match-sorter/remove-accents.ts`,
  ).artifact
  assert.equal(accents.originals[0].originMember, 'accentDependency')
  assert.equal(
    accents.originals[0].sha256,
    inventory.origins.matching.sources['remove-accents.ts'].upstreamSha256,
  )
})

test('unknown vendor modules fail closed in source and built paths; similarly named owned and external paths do not', () => {
  for (const path of [
    'vendor/unrecorded/index.ts',
    'vendor/virtual-core/new.ts',
    'vendor/unknown/node_modules/hidden.ts',
  ]) {
    assert.throws(
      () => inventory.classify(source + path),
      /Unregistered vendor artifact/,
    )
    assert.throws(
      () =>
        inventory.classify(
          `packages/components/dist/source/${path.replace('.ts', '.js')}`,
        ),
      /Unregistered vendor artifact/,
    )
  }
  assert.equal(
    inventory.classify(`${source}vendor-like.ts`).origin,
    'components',
  )
  assert.equal(
    inventory.classify(`${root}node_modules/solid-js/dist/solid.js`).origin,
    'external',
  )
  assert.equal(inventory.classify('\0virtual:components').kind, 'virtual')
  assert.equal(
    inventory.classify('examples/components/main.tsx').origin,
    'application',
  )
})
