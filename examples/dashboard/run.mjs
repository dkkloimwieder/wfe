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
  const apply = () =>
    page.getByRole('button', { name: 'Apply filters', exact: true })
  async function applyAndReadRows() {
    const button = page.locator('.table-filter-actions button')
    if (await button.isEnabled()) await button.click()
    return rows()
  }
  const choiceTrigger = (label) =>
    page.getByRole('button', { name: new RegExp('^' + label + '(?:\\s|$)') })
  async function pick(label, value) {
    await choiceTrigger(label).click()
    await page
      .getByRole('listbox')
      .getByRole('option', { name: value, exact: true })
      .click()
    await expect(choiceTrigger(label)).toBeFocused()
  }
  async function pickMany(label, values) {
    const trigger = choiceTrigger(label)
    await trigger.click()
    for (const value of values)
      await page
        .getByRole('listbox')
        .getByRole('option', { name: value, exact: true })
        .click()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  }
  async function test(name, run) {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.evaluate(() => {
      window.dashboardFixture.start()
      window.dashboardFixture.replaceRows(2)
    })
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
      assert.equal((await applyAndReadRows()).length, count)
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
    assert.equal((await applyAndReadRows()).length, 2)
    await page.getByLabel('Record name', { exact: true }).fill('New shelf')
    await page
      .getByRole('combobox', { name: 'Region', exact: true })
      .selectOption('East')
    await page.getByText('Active record', { exact: true }).click()
    await page.getByRole('button', { name: 'Save record', exact: true }).click()
    assert.equal((await applyAndReadRows()).length, 3)
    assert.equal(
      await page.locator('#application-status').textContent(),
      'Saved New shelf.',
    )
    assert.match(
      await page.locator('tr[data-row="created-1"]').textContent(),
      /New shelfEast/,
    )
    assert.equal(
      await page.getByLabel('Record name', { exact: true }).inputValue(),
      '',
    )
  })
  await test('One Apply action commits pending column filters and search, while clears and invalid dates stay pending', async () => {
    await page.evaluate(() => window.dashboardFixture.replaceRows(8))
    const active = page.getByRole('checkbox', { name: 'Active', exact: true })
    const date = page.getByRole('textbox', {
      name: 'Created start',
      exact: true,
    })
    const search = page.getByRole('searchbox', {
      name: 'Search all columns',
      exact: true,
    })
    await expect(apply()).toBeDisabled()
    await active.press('Space')
    await date.fill('2026-01-03')
    await search.fill('West')
    assert.equal((await rows()).length, 8)
    await expect(page.locator('.table-workspace-summary')).toHaveText(
      '8/8 records',
    )
    await expect(
      page.getByText('Unapplied changes', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('0 active', { exact: true })).toBeVisible()
    await apply().click()
    assert.deepEqual(await rows(), ['record-3', 'record-5', 'record-7'])
    await expect(apply()).toBeDisabled()
    await expect(page.getByText('3 active', { exact: true })).toBeVisible()
    await page
      .getByRole('button', { name: 'Clear Created start', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Clear search', exact: true })
      .click()
    await active.press('Space')
    await active.press('Space')
    assert.deepEqual(await rows(), ['record-3', 'record-5', 'record-7'])
    await apply().press('Enter')
    assert.equal((await rows()).length, 8)
    await active.press('Space')
    await date.fill('2026-02-30')
    await apply().click()
    await expect(date).toBeFocused()
    assert.equal((await rows()).length, 8)
    await date.press('Escape')
    await apply().click()
    assert.deepEqual(await rows(), [
      'record-1',
      'record-3',
      'record-5',
      'record-7',
    ])
    await active.press('Space')
    await page.evaluate(() => window.dashboardFixture.replaceRows(2))
    await expect(active).toHaveAttribute('aria-checked', 'false')
    assert.deepEqual(await rows(), ['record-1'])
    await apply().click()
    assert.deepEqual(await rows(), ['record-2'])
  })
  await test('Boolean filters preserve false and clear to either even with empty results', async () => {
    const filter = page.getByRole('checkbox', {
      name: 'Active',
      exact: true,
    })
    const clear = page.getByRole('button', {
      name: 'Clear Active filter',
      exact: true,
    })
    await expect(filter).toHaveAttribute('aria-checked', 'mixed')
    await filter.press('Space')
    assert.deepEqual(await applyAndReadRows(), ['record-1'])
    await expect(
      page
        .locator('tr[data-row] td[data-column="active"]')
        .getByRole('img', { name: 'Yes', exact: true }),
    ).toHaveCount(1)
    await page.locator('.table-boolean-filter .ui-check-control').click()
    assert.deepEqual(await applyAndReadRows(), ['record-2'])
    await expect(
      page
        .locator('tr[data-row] td[data-column="active"]')
        .getByRole('img', { name: 'No', exact: true }),
    ).toHaveCount(1)
    assert.equal(
      await page.getByText('1 active', { exact: true }).isVisible(),
      true,
    )
    await page.evaluate(() => window.dashboardFixture.replaceRows(0))
    await expect(filter).toHaveAttribute('aria-checked', 'false')
    await page.evaluate(() => window.dashboardFixture.replaceRows(2))
    assert.deepEqual(await applyAndReadRows(), ['record-2'])
    await filter.press('Space')
    assert.equal((await applyAndReadRows()).length, 2)
    await page.evaluate(() =>
      window.dashboardFixture.setFilter('active', false),
    )
    await filter.press('Space')
    await expect(filter).toHaveAttribute('aria-checked', 'mixed')
    await expect(filter).toBeFocused()
    assert.equal((await applyAndReadRows()).length, 2)
    await expect(clear).toHaveCount(0)
    await expect(page.locator('.table-boolean-filter label')).toHaveCount(0)
    assert.equal(
      await page
        .locator('.table-boolean-filter')
        .evaluate((node) => getComputedStyle(node).borderWidth),
      '0px',
    )
    assert.equal(
      await page.getByText('0 active', { exact: true }).isVisible(),
      true,
    )
    await page.evaluate(() => window.dashboardFixture.replaceRows(0))
    await page.evaluate(() =>
      window.dashboardFixture.setFilter('active', false),
    )
    await page.evaluate(() => window.dashboardFixture.replaceRows(2))
    assert.deepEqual(await applyAndReadRows(), ['record-2'])
  })
  await test('Column formatting changes symbols, dates and numbers without changing filter or sort values', async () => {
    await page.evaluate(() => window.dashboardFixture.replaceRows(8))
    const active = page.getByRole('combobox', {
      name: 'Active',
      exact: true,
    })
    const date = page.getByRole('combobox', {
      name: 'Created',
      exact: true,
    })
    const amount = page.getByRole('combobox', {
      name: 'Amount',
      exact: true,
    })
    const cell = (row, id) =>
      page.locator(`tr[data-row="record-${row}"] td[data-column="${id}"]`)
    const results = page.locator('.table-workspace-results')
    const height = (await results.boundingBox()).height
    await expect(
      cell(1, 'active').getByRole('img', { name: 'Yes', exact: true }),
    ).toHaveCount(1)
    await expect(
      cell(2, 'active').getByRole('img', { name: 'No', exact: true }),
    ).toHaveCount(1)
    await active.selectOption('boolean-text')
    await expect(cell(1, 'active')).toHaveText('Yes')
    await expect(cell(2, 'active')).toHaveText('No')
    await date.selectOption('date-long')
    await expect(cell(1, 'created')).toHaveText('January 1, 2026')
    await date.selectOption('date-short')
    await expect(cell(1, 'created')).toHaveText('01/01/2026')
    await amount.selectOption('number-decimal')
    await expect(cell(1, 'amount')).toHaveText('0.00')
    await expect(cell(2, 'amount')).toHaveText('12.50')
    await expect(cell(3, 'amount')).toHaveText('')
    await expect(cell(4, 'amount')).toHaveText('-3.25')
    await page.evaluate(() =>
      window.dashboardFixture.setFilter('active', false),
    )
    assert.deepEqual(await applyAndReadRows(), [
      'record-2',
      'record-4',
      'record-6',
      'record-8',
    ])
    await active.selectOption('boolean-symbol')
    assert.deepEqual(await applyAndReadRows(), [
      'record-2',
      'record-4',
      'record-6',
      'record-8',
    ])
    await page.evaluate(() => {
      window.dashboardFixture.setFilter('active', undefined)
      window.dashboardFixture.setFilter('amount', {
        operator: 'between',
        min: 0,
        max: 0,
      })
    })
    assert.deepEqual(await applyAndReadRows(), ['record-1', 'record-5'])
    await page.evaluate(() =>
      window.dashboardFixture.setFilter('amount', undefined),
    )
    await page
      .getByRole('button', { name: 'Sort by Amount', exact: true })
      .click()
    assert.deepEqual((await applyAndReadRows()).slice(0, 2), [
      'record-4',
      'record-8',
    ])
    await amount.selectOption('number-grouped')
    assert.deepEqual((await applyAndReadRows()).slice(0, 2), [
      'record-4',
      'record-8',
    ])
    const grouping = page.getByRole('combobox', {
      name: 'Add grouping',
      exact: true,
    })
    await grouping.selectOption('active')
    await expect(
      page
        .locator('[data-group-toggle]')
        .getByRole('img', { name: 'Yes', exact: true }),
    ).toHaveCount(1)
    await expect(
      page
        .locator('[data-group-toggle]')
        .getByRole('img', { name: 'No', exact: true }),
    ).toHaveCount(1)
    await page
      .getByRole('button', { name: 'Clear grouping', exact: true })
      .click()
    await grouping.selectOption('created')
    assert.ok(
      (await page.locator('[data-group-toggle]').allTextContents()).some(
        (text) => text.includes('01/01/2026'),
      ),
    )
    await page
      .getByRole('button', { name: 'Clear grouping', exact: true })
      .click()
    assert.equal((await results.boundingBox()).height, height)
    await page.evaluate(() => window.dashboardFixture.replaceRows(0))
    await expect(active).toHaveValue('boolean-symbol')
    await expect(date).toHaveValue('date-short')
    await expect(amount).toHaveValue('number-grouped')
  })
  await test('Date boundaries work independently and include both endpoint dates', async () => {
    const start = page.getByLabel('Created start', { exact: true })
    const end = page.getByLabel('Created end', { exact: true })
    const clearStart = page.getByRole('button', {
      name: 'Clear Created start',
      exact: true,
    })
    const clearEnd = page.getByRole('button', {
      name: 'Clear Created end',
      exact: true,
    })
    assert.equal(await start.getAttribute('type'), 'text')
    assert.equal(await end.getAttribute('type'), 'text')
    assert.equal(
      await start.evaluate((node) => getComputedStyle(node).textTransform),
      'none',
    )
    await start.fill('2026-01-02')
    assert.equal(
      await start.evaluate((node) => getComputedStyle(node).textTransform),
      'none',
    )
    assert.deepEqual(await applyAndReadRows(), ['record-2'])
    await end.fill('2026-01-02')
    assert.deepEqual(await applyAndReadRows(), ['record-2'])
    assert.equal(
      await page.getByText('1 active', { exact: true }).isVisible(),
      true,
    )
    await clearStart.click()
    await expect(start).toBeFocused()
    assert.equal((await applyAndReadRows()).length, 2)
    await end.fill('2026-01-01')
    assert.deepEqual(await applyAndReadRows(), ['record-1'])
    await start.fill('2026-01-02')
    assert.deepEqual(await applyAndReadRows(), [])
    assert.equal(
      await page
        .getByText('No records match your search or filters.', { exact: true })
        .isVisible(),
      true,
    )
    await clearEnd.click()
    await expect(end).toBeFocused()
    assert.deepEqual(await applyAndReadRows(), ['record-2'])
    await page.evaluate(() => window.dashboardFixture.replaceRows(0))
    assert.equal(await start.inputValue(), '2026-01-02')
    await page.evaluate(() => window.dashboardFixture.replaceRows(2))
    assert.deepEqual(await applyAndReadRows(), ['record-2'])
    await page.evaluate(() => window.dashboardFixture.setFilter('active', true))
    assert.deepEqual(await applyAndReadRows(), [])
    await page.evaluate(() =>
      window.dashboardFixture.setFilter('active', false),
    )
    assert.deepEqual(await applyAndReadRows(), ['record-2'])
    await page.evaluate(() =>
      window.dashboardFixture.setFilter('active', undefined),
    )
    await clearStart.click()
    assert.equal((await applyAndReadRows()).length, 2)
    assert.equal(
      await page.getByText('0 active', { exact: true }).isVisible(),
      true,
    )
    await expect(clearStart).toBeDisabled()
    await expect(clearEnd).toBeDisabled()
    await page
      .getByRole('button', { name: 'Sort by Created', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['record-1', 'record-2'])
    await page
      .getByRole('button', { name: 'Sort by Created', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['record-2', 'record-1'])
    await page
      .getByRole('combobox', { name: 'Add grouping', exact: true })
      .selectOption('created')
    assert.equal(await page.locator('tr[data-group]').count(), 2)
    const group = page.locator('[data-group-toggle]').first()
    assert.match(await group.textContent(), /2026-01-0[12]/)
    assert.equal(
      await group.evaluate((node) => getComputedStyle(node).textTransform),
      'none',
    )
  })
  await test('Text matching offers contains, equals, starts with, and exclusion', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    const text = page.getByRole('textbox', { name: 'Name', exact: true })
    const match = page.getByRole('combobox', {
      name: 'Name match',
      exact: true,
    })
    await text.fill('RECORD 1')
    assert.deepEqual(await applyAndReadRows(), ['record-1'])
    for (const mode of ['equals', 'starts-with']) {
      await match.selectOption(mode)
      assert.deepEqual(await applyAndReadRows(), ['record-1'])
    }
    await match.selectOption('not-contains')
    assert.equal((await applyAndReadRows()).length, 7)
    await text.press('Escape')
    await expect(text).toBeFocused()
    assert.equal((await applyAndReadRows()).length, 8)
    assert.equal(await match.inputValue(), 'contains')
  })
  await test('Single choices and exclusions retain record casing and clear to Any', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    const trigger = choiceTrigger('Region')
    await pick('Region', 'West')
    assert.deepEqual(await applyAndReadRows(), [
      'record-1',
      'record-3',
      'record-5',
      'record-7',
    ])
    await page
      .getByRole('combobox', { name: 'Region match', exact: true })
      .selectOption('not-in')
    assert.deepEqual(await applyAndReadRows(), [
      'record-2',
      'record-4',
      'record-6',
      'record-8',
    ])
    assert.equal(
      await trigger.evaluate((node) => getComputedStyle(node).textTransform),
      'none',
    )
    await page
      .getByRole('button', { name: 'Clear Region filter', exact: true })
      .click()
    await expect(trigger).toBeFocused()
    assert.equal((await applyAndReadRows()).length, 8)
    await expect(trigger).toHaveText('Any')
    await trigger.press('Enter')
    await page.keyboard.press('e')
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveText('East')
    assert.equal((await applyAndReadRows()).length, 4)
  })
  await test('Multiple choices match any selection and support exclusion and an empty selection', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    await pickMany('Status', ['Open', 'Closed'])
    assert.equal((await applyAndReadRows()).length, 6)
    await pickMany('Status', ['Closed'])
    assert.equal((await applyAndReadRows()).length, 4)
    await page
      .getByRole('combobox', { name: 'Status match', exact: true })
      .selectOption('not-in')
    assert.deepEqual(await applyAndReadRows(), [
      'record-2',
      'record-3',
      'record-6',
      'record-7',
    ])
    await pickMany('Status', ['Open'])
    assert.equal((await applyAndReadRows()).length, 8)
    await expect(choiceTrigger('Status')).toHaveText('Any')
    assert.equal(
      await page.getByText('0 active', { exact: true }).isVisible(),
      true,
    )
  })
  await test('Numeric boundaries include zero, negative values, decimals, and optional endpoints', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    const min = page.getByRole('spinbutton', {
      name: 'Amount minimum',
      exact: true,
    })
    const max = page.getByRole('spinbutton', {
      name: 'Amount maximum',
      exact: true,
    })
    const mode = page.getByRole('combobox', {
      name: 'Amount match',
      exact: true,
    })
    await min.fill('0')
    assert.deepEqual(await applyAndReadRows(), [
      'record-1',
      'record-2',
      'record-5',
      'record-6',
    ])
    await max.fill('0')
    assert.deepEqual(await applyAndReadRows(), ['record-1', 'record-5'])
    await min.fill('')
    assert.deepEqual(await applyAndReadRows(), [
      'record-1',
      'record-4',
      'record-5',
      'record-8',
    ])
    await min.fill('-3.25')
    await max.fill('12.5')
    assert.equal((await applyAndReadRows()).length, 6)
    await min.fill('')
    await min.press('-')
    await expect(min).toHaveAttribute('aria-invalid', 'true')
    assert.equal((await applyAndReadRows()).length, 6)
    await min.press('Escape')
    await expect(min).toHaveValue('')
    await expect(min).not.toHaveAttribute('aria-invalid', 'true')
    await min.fill('20')
    assert.deepEqual(await applyAndReadRows(), [])
    await mode.selectOption('empty')
    assert.deepEqual(await applyAndReadRows(), ['record-3', 'record-7'])
    await mode.selectOption('not-empty')
    assert.equal((await applyAndReadRows()).length, 6)
    await page
      .getByRole('button', { name: 'Clear Amount filter', exact: true })
      .click()
    await expect(min).toHaveValue('')
    await expect(max).toHaveValue('')
    assert.equal((await applyAndReadRows()).length, 8)
  })
  await test('Nullable text distinguishes empty records from ordinary text and negative matching', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    const mode = page.getByRole('combobox', {
      name: 'Notes match',
      exact: true,
    })
    await mode.selectOption('empty')
    assert.deepEqual(await applyAndReadRows(), [
      'record-1',
      'record-3',
      'record-5',
      'record-7',
    ])
    await mode.selectOption('not-empty')
    assert.equal((await applyAndReadRows()).length, 4)
    await mode.selectOption('equals')
    await page
      .getByRole('textbox', { name: 'Notes', exact: true })
      .fill('Ready to review')
    assert.deepEqual(await applyAndReadRows(), ['record-2', 'record-6'])
    await mode.selectOption('not-contains')
    assert.deepEqual(await applyAndReadRows(), ['record-4', 'record-8'])
  })
  await test('Selected tags keep compact indicators and stable option heights', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    const trigger = choiceTrigger('Tags')
    await trigger.click()
    const list = page.getByRole('listbox')
    const option = list.getByRole('option', { name: 'Priority', exact: true })
    const before = await option.boundingBox()
    await option.click()
    await expect(option).toHaveAttribute('aria-selected', 'true')
    const after = await option.boundingBox()
    assert.equal(after.height, before.height)
    assert.ok(after.height <= 36)
    const indicator = option.locator('.popup-item-indicator')
    for (const element of [indicator, indicator.locator('svg')]) {
      const box = await element.boundingBox()
      assert.equal(box.width, 16)
      assert.equal(box.height, 16)
      assert.ok(
        Math.abs(box.y + box.height / 2 - after.y - after.height / 2) <= 1,
      )
    }
    await list.getByRole('option', { name: 'External', exact: true }).click()
    await expect(list.locator('[aria-selected="true"]')).toHaveCount(2)
    assert.equal((await rows()).length, 8)
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    assert.equal((await applyAndReadRows()).length, 6)
  })
  await test('Tags support Any, All, exclusion, and empty values', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    await pickMany('Tags', ['Priority', 'External'])
    assert.equal((await applyAndReadRows()).length, 6)
    const mode = page.getByRole('combobox', {
      name: 'Tags match',
      exact: true,
    })
    await mode.selectOption('all')
    assert.deepEqual(await applyAndReadRows(), ['record-4', 'record-8'])
    await mode.selectOption('not-in')
    assert.deepEqual(await applyAndReadRows(), [])
    await mode.selectOption('empty')
    assert.deepEqual(await applyAndReadRows(), ['record-3', 'record-7'])
    await mode.selectOption('not-empty')
    assert.equal((await applyAndReadRows()).length, 6)
    await page
      .getByRole('button', { name: 'Clear Tags filter', exact: true })
      .click()
    assert.equal((await applyAndReadRows()).length, 8)
  })
  await test('Application-controlled filter values and mixed filter types update the same Table', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    await page.evaluate(() => {
      window.dashboardFixture.setFilter('amount', {
        operator: 'between',
        min: 0,
        max: 0,
      })
      window.dashboardFixture.setFilter('region', {
        operator: 'in',
        values: ['West'],
      })
    })
    await expect(
      page.getByRole('spinbutton', {
        name: 'Amount minimum',
        exact: true,
      }),
    ).toHaveValue('0')
    await expect(choiceTrigger('Region')).toHaveText('West')
    assert.deepEqual(await applyAndReadRows(), ['record-1', 'record-5'])
    await page.evaluate(() =>
      window.dashboardFixture.setFilter('active', false),
    )
    assert.deepEqual(await applyAndReadRows(), [])
    await page.evaluate(() => window.dashboardFixture.setFilter('active', true))
    await page
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill('Record 5')
    assert.deepEqual(await applyAndReadRows(), ['record-5'])
    for (const id of ['name', 'region', 'amount', 'active'])
      await page.evaluate(
        (id) => window.dashboardFixture.setFilter(id, undefined),
        id,
      )
    assert.equal((await applyAndReadRows()).length, 8)
    await page.evaluate(() =>
      window.dashboardFixture.setFilter('amount', { operator: 'empty' }),
    )
    await page.evaluate(() =>
      window.dashboardFixture.setFilter('amount', undefined),
    )
    await expect(
      page.getByRole('spinbutton', {
        name: 'Amount minimum',
        exact: true,
      }),
    ).toBeVisible()
    await page
      .getByRole('combobox', { name: 'Add grouping', exact: true })
      .selectOption('tags')
    assert.equal(await page.locator('tr[data-group]').count(), 4)
  })
  await test('Global search includes boolean, numeric, date, and collection values', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    const search = page.getByRole('searchbox', {
      name: 'Search all columns',
      exact: true,
    })
    for (const [query, expected] of [
      ['Priority', ['record-1', 'record-4', 'record-5', 'record-8']],
      ['false', ['record-2', 'record-4', 'record-6', 'record-8']],
      ['Archived', ['record-3', 'record-7']],
      ['-3.25', ['record-4', 'record-8']],
      ['2026-01-08', ['record-8']],
    ]) {
      await search.fill(query)
      assert.deepEqual(await applyAndReadRows(), expected)
    }
    await search.fill('')
    assert.equal((await applyAndReadRows()).length, 8)
  })
  await test('Sorting filtering grouping and display controls use the shared Table', async () => {
    await page
      .getByRole('button', { name: 'Sort by Name', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Sort by Name', exact: true })
      .click()
    assert.deepEqual(await applyAndReadRows(), ['record-2', 'record-1'])
    await pick('Region', 'West')
    assert.deepEqual(await applyAndReadRows(), ['record-1'])
    await page
      .getByRole('button', { name: 'Clear Region filter', exact: true })
      .click()
    await apply().click()
    await page
      .getByRole('combobox', { name: 'Add grouping', exact: true })
      .selectOption('region')
    assert.equal(await page.locator('tr[data-group]').count(), 2)
    await page
      .getByRole('button', { name: 'Clear grouping', exact: true })
      .click()
    await page.getByText('Display columns', { exact: true }).click()
    await page
      .getByRole('group', { name: 'Visible columns', exact: true })
      .getByText('Active', { exact: true })
      .click()
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
        .locator('.column-filters .table-column-filter')
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
    const filter = choiceTrigger('Region')
    await pick('Region', 'West')
    await apply().click()
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
    assert.equal(await filter.textContent(), 'West')
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
    assert.equal(await filter.textContent(), 'West')
    assert.equal(
      await filter.evaluate((node) => node === window.savedTableFilter),
      true,
    )
    await page.getByText('Filters', { exact: true }).click()
    assert.equal(
      await page.getByText('1 active', { exact: true }).isVisible(),
      true,
    )
    assert.deepEqual(await applyAndReadRows(), ['record-1'])
    await page.getByText('Filters', { exact: true }).click()
    assert.equal(await filter.textContent(), 'West')
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
    assert.equal((await applyAndReadRows()).length, 8)
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
    await pick('Region', 'West')
    await apply().click()
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
      assert.equal(await zoomed.locator('thead th').count(), 8)
      for (const header of await zoomed.locator('thead th').all())
        assert.ok((await header.boundingBox()).width > 130)
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
