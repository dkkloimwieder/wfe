import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname } from 'node:path'
import { loadavg } from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

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
  await page.goto(`http://127.0.0.1:${server.address().port}/?composition=1`)
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
      /New shelfEastfalse/,
    )
    assert.equal(
      await page.getByLabel('Record name', { exact: true }).inputValue(),
      '',
    )
  })
  await test('Boolean filters preserve false and clear to either even with empty results', async () => {
    const filter = page.getByRole('combobox', {
      name: 'Filter Active',
      exact: true,
    })
    const clear = page.getByRole('button', {
      name: 'Clear Active filter',
      exact: true,
    })
    assert.deepEqual(await filter.locator('option').allTextContents(), [
      'Either',
      'True',
      'False',
    ])
    assert.equal(await filter.inputValue(), '')
    assert.equal(
      await filter.evaluate((node) => getComputedStyle(node).textTransform),
      'uppercase',
    )
    await filter.selectOption('true')
    assert.deepEqual(await rows(), ['record-1'])
    assert.equal(
      await page.locator('tr[data-row] td[data-column="active"]').textContent(),
      'true',
    )
    await filter.selectOption('false')
    assert.deepEqual(await rows(), ['record-2'])
    assert.equal(
      await page.locator('tr[data-row] td[data-column="active"]').textContent(),
      'false',
    )
    assert.equal(
      await page.getByText('1 active', { exact: true }).isVisible(),
      true,
    )
    await page.evaluate(() => window.dashboardFixture.replaceRows(0))
    assert.equal(await filter.inputValue(), 'false')
    await page.evaluate(() => window.dashboardFixture.replaceRows(2))
    assert.deepEqual(await rows(), ['record-2'])
    await filter.selectOption('')
    assert.equal((await rows()).length, 2)
    await filter.selectOption('false')
    await clear.click()
    assert.equal(await filter.inputValue(), '')
    assert.equal((await rows()).length, 2)
    await expect(filter).toBeFocused()
    await expect(clear).toBeDisabled()
    assert.equal(
      await page.getByText('0 active', { exact: true }).isVisible(),
      true,
    )
    await page.evaluate(() => window.dashboardFixture.replaceRows(0))
    await filter.selectOption('false')
    await page.evaluate(() => window.dashboardFixture.replaceRows(2))
    assert.deepEqual(await rows(), ['record-2'])
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
  await test('Shared panels and grouping levels have square surfaces and aligned edges', async () => {
    const appearance = await page.evaluate(() => {
      const button = getComputedStyle(
        document.querySelector('button[type="submit"]'),
      )
      const input = getComputedStyle(
        document.querySelector('form input:not([type="checkbox"])'),
      )
      return {
        button: button.backgroundColor,
        input: input.backgroundColor,
        panels: [...document.querySelectorAll('.ui-dashboard-panel')].map(
          (node) => {
            const style = getComputedStyle(node)
            return {
              radius: style.borderRadius,
              padding: [
                style.paddingTop,
                style.paddingRight,
                style.paddingBottom,
                style.paddingLeft,
              ],
            }
          },
        ),
        paragraphs: [
          ...document.querySelectorAll('.ui-dashboard-panel > p'),
        ].map((node) => getComputedStyle(node).marginTop),
      }
    })
    for (const panel of appearance.panels) {
      assert.equal(panel.radius, '0px')
      assert.equal(new Set(panel.padding).size, 1)
    }
    assert.ok(appearance.paragraphs.every((value) => value === '0px'))
    for (const id of ['name', 'region']) {
      await page
        .getByRole('combobox', { name: 'Add grouping', exact: true })
        .selectOption(id)
    }
    for (const width of [1440, 1100, 700, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      if (
        width < 768 &&
        (await page
          .locator('.table-workspace')
          .getAttribute('data-controls-open')) === null
      ) {
        await page
          .getByRole('button', { name: 'Table controls', exact: true })
          .click()
      }
      const filters = await page
        .locator('.column-filters .filter-input')
        .first()
        .boundingBox()
      const search = await page
        .locator('.table-workspace .toolbar .filter-input')
        .boundingBox()
      const add = await page
        .getByRole('combobox', { name: 'Add grouping', exact: true })
        .boundingBox()
      assert.equal(search.x, filters.x)
      assert.equal(search.width, filters.width)
      assert.equal(add.x, filters.x)
      assert.equal(add.width, filters.width)
      const levels = page.locator('.grouping-levels > li')
      const controls = []
      for (const level of await levels.all()) {
        const order = await level.locator('select').boundingBox()
        const actions = await level
          .locator('.grouping-level-actions')
          .boundingBox()
        controls.push({ order, actions })
        const buttons = await level
          .locator('.grouping-level-actions button')
          .all()
        const boxes = await Promise.all(
          buttons.map((button) => button.boundingBox()),
        )
        assert.equal(new Set(boxes.map((box) => box.y)).size, 1)
        assert.ok(boxes[0].x + boxes[0].width < boxes[1].x)
        const bounds = await level.boundingBox()
        for (const box of [order, actions, ...boxes]) {
          assert.ok(box.x >= bounds.x - 1)
          assert.ok(box.x + box.width <= bounds.x + bounds.width + 1)
        }
      }
      assert.equal(controls[0].order.x, controls[1].order.x)
      assert.equal(controls[0].order.width, controls[1].order.width)
      assert.equal(controls[0].actions.x, controls[1].actions.x)
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
    }
  })
  await test('Expanded filters and grouping never consume the results height', async () => {
    await page.setViewportSize({ width: 1440, height: 500 })
    const scroller = page.locator('.table-scroll')
    const before = await scroller.boundingBox()
    assert.ok(before.height > 300)
    for (const id of ['name', 'region', 'active']) {
      await page
        .getByRole('combobox', { name: 'Add grouping', exact: true })
        .selectOption(id)
    }
    await page.getByText('Display columns', { exact: true }).click()
    assert.deepEqual(await scroller.boundingBox(), before)
    const controls = page.getByRole('complementary', {
      name: 'Table controls',
      exact: true,
    })
    assert.equal(
      await controls.evaluate((node) => node.scrollHeight > node.clientHeight),
      true,
    )
    await controls.evaluate((node) => {
      node.scrollTop = node.scrollHeight
    })
    assert.equal(await scroller.evaluate((node) => node.scrollTop), 0)
    assert.deepEqual(await scroller.boundingBox(), before)
    for (const count of [0, 2, 500]) {
      await page.evaluate(
        (count) => window.dashboardFixture.replaceRows(count),
        count,
      )
      assert.deepEqual(await scroller.boundingBox(), before)
    }
    await scroller.evaluate((node) => {
      node.scrollTop = node.scrollHeight
    })
    assert.equal(await controls.evaluate((node) => node.scrollTop > 0), true)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight),
      500,
    )
    await page.setViewportSize({ width: 390, height: 568 })
    const narrow = await scroller.boundingBox()
    assert.ok(narrow.height > 300)
    await page
      .getByRole('button', { name: 'Table controls', exact: true })
      .click()
    assert.deepEqual(await scroller.boundingBox(), narrow)
    await page
      .getByRole('button', { name: 'Close table controls', exact: true })
      .click()
    assert.deepEqual(await scroller.boundingBox(), narrow)
  })
  await test('The controls drawer preserves nodes and state and restores visible keyboard focus', async () => {
    const filter = page.getByRole('textbox', {
      name: 'Filter Region',
      exact: true,
    })
    await filter.fill('West')
    await filter.evaluate((node) => {
      window.savedTableFilter = node
    })
    await page.setViewportSize({ width: 390, height: 844 })
    const toggle = page.getByRole('button', {
      name: 'Table controls',
      exact: true,
    })
    await expect(toggle).toBeFocused()
    await toggle.press('Enter')
    await expect(filter).toBeVisible()
    assert.equal(await filter.inputValue(), 'West')
    assert.equal(
      await filter.evaluate((node) => node === window.savedTableFilter),
      true,
    )
    await page
      .getByRole('button', { name: 'Close table controls', exact: true })
      .focus()
    await page.keyboard.press('Escape')
    await expect(toggle).toBeFocused()
    await expect(filter).toBeHidden()
    await toggle.press('Space')
    await page.locator('.table-scroll').focus()
    await expect(page.locator('.table-scroll')).toBeFocused()
    await expect(filter).toBeHidden()
    await toggle.focus()
    await page.setViewportSize({ width: 1440, height: 1000 })
    await expect(
      page.getByRole('complementary', { name: 'Table controls', exact: true }),
    ).toBeFocused()
    assert.equal(await filter.inputValue(), 'West')
    assert.equal(
      await filter.evaluate((node) => node === window.savedTableFilter),
      true,
    )
    await page.getByText('Filters', { exact: true }).click()
    assert.equal(
      await page.getByText('1 active', { exact: true }).isVisible(),
      true,
    )
    assert.deepEqual(await rows(), ['record-1'])
    await page.getByText('Filters', { exact: true }).click()
    assert.equal(await filter.inputValue(), 'West')
  })
  await test('The controls drawer stays below application navigation and preserves its state', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    const controls = page.getByRole('complementary', {
      name: 'Table controls',
      exact: true,
    })
    await page
      .getByRole('button', { name: 'Table controls', exact: true })
      .click()
    await expect(controls).toBeVisible()
    await page.getByRole('button', { name: 'Navigation', exact: true }).click()
    await page
      .getByRole('button', { name: 'Close navigation', exact: true })
      .click({ timeout: 5000 })
    await expect(controls).toBeVisible()
    await page
      .getByRole('button', { name: 'Close table controls', exact: true })
      .click()
    await expect(controls).toBeHidden()
    await expect(
      page.getByRole('button', { name: 'Table controls', exact: true }),
    ).toBeFocused()
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
  await test('The default page contains only table controls and main results', async () => {
    report.diagnostics.push(
      ...(await page.evaluate(() => window.dashboardFixture.diagnostics())),
    )
    await page.goto(`http://127.0.0.1:${server.address().port}/`)
    await page.waitForFunction(() => Boolean(window.dashboardFixture))
    assert.equal(await page.getByRole('navigation').count(), 0)
    assert.equal(
      await page
        .locator('form, .dashboard-sidebar, .dashboard-navigation')
        .count(),
      0,
    )
    assert.equal(await page.getByRole('complementary').count(), 1)
    const main = await page
      .getByRole('main', { name: 'Records workspace' })
      .boundingBox()
    assert.equal(main.x, 0)
    assert.equal(main.y, 0)
    assert.equal(main.width, 1440)
    assert.equal(main.height, 1000)
    const results = await page.locator('.table-workspace-results').boundingBox()
    assert.ok(results.width > 1100)
    assert.ok((await page.locator('.table-scroll').boundingBox()).height > 900)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight),
      1000,
    )
  })
  await test('The Table starts level with controls and keeps its summary pinned below scrolling records', async () => {
    const controls = page.locator('.table-workspace-controls')
    const scroller = page.locator('.table-scroll')
    const footer = page.locator('.table-workspace-summary')
    const controlsBox = await controls.boundingBox()
    const tableBox = await scroller.boundingBox()
    assert.equal(tableBox.y, controlsBox.y)
    const before = await footer.boundingBox()
    assert.equal(await footer.textContent(), '2/2 records')
    await page.evaluate(() => window.dashboardFixture.replaceRows(500))
    await scroller.evaluate((node) => {
      node.scrollTop = node.scrollHeight
    })
    assert.deepEqual(await footer.boundingBox(), before)
    assert.equal(await footer.textContent(), '500/500 records')
    assert.ok(before.y >= tableBox.y + tableBox.height)
    await page
      .getByRole('textbox', { name: 'Filter Region', exact: true })
      .fill('West')
    assert.equal(await footer.textContent(), '250/500 records')
    assert.deepEqual(await footer.boundingBox(), before)
    assert.equal(
      await page
        .getByText('Filters', { exact: true })
        .evaluate((node) => getComputedStyle(node).textTransform),
      'uppercase',
    )
    assert.equal(
      await footer.evaluate((node) => getComputedStyle(node).textTransform),
      'uppercase',
    )
    assert.equal(
      await page
        .locator('thead th')
        .first()
        .evaluate((node) => getComputedStyle(node).textTransform),
      'uppercase',
    )
    const value = page.locator(
      'tr[data-row="record-1"] td[data-column="region"]',
    )
    await scroller.evaluate((node) => {
      node.scrollTop = 0
    })
    assert.equal(await value.textContent(), 'West')
    assert.equal(
      await value.evaluate((node) => getComputedStyle(node).textTransform),
      'none',
    )
    await page
      .getByRole('combobox', { name: 'Add grouping', exact: true })
      .selectOption('region')
    const groupValue = page.locator('[data-group-toggle]').first()
    assert.equal(
      await groupValue.evaluate((node) => getComputedStyle(node).textTransform),
      'none',
    )
    await page.evaluate(() => window.dashboardFixture.replaceRows(0))
    assert.deepEqual(await footer.boundingBox(), before)
    assert.equal(await footer.textContent(), '0/0 records')
  })
  await test('The main Table remains readable at doubled browser scale', async () => {
    const zoomed = await browser.newPage({
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 2,
    })
    zoomed.on('pageerror', (error) => report.errors.push(error.stack))
    zoomed.on('console', (message) => {
      if (['warning', 'error'].includes(message.type()))
        report.warnings.push(message.text())
    })
    try {
      await zoomed.goto(`http://127.0.0.1:${server.address().port}/`)
      await zoomed.waitForFunction(() => Boolean(window.dashboardFixture))
      const before = await zoomed.locator('.table-scroll').boundingBox()
      for (const id of ['name', 'region', 'active']) {
        await zoomed
          .getByRole('combobox', { name: 'Add grouping', exact: true })
          .selectOption(id)
      }
      assert.deepEqual(
        await zoomed.locator('.table-scroll').boundingBox(),
        before,
      )
      assert.ok(before.width > 600)
      assert.ok(before.height > 450)
      assert.equal(await zoomed.getByRole('navigation').count(), 0)
      assert.equal(await zoomed.locator('form').count(), 0)
      for (const header of await zoomed.locator('thead th').all())
        assert.ok((await header.boundingBox()).width > 180)
      assert.equal(
        await zoomed.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
        true,
      )
      await zoomed.setViewportSize({ width: 390, height: 568 })
      const narrow = await zoomed.locator('.table-scroll').boundingBox()
      assert.ok(narrow.width > 350)
      assert.ok(narrow.height > 450)
      await zoomed
        .getByRole('button', { name: 'Table controls', exact: true })
        .click()
      assert.deepEqual(
        await zoomed.locator('.table-scroll').boundingBox(),
        narrow,
      )
      await zoomed
        .getByRole('button', { name: 'Close table controls', exact: true })
        .click()
      assert.deepEqual(
        await zoomed.locator('.table-scroll').boundingBox(),
        narrow,
      )
    } finally {
      if (await zoomed.evaluate(() => Boolean(window.dashboardFixture)))
        report.diagnostics.push(
          ...(await zoomed.evaluate(() =>
            window.dashboardFixture.diagnostics(),
          )),
        )
      await zoomed.close()
    }
  })
  report.diagnostics.push(
    ...(await page.evaluate(() => window.dashboardFixture.diagnostics())),
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
