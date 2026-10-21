import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(
  new URL(
    process.env.BENCH_DEVELOPMENT
      ? '.dist-dev/'
      : process.env.BENCH_DISTRIBUTION
        ? '.dist-package/'
        : '.dist/',
    import.meta.url,
  ),
)
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    const name = path === '/' ? 'index.html' : path.slice(1)
    response.setHeader(
      'Content-Type',
      name.endsWith('.js')
        ? 'text/javascript'
        : name.endsWith('.css')
          ? 'text/css'
          : 'text/html',
    )
    response.end(await readFile(root + name))
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.waitForFunction(() => window.styleFixture)
  assert.equal(
    await page.evaluate(
      () =>
        JSON.stringify(window.styleFixture.baseline) ===
        JSON.stringify(window.styleFixture.outside()),
    ),
    true,
    'unrelated content retains its styles',
  )
  await page.evaluate(() =>
    window.styleFixture.configure('light', 'compact', 'dark'),
  )
  await page.locator('#light-button').focus()
  await expect(page.locator('#light-button')).toBeFocused()
  assert.equal(
    await page.evaluate(
      () =>
        JSON.stringify(window.styleFixture.baseline) ===
        JSON.stringify(window.styleFixture.outside()),
    ),
    true,
  )
  for (const id of ['light', 'dark', 'comfortable']) {
    const search = page.locator(`#${id}-search`)
    const clear = page.locator(`#${id}-clear`)
    const group = page.locator(`#${id} .filter-input`)
    await search.focus()
    await expect(search).toBeFocused()
    const bounds = await group.boundingBox()
    const clearBounds = await clear.boundingBox()
    assert.ok(bounds.x + bounds.width >= clearBounds.x + clearBounds.width)
    await clear.focus()
    await expect(clear).toBeFocused()
    const select = page.locator(`#${id}-select`)
    const enhanced = await select.evaluate(
      (node) => getComputedStyle(node).appearance === 'base-select',
    )
    await select.focus()
    await page.keyboard.press('ArrowDown')
    if (enhanced) {
      assert.equal(await select.evaluate((node) => node.matches(':open')), true)
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      assert.equal(
        await select.evaluate((node) => node.matches(':open')),
        false,
      )
    }
    assert.equal(await select.inputValue(), 'second')
    const list = page.locator(`#${id}-listbox`)
    assert.equal(
      await list.evaluate((node) => getComputedStyle(node).appearance),
      'auto',
    )
  }
  await page.emulateMedia({ forcedColors: 'active' })
  assert.equal(
    await page
      .locator('#light-select')
      .evaluate((node) => getComputedStyle(node).appearance),
    'auto',
  )

  await page.emulateMedia({ forcedColors: 'none' })
  assert.deepEqual(errors, [])
  console.log(
    'PASS style isolation, field focus, native select interaction, and forced-color fallback',
  )
} finally {
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
