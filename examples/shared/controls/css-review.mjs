import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { cssInputs, hashCss } from '../../../scripts/css-provenance.mjs'

export async function reviewCssProvenance(page, url) {
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const directory = `packages/components/${process.env.BENCH_DISTRIBUTION ? 'dist/source' : 'src'}/styles`
  const mode = process.env.BENCH_DISTRIBUTION ? 'distribution' : 'source'
  const response = await page.request.get(
    new URL('css-provenance.json', url).href,
  )
  assert.equal(response.status(), 200)
  const manifest = await response.json()
  assert.equal(manifest.mode, mode)
  assert.equal(manifest.entry, `${directory}/styles.css`)
  const current = cssInputs(root, directory)
  assert.equal(manifest.inputs.length, current.size)
  for (const { file, sha256 } of manifest.inputs) {
    assert.equal(
      current.get(resolve(root, file)),
      sha256,
      `Stale fixture CSS: ${file}. Rebuild the fixture.`,
    )
    assert.equal(
      hashCss(
        await readFile(
          new URL(
            `../../../packages/components/src/styles/${file.split('/styles/')[1]}`,
            import.meta.url,
          ),
        ),
      ),
      sha256,
      `Stale package CSS: ${file}. Build components and the fixture.`,
    )
  }
  if (manifest.live) {
    const inline = await page
      .locator('style[data-vite-dev-id]')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          id: node.dataset.viteDevId,
          text: node.textContent.trim(),
        })),
      )
    for (const sheet of manifest.stylesheets) {
      const loaded = inline.find((node) => node.id.endsWith(`/${sheet.file}`))
      assert.ok(loaded, `Missing live stylesheet: ${sheet.file}`)
      assert.equal(
        hashCss(loaded.text),
        sheet.sha256,
        `Stale live stylesheet: ${sheet.file}`,
      )
    }
    assert.ok(manifest.stylesheets.length)
    return manifest
  }
  const loaded = await page
    .locator('link[rel=stylesheet]')
    .evaluateAll((nodes) =>
      nodes.map((node) => new URL(node.href).pathname.slice(1)),
    )
  for (const asset of manifest.assets) {
    assert.ok(
      loaded.includes(asset.file),
      `CSS asset is not attached: ${asset.file}`,
    )
    const assetResponse = await page.request.get(new URL(asset.file, url).href)
    assert.equal(assetResponse.status(), 200)
    assert.equal(
      hashCss(await assetResponse.body()),
      asset.sha256,
      `Wrong served CSS: ${asset.file}`,
    )
  }
  return manifest
}
