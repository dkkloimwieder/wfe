import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
const root = new URL(
  '../packages/components/src/vendor/corvu-calendar/',
  import.meta.url,
)
const manifest = JSON.parse(
  readFileSync(new URL('provenance.json', root), 'utf8'),
)
assert.match(manifest.commit, /^[a-f0-9]{40}$/)
assert.deepEqual(
  readdirSync(root)
    .filter((name) => !['README.md', 'provenance.json'].includes(name))
    .sort(),
  Object.keys(manifest.sources).sort(),
)
for (const [name, source] of Object.entries(manifest.sources)) {
  const hash = createHash('sha256')
    .update(readFileSync(new URL(name, root)))
    .digest('hex')
  assert.equal(hash, source.localSha256, name)
  assert.match(source.upstreamSha256, /^[a-f0-9]{64}$/)
  if (name === 'LICENSE') assert.equal(hash, source.upstreamSha256)
}
console.log('Checked calendar source inventory, license, and hashes')
