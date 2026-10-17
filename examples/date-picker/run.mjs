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
const output = process.env.BENCH_OUTPUT ?? '/tmp/date-picker-browser.json'
const report = {
  directory,
  hostLoad: loadavg(),
  cases: [],
  errors: [],
  warnings: [],
  diagnostics: [],
}
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
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForFunction(() => Boolean(window.datePickerFixture))
  const input = page.getByLabel('Review date', { exact: true })
  const trigger = page.getByRole('button', {
    name: 'Open Review date calendar',
    exact: true,
  })
  const clear = page.getByRole('button', {
    name: 'Clear review date',
    exact: true,
  })
  const day = (value) => page.locator(`[data-date="${value}"]`)
  const set = (state) =>
    page.evaluate((state) => window.datePickerFixture.set(state), state)
  const state = () => page.evaluate(() => window.datePickerFixture.snapshot())
  async function test(name, run) {
    await page.evaluate(() => window.datePickerFixture.start())
    await run()
    report.cases.push({ name, status: 'passed' })
    console.log('PASS ' + name)
  }
  await test('Typing validates dates without discarding invalid drafts or changing the accepted value', async () => {
    await input.fill('2024-02-30')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    assert.equal((await state()).value, '2024-02-29')
    await expect(
      page.getByText('Enter an available date as YYYY-MM-DD.', { exact: true }),
    ).toBeVisible()
    await input.press('Escape')
    await expect(input).toHaveValue('2024-02-29')
    await input.fill('2024-03-01')
    assert.equal((await state()).value, '2024-03-01')
    await set({ value: '2025-01-10' })
    await expect(input).toHaveValue('2025-01-10')
    await clear.click()
    await expect(input).toBeFocused()
    await expect(input).toHaveValue('')
    assert.equal((await state()).value, undefined)
  })
  await test('The shared popup focuses the selected date, handles leap-year keyboard movement, and returns focus', async () => {
    await trigger.click()
    await expect(day('2024-02-29')).toBeFocused()
    await page.keyboard.press('Shift+PageDown')
    await expect(day('2025-02-28')).toBeFocused()
    await page.keyboard.press('PageUp')
    await expect(day('2025-01-28')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(day('2025-01-27')).toBeFocused()
    await page.keyboard.press('End')
    await expect(day('2025-02-02')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(day('2025-02-03')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(input).toHaveValue('2025-02-03')
    await expect(trigger).toBeFocused()
    await expect(page.locator('.ui-date-popup')).toHaveCount(0)
    await trigger.press('Space')
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await trigger.click()
    await page
      .getByRole('button', { name: 'After picker', exact: true })
      .click()
    await expect(page.locator('.ui-date-popup')).toHaveCount(0)
  })
  await test('The heading opens month and year choices with complete focus borders', async () => {
    await set({ min: undefined, max: undefined })
    await trigger.click()
    const selected = day('2024-02-29')
    await selected.press('ArrowLeft')
    await page.keyboard.press('ArrowRight')
    assert.equal(
      await selected.evaluate((node) => getComputedStyle(node).outlineOffset),
      '-2px',
    )
    await expect(selected.locator('..')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const heading = page.getByRole('button', {
      name: 'Choose month and year',
      exact: true,
    })
    await expect(heading).toHaveAccessibleDescription('February 2024')
    await expect(page.getByRole('grid')).toHaveAccessibleName('February 2024')
    await expect(heading.locator('[aria-live="polite"]')).toHaveText(
      'February 2024',
    )
    await heading.click()
    await expect(heading).toHaveAttribute('aria-expanded', 'true')
    await page
      .getByRole('spinbutton', { name: 'Year', exact: true })
      .fill('2028')
    await page.getByRole('button', { name: 'March', exact: true }).click()
    await expect(day('2028-03-01')).toBeFocused()
    await expect(heading).toHaveAccessibleDescription('March 2028')
    await expect(page.getByRole('grid')).toHaveAccessibleName('March 2028')
    await expect(heading.locator('[aria-live="polite"]')).toHaveText(
      'March 2028',
    )
    assert.equal((await state()).value, '2024-02-29')
    await heading.click()
    await page.getByRole('button', { name: 'Next year', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(heading).toBeFocused()
    await expect(heading).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.ui-date-popup')).toBeVisible()
    await day('2029-03-05').click()
    await expect(input).toHaveValue('2029-03-05')
    await expect(trigger).toBeFocused()
  })
  await test('Disabled days and boundaries reject typed dates and keyboard selection', async () => {
    await set({
      min: '2024-02-29',
      max: '2024-03-03',
      excluded: ['2024-03-01'],
    })
    await input.fill('2024-03-01')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await input.press('Escape')
    await trigger.click()
    await expect(day('2024-02-29')).toBeFocused()
    await expect(day('2024-02-28')).toBeDisabled()
    await page.keyboard.press('ArrowRight')
    await expect(day('2024-03-02')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(day('2024-03-03')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(day('2024-03-03')).toBeFocused()
    await page.keyboard.press('Space')
    assert.equal((await state()).value, '2024-03-03')
    await trigger.click()
    await set({ disabled: true })
    await expect(input).toBeDisabled()
    await expect(trigger).toBeDisabled()
    await expect(page.locator('.ui-date-popup')).toHaveCount(0)
  })
  await test('Controlled selection follows parent values and years below 100 retain their year', async () => {
    await set({ value: '0001-01-01', min: undefined, max: undefined })
    await trigger.click()
    await expect(day('0001-01-01')).toBeFocused()
    await expect(
      page.getByRole('button', { name: 'Previous month', exact: true }),
    ).toBeDisabled()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(input).toHaveValue('0001-01-02')
    await set({ value: '9999-12-31' })
    await trigger.click()
    await expect(
      page.getByRole('button', { name: 'Next month', exact: true }),
    ).toBeDisabled()
    await page.keyboard.press('Escape')
    await set({ value: '2024-02-29', accept: false })
    await trigger.click()
    await day('2024-02-28').click()
    assert.equal((await state()).value, '2024-02-29')
    await trigger.click()
    await expect(day('2024-02-29')).toHaveAttribute('data-selected', '')
  })
  await test('Configured date formats and locales preserve canonical values', async () => {
    await set({ dateFormat: 'dd/MM/yyyy' })
    await expect(input).toHaveValue('29/02/2024')
    await input.fill('17/10/2026')
    assert.equal((await state()).value, '2026-10-17')
    const count = (await state()).changes
    await set({ dateFormat: 'locale', locale: 'en-US' })
    await expect(input).toHaveValue('10/17/2026')
    assert.equal((await state()).changes, count)
    await trigger.click()
    await day('2026-10-18').click()
    await expect(input).toHaveValue('10/18/2026')
    assert.equal((await state()).value, '2026-10-18')
    await set({ accept: false, dateFormat: 'dd.MM.yyyy' })
    await input.fill('19.10.2026')
    assert.equal((await state()).value, '2026-10-18')
    await input.blur()
    await expect(input).toHaveValue('18.10.2026')
  })
  await test('Shared field identity, descriptions and readonly state remain consistent', async () => {
    await set({ required: true, invalid: true })
    await expect(input).toHaveAttribute('id', 'review-date')
    await expect(input).not.toHaveAttribute('name')
    assert.equal(
      await page
        .locator('form')
        .evaluate((form) => new FormData(form).get('reviewDate')),
      '2024-02-29',
    )
    await expect(input).toHaveAttribute('required', '')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveAccessibleDescription(
      'Date entry help Application date validation',
    )
    await set({ invalidOverride: false })
    await expect(input).not.toHaveAttribute('aria-invalid', 'true')
    await input.fill('2024-02-30')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await input.press('Escape')
    await expect(input).not.toHaveAttribute('aria-invalid', 'true')
    await trigger.click()
    await set({ readonly: true })
    await expect(page.locator('.ui-date-popup')).toHaveCount(0)
    await expect(input).toHaveAttribute('readonly', '')
    await expect(trigger).toBeDisabled()
    await expect(clear).toBeDisabled()
    const before = await state()
    await input.evaluate((node) => {
      node.value = '2026-01-01'
      node.dispatchEvent(new Event('input', { bubbles: true }))
    })
    assert.equal((await state()).changes, before.changes)
    await set({ readonly: false, invalid: false })
    await expect(input).not.toHaveAttribute('readonly')
    await expect(input).not.toHaveAttribute('aria-invalid', 'true')
  })
  await test('Named forms submit only accepted ISO dates and intrinsic validity blocks drafts', async () => {
    await set({ dateFormat: 'dd/MM/yyyy' })
    const form = page.locator('form')
    assert.deepEqual(await form.evaluate((node) => [...new FormData(node)]), [
      ['reviewDate', '2024-02-29'],
    ])
    await input.fill('30/02/2024')
    assert.equal((await state()).intrinsicValid, false)
    assert.equal(await input.evaluate((node) => node.checkValidity()), false)
    await form.evaluate((node) => node.requestSubmit())
    assert.equal((await state()).submits, 0)
    await input.press('Escape')
    assert.equal((await state()).intrinsicValid, true)
    await set({ min: '2025-01-01' })
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    assert.equal((await state()).intrinsicValid, false)
    await set({ disabled: true })
    assert.equal((await state()).intrinsicValid, true)
    assert.deepEqual(await form.evaluate((node) => [...new FormData(node)]), [])
    await set({ disabled: false, min: undefined, readonly: true })
    assert.deepEqual(await form.evaluate((node) => [...new FormData(node)]), [
      ['reviewDate', '2024-02-29'],
    ])
  })
  await test('Locale calendar extensions retain Gregorian date semantics', async () => {
    await set({ locale: 'en-US-u-ca-buddhist', dateFormat: 'locale' })
    await expect(input).toHaveValue('02/29/2024')
    await trigger.click()
    await expect(page.getByRole('grid')).toHaveAccessibleName('February 2024')
    await day('2024-03-01').click()
    assert.equal((await state()).value, '2024-03-01')
  })
  await test('Disposal removes the open popup and detached field listeners', async () => {
    await trigger.click()
    await page.evaluate(() => {
      window.detachedDate = document.querySelector('.ui-date-picker input')
      window.datePickerFixture.stop()
      window.detachedDate.value = '2026-01-01'
      window.detachedDate.dispatchEvent(new Event('input', { bubbles: true }))
    })
    assert.equal((await state()).changes, 0)
    assert.equal(await page.locator('.ui-date-popup').count(), 0)
    assert.equal(await page.locator('#root').textContent(), '')
    await page.evaluate(() => window.datePickerFixture.start())
    await expect(input).toHaveValue('2024-02-29')
  })
  report.diagnostics.push(
    ...(await page.evaluate(() => window.datePickerFixture.diagnostics())),
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
