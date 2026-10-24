import assert from 'node:assert/strict'
import {
  hashBytes,
  exactFiles,
  collectLiteralImports,
  resolveRelativeImport,
} from './lib/vendor-guards.mjs'
import { readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export async function checkCharts(root) {
  const manifest = JSON.parse(
    await readFile(new URL('provenance.json', root), 'utf8'),
  )
  assert.equal(manifest.version, '1.1.0')
  assert.equal(manifest.revision, '57774e14a1a86081eddb3a23523724a40da05640')
  assert.equal(manifest.license, 'MIT')
  assert.equal(
    hashBytes(await readFile(new URL('LICENSE', root))),
    manifest.licenseSha256,
  )
  const names = new Set(Object.keys(manifest.files))
  const imports = new Map()
  const external = new Set()
  await exactFiles(root, [...names, 'README.md', 'provenance.json', 'LICENSE'])
  const allowedPaths = new Set(
    [...names].map((name) => fileURLToPath(new URL(name, root))),
  )
  for (const [name, item] of Object.entries(manifest.files)) {
    assert.match(item.upstreamSha256, /^[a-f0-9]{64}$/)
    assert.equal(item.source, 'packages/' + name)
    const bytes = await readFile(new URL(name, root))
    assert.equal(
      hashBytes(bytes),
      item.localSha256,
      `Chart source differs: ${name}`,
    )
    if (item.localSha256 !== item.upstreamSha256) {
      assert.ok(
        ['strict-types', 'runtime-theme', 'portal-mount'].includes(item.repair),
      )
      assert.ok(
        manifest.repairs[name]?.length > 40,
        `Undocumented chart repair: ${name}`,
      )
    }
    const targets = []
    for (const value of collectLiteralImports(bytes.toString(), name)) {
      if (value.startsWith('.')) {
        let target
        try {
          target = await resolveRelativeImport(new URL(name, root), value, {
            extensions: ['.ts'],
            boundary: root,
            allowedPaths,
          })
        } catch (error) {
          throw new Error(
            `Chart import leaves captured source: ${name}: ${value}`,
            { cause: error },
          )
        }
        targets.push(
          relative(fileURLToPath(root), target).replaceAll('\\', '/'),
        )
      } else external.add(value)
    }
    imports.set(name, targets)
  }
  assert.deepEqual([...external].sort(), ['d3-scale', 'd3-shape'])
  assert.deepEqual(manifest.externalImports, [...external].sort())
  const reached = new Set()
  function reach(name) {
    assert.ok(names.has(name), `Missing chart entrypoint: ${name}`)
    if (reached.has(name)) return
    reached.add(name)
    imports.get(name).forEach(reach)
  }
  for (const entry of manifest.entrypoints) reach(`charts-core/src/${entry}.ts`)
  assert.equal(
    reached.size,
    names.size,
    'Chart capture contains unreachable source',
  )
  return names.size
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const count = await checkCharts(
    new URL('../packages/components/src/vendor/charts/', import.meta.url),
  )
  console.log(
    `Checked ${count} owned chart files, import closure, repairs and MIT license`,
  )
}
