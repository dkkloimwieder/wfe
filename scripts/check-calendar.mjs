import assert from 'node:assert/strict'
import { hashBytes, exactFiles } from './lib/vendor-guards.mjs'
import { readFileSync } from 'node:fs'
const root = new URL(
  '../packages/components/src/vendor/corvu-calendar/',
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
  const hash = hashBytes(readFileSync(new URL(name, root)))
  assert.equal(hash, source.localSha256, name)
  assert.match(source.upstreamSha256, /^[a-f0-9]{64}$/)
  if (name === 'LICENSE') assert.equal(hash, source.upstreamSha256)
}
console.log('Checked calendar source inventory, license, and hashes')
