import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { checkCharts } from '../../scripts/check-charts.mjs'

const source = new URL(
  '../../packages/components/src/vendor/charts/',
  import.meta.url,
)
test('chart capture verifies imports, file closure and explicit local repairs', async () => {
  assert.equal(await checkCharts(source), 74)
  const temporary = await mkdtemp(join(tmpdir(), 'wfe-chart-integrity-'))
  const root = pathToFileURL(temporary + '/')
  try {
    await cp(source, temporary, { recursive: true })
    const path = 'charts-core/src/line.ts'
    const original = await readFile(new URL(path, root), 'utf8')
    const manifest = JSON.parse(
      await readFile(new URL('provenance.json', root), 'utf8'),
    )
    async function edit(code) {
      await writeFile(new URL(path, root), code)
      manifest.files[path].localSha256 = createHash('sha256')
        .update(code)
        .digest('hex')
      await writeFile(
        new URL('provenance.json', root),
        JSON.stringify(manifest),
      )
    }
    await edit(original + "\nimport 'unapproved-chart-library'\n")
    await assert.rejects(checkCharts(root))
    await edit(original + "\nexport * from '../../outside'\n")
    await assert.rejects(checkCharts(root), /leaves captured source/)
    await edit(original)
    delete manifest.files[path].repair
    await writeFile(new URL('provenance.json', root), JSON.stringify(manifest))
    await assert.rejects(checkCharts(root))
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})
