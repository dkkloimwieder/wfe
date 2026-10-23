import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { layoutBreakpoints } from '../../packages/components/src/internal/containerLayout.ts'

test('SSR viewport fallback thresholds agree with the shared runtime drawer policy', async () => {
  for (const [file, regions] of [
    ['layout.css', ['navigation', 'context']],
    ['table-workspace.css', ['controls']],
  ]) {
    const source = await readFile(
      new URL(`../../packages/components/src/styles/${file}`, import.meta.url),
      'utf8',
    )
    const fallback = [
      ...source.matchAll(/@media \((?:width (?:<|>=)|min-width:) (\d+)rem\)/g),
    ].map((match) => Number(match[1]))
    assert.deepEqual(
      new Set(fallback),
      new Set(regions.map((region) => layoutBreakpoints[region])),
    )
    for (const region of regions)
      assert.ok(source.includes(`[data-${region}-drawer]`))
  }
})
