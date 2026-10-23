import {
  attachDiagnostics,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  selectGroups,
  startStaticServer,
} from '../shared/browser/runner.mjs'
import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
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
const output = process.env.BENCH_OUTPUT ?? '/tmp/styles-browser.json'
const report = { cases: [], errors: [], warnings: [] }
let server
let browser
let detachDiagnostics
try {
  report.groups = selectGroups({ styles: true })
  server = await startStaticServer({
    assets: root,
    onServerError: (error) => {
      report.serverErrors ??= []
      report.serverErrors.push(error)
    },
  })
  browser = await launchBrowser({ chromium })
  const page = await browser.newPage()
  // Preserve this raw-isolation fixture's existing page-error-only policy.
  detachDiagnostics = attachDiagnostics(page, report, {
    console: () => 'observe',
  })
  const errors = report.errors
  await page.goto(server.url)
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
    const group = page.locator(`#${id} :is(.ui-input-affix, .filter-input)`)
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
  const name =
    'style isolation, field focus, native select interaction, and forced-color fallback'
  report.cases.push(name)
  console.log(`PASS ${name}`)
} catch (error) {
  report.failure = errorText(error)
  report.failureDetails = errorDetails(error)
} finally {
  const failed = await finalizeReport({
    report,
    output,
    cleanup: [
      { name: 'browser', close: () => browser?.close() },
      { name: 'diagnostic listeners', close: () => detachDiagnostics?.() },
      { name: 'static server', close: () => server?.close() },
    ],
  })
  if (failed) process.exitCode = 1
}
