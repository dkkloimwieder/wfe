import {
  choiceControl,
  selectValue,
  controlValue,
  expectValue,
} from '../shared/controls/select-review.mjs'
import {
  appearanceColor,
  reviewAppearanceFocus,
} from '../shared/appearance/focus-review.mjs'
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
  async function resize(viewport) {
    await page.setViewportSize(viewport)
    // Media-query listeners and reactive updates finish before the next interaction.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    )
  }
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
    page.getByRole('button', { name: 'Refresh results', exact: true })
  async function applyAndReadRows() {
    const button = page.locator('.table-filter-actions button')
    if (await button.isEnabled()) await button.click()
    return rows()
  }
  const choiceTrigger = (label) =>
    page
      .locator('.table-workspace-controls')
      .getByRole('button', { name: new RegExp('^' + label + '(?:\\s|$)') })
      .and(page.locator(':not([data-ui-text="system"])'))
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
    await resize({ width: 1440, height: 1000 })
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
    await selectValue(
      choiceControl(page, { name: 'Region', exact: true }),
      'East',
    )
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
      await controlValue(page.getByLabel('Record name', { exact: true })),
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
    const active = choiceControl(page, {
      name: 'Active',
      exact: true,
    })
    const date = choiceControl(page, {
      name: 'Created',
      exact: true,
    })
    const amount = choiceControl(page, {
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
    await selectValue(active, 'boolean-text')
    await expect(cell(1, 'active')).toHaveText('Yes')
    await expect(cell(2, 'active')).toHaveText('No')
    await selectValue(date, 'date-long')
    await expect(cell(1, 'created')).toHaveText('January 1, 2026')
    await selectValue(date, 'date-short')
    await expect(cell(1, 'created')).toHaveText('01/01/2026')
    await selectValue(amount, 'number-decimal')
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
    await selectValue(active, 'boolean-symbol')
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
    await selectValue(amount, 'number-grouped')
    assert.deepEqual((await applyAndReadRows()).slice(0, 2), [
      'record-4',
      'record-8',
    ])
    const grouping = choiceControl(page, {
      name: 'Add grouping',
      exact: true,
    })
    await selectValue(grouping, 'active')
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
    await selectValue(grouping, 'created')
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
    await expectValue(active, 'boolean-symbol')
    await expectValue(date, 'date-short')
    await expectValue(amount, 'number-grouped')
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
    assert.equal(await controlValue(start), '2026-01-02')
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
    await selectValue(
      choiceControl(page, { name: 'Add grouping', exact: true }),
      'created',
    )
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
    const match = choiceControl(page, {
      name: 'Name match',
      exact: true,
    })
    await text.fill('RECORD 1')
    assert.deepEqual(await applyAndReadRows(), ['record-1'])
    for (const mode of ['equals', 'starts-with']) {
      await selectValue(match, mode)
      assert.deepEqual(await applyAndReadRows(), ['record-1'])
    }
    await selectValue(match, 'not-contains')
    assert.equal((await applyAndReadRows()).length, 7)
    await text.press('Escape')
    await expect(text).toBeFocused()
    assert.equal((await applyAndReadRows()).length, 8)
    assert.equal(await controlValue(match), 'contains')
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
    await selectValue(
      choiceControl(page, { name: 'Region match', exact: true }),
      'not-in',
    )
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
    await selectValue(
      choiceControl(page, { name: 'Status match', exact: true }),
      'not-in',
    )
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
    const mode = choiceControl(page, {
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
    await expectValue(min, '')
    await expect(min).not.toHaveAttribute('aria-invalid', 'true')
    await min.fill('20')
    assert.deepEqual(await applyAndReadRows(), [])
    await selectValue(mode, 'empty')
    assert.deepEqual(await applyAndReadRows(), ['record-3', 'record-7'])
    await selectValue(mode, 'not-empty')
    assert.equal((await applyAndReadRows()).length, 6)
    await page
      .getByRole('button', { name: 'Clear Amount filter', exact: true })
      .click()
    await expectValue(min, '')
    await expectValue(max, '')
    assert.equal((await applyAndReadRows()).length, 8)
  })
  await test('Nullable text distinguishes empty records from ordinary text and negative matching', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    const mode = choiceControl(page, {
      name: 'Notes match',
      exact: true,
    })
    await selectValue(mode, 'empty')
    assert.deepEqual(await applyAndReadRows(), [
      'record-1',
      'record-3',
      'record-5',
      'record-7',
    ])
    await selectValue(mode, 'not-empty')
    assert.equal((await applyAndReadRows()).length, 4)
    await selectValue(mode, 'equals')
    await page
      .getByRole('textbox', { name: 'Notes', exact: true })
      .fill('Ready to review')
    assert.deepEqual(await applyAndReadRows(), ['record-2', 'record-6'])
    await selectValue(mode, 'not-contains')
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
    const mode = choiceControl(page, {
      name: 'Tags match',
      exact: true,
    })
    await selectValue(mode, 'all')
    assert.deepEqual(await applyAndReadRows(), ['record-4', 'record-8'])
    await selectValue(mode, 'not-in')
    assert.deepEqual(await applyAndReadRows(), [])
    await selectValue(mode, 'empty')
    assert.deepEqual(await applyAndReadRows(), ['record-3', 'record-7'])
    await selectValue(mode, 'not-empty')
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
    await expectValue(
      page.getByRole('spinbutton', {
        name: 'Amount minimum',
        exact: true,
      }),
      '0',
    )
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
    await selectValue(
      choiceControl(page, { name: 'Add grouping', exact: true }),
      'tags',
    )
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
    await selectValue(
      choiceControl(page, { name: 'Add grouping', exact: true }),
      'region',
    )
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
      await selectValue(
        choiceControl(page, { name: 'Add grouping', exact: true }),
        id,
      )
    }
    for (const width of [1440, 1100, 700, 390]) {
      await resize({ width, height: 1000 })
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
      const add = await choiceControl(page, {
        name: 'Add grouping',
        exact: true,
      }).boundingBox()
      assert.equal(search.x, filters.x)
      assert.equal(search.width, filters.width)
      assert.equal(add.x, filters.x)
      assert.equal(add.width, filters.width)
      const levels = page.locator('.grouping-levels > li')
      const controls = []
      for (const level of await levels.all()) {
        const order = await level.locator('.popup-trigger').boundingBox()
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
  await test('APPLY stays in the shared header while control sections scroll below it', async () => {
    for (const viewport of [
      { width: 1440, height: 500 },
      { width: 390, height: 568 },
    ]) {
      await resize(viewport)
      if (viewport.width < 768)
        await page
          .getByRole('button', { name: 'Table controls', exact: true })
          .click()
      const pane = page.locator('.table-workspace-controls')
      const header = page.locator('.table-workspace-header')
      const body = pane.locator('.table-workspace-controls-body')
      const paneBox = await pane.boundingBox()
      const headerBox = await header.boundingBox()
      const bodyBox = await body.boundingBox()
      const frame = await page.locator('.table-workspace').boundingBox()
      assert.equal(headerBox.x, frame.x + 1)
      assert.equal(headerBox.width, frame.width - 2)
      assert.ok(paneBox.y >= headerBox.y + headerBox.height)
      assert.ok(bodyBox.y >= headerBox.y + headerBox.height)
      assert.equal(
        await header.evaluate(
          (node) => getComputedStyle(node).borderBottomWidth,
        ),
        '1px',
      )
      assert.equal(
        await pane.evaluate((node) => getComputedStyle(node).borderTopColor),
        await page
          .locator('.table-workspace-results')
          .evaluate((node) => getComputedStyle(node).borderTopColor),
      )
      assert.equal(
        await header.evaluate((node) => getComputedStyle(node).backgroundColor),
        await page
          .locator('.table-workspace-results')
          .evaluate((node) => getComputedStyle(node).backgroundColor),
      )
      await body.evaluate((node) => {
        node.scrollTop = node.scrollHeight
      })
      assert.ok(await body.evaluate((node) => node.scrollTop > 0))
      assert.deepEqual(await header.boundingBox(), headerBox)
      await expect(apply()).toBeVisible()
      await page
        .getByText('Filters', { exact: true })
        .evaluate((node) => (node.closest('details').open = false))
      await expect(apply()).toBeVisible()
      assert.deepEqual(await header.boundingBox(), headerBox)
      await page
        .getByText('Filters', { exact: true })
        .evaluate((node) => (node.closest('details').open = true))
      await body.evaluate((node) => {
        node.scrollTop = 0
      })
      await page
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill('Record 1')
      await body.evaluate((node) => {
        node.scrollTop = node.scrollHeight
      })
      await apply().click()
      await expect(apply()).toBeFocused()
      assert.deepEqual(await rows(), ['record-1'])
      await page.evaluate(() => window.dashboardFixture.start())
    }
  })
  await test('Expanded filters and grouping never consume the results height', async () => {
    await resize({ width: 1440, height: 500 })
    const scroller = page.locator('.table-scroll')
    const before = await scroller.boundingBox()
    assert.ok(before.height > 300)
    for (const id of ['name', 'region', 'active']) {
      await selectValue(
        choiceControl(page, { name: 'Add grouping', exact: true }),
        id,
      )
    }
    await page.getByText('Display columns', { exact: true }).click()
    assert.deepEqual(await scroller.boundingBox(), before)
    const controls = page.locator('.table-workspace-controls-body')
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
    await resize({ width: 390, height: 568 })
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
  await test('Desktop controls own collapse state by default and release stale callbacks', async () => {
    const toggle = page.getByRole('button', {
      name: 'Table controls',
      exact: true,
    })
    const pane = page.locator('.table-workspace-controls')
    const original = await page.locator('.table-scroll').boundingBox()
    const detached = await toggle.elementHandle()
    await toggle.press('Enter')
    await expect(pane).toBeHidden()
    assert.ok(
      (await page.locator('.table-scroll').boundingBox()).width >
        original.width,
    )
    await toggle.press('Space')
    await expect(pane).toBeVisible()
    assert.deepEqual(
      await page.locator('.table-scroll').boundingBox(),
      original,
    )
    await pane.locator('summary').filter({ hasText: 'Grouping' }).focus()
    await page.keyboard.press('Escape')
    await expect(toggle).toBeFocused()
    await expect(pane).toBeHidden()
    await page.evaluate(() => window.dashboardFixture.start())
    await detached.evaluate((node) => node.click())
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(pane).toBeVisible()
    await detached.dispose()
  })
  await test('The controls drawer preserves nodes and state and restores visible keyboard focus', async () => {
    const filter = choiceTrigger('Region')
    await pick('Region', 'West')
    await apply().click()
    await filter.evaluate((node) => {
      window.savedTableFilter = node
    })
    await resize({ width: 390, height: 844 })
    const toggle = page.getByRole('button', {
      name: 'Table controls',
      exact: true,
    })
    await expect(apply()).toBeFocused()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
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
    await resize({ width: 1440, height: 1000 })
    await expect(toggle).toBeFocused()
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
    await resize({ width: 390, height: 844 })
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
    await resize({ width: 390, height: 844 })
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
      await controlValue(page.getByLabel('Record name', { exact: true })),
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
    await resize({ width: 1440, height: 1000 })
    assert.equal(
      await controlValue(page.getByLabel('Record name', { exact: true })),
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
    assert.ok((await page.locator('.table-scroll').boundingBox()).height > 750)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight),
      1000,
    )
  })
  await test('Neutral surface modes, accents and depth preserve table state and geometry', async () => {
    const schemeButton = (name) =>
      page.getByRole('button', { name: `${name} surfaces`, exact: true })
    const accentButton = (name) =>
      page.getByRole('button', { name: `${name} accent`, exact: true })
    const depth = (level) =>
      page.getByRole('button', {
        name: level ? `Depth ${level}` : 'No shadows',
        exact: true,
      })
    const header = page.locator('.table-workspace-header')
    const caption = page.locator('.table-workspace-title')
    const tableHeader = page.locator('thead')
    const surface = page.locator('.table-scroll')
    const samples = page.locator('.surface-sample')
    const sample = (name) =>
      page.locator(`[data-swatch="${name}"] .surface-sample`)
    const background = (node) =>
      node.evaluate((element) => getComputedStyle(element).backgroundColor)
    await expect(samples).toHaveCount(6)
    await expect(schemeButton('Black / white')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    assert.equal(
      await apply().evaluate((node) => getComputedStyle(node).opacity),
      '1',
    )
    const name = page.getByRole('textbox', { name: 'Name', exact: true })
    await name.fill('Record 1')
    const initialRows = await rows()
    const geometry = await surface.boundingBox()
    const table = await page.locator('table').elementHandle()
    for (const scheme of ['Light', 'Dark', 'Black / white']) {
      await schemeButton(scheme).focus()
      await page.keyboard.press('Enter')
      await expect(schemeButton(scheme)).toHaveAttribute('aria-pressed', 'true')
      const colors = await page
        .locator('.surface-swatches code')
        .allTextContents()
      assert.equal(
        new Set(colors.slice(0, 4)).size,
        scheme === 'Black / white' ? 1 : 4,
      )
      const panes = [
        page.locator('.table-workspace-controls'),
        page.locator('.table-workspace-results'),
      ]
      const paneBoxes = await Promise.all(
        panes.map((node) => node.boundingBox()),
      )
      assert.equal(paneBoxes[0].y, paneBoxes[1].y)
      assert.equal(paneBoxes[0].height, paneBoxes[1].height)
      const paneSurface = 'Surface 1'
      for (const pane of panes)
        assert.equal(
          await background(pane),
          await background(sample(paneSurface)),
        )
      assert.equal(await background(header), await background(panes[0]))
      assert.equal(await background(tableHeader), await background(surface))
      for (const node of [
        caption,
        page.locator('.table-control-section > summary').first(),
      ])
        assert.equal(await background(node), 'rgba(0, 0, 0, 0)')
      assert.equal(
        await background(surface),
        await background(sample(paneSurface)),
      )
      const sectionShadow = await surface.evaluate(
        (node) => getComputedStyle(node).boxShadow,
      )
      assert.equal(sectionShadow, 'none')
      assert.equal(
        await page
          .locator('.table-control-section')
          .first()
          .evaluate((node) => getComputedStyle(node).boxShadow),
        sectionShadow,
      )
      assert.notEqual(
        await page
          .locator('.table-workspace')
          .evaluate((node) => getComputedStyle(node).boxShadow),
        'none',
      )
      assert.equal(
        await tableHeader.evaluate((node) => getComputedStyle(node).color),
        await background(sample('Text 1')),
      )
      assert.deepEqual(await surface.boundingBox(), geometry)
      assert.deepEqual(await rows(), initialRows)
      await expectValue(name, 'Record 1')
      assert.equal(
        await table.evaluate(
          (node) =>
            node.isConnected && node === document.querySelector('table'),
        ),
        true,
      )
    }
    await schemeButton('Light').click()
    const neutralColors = await samples.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).backgroundColor),
    )
    for (const button of await page
      .getByRole('group', { name: 'Accent colors', exact: true })
      .getByRole('button')
      .all()) {
      await button.click()
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      assert.deepEqual(
        await samples.evaluateAll((nodes) =>
          nodes.map((node) => getComputedStyle(node).backgroundColor),
        ),
        neutralColors,
      )
      for (const node of [caption])
        assert.equal(await background(node), 'rgba(0, 0, 0, 0)')
      assert.deepEqual(await surface.boundingBox(), geometry)
      assert.deepEqual(await rows(), initialRows)
      await expectValue(name, 'Record 1')
    }
    for (const mode of ['Light', 'Dark']) {
      await schemeButton(mode).click()
      for (const [layer, selector] of [
        ['Base', '.table-page'],
        ['Panes', '.table-workspace-results'],
        ['Content', '.table-scroll'],
      ]) {
        for (const level of [1, 2, 3]) {
          const button = page.getByRole('button', {
            name: `${layer} Surface ${level}`,
            exact: true,
          })
          await button.focus()
          await page.keyboard.press('Enter')
          await expect(button).toHaveAttribute('aria-pressed', 'true')
          assert.equal(
            await background(page.locator(selector)),
            await background(sample(`Surface ${level}`)),
          )
          assert.deepEqual(await surface.boundingBox(), geometry)
          assert.deepEqual(await rows(), initialRows)
          await expectValue(name, 'Record 1')
          assert.equal(await background(caption), 'rgba(0, 0, 0, 0)')
          assert.equal(await background(tableHeader), await background(surface))
        }
      }
    }
    await page
      .getByRole('button', { name: 'Base Surface 2', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Panes Surface 1', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Content Surface 1', exact: true })
      .click()
    const shadows = []
    for (const level of [1, 2, 3]) {
      await depth(level).click()
      await expect(depth(level)).toHaveAttribute('aria-pressed', 'true')
      shadows.push(
        await page
          .locator('.table-workspace')
          .evaluate((node) => getComputedStyle(node).boxShadow),
      )
      assert.deepEqual(await surface.boundingBox(), geometry)
    }
    assert.equal(new Set(shadows).size, 3)
    await depth(1).click()
    await schemeButton('Light').click()
    await accentButton('Blue').click()
    assert.equal(
      await page
        .locator('.table-page')
        .evaluate((node) =>
          getComputedStyle(node).getPropertyValue('--ui-focus').trim(),
        ),
      '#1c7ed6',
    )
    await choiceTrigger('Region').click()
    const popup = page.locator('.popup-content')
    assert.equal(await background(popup), await background(sample('Surface 1')))
    assert.notEqual(
      await popup.evaluate((node) => getComputedStyle(node).boxShadow),
      'none',
    )
    await page.keyboard.press('Escape')
    await depth(0).click()
    await expect(depth(0)).toHaveAttribute('aria-pressed', 'true')
    assert.equal(
      await surface.evaluate((node) => getComputedStyle(node).boxShadow),
      'none',
    )
    assert.equal(
      await sample('Surface 4').evaluate(
        (node) => getComputedStyle(node).boxShadow,
      ),
      'none',
    )
    await depth(1).click()
    assert.notEqual(
      await sample('Surface 4').evaluate(
        (node) => getComputedStyle(node).boxShadow,
      ),
      'none',
    )
    assert.deepEqual(await surface.boundingBox(), geometry)
    const detached = await accentButton('Blue').elementHandle()
    await page.evaluate(() => window.dashboardFixture.start())
    await detached.evaluate((node) => node.click())
    await expect(accentButton('Neutral')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await resize({ width: 390, height: 568 })
    for (const selector of [
      '.appearance-pickers',
      '.appearance-layers',
      '.surface-swatches',
    ])
      assert.ok(
        await page
          .locator(selector)
          .evaluate((node) => node.scrollWidth > node.clientWidth),
      )
    const narrow = await surface.boundingBox()
    await schemeButton('Dark').focus()
    await page.keyboard.press('Space')
    await accentButton('Blue').focus()
    await page.keyboard.press('Enter')
    assert.equal(
      await page
        .locator('.table-page')
        .evaluate((node) =>
          getComputedStyle(node).getPropertyValue('--ui-focus').trim(),
        ),
      '#d0ebff',
    )
    assert.deepEqual(await surface.boundingBox(), narrow)
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
      true,
    )
    await page.reload()
    await expect(schemeButton('Black / white')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(accentButton('Neutral')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await table.dispose()
    await detached.dispose()
  })
  await test('Controls collapse and move without replacing table nodes or pending drafts', async () => {
    const workspace = page.locator('.table-workspace')
    const pane = page.locator('.table-workspace-controls')
    const surface = page.locator('.table-scroll')
    const toggle = page.getByRole('button', {
      name: 'Table controls',
      exact: true,
    })
    const draft = page.getByRole('textbox', { name: 'Name', exact: true })
    await draft.fill('Record 1')
    await expect(page.locator('.table-controls-toggle')).toHaveCount(1)
    await expect(page.locator('.table-workspace-toolbar')).toHaveCount(0)
    await expect(
      page.locator('.table-workspace-header-actions button'),
    ).toHaveCount(2)
    const heading = page.locator('.table-workspace-title > span')
    const headingBox = await heading.boundingBox()
    const toggleBox = await toggle.boundingBox()
    assert.equal(toggleBox.width, toggleBox.height)
    const initialFrame = await workspace.boundingBox()
    assert.ok(
      Math.abs(
        headingBox.x +
          headingBox.width / 2 -
          initialFrame.x -
          initialFrame.width / 2,
      ) < 1,
    )
    assert.ok(toggleBox.x < headingBox.x)
    await expect(toggle).toHaveAttribute('title', 'HIDE CONTROLS')
    const iconBox = await toggle.locator('svg').boundingBox()
    assert.ok(
      Math.abs(
        iconBox.x + iconBox.width / 2 - toggleBox.x - toggleBox.width / 2,
      ) < 0.1,
    )
    assert.ok(
      Math.abs(
        iconBox.y + iconBox.height / 2 - toggleBox.y - toggleBox.height / 2,
      ) < 0.1,
    )
    const savedTable = await page.locator('table').elementHandle()
    const savedDraft = await draft.elementHandle()
    const initialRows = await rows()
    const original = await surface.boundingBox()
    await toggle.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(pane).toBeHidden()
    const full = await surface.boundingBox()
    assert.ok(full.width > original.width + 250)
    assert.equal(full.height, original.height)
    const frame = await workspace.boundingBox()
    assert.equal(full.width, frame.width - 2)
    await page
      .getByRole('button', { name: 'right controls pane', exact: true })
      .click()
    assert.deepEqual(await surface.boundingBox(), full)
    await toggle.click()
    const rightPane = await pane.boundingBox()
    const rightResults = await page
      .locator('.table-workspace-results')
      .boundingBox()
    assert.equal(rightResults.x + rightResults.width, rightPane.x)
    assert.equal((await surface.boundingBox()).width, original.width)
    await expectValue(draft, 'Record 1')
    await toggle.click()
    await page
      .getByRole('button', { name: 'top controls pane', exact: true })
      .click()
    assert.deepEqual(await surface.boundingBox(), full)
    await toggle.click()
    await expect(pane).toBeVisible()
    const top = await surface.boundingBox()
    assert.equal(top.width, full.width)
    assert.ok(top.height > original.height * 0.5)
    const paneBox = await pane.boundingBox()
    assert.ok(paneBox.height <= frame.height * 0.4)
    const sectionBoxes = await page
      .locator('.table-control-section')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const bounds = node.getBoundingClientRect()
          return {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            bottom: bounds.bottom,
          }
        }),
      )
    for (let index = 0; index < sectionBoxes.length; index++) {
      assert.equal(sectionBoxes[index].x, paneBox.x)
      assert.equal(sectionBoxes[index].width, paneBox.width)
      if (index)
        assert.equal(sectionBoxes[index].y, sectionBoxes[index - 1].bottom)
    }
    const filterBoxes = await page
      .locator('.column-filters > .table-filter')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const bounds = node.getBoundingClientRect()
          return { x: bounds.x, y: bounds.y }
        }),
      )
    assert.equal(filterBoxes[0].y, filterBoxes[1].y)
    assert.ok(filterBoxes[1].x > filterBoxes[0].x)
    const body = pane.locator('.table-workspace-controls-body')
    await body.evaluate((node) => {
      node.scrollTop = node.scrollHeight
    })
    assert.ok(await body.evaluate((node) => node.scrollTop > 0))
    assert.deepEqual(await surface.boundingBox(), top)
    await body.evaluate((node) => {
      node.scrollTop = 0
    })
    await expectValue(draft, 'Record 1')
    assert.deepEqual(await rows(), initialRows)
    const expandedHeight = (await pane.boundingBox()).height
    await pane.locator('.table-control-section').evaluateAll((nodes) =>
      nodes.forEach((node) => {
        node.open = false
      }),
    )
    const compactHeight = (await pane.boundingBox()).height
    assert.ok(compactHeight < expandedHeight)
    const contentHeight = await pane.evaluate((node) => {
      const sections = [
        ...node.querySelectorAll('.table-control-section'),
      ].reduce(
        (height, section) => height + section.getBoundingClientRect().height,
        0,
      )
      return sections + parseFloat(getComputedStyle(node).borderBottomWidth)
    })
    assert.equal(compactHeight, contentHeight)
    await pane
      .locator('.table-control-section')
      .first()
      .evaluate((node) => {
        node.open = true
      })
    await choiceTrigger('Region').click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.evaluate(() =>
      window.dashboardFixture.setControlsCollapsed(true),
    )
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(toggle).toBeFocused()
    await toggle.click()
    await draft.focus()
    await page.evaluate(() =>
      window.dashboardFixture.setControlsCollapsed(true),
    )
    await expect(toggle).toBeFocused()
    await expect(pane).toBeHidden()
    assert.deepEqual(await surface.boundingBox(), full)
    await toggle.press('Space')
    await page
      .getByRole('button', { name: 'left controls pane', exact: true })
      .click()
    assert.deepEqual(await surface.boundingBox(), original)
    assert.equal(
      await savedDraft.evaluate(
        (node) => node === document.querySelector('input[aria-label="Name"]'),
      ),
      true,
    )
    assert.equal(
      await savedTable.evaluate(
        (node) => node === document.querySelector('table'),
      ),
      true,
    )
    await expectValue(draft, 'Record 1')
    await apply().click()
    assert.deepEqual(await rows(), ['record-1'])
    const sections = await page
      .locator('.table-control-section')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          border: getComputedStyle(node).borderLeftWidth,
          margin: getComputedStyle(node).marginTop,
        })),
      )
    assert.ok(
      sections.every(
        (section) => section.border === '0px' && section.margin === '0px',
      ),
    )
    await page.getByText('Filters', { exact: true }).click()
    await page.getByText('Grouping', { exact: true }).click()
    assert.deepEqual(await surface.boundingBox(), original)
    await toggle.click()
    await toggle.focus()
    await resize({ width: 390, height: 568 })
    await expect(toggle).toBeFocused()
    const narrow = await surface.boundingBox()
    await toggle.press('Enter')
    await expect(pane).toBeVisible()
    assert.deepEqual(await surface.boundingBox(), narrow)
    await page
      .getByRole('button', { name: 'Close table controls', exact: true })
      .click()
    await resize({ width: 1440, height: 1000 })
    await expect(toggle).toBeFocused()
    await expect(pane).toBeHidden()
    await toggle.click()
    await page
      .getByRole('button', { name: 'top controls pane', exact: true })
      .click()
    await resize({ width: 960, height: 540 })
    assert.ok((await surface.boundingBox()).height > 120)
    await page
      .getByRole('button', { name: 'right controls pane', exact: true })
      .click()
    await resize({ width: 390, height: 568 })
    await toggle.click()
    await expect(pane).toBeVisible()
    assert.equal(
      await pane
        .locator('.table-workspace-controls-body')
        .evaluate((node) => getComputedStyle(node).flexDirection),
      'column',
    )
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
      true,
    )
  })
  await test('The merged header centers its title and places actions at the configured edge', async () => {
    const header = page.locator('.table-workspace-header')
    const title = page.locator('.table-workspace-title')
    const actions = page.locator('.table-workspace-header-actions')
    const pane = page.locator('.table-workspace-controls')
    const toggle = page.getByRole('button', {
      name: 'Table controls',
      exact: true,
    })
    const table = await page.locator('table').elementHandle()
    const draft = page.getByRole('textbox', { name: 'Name', exact: true })
    await draft.fill('Record 1')
    const draftNode = await draft.elementHandle()
    for (const placement of ['left', 'top', 'right']) {
      await page
        .getByRole('button', {
          name: `${placement} controls pane`,
          exact: true,
        })
        .click()
      for (const width of [1440, 390]) {
        await resize({ width, height: 900 })
        await expect(toggle).toHaveAttribute(
          'aria-expanded',
          width === 390 ? 'false' : 'true',
        )
        for (let step = 0; step < 2; step++) {
          const bounds = await header.boundingBox()
          assert.equal(bounds.height, 35)
          const titleBox = await title.boundingBox()
          const actionsBox = await actions.boundingBox()
          assert.ok(
            Math.abs(
              titleBox.x + titleBox.width / 2 - bounds.x - bounds.width / 2,
            ) < 1,
          )
          if (placement === 'right') {
            assert.ok(actionsBox.x >= titleBox.x + titleBox.width)
            const lastButton = await actions
              .locator(':scope > *')
              .last()
              .boundingBox()
            assert.ok(
              Math.abs(
                lastButton.x + lastButton.width - bounds.x - bounds.width + 8,
              ) < 1,
            )
          } else {
            assert.ok(actionsBox.x + actionsBox.width <= titleBox.x)
            const firstButton = await actions
              .getByRole('button')
              .first()
              .boundingBox()
            assert.ok(Math.abs(firstButton.x - bounds.x - 8) < 1)
          }
          assert.equal(await page.locator('.table-workspace-header').count(), 1)
          assert.equal(
            await page
              .locator(
                '.table-workspace-results-header, .table-workspace-controls-header',
              )
              .count(),
            0,
          )
          await toggle.click()
          if (await pane.isVisible()) {
            const paneBox = await pane.boundingBox()
            assert.ok(paneBox.y >= bounds.y + bounds.height)
          }
        }
      }
    }
    assert.equal(
      await table.evaluate((n) => n === document.querySelector('table')),
      true,
    )
    assert.equal(
      await draftNode.evaluate(
        (n) => n === document.querySelector('input[aria-label="Name"]'),
      ),
      true,
    )
    assert.equal(await draftNode.evaluate((node) => node.value), 'Record 1')
    await resize({ width: 1440, height: 900 })
    await page.evaluate(() =>
      window.dashboardFixture.setControlsCollapsed(true),
    )
    await apply().click()
    assert.deepEqual(await rows(), ['record-1'])
    await expect(pane).toBeHidden()
    await table.dispose()
    await draftNode.dispose()
  })
  await test('Button tones keep colored outlines, true inversion and contrasting hover states', async () => {
    const samples = page.getByRole('group', {
      name: 'Button variants',
      exact: true,
    })
    const tones = page.getByRole('group', { name: 'Button tone', exact: true })
    const sample = (variant) =>
      samples.getByRole('button', { name: variant, exact: true })
    const values = (button) =>
      button.evaluate((node) => {
        const style = getComputedStyle(node)
        return { background: style.backgroundColor, color: style.color }
      })
    const luminance = (color) => {
      const channels = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const channel = color.startsWith('color(') ? value : value / 255
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
        })
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }
    const readable = (colors) => {
      const a = luminance(colors.background),
        b = luminance(colors.color)
      assert.ok(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
        JSON.stringify(colors),
      )
    }
    for (const mode of ['Black / white', 'Light', 'Dark']) {
      await page
        .getByRole('button', { name: `${mode} surfaces`, exact: true })
        .click()
      await tones.getByRole('button', { name: 'accent', exact: true }).click()
      for (const accent of await page
        .getByRole('group', { name: 'Accent colors', exact: true })
        .getByRole('button')
        .all()) {
        await accent.click()
        const filled = await values(sample('filled'))
        const inverted = await values(sample('inverted'))
        const outline = await sample('outline').evaluate((node) => {
          const style = getComputedStyle(node)
          return { text: style.color, border: style.borderTopColor }
        })
        assert.equal(outline.text, filled.background)
        assert.equal(outline.border, filled.background)
        assert.deepEqual(inverted, {
          background: filled.color,
          color: filled.background,
        })
        for (const variant of ['filled', 'inverted']) {
          const button = sample(variant)
          const before = await values(button)
          readable(before)
          await button.hover()
          const hovered = await values(button)
          assert.notDeepEqual(hovered, before)
          readable(hovered)
          await page.mouse.move(0, 0)
        }
        for (const button of await samples.getByRole('button').all()) {
          await button.hover()
          assert.equal(
            await button.evaluate((node) =>
              getComputedStyle(node).textDecorationLine.includes('underline'),
            ),
            false,
          )
        }
      }
      const node = await sample('outline').elementHandle()
      const original = await sample('outline').boundingBox()
      await tones.getByRole('button', { name: 'neutral', exact: true }).click()
      const filled = await values(sample('filled'))
      assert.deepEqual(await values(sample('inverted')), {
        background: filled.color,
        color: filled.background,
      })
      assert.equal(await sample('outline').getAttribute('data-tone'), 'neutral')
      assert.equal(
        await sample('outline').evaluate(
          (node) => getComputedStyle(node).color,
        ),
        filled.background,
      )
      assert.deepEqual(await sample('outline').boundingBox(), original)
      assert.equal(await node.evaluate((node) => node.isConnected), true)
      await node.dispose()
      const heights = await samples
        .getByRole('button')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().height),
        )
      assert.equal(new Set(heights).size, 1)
    }
  })
  await test('All filter selects share caret geometry, hover and accent highlights', async () => {
    const operator = choiceControl(page, {
      name: 'Region match',
      exact: true,
    })
    const value = choiceTrigger('Region')
    const original = await operator.boundingBox()
    for (const mode of ['Light', 'Dark']) {
      await page
        .getByRole('button', { name: `${mode} surfaces`, exact: true })
        .click()
      for (const accent of ['Blue', 'Violet', 'Orange']) {
        await page
          .getByRole('button', { name: `${accent} accent`, exact: true })
          .click()
        const fill = await appearanceColor(page, '--ui-selection')
        const ink = await appearanceColor(page, '--ui-on-selection')
        assert.ok(
          (await appearanceColor(page, '--ui-focus-ring')).includes('0.85'),
        )
        const styles = []
        for (const control of [operator, value]) {
          await page.mouse.move(0, 0)
          const rest = await control.evaluate((node) => {
            const style = getComputedStyle(node)
            return {
              caret: style.backgroundImage,
              position: style.backgroundPosition,
              paddingStart: style.paddingInlineStart,
              paddingEnd: style.paddingInlineEnd,
              height: node.getBoundingClientRect().height,
              fill: style.backgroundColor,
            }
          })
          await control.hover()
          const hover = await control.evaluate(
            (node) => getComputedStyle(node).backgroundColor,
          )
          assert.notEqual(hover, rest.fill)
          styles.push({ ...rest, fill: undefined, hover })
          await control.click()
          await page.getByRole('listbox').getByRole('option').first().hover()
          const option = page
            .getByRole('listbox')
            .locator('[data-highlighted]')
            .first()
          assert.deepEqual(
            await option.evaluate((node) => {
              const style = getComputedStyle(node)
              return { fill: style.backgroundColor, ink: style.color }
            }),
            { fill, ink },
          )
          await page.keyboard.press('Escape')
          await expect(control).toBeFocused()
          await expect(page.locator('.table-workspace')).toHaveAttribute(
            'data-controls-placement',
            'left',
          )
        }
        assert.deepEqual(styles[0], styles[1])
        assert.deepEqual(await operator.boundingBox(), original)
      }
    }
  })
  await test('All editable filter inputs share hover treatment without moving', async () => {
    await page
      .getByRole('button', { name: 'Light surfaces', exact: true })
      .click()
    const controls = page.locator(
      '.table-workspace-controls-body .ui-input, .table-workspace-controls-body .popup-trigger, .table-workspace-controls-body .ui-check-control',
    )
    let count = 0
    for (const control of await controls.all()) {
      if (!(await control.isVisible()) || (await control.isDisabled())) continue
      await page.mouse.move(0, 0)
      await control.scrollIntoViewIfNeeded()
      const before = await control.boundingBox()
      const color = await control.evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      )
      await control.hover()
      assert.notEqual(
        await control.evaluate(
          (node) => getComputedStyle(node).backgroundColor,
        ),
        color,
      )
      assert.deepEqual(await control.boundingBox(), before)
      count++
    }
    assert.ok(count >= 12)
    assert.equal(
      await page.locator('.table-workspace select.ui-native-select').count(),
      0,
    )
  })
  await test('Appearance button focus rings stay complete across desktop and narrow strips', async () => {
    await reviewAppearanceFocus(page)
  })
  await test('Column headers stay visible while rows scroll in every pane placement', async () => {
    await page.evaluate(() => window.dashboardFixture.replaceRows(500))
    for (const placement of ['left', 'top', 'right']) {
      await page
        .getByRole('button', {
          name: `${placement} controls pane`,
          exact: true,
        })
        .click()
      const viewport = page.locator('.table-scroll')
      const header = viewport.locator('thead')
      await viewport.evaluate((node) => {
        node.scrollTop = 800
      })
      await expect
        .poll(() =>
          header.evaluate((node) => {
            const viewport = node.closest('.table-scroll')
            return Math.abs(
              node.getBoundingClientRect().top -
                viewport.getBoundingClientRect().top,
            )
          }),
        )
        .toBeLessThanOrEqual(1)
      assert.ok(await viewport.evaluate((node) => node.scrollTop > 0))
      const first = header.locator('th').first()
      assert.equal(
        await first.evaluate((node) => {
          const rect = node.getBoundingClientRect()
          return node.contains(
            document.elementFromPoint(
              rect.left + 10,
              rect.top + rect.height / 2,
            ),
          )
        }),
        true,
      )
      const before = await first.boundingBox()
      await viewport.evaluate((node) => {
        node.scrollLeft = 100
      })
      const moved = await viewport.evaluate((node) => node.scrollLeft)
      const after = await first.boundingBox()
      assert.ok(Math.abs(after.x - before.x + moved) <= 1)
      await viewport.evaluate((node) => {
        node.scrollTop = 0
        node.scrollLeft = 0
      })
    }
  })
  await test('Shared APPLY reveals invalid fields in a collapsed pane or closed narrow drawer', async () => {
    const pane = page.locator('.table-workspace-controls')
    const toggle = page.getByRole('button', {
      name: 'Table controls',
      exact: true,
    })
    const start = page.getByRole('textbox', {
      name: 'Created start',
      exact: true,
    })
    for (const width of [1440, 390]) {
      await resize({ width, height: 900 })
      await expect(toggle).toHaveAttribute(
        'aria-expanded',
        width === 390 ? 'false' : 'true',
      )
      if (!(await pane.isVisible())) await toggle.click()
      await page
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill(width === 1440 ? 'Record 1' : 'Record 2')
      await start.fill('invalid')
      await start.press('Tab')
      await expect(start).toHaveAttribute('aria-invalid', 'true')
      await toggle.click()
      await expect(pane).toBeHidden()
      await apply().click()
      await expect(pane).toBeVisible()
      await expect(start).toBeFocused()
      await expectValue(start, 'invalid')
      await start.fill('2026-01-01')
      await start.press('Tab')
      await apply().click()
    }
  })
  await test('The Table starts level with controls and keeps its summary pinned below scrolling records', async () => {
    const controls = page.locator('.table-workspace-controls')
    const scroller = page.locator('.table-scroll')
    const footer = page.locator('.table-workspace-summary')
    const controlsBox = await controls.boundingBox()
    const tableBox = await scroller.boundingBox()
    assert.equal(
      (await page.locator('.table-workspace-results').boundingBox()).y,
      controlsBox.y,
    )
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
    await selectValue(
      choiceControl(page, { name: 'Add grouping', exact: true }),
      'region',
    )
    const groupValue = page.locator('[data-group-toggle]').first()
    assert.equal(
      await groupValue.evaluate((node) => getComputedStyle(node).textTransform),
      'none',
    )
    await page.evaluate(() => window.dashboardFixture.replaceRows(0))
    assert.deepEqual(await footer.boundingBox(), before)
    assert.equal(await footer.textContent(), '0/0 records')
  })
  await test('Display alignment follows column identity across grouping, visibility and movement', async () => {
    await page.getByText('Display columns', { exact: true }).click()
    const align = (name) =>
      choiceControl(page, { name: `${name} alignment`, exact: true })
    const cell = (id) =>
      page.locator(`tr[data-row="record-1"] td[data-column="${id}"]`)
    const header = (id) => page.locator(`thead th[data-column="${id}"]`)
    for (const value of ['center', 'right', 'left']) {
      await selectValue(align('Name'), value)
      assert.equal(
        await cell('name').evaluate((n) => getComputedStyle(n).textAlign),
        value,
      )
      assert.equal(
        await header('name').evaluate((n) => getComputedStyle(n).textAlign),
        value,
      )
      assert.equal(
        await header('name')
          .locator('.column-move')
          .evaluate((n) => getComputedStyle(n).textAlign),
        value,
      )
    }
    await page.evaluate(() =>
      window.dashboardFixture.setColumnAlignment('active', 'center'),
    )
    await expectValue(align('Active'), 'center')
    assert.equal(
      await cell('active').evaluate((n) => getComputedStyle(n).textAlign),
      'center',
    )
    const labelBounds = (node) => {
      const range = document.createRange()
      range.selectNodeContents(node)
      const { x, width } = range.getBoundingClientRect()
      return { x, width }
    }
    await selectValue(align('Name'), 'center')
    const nameCell = await cell('name').boundingBox()
    const nameLabel = await header('name')
      .locator('.column-move')
      .evaluate(labelBounds)
    assert.ok(
      Math.abs(
        nameLabel.x + nameLabel.width / 2 - nameCell.x - nameCell.width / 2,
      ) < 1,
    )
    await selectValue(align('Amount'), 'right')
    await page
      .getByRole('button', { name: 'Move Amount column', exact: true })
      .focus()
    await page.keyboard.press('Home')
    const amountValue = await cell('amount').evaluate(labelBounds)
    const amountLabel = await header('amount')
      .locator('.column-move')
      .evaluate(labelBounds)
    assert.ok(
      Math.abs(
        amountValue.x + amountValue.width - amountLabel.x - amountLabel.width,
      ) < 1,
    )
    await expect(header('amount')).toHaveAttribute(
      'data-column-alignment',
      'right',
    )
    const visible = page.getByRole('group', {
      name: 'Visible columns',
      exact: true,
    })
    await visible.getByText('Amount', { exact: true }).click()
    await expect(header('amount')).toHaveCount(0)
    await expectValue(align('Amount'), 'right')
    await visible.getByText('Amount', { exact: true }).click()
    await expect(cell('amount')).toHaveAttribute(
      'data-column-alignment',
      'right',
    )
    assert.equal(await cell('amount').textContent(), '0')
    await page.evaluate(() =>
      window.dashboardFixture.setColumnAlignment('region', 'right'),
    )
    await selectValue(
      choiceControl(page, { name: 'Add grouping', exact: true }),
      'region',
    )
    const grouped = page
      .locator('tr[data-group] td[data-column="region"]')
      .first()
    assert.equal(
      await grouped.evaluate((n) => getComputedStyle(n).textAlign),
      'right',
    )
    const summary = page
      .locator('tr[data-group] td[data-column="amount"]')
      .first()
    assert.equal(
      await summary.evaluate((n) => getComputedStyle(n).textAlign),
      'right',
    )
  })
  await test('Row and column dividers use independent surfaces in every neutral mode', async () => {
    const color = async (selector, property) =>
      page
        .locator(selector)
        .first()
        .evaluate((node, key) => getComputedStyle(node)[key], property)
    const head = 'thead th:not(:last-child)'
    const body = 'tr[data-row] td:not(:last-child)'
    const first = 'rgb(252, 252, 253)'
    assert.equal(await color(head, 'borderInlineEndColor'), first)
    assert.equal(await color(body, 'borderInlineEndColor'), first)
    assert.equal(await color(body, 'borderTopColor'), first)
    for (const [scheme, row, column] of [
      ['Black / white', 'rgb(233, 236, 239)', 'rgb(206, 212, 218)'],
      ['Light', 'rgb(233, 236, 239)', 'rgb(206, 212, 218)'],
      ['Dark', 'rgb(52, 58, 64)', 'rgb(134, 142, 150)'],
    ]) {
      await page
        .getByRole('button', { name: `${scheme} surfaces`, exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Row lines Surface 2', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Column lines Surface 4', exact: true })
        .click()
      assert.equal(await color(head, 'borderInlineEndColor'), column)
      assert.equal(await color(body, 'borderInlineEndColor'), column)
      assert.equal(await color(body, 'borderTopColor'), row)
      assert.equal(await color(head, 'borderInlineEndWidth'), '1px')
      assert.equal(
        await color('thead tr:first-child th', 'borderTopWidth'),
        '0px',
      )
    }
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
        await selectValue(
          choiceControl(zoomed, { name: 'Add grouping', exact: true }),
          id,
        )
      }
      assert.deepEqual(
        await zoomed.locator('.table-scroll').boundingBox(),
        before,
      )
      assert.ok(before.width > 600)
      assert.ok(before.height > 280)
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
      assert.ok(narrow.height > 320)
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
