import assert from 'node:assert/strict'
import { hashBytes } from './lib/vendor-guards.mjs'
import { readFile } from 'node:fs/promises'

const root = new URL(
  '../packages/components/src/vendor/virtual-core/',
  import.meta.url,
)
const provenance = JSON.parse(
  await readFile(new URL('provenance.json', root), 'utf8'),
)
assert.equal(provenance.package, '@tanstack/virtual-core')
assert.equal(provenance.version, '3.17.11')
assert.equal(provenance.license, 'MIT')
for (const name of [
  'index.ts',
  'utils.ts',
  'lazy-measurements.ts',
  'LICENSE',
]) {
  assert.match(provenance.upstreamSha256[name], /^[a-f0-9]{64}$/)
  const bytes = await readFile(new URL(name, root))
  const actual = hashBytes(bytes)
  assert.equal(
    actual,
    provenance.localSha256[name],
    `Owned virtual source differs: ${name}`,
  )
  if (name === 'LICENSE') assert.equal(actual, provenance.upstreamSha256[name])
}
console.log('Checked owned virtual engine source and unchanged MIT license')
