import { reviewThemeHost } from '../shared/appearance/host-review.mjs'
import {
  choiceControl,
  selectValue,
  controlValue,
  expectValue,
} from '../shared/controls/select-review.mjs'
import { reviewAppearanceFocus } from '../shared/appearance/focus-review.mjs'
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
        ? '/components/dist/table/Table.jsx'
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
  await reviewThemeHost(page)
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
    await expect(apply()).toBeEnabled()
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
    await expect(apply()).toBeEnabled()
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

    await start.fill('2026-01-02')

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
  await test('Selected tags retain multiple choices until explicit application', async () => {
    await page
      .getByRole('button', { name: 'Eight records', exact: true })
      .click()
    const trigger = choiceTrigger('Tags')
    await trigger.click()
    const list = page.getByRole('listbox')
    const option = list.getByRole('option', { name: 'Priority', exact: true })
    await option.click()
    await expect(option).toHaveAttribute('aria-selected', 'true')
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
      const frame = await page.locator('.table-workspace').evaluate((node) => ({
        x: node.getBoundingClientRect().x + node.clientLeft,
        width: node.clientWidth,
      }))
      assert.equal(headerBox.x, frame.x)
      assert.equal(headerBox.width, frame.width)
      assert.ok(paneBox.y >= headerBox.y + headerBox.height)
      assert.ok(bodyBox.y >= headerBox.y + headerBox.height)

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
  await test('Theme controls preserve table state and owners', async () => {
    const surface = page.locator('.table-scroll')
    const original = await surface.elementHandle()
    const table = await page.locator('table').elementHandle()
    const draft = page.getByRole('textbox', { name: 'Name', exact: true })
    await draft.fill('Record 1')
    const initialRows = await rows()
    const retained = async () => {
      assert.deepEqual(await rows(), initialRows)
      await expectValue(draft, 'Record 1')
      assert.equal(
        await surface.evaluate((node, saved) => node === saved, original),
        true,
      )
      assert.equal(
        await table.evaluate(
          (node) =>
            node.isConnected && node === document.querySelector('table'),
        ),
        true,
      )
    }
    for (const mode of ['Dark', 'Light', 'Black / white']) {
      const button = page.getByRole('button', {
        name: `${mode} surfaces`,
        exact: true,
      })
      await button.focus()
      await page.keyboard.press('Enter')
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      await retained()
    }
    for (const button of await page
      .getByRole('group', { name: 'Accent colors', exact: true })
      .getByRole('button')
      .all()) {
      await button.click()
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      await retained()
    }
    const detached = await page
      .getByRole('button', { name: 'Neutral accent', exact: true })
      .elementHandle()
    await page.evaluate(() => window.dashboardFixture.start())
    await detached.evaluate((node) => node.click())
    await expect(
      page.getByRole('button', { name: 'Blue accent', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await detached.dispose()
    await table.dispose()
    await original.dispose()
    await page.reload()
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
    await expect(page.locator('.table-workspace-title-text')).toHaveText(
      'Records',
    )
    await expect(toggle).toHaveAttribute('title', 'HIDE CONTROLS')
    const savedTable = await page.locator('table').elementHandle()
    const savedDraft = await draft.elementHandle()
    const initialRows = await rows()
    const original = await surface.boundingBox()
    await toggle.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(pane).toBeHidden()
    const full = await surface.boundingBox()
    assert.ok(full.width > original.width)
    assert.equal(full.height, original.height)
    const frame = await workspace.boundingBox()
    await expect(workspace.locator('.table-workspace-resize')).toBeHidden()
    assert.equal(
      full.width,
      await workspace.evaluate((node) => node.clientWidth),
    )
    await page
      .getByRole('button', { name: 'right controls pane', exact: true })
      .click()
    const closedRight = await surface.boundingBox()
    assert.equal(closedRight.width, full.width)
    assert.equal(closedRight.height, full.height)
    assert.equal(
      closedRight.x,
      await workspace.evaluate(
        (node) => node.getBoundingClientRect().x + node.clientLeft,
      ),
    )
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
    const closedTop = await surface.boundingBox()
    assert.equal(closedTop.width, full.width)
    assert.equal(closedTop.height, full.height)
    await toggle.click()
    await expect(pane).toBeVisible()
    const top = await surface.boundingBox()
    assert.equal(top.width, closedTop.width)
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
    const display = pane
      .locator('.table-control-section')
      .filter({ has: page.locator('.display-fields') })
    await display.locator('summary').click()
    const displayBoxes = await display
      .locator('.column-display-option')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect()
          return { x: box.x, y: box.y, width: box.width }
        }),
      )
    assert.ok(displayBoxes.length > 2)
    assert.equal(displayBoxes[0].y, displayBoxes[1].y)
    assert.ok(displayBoxes[1].x > displayBoxes[0].x)
    await display.locator('summary').click()
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
    assert.deepEqual(await surface.boundingBox(), closedTop)
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
  await test('The merged header keeps actions reachable and retains drafts across placements', async () => {
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
          await expect(title).toBeVisible()
          for (const button of await actions.getByRole('button').all())
            await button.click({ trial: true })
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

    const value = page.locator(
      'tr[data-row="record-1"] td[data-column="region"]',
    )
    await scroller.evaluate((node) => {
      node.scrollTop = 0
    })
    assert.equal(await value.textContent(), 'West')

    await selectValue(
      choiceControl(page, { name: 'Add grouping', exact: true }),
      'region',
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
