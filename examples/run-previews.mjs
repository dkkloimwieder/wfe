import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

const output = process.env.BENCH_OUTPUT ?? 'test-results/previews.json'
const report = { cases: [], errors: [], warnings: [], failedResponses: [] }
const previews = []
let browser
try {
  browser = await chromium.launch({
    executablePath: process.env.BENCH_EXECUTABLE_PATH,
  })
  for (const [fixture, ready, query] of [
    ['components', 'consumerFixture', '?consumer=1'],
    ['analytics', 'analyticsFixture', ''],
    ['table-read-only', 'readOnlyFixture', ''],
    ['table-editing', 'editingFixture', ''],
  ]) {
    const server = await createServer({
      configFile: fileURLToPath(
        new URL(`./${fixture}/vite.config.ts`, import.meta.url),
      ),
      optimizeDeps: { force: true },
      server: { host: '127.0.0.1', port: 0, strictPort: true },
    })
    previews.push({ server, fixture, ready, query })
    assert.equal(
      new Set(previews.map(({ server }) => server.config.cacheDir)).size,
      previews.length,
      'Review examples must use separate dependency caches',
    )
    await server.listen()
    const preview = previews.at(-1)
    preview.url = `http://127.0.0.1:${server.httpServer.address().port}/${query}`
    preview.page = await browser.newPage()
    preview.page.on('pageerror', (error) => report.errors.push(error.stack))
    preview.page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type()))
        report.warnings.push(message.text())
    })
    preview.page.on('response', (response) => {
      if (response.status() >= 400)
        report.failedResponses.push({
          url: response.url(),
          status: response.status(),
        })
    })
    // Warm each example serially, then reload all earlier examples.
    for (const active of previews) {
      await active.page.goto(active.url)
      await active.page.waitForFunction(
        (ready) => Boolean(window[ready]),
        active.ready,
      )
      if (active.fixture === 'components') {
        await active.page
          .getByRole('textbox', { name: 'Display name', exact: true })
          .fill('Preview record')
        assert.equal(
          (await active.page.evaluate(() => window.consumerFixture.read()))
            .name,
          'Preview record',
        )
      } else if (active.fixture === 'analytics') {
        await active.page.locator('tr[data-row]').first().waitFor()
      } else if (active.fixture === 'table-read-only') {
        await active.page
          .getByRole('button', { name: 'Sort by Amount', exact: true })
          .click()
        assert.deepEqual(
          await active.page
            .locator('tr[data-row]')
            .evaluateAll((rows) => rows.map((row) => row.dataset.row)),
          ['b', 'c', 'a'],
        )
      } else {
        assert.ok(
          (await active.page.getByRole('button', { name: /^Edit / }).count()) >
            0,
        )
      }
      report.cases.push(
        `${active.fixture} works with ${previews.length} active previews`,
      )
    }
  }
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
  assert.deepEqual(report.failedResponses, [])
} catch (error) {
  report.failure = error.stack
  process.exitCode = 1
} finally {
  await browser?.close()
  for (const { server } of previews.reverse()) await server.close()
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
