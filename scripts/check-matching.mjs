import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
const root = new URL(
  '../packages/components/src/vendor/match-sorter/',
  import.meta.url,
)
const manifest = JSON.parse(
  readFileSync(new URL('provenance.json', root), 'utf8'),
)
assert.match(manifest.commit, /^[a-f0-9]{40}$/)
assert.deepEqual(
  readdirSync(root)
    .filter((n) => !['README.md', 'provenance.json'].includes(n))
    .sort(),
  Object.keys(manifest.sources).sort(),
)
for (const [name, source] of Object.entries(manifest.sources)) {
  const bytes = readFileSync(new URL(name, root))
  const hash = createHash('sha256').update(bytes).digest('hex')
  assert.equal(hash, source.localSha256, name)
  assert.match(source.upstreamSha256, /^[a-f0-9]{64}$/)
  if (name.startsWith('LICENSE')) assert.equal(hash, source.upstreamSha256)
  if (name.endsWith('.ts')) {
    for (const match of bytes.toString().matchAll(/\bfrom\s+['"]([^'"]+)['"]/g))
      assert.equal(
        match[1],
        './remove-accents',
        'matching capture has no external runtime imports',
      )
  }
}
console.log(
  'Checked matching source, accent normalization, licenses and hashes',
)
