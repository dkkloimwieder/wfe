import {
  startStaticServer,
  launchBrowser,
  attachDiagnostics,
  selectGroups,
  finalizeReport,
  captureDiagnostic,
  errorDetails,
  errorText,
} from '../shared/browser/runner.mjs'
import { reviewThemeHost } from '../shared/appearance/host-review.mjs'
import { reviewMessages } from './review-messages.mjs'
import { reviewPagination } from '../shared/controls/pagination-review.mjs'
import { reviewSelection } from './review-selection.mjs'
import { collapsedGroupLabel } from '../shared/controls/icon-review.mjs'
import {
  choiceControl,
  selectValue,
  controlValue,
} from '../shared/controls/select-review.mjs'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadavg } from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const directory = process.env.BENCH_DEVELOPMENT
  ? '.dist-dev'
  : process.env.BENCH_DISTRIBUTION
    ? '.dist-package'
    : '.dist'
const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
const output = process.env.BENCH_OUTPUT ?? '/tmp/table-read-only-browser.json'
const externalUrl = process.env.BENCH_URL
const report = {
  directory: externalUrl ? null : directory,
  moduleAudit: false,
  hostLoad: loadavg(),
  cases: [],
  errors: [],
  warnings: [],
  diagnostics: [],
}
let server
let browser
let page
let detachPage = () => {}
try {
  report.groups = selectGroups({ 'table-read-only': true })
  if (!externalUrl) {
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
        /table-core|@tanstack\/store|node_modules\/[^ ]*virtual-core|zod\/|createEditing|solid-form|node_modules\/@kobalte\//.test(
          path,
        ),
      ),
    )
    const ownedControlModules = modules.filter((path) =>
      path.includes(
        process.env.BENCH_DISTRIBUTION
          ? '/components/dist/source/vendor/kobalte/'
          : '/components/src/vendor/kobalte/',
      ),
    )
    assert.ok(
      ownedControlModules.some((path) =>
        /\/checkbox-root\.(tsx|jsx)$/.test(path),
      ),
      'column controls use the owned shared checkbox',
    )
    assert.ok(
      ownedControlModules.every((path) =>
        /\/utils\/src\/|\/core\/src\/(checkbox|form-control|polymorphic|select|listbox|list|selection|i18n|popper|dismissable-layer|popover|button)\/|\/core\/src\/primitives\/(create-tag-name|create-toggle-state|create-collection|create-disclosure-state|create-register-id)\//.test(
          path,
        ),
      ),
      'read-only Table retains only its control, selection, and popup behavior',
    )
    assert.ok(
      ownedControlModules.some((path) =>
        /\/select-root\.(tsx|jsx)$/.test(path),
      ),
      'choice filters use the shared Select',
    )
    assert.ok(
      ownedControlModules.some((path) =>
        /\/popover-root\.(tsx|jsx)$/.test(path),
      ),
      'date filters use the shared Popover',
    )
    assert.ok(
      modules.some((path) =>
        /\/components\/(src|dist\/source)\/components\/DatePicker\.(tsx|jsx)$/.test(
          path,
        ),
      ),
      'date filters use the shared DatePicker',
    )
    report.moduleAudit = true
  }
  server = externalUrl
    ? undefined
    : await startStaticServer({
        assets,
        onServerError: (error) => {
          ;(report.serverErrors ??= []).push(error)
        },
      })
  const url = externalUrl ?? server.url
  report.url = url
  browser = await launchBrowser({ chromium })
  report.browser = browser.version()
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  detachPage = attachDiagnostics(page, report)
  await page.goto(url)
  await page.waitForFunction(() => Boolean(window.readOnlyFixture))
  await reviewThemeHost(page)
  const rows = () =>
    page
      .locator('tr[data-row]')
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.row))
  async function applyAndReadRows() {
    const button = page.getByRole('button', {
      name: 'Refresh results',
      exact: true,
    })
    if (await button.isEnabled()) await button.click()
    return rows()
  }
  async function test(name, run) {
    await page.evaluate(() => window.readOnlyFixture.start())
    await run()
    report.cases.push({ name, status: 'passed' })
    console.log(`PASS ${name}`)
  }
  await test('Default tables fill their scroll area and explicit widths remain exact', async () => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.evaluate(() => window.readOnlyFixture.start())
      const assertFill = async () => {
        const sizes = await page.locator('.table-scroll').evaluate((node) => ({
          viewport: node.clientWidth,
          table: node.querySelector('table').getBoundingClientRect().width,
        }))
        assert.ok(
          Math.abs(sizes.table - sizes.viewport) <= 1,
          JSON.stringify(sizes),
        )
      }
      await assertFill()
      await page.evaluate(() => window.readOnlyFixture.replace([]))
      await assertFill()
      for (const exact of [600, 1800]) {
        await page.evaluate(
          (exact) => window.readOnlyFixture.start(false, exact),
          exact,
        )
        const size = await page
          .locator('table')
          .evaluate((node) => node.getBoundingClientRect().width)
        assert.ok(
          Math.abs(size - exact) <= 1,
          `Expected ${exact}px, received ${size}px`,
        )
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
    }
    await page.setViewportSize({ width: 1280, height: 900 })
  })
  await test('Read-only sorting uses numeric values and exposes no editing controls', async () => {
    assert.equal(await page.getByRole('button', { name: /^Save/ }).count(), 0)
    assert.equal(
      await choiceControl(page, { name: 'Save mode', exact: true }).count(),
      0,
    )
    assert.equal(
      await page.locator('tbody input, tbody select, [data-editor]').count(),
      0,
    )
    await page
      .getByRole('button', { name: 'Sort by Amount', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['b', 'c', 'a'])
    await page
      .getByRole('button', { name: 'Sort by Amount', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['a', 'c', 'b'])
  })
  await test('Column filters and search process application records', async () => {
    assert.equal(
      await page
        .getByRole('searchbox', { name: 'Search all columns', exact: true })
        .getAttribute('placeholder'),
      'Search values…',
    )
    await page
      .getByRole('textbox', { name: 'Category', exact: true })
      .fill('West')
    assert.deepEqual(await applyAndReadRows(), ['a', 'c'])
    await page
      .getByRole('searchbox', { name: 'Search all columns', exact: true })
      .fill('Chair')
    assert.deepEqual(await applyAndReadRows(), ['c'])
    await page
      .getByRole('button', { name: 'Clear search', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['a', 'c'])
    await page
      .getByRole('button', { name: 'Clear Category filter', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['a', 'b', 'c'])
  })
  await test('Nested grouping, expansion, ordering and filtered summaries work without editing', async () => {
    await selectValue(
      choiceControl(page, { name: 'Add grouping', exact: true }),
      'category',
    )
    assert.equal(await page.locator('tr[data-group]').count(), 2)
    const west = page.locator('tr[data-group]').filter({
      has: page.getByRole('button', {
        name: 'Expand Category: West',
        exact: true,
      }),
    })
    assert.equal(
      await west.locator('[data-group-summary="amount"]').textContent(),
      '54',
    )
    await selectValue(
      choiceControl(page, { name: 'Order Category groups', exact: true }),
      'value:asc',
    )
    assert.deepEqual(
      await Promise.all(
        (await page.locator('tr[data-group] button').all()).map(
          collapsedGroupLabel,
        ),
      ),
      ['East', 'West'],
    )
    await page
      .getByRole('button', { name: 'Expand Category: West', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['a', 'c'])
    await selectValue(
      choiceControl(page, { name: 'Add grouping', exact: true }),
      'name',
    )
    await page
      .getByRole('button', { name: 'Expand all groups', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['b', 'a', 'c'])
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Desk')
    assert.deepEqual(await applyAndReadRows(), ['a'])
    assert.equal(
      await page
        .locator('tr[data-group]')
        .first()
        .locator('[data-group-summary="amount"]')
        .textContent(),
      '42',
    )
    await page
      .getByRole('button', { name: 'Clear grouping', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['a'])
  })
  await test('Display controls and application replacements preserve table state', async () => {
    await page.getByText('Display columns', { exact: true }).click()
    const amount = page.getByRole('checkbox', {
      name: 'Amount',
      exact: true,
    })
    assert.equal(await amount.isDisabled(), true)
    await page
      .getByRole('group', { name: 'Visible columns', exact: true })
      .getByText('Amount', { exact: true })
      .click({ force: true })
    assert.equal(await amount.isChecked(), true)
    await page
      .getByRole('group', { name: 'Visible columns', exact: true })
      .getByText('Category', { exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Move Amount column', exact: true })
      .focus()
    await page.keyboard.press('Home')
    assert.deepEqual(
      await page
        .locator('thead th')
        .evaluateAll((nodes) => nodes.map((node) => node.dataset.column)),
      ['amount', 'name'],
    )
    await page
      .getByRole('button', { name: 'Sort by Amount', exact: true })
      .click()
    await page.evaluate(() =>
      window.readOnlyFixture.replace([
        {
          id: 'a',
          values: { category: 'West', name: 'Desk updated', amount: 1 },
        },
        { id: 'd', values: { category: 'North', name: 'Shelf', amount: 5 } },
      ]),
    )
    assert.deepEqual(await applyAndReadRows(), ['a', 'd'])
    assert.equal(
      await page.locator('tr[data-row="a"] [data-column="name"]').textContent(),
      'Desk updated',
    )
    assert.equal(
      await page
        .getByRole('checkbox', { name: 'Category', exact: true })
        .isChecked(),
      false,
    )
  })
  await test('Uncontrolled display alignment survives record replacement and hidden columns', async () => {
    await page.getByText('Display columns', { exact: true }).click()
    const alignment = choiceControl(page, {
      name: 'Category alignment',
      exact: true,
    })
    await selectValue(alignment, 'center')
    const visible = page.getByRole('group', {
      name: 'Visible columns',
      exact: true,
    })
    await visible.getByText('Category', { exact: true }).click()
    await page.evaluate(() =>
      window.readOnlyFixture.replace([
        { id: 'a', values: { category: 'West', name: 'Desk', amount: 1 } },
      ]),
    )
    await visible.getByText('Category', { exact: true }).click()
    assert.equal(await controlValue(alignment), 'center')
    for (const selector of [
      'thead th[data-column="category"]',
      'tr[data-row="a"] td[data-column="category"]',
    ])
      assert.equal(
        await page
          .locator(selector)
          .evaluate((n) => getComputedStyle(n).textAlign),
        'center',
      )
  })
  await test('Empty filtered and source results remain distinct and disposal releases the DOM', async () => {
    await page
      .getByRole('searchbox', { name: 'Search all columns', exact: true })
      .fill('missing')
    await applyAndReadRows()
    assert.equal(
      await page
        .getByText('No records match your search or filters.', { exact: true })
        .isVisible(),
      true,
    )
    await page.evaluate(() => window.readOnlyFixture.replace([]))
    assert.equal(
      await page.getByText('No records yet.', { exact: true }).isVisible(),
      true,
    )
    await page.setViewportSize({ width: 390, height: 800 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    )
    await page.evaluate(() => window.readOnlyFixture.stop())
    assert.equal(await page.locator('#root').textContent(), '')
  })
  await reviewSelection(page, test)
  await test('Pagination uses accepted application pages, pending responses, unknown totals and narrow controls', async () => {
    await page.evaluate(() => window.readOnlyFixture.startPaged())
    await reviewPagination(page)
    const next = await page
      .getByRole('button', { name: 'Previous page' })
      .elementHandle()
    const requests = await page.evaluate(
      () => window.readOnlyFixture.pagination.read().requests,
    )
    await page.evaluate(() => window.readOnlyFixture.stop())
    await next.evaluate((node) => node.click())
    assert.equal(
      await page.evaluate(
        () => window.readOnlyFixture.pagination.read().requests,
      ),
      requests,
    )
  })
  const earlierDiagnostics = await page.evaluate(() =>
    window.readOnlyFixture.diagnostics(),
  )
  await reviewMessages(page, url)
  report.cases.push({
    name: 'Table messages switch language without replacing draft controls',
    status: 'passed',
  })
  report.diagnostics = await page.evaluate(() =>
    window.readOnlyFixture.diagnostics(),
  )
  report.diagnostics.unshift(...earlierDiagnostics)
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
  report.failure = errorText(error)
  report.failureDetails = errorDetails(error)
  // Capture only after failure so diagnostics do not change scroll timing.
  report.failureGeometry = await captureDiagnostic(
    report,
    'failure geometry',
    () =>
      page?.evaluate(() => {
        const viewport = document.querySelector('.table-scroll')
        return {
          scrollTop: viewport?.scrollTop,
          scrollHeight: viewport?.scrollHeight,
          clientHeight: viewport?.clientHeight,
          headerHeight: viewport
            ?.querySelector('thead')
            ?.getBoundingClientRect().height,
          rows: [...document.querySelectorAll('tr[data-row]')].map(
            (row) => row.dataset.row,
          ),
          activeElement: document.activeElement?.outerHTML,
        }
      }),
  )
  process.exitCode = 1
} finally {
  const failed = await finalizeReport({
    report,
    cleanup: [
      { name: 'browser', close: () => browser?.close() },
      { name: 'page diagnostics', close: () => detachPage() },
      { name: 'static server', close: () => server?.close() },
    ],
    output,
  })
  if (failed) process.exitCode = 1
}
