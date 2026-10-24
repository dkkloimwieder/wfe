import assert from 'node:assert/strict'
import {
  hashBytes,
  exactFiles,
  collectLiteralImports,
} from './lib/vendor-guards.mjs'
import { readFileSync } from 'node:fs'
const root = new URL(
  '../packages/components/src/vendor/match-sorter/',
  import.meta.url,
)
const manifest = JSON.parse(
  readFileSync(new URL('provenance.json', root), 'utf8'),
)
assert.match(manifest.commit, /^[a-f0-9]{40}$/)
await exactFiles(root, [
  ...Object.keys(manifest.sources),
  'README.md',
  'provenance.json',
])
for (const [name, source] of Object.entries(manifest.sources)) {
  const bytes = readFileSync(new URL(name, root))
  const hash = hashBytes(bytes)
  assert.equal(hash, source.localSha256, name)
  assert.match(source.upstreamSha256, /^[a-f0-9]{64}$/)
  if (name.startsWith('LICENSE')) assert.equal(hash, source.upstreamSha256)
  if (name.endsWith('.ts')) {
    for (const imported of collectLiteralImports(bytes.toString(), name))
      assert.equal(
        imported,
        './remove-accents',
        'matching capture has no external runtime imports',
      )
  }
}
console.log(
  'Checked matching source, accent normalization, licenses and hashes',
)
