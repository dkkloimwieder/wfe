import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { vendorInventory } from './vendor-inventory.mjs'

import {
  hashBytes as hash,
  exactFiles,
  collectLiteralImports,
  resolveRelativeImport,
} from './vendor-guards.mjs'
export { exactFiles } from './vendor-guards.mjs'
const source = 'packages/components/src'
export async function checkVendorIntegrity(root) {
  const inventory = await vendorInventory(root)
  assert.deepEqual(
    Object.keys(inventory.origins.virtual.localSha256).sort(),
    Object.keys(inventory.origins.virtual.upstreamSha256).sort(),
    'Virtual original/local maps must have the same entries',
  )
  const expected = inventory.artifacts
    .filter((item) => item.kind !== 'generated')
    .map((item) => item.path.slice(`${source}/vendor/`.length))
  for (const directory of [
    'kobalte',
    'virtual-core',
    'corvu-calendar',
    'match-sorter',
    'charts',
    'icons',
    'dnd-kit',
  ])
    expected.push(`${directory}/provenance.json`, `${directory}/README.md`)
  expected.push('icons/upstream.json', 'dnd-kit/repairs.patch')
  await exactFiles(resolve(root, source, 'vendor'), expected)
  const packageJson = JSON.parse(
    await readFile(resolve(root, 'packages/components/package.json'), 'utf8'),
  )
  assert.deepEqual(
    inventory.origins.dnd.externalDependencies,
    { '@preact/signals-core': '1.10.0' },
    'DnD external dependency boundary',
  )
  assert.deepEqual(
    inventory.origins.dnd.externalImports,
    ['@preact/signals-core'],
    'DnD external import boundary',
  )
  assert.equal(
    packageJson.dependencies?.['@preact/signals-core'],
    '1.10.0',
    'DnD signal dependency pin',
  )
  assert.match(
    inventory.origins.dnd.repairSha256,
    /^[a-f0-9]{64}$/,
    'DnD repair hash',
  )
  assert.equal(
    hash(await readFile(resolve(root, source, 'vendor/dnd-kit/repairs.patch'))),
    inventory.origins.dnd.repairSha256,
    'DnD repair bytes',
  )
  const external = new Set([
    ...Object.keys(packageJson.dependencies),
    ...Object.keys(packageJson.peerDependencies),
  ])
  const names = new Set(
    inventory.artifacts
      .filter((item) => item.kind !== 'generated')
      .map((item) => item.path),
  )
  for (const item of inventory.artifacts) {
    const bytes = await readFile(resolve(root, item.path))
    assert.equal(
      hash(bytes),
      item.localSha256,
      `Vendor local hash: ${item.path}`,
    )
    if (item.kind === 'license')
      assert.equal(
        item.localSha256,
        item.originals[0].sha256,
        `Unchanged license: ${item.path}`,
      )
    if (!/\.tsx?$/.test(item.path) || item.kind === 'generated') continue
    const imports = collectLiteralImports(bytes.toString(), item.path)
    for (const imported of imports) {
      if (imported.startsWith('.')) {
        const found = await resolveRelativeImport(
          resolve(root, item.path),
          imported,
          { extensions: ['.ts', '.tsx'], boundary: resolve(root, source) },
        )
        const local = relative(root, found).replaceAll('\\', '/')
        if (item.family === 'kobalte')
          assert.ok(
            local.startsWith(source + '/'),
            `Kobalte import leaves owned source: ${local}`,
          )
        else
          assert.ok(
            names.has(local) &&
              inventory.classify(local).origin === item.family,
            `Import leaves captured subset: ${item.path}: ${imported}`,
          )
      } else {
        const allowed =
          item.family === 'kobalte'
            ? external
            : item.family === 'charts'
              ? new Set(['d3-scale', 'd3-shape'])
              : item.family === 'dnd'
                ? new Set(['@preact/signals-core'])
                : new Set()
        assert.ok(
          allowed.has(imported) && !imported.startsWith('@kobalte/'),
          `Unexpected external vendor import: ${item.path}: ${imported}`,
        )
      }
    }
  }
  return { artifacts: inventory.artifacts.length }
}
