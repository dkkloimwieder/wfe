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
