#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const vendor = fileURLToPath(
  new URL('../packages/components/src/vendor/charts/', import.meta.url),
)
const [sourceArg, outputArg] = process.argv.slice(2)
assert.ok(
  sourceArg && outputArg,
  'Usage: node scripts/capture-charts.mjs <release source> <empty output directory>',
)
const source = resolve(sourceArg)
const output = resolve(outputArg)
await mkdir(output, { recursive: true })
assert.equal(
  (await readdir(output)).length,
  0,
  'Output directory must be empty',
)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const manifest = JSON.parse(
  await readFile(resolve(vendor, 'provenance.json'), 'utf8'),
)
const repairs = await readFile(resolve(vendor, 'repairs.patch'))
assert.equal(hash(repairs), manifest.repairSha256, 'Repair patch hash')
assert.equal(
  hash(await readFile(resolve(source, 'LICENSE'))),
  manifest.licenseSha256,
  'Release license hash',
)
for (const [name, entry] of Object.entries(manifest.files)) {
  assert.match(name, /^(charts-core|charts-scales)\/src\/[a-z0-9-]+\.ts$/)
  assert.equal(entry.source, 'packages/' + name)
  const bytes = await readFile(resolve(source, entry.source))
  assert.equal(
    hash(bytes),
    entry.upstreamSha256,
    `Release source hash: ${name}`,
  )
  const target = resolve(output, name)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, bytes)
}
const result = spawnSync('git', ['apply', resolve(vendor, 'repairs.patch')], {
  cwd: output,
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8',
})
assert.equal(result.status, 0, `Apply documented repairs: ${result.stderr}`)
for (const [name, entry] of Object.entries(manifest.files))
  assert.equal(
    hash(await readFile(resolve(output, name))),
    entry.localSha256,
    `Repaired source hash: ${name}`,
  )
for (const name of ['LICENSE', 'README.md', 'provenance.json', 'repairs.patch'])
  await copyFile(resolve(vendor, name), resolve(output, name))
console.log(
  `Reproduced ${Object.keys(manifest.files).length} chart files at ${manifest.revision}`,
)
