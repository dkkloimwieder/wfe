import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname } from 'node:path'
import { loadavg } from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const directory = process.env.BENCH_DEVELOPMENT
  ? '.dist-dev'
  : process.env.BENCH_DISTRIBUTION
    ? '.dist-package'
    : '.dist'
const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
const output = process.env.BENCH_OUTPUT ?? '/tmp/dashboard-browser.json'
const report = {
  directory,
  hostLoad: loadavg(),
  cases: [],
  errors: [],
  warnings: [],
  diagnostics: [],
}
const modules = JSON.parse(await readFile(assets + 'modules.json', 'utf8'))
assert.ok(
  modules.some((id) =>
    id.includes(
      process.env.BENCH_DISTRIBUTION
        ? '/components/dist/source/table/Table.jsx'
        : '/components/src/table/Table.tsx',
    ),
  ),
  'fixture uses shared UI Table source',
)
assert.ok(
  !modules.some(
    (id) =>
      id.includes('/solid-table/bench/table/') &&
      /\/(Table[^/]*|ReadOnlyTable)\.tsx$/.test(id),
  ),
  'fixture has no duplicate Table source',
)
assert.ok(
  !modules.some((path) =>
    /table-core|@tanstack\/store|virtual-core|zod\/|createEditing|solid-form|node_modules\/@kobalte\//.test(
      path,
    ),
  ),
)
report.moduleAudit = true
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    if (path === '/favicon.ico') return void response.writeHead(204).end()
    response.setHeader(
      'Content-Type',
      path.endsWith('.js')
        ? 'text/javascript'
        : path.endsWith('.css')
          ? 'text/css'
          : 'text/html',
    )
    response.end(
      await readFile(assets + (path === '/' ? 'index.html' : path.slice(1))),
    )
  } catch {
    response.writeHead(404).end()
  }
})
let browser
try {
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  browser = await chromium.launch({
    executablePath: process.env.BENCH_EXECUTABLE_PATH,
  })
  report.browser = browser.version()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('pageerror', (error) => report.errors.push(error.stack))
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type()))
      report.warnings.push(message.text())
  })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.waitForFunction(() => Boolean(window.dashboardFixture))
  const rows = () =>
    page
      .locator('tr[data-row]')
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.row))
  async function test(name, run) {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.evaluate(() => window.dashboardFixture.start())
    await run()
    report.cases.push({ name, status: 'passed' })
    console.log(`PASS ${name}`)
  }
  await test('Real Table composition preserves result geometry', async () => {
    const bounds = () => page.locator('.table-scroll').boundingBox()
    const initial = await bounds()
    assert.ok(initial.height > 300)
    for (const [button, count] of [
      ['Empty results', 0],
      ['500 records', 500],
      ['Two records', 2],
    ]) {
      await page.getByRole('button', { name: button, exact: true }).click()
      assert.equal((await rows()).length, count)
      const box = await bounds()
      assert.equal(box.height, initial.height)
      assert.equal(box.y, initial.y)
      if (count === 500) {
        assert.equal(
          await page
            .locator('.table-scroll')
            .evaluate((node) => node.scrollHeight > node.clientHeight),
          true,
        )
        await page.locator('tr[data-row="record-500"]').scrollIntoViewIfNeeded()
        assert.equal(
          await page.locator('tr[data-row="record-500"]').isVisible(),
          true,
        )
      }
    }
    assert.equal(
      await page.getByRole('main', { name: 'Records workspace' }).count(),
      1,
    )
    assert.equal(
      await page
        .getByRole('navigation', { name: 'Primary navigation' })
        .count(),
      1,
    )
  })
  await test('Application form validates and saves through shared controls', async () => {
    await page.getByRole('button', { name: 'Save record', exact: true }).click()
    assert.equal(
      await page
        .getByLabel('Record name', { exact: true })
        .getAttribute('aria-invalid'),
      'true',
    )
    assert.equal((await rows()).length, 2)
    await page.getByLabel('Record name', { exact: true }).fill('New shelf')
    await page.getByLabel('Region', { exact: true }).selectOption('East')
    await page.getByText('Active record', { exact: true }).click()
    await page.getByRole('button', { name: 'Save record', exact: true }).click()
    assert.equal((await rows()).length, 3)
    assert.equal(
      await page.locator('#application-status').textContent(),
      'Saved New shelf.',
    )
    assert.match(
      await page.locator('tr[data-row="created-1"]').textContent(),
      /New shelfEastNo/,
    )
    assert.equal(
      await page.getByLabel('Record name', { exact: true }).inputValue(),
      '',
    )
  })
  await test('Sorting filtering grouping and display controls use the shared Table', async () => {
    await page
      .getByRole('button', { name: 'Sort by Name', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Sort by Name', exact: true })
      .click()
    assert.deepEqual(await rows(), ['record-2', 'record-1'])
    await page
      .getByRole('textbox', { name: 'Filter Region', exact: true })
      .fill('West')
    assert.deepEqual(await rows(), ['record-1'])
    await page
      .getByRole('button', { name: 'Clear Region filter', exact: true })
      .click()
    await page
      .getByRole('combobox', { name: 'Add grouping', exact: true })
      .selectOption('region')
    assert.equal(await page.locator('tr[data-group]').count(), 2)
    await page
      .getByRole('button', { name: 'Clear grouping', exact: true })
      .click()
    await page.getByText('Display columns', { exact: true }).click()
    await page.getByText('Show Active', { exact: true }).click()
    assert.equal(
      await page.locator('thead th[data-column="active"]').count(),
      0,
    )
    await page.getByRole('button', { name: 'Two records', exact: true }).click()
    assert.equal(
      await page.locator('thead th[data-column="active"]').count(),
      0,
    )
  })
  await test('Narrow layout keeps form draft and application navigation', async () => {
    await page.getByLabel('Record name', { exact: true }).fill('Keep draft')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Navigation', exact: true }).click()
    await page.getByRole('button', { name: 'Activity', exact: true }).click()
    assert.equal(
      await page
        .getByRole('button', { name: 'Navigation', exact: true })
        .getAttribute('aria-expanded'),
      'false',
    )
    assert.equal(
      await page.locator('#application-status').textContent(),
      'Activity selected. This example keeps the records view open.',
    )
    assert.equal(
      await page.getByLabel('Record name', { exact: true }).inputValue(),
      'Keep draft',
    )
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    )
    await page
      .getByLabel('Record name', { exact: true })
      .scrollIntoViewIfNeeded()
    assert.equal(
      await page.getByLabel('Record name', { exact: true }).isVisible(),
      true,
    )
    await page.setViewportSize({ width: 1440, height: 1000 })
    assert.equal(
      await page.getByLabel('Record name', { exact: true }).inputValue(),
      'Keep draft',
    )
  })
  await test('Root disposal removes shared controls and stale callbacks', async () => {
    await page.evaluate(() => {
      window.detachedSave = document.querySelector('form')
      window.dashboardFixture.stop()
      window.detachedSave.dispatchEvent(
        new SubmitEvent('submit', { bubbles: true, cancelable: true }),
      )
    })
    assert.equal(await page.locator('#root').textContent(), '')
    await page.evaluate(() => window.dashboardFixture.start())
    assert.equal((await rows()).length, 2)
  })
  report.diagnostics = await page.evaluate(() =>
    window.dashboardFixture.diagnostics(),
  )
  // Host load affects duration, not correctness.
  report.timingDiagnostics = report.diagnostics.filter(
    (event) => event.code === 'HOT_SCOPE_TIME',
  )
  report.diagnostics = report.diagnostics.filter(
    (event) => event.code !== 'HOT_SCOPE_TIME',
  )
  assert.deepEqual(report.diagnostics, [])
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
} catch (error) {
  report.failure = error.stack
  process.exitCode = 1
} finally {
  await browser?.close()
  await new Promise((done) => server.close(done))
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
