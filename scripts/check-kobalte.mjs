import assert from 'node:assert/strict'
import {
  hashBytes,
  exactFiles,
  collectLiteralImports,
  resolveRelativeImport,
} from './lib/vendor-guards.mjs'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/components',
)
const vendor = resolve(root, 'src/vendor/kobalte')
const provenance = JSON.parse(
  readFileSync(resolve(vendor, 'provenance.json'), 'utf8'),
)
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const dependencies = new Set([
  ...Object.keys(manifest.dependencies),
  ...Object.keys(manifest.peerDependencies),
])
const paths = Object.keys(provenance.sources).sort()
await exactFiles(vendor, [...paths, 'README.md', 'provenance.json'])
for (const [path, expected] of Object.entries(provenance.sources)) {
  const file = resolve(vendor, path)
  const bytes = readFileSync(file)
  const digest = hashBytes(bytes)
  assert.equal(digest, expected.localSha256, `local source hash: ${path}`)
  assert.match(
    expected.upstreamSha256,
    /^[a-f0-9]{64}$/,
    `upstream hash: ${path}`,
  )
  if (path.endsWith('LICENSE.md'))
    assert.equal(digest, expected.upstreamSha256, `unchanged license: ${path}`)
  if (!/\.tsx?$/.test(path)) continue
  for (const imported of collectLiteralImports(bytes.toString(), path)) {
    if (imported.startsWith('.')) {
      await resolveRelativeImport(file, imported, {
        extensions: ['.ts', '.tsx'],
        boundary: resolve(root, 'src'),
      })
    } else {
      assert.ok(
        dependencies.has(imported),
        `declared external dependency: ${path}: ${imported}`,
      )
      assert.ok(
        !imported.startsWith('@kobalte/'),
        `no installed Kobalte implementation: ${path}`,
      )
    }
  }
}
console.log(
  `Checked ${paths.length} vendor files, licenses, and import ownership`,
)
