import { reviewThemeHost } from '../shared/appearance/host-review.mjs'
import {
  choiceControl,
  selectValue,
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
const output = process.env.BENCH_OUTPUT ?? '/tmp/form-contract-browser.json'
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
const modules = JSON.parse(await readFile(assets + 'modules.json', 'utf8'))
const formDirectory = process.env.BENCH_DISTRIBUTION
  ? '/packages/form/dist/'
  : '/packages/form/src/'
assert.ok(
  modules.some((id) => id.includes(formDirectory)),
  `Missing form modules from ${formDirectory}`,
)
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
  await page.waitForFunction(() => Boolean(window.formContractFixture))
  await reviewThemeHost(page)
  const name = page.getByRole('textbox', { name: 'Name', exact: true })
  const category = choiceControl(page, { name: 'Category', exact: true })
  const enabled = page.getByRole('checkbox', { name: 'Enabled', exact: true })
  const save = page.getByRole('button', { name: 'Save', exact: true })
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true })
  const reset = page.getByRole('button', { name: 'Reset', exact: true })
  const status = page.getByRole('status')
  const snapshot = () =>
    page.evaluate(() => window.formContractFixture.snapshot())
  const phase = (value) => expect(status).toContainText(value)
  const hold = (stage) =>
    page.evaluate((stage) => window.formContractFixture.hold(stage), stage)
  async function test(name, run) {
    await page.evaluate(() => window.formContractFixture.start())
    await run()
    report.cases.push({ name, status: 'passed' })
    console.log('PASS ' + name)
  }
  await test('Form controls retain keyboard focus across appearance changes', async () => {
    for (const mode of ['Light', 'Dark']) {
      await page
        .getByRole('button', { name: `${mode} surfaces`, exact: true })
        .click()
      for (const accent of ['Blue', 'Pink']) {
        const swatch = page.getByRole('button', {
          name: `${accent} accent`,
          exact: true,
        })
        await swatch.click()
        await page.keyboard.press('Tab')
        for (const field of [name, category, enabled]) {
          await field.focus()
          await expect(field).toBeFocused()
        }
      }
    }
    await reviewAppearanceFocus(page)
  })
  await test('Text, choices and boolean controls show only application-accepted values', async () => {
    await page.evaluate(() => window.formContractFixture.rejectEdits(true))
    await name.fill('Rejected')
    await selectValue(category, 'Research')
    await page.getByText('Enabled', { exact: true }).click()
    await expectValue(name, 'Draft record')
    await expectValue(category, 'General')
    await expect(enabled).not.toBeChecked()
    assert.equal((await snapshot()).dirty, false)
    await page.evaluate(() => window.formContractFixture.rejectEdits(false))
    await name.fill('Accepted')
    await selectValue(category, 'Research')
    await page.getByText('Enabled', { exact: true }).click()
    assert.deepEqual((await snapshot()).values, {
      name: 'Accepted',
      category: 'Research',
      enabled: true,
    })
    await phase('Changed')
  })
  await test('Only explicit Save validates, names errors and focuses the first invalid field', async () => {
    await name.fill('')
    await name.press('Enter')
    await enabled.focus()
    await page.keyboard.press('Space')
    await category.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(category).toBeFocused()
    assert.deepEqual((await snapshot()).requests, [])
    await save.focus()
    await page.keyboard.press('Enter')
    await phase('invalid')
    await expect(name).toBeFocused()
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    const description = await name.getAttribute('aria-describedby')
    assert.ok(description)
    const described = await name.evaluate((node) =>
      (node.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent)
        .join(' '),
    )
    assert.ok(described.includes('Enter a name.'))
    assert.equal(
      (await snapshot()).requests.filter((r) => r.stage === 'submission')
        .length,
      0,
    )
    await name.fill('Valid record')
    await expect(name).not.toHaveAttribute('aria-invalid', 'true')
    await save.click()
    await phase('success')
    await phase('Unchanged')
  })
  await test('Rejected fields, form errors and unexpected failures allow an explicit retry', async () => {
    const response = choiceControl(page, {
      name: 'Simulated response',
      exact: true,
    })
    await selectValue(response, 'field-error')
    await save.click()
    await phase('rejected')
    await expect(name).toBeFocused()
    await expect(
      page.getByText('This name is already in use.', { exact: true }),
    ).toBeVisible()
    await selectValue(response, 'form-error')
    await save.click()
    await phase('rejected')
    await expect(page.getByRole('alert')).toHaveText(
      'The service rejected this record.',
    )
    await selectValue(response, 'failure')
    await save.click()
    await phase('error')
    await expect(page.getByRole('alert')).toHaveText(
      'The save failed. Try again.',
    )
    await selectValue(response, 'success')
    await save.click()
    await phase('success')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
  await test('Pending validation deduplicates requests and cancellation suppresses late errors', async () => {
    await hold('validation')
    await save.click()
    await phase('validating')
    await expect(save).toBeDisabled()
    const attempt = (await snapshot()).requests[0].attempt
    const duplicate = await page.evaluate(() => {
      const app = window.formContractFixture.capture()
      return app.form.submit() === app.form.submit()
    })
    assert.equal(duplicate, true)
    assert.equal((await snapshot()).requests.length, 1)
    await cancel.click()
    await phase('idle')
    assert.equal((await snapshot()).requests[0].aborted, true)
    await page.evaluate(
      (attempt) => window.formContractFixture.complete(attempt, 'validation'),
      attempt,
    )
    await phase('idle')
    assert.equal(
      (await snapshot()).requests.filter((r) => r.stage === 'submission')
        .length,
      0,
    )
  })
  await test('Accepted edits cancel saving and an old response cannot replace a new result', async () => {
    await hold('submission')
    await name.fill('First')
    await save.click()
    await phase('submitting')
    const first = (await snapshot()).requests.find(
      (r) => r.stage === 'submission',
    ).attempt
    await name.fill('Second')
    await phase('idle')
    await save.click()
    await phase('submitting')
    const latest = (await snapshot()).requests
      .filter((r) => r.stage === 'submission')
      .at(-1).attempt
    assert.ok(latest > first)
    await page.evaluate(
      (first) => window.formContractFixture.complete(first, 'submission'),
      first,
    )
    await phase('submitting')
    await expectValue(name, 'Second')
    await page.evaluate(
      (latest) => window.formContractFixture.complete(latest, 'submission'),
      latest,
    )
    await phase('success')
    assert.equal((await snapshot()).defaults.name, 'Second')
  })
  await test('External replacement and reset use application defaults and cancel pending work', async () => {
    await hold('submission')
    await name.fill('Pending')
    await save.click()
    await phase('submitting')
    await page
      .getByRole('button', { name: 'Load other record', exact: true })
      .click()
    await phase('idle')
    await expectValue(name, 'External record')
    await expectValue(category, 'Research')
    await expect(enabled).toBeChecked()
    await name.fill('Edited')
    await page.getByText('Enabled', { exact: true }).click()
    await reset.click()
    await expectValue(name, 'External record')
    await expect(enabled).toBeChecked()
    assert.equal((await snapshot()).dirty, false)
    await page
      .getByRole('button', { name: 'Complete response', exact: true })
      .click()
    await phase('idle')
    assert.equal((await snapshot()).defaults.name, 'External record')
  })
  await test('Disposal removes listeners and ignores responses retained by the application', async () => {
    await hold('submission')
    await save.click()
    await phase('submitting')
    const oldButton = await reset.elementHandle()
    await page.evaluate(() => {
      window.savedApplication = window.formContractFixture.capture()
      window.formContractFixture.stop()
    })
    await expect(page.locator('form')).toHaveCount(0)
    await page.evaluate(() => window.formContractFixture.start())
    await name.fill('New lifetime')
    await page.evaluate(() => window.savedApplication.complete())
    await oldButton.evaluate((node) => node.click())
    await expectValue(name, 'New lifetime')
    await phase('idle')
    assert.deepEqual((await snapshot()).requests, [])
    await oldButton.dispose()
  })
  await test('Shared appearance controls change surfaces without replacing fields or pending work', async () => {
    const button = (label) =>
      page.getByRole('button', { name: label, exact: true })
    await expect(
      page.getByRole('group', { name: 'Controls placement', exact: true }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('group', { name: 'Row lines', exact: true }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('group', { name: 'Column lines', exact: true }),
    ).toHaveCount(0)
    await name.fill('Appearance draft')
    await selectValue(category, 'Research')
    await page.getByText('Enabled', { exact: true }).click()
    const field = await name.elementHandle()
    await hold('submission')
    await save.click()
    await phase('submitting')
    const before = await snapshot()
    await button('Light surfaces').click()
    await button('Dark surfaces').click()
    await button('Blue accent').click()
    await name.focus()
    await expect(name).toBeFocused()
    assert.equal(
      await name.evaluate((node, original) => node === original, field),
      true,
    )
    assert.deepEqual(await snapshot(), before)
    await page
      .getByRole('button', { name: 'Complete response', exact: true })
      .click()
    await phase('success')
    await expectValue(name, 'Appearance draft')
    await expectValue(category, 'Research')
    await expect(enabled).toBeChecked()
    await name.fill('')
    await save.click()
    await phase('invalid')
    await button('Black / white surfaces').click()
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Enter a name.', { exact: true })).toBeVisible()
    await phase('invalid')
    await field.dispose()
  })
  await test('Narrow layout preserves labels and native keyboard behavior without page overflow', async () => {
    await page.setViewportSize({ width: 390, height: 568 })
    await name.fill('Narrow record')
    await selectValue(category, 'Research')
    await enabled.focus()
    await page.keyboard.press('Space')
    await expect(enabled).toBeChecked()
    await save.focus()
    await page.keyboard.press('Space')
    await phase('success')
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    )
    assert.equal((await snapshot()).values.name, 'Narrow record')
  })
  report.diagnostics.push(
    ...(await page.evaluate(() => window.formContractFixture.diagnostics())),
  )
  report.diagnostics = report.diagnostics.filter(
    (event) => event.code !== 'HOT_SCOPE_TIME',
  )
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
  assert.deepEqual(report.diagnostics, [])
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
