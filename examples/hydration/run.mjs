import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

const assets = fileURLToPath(
  new URL(
    process.env.BENCH_DISTRIBUTION ? '.dist-package/' : '.dist/',
    import.meta.url,
  ),
)
const report = { errors: [], warnings: [], serverWarnings: [], assertions: [] }
let browser
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
try {
  for (const ssr of [true, false]) {
    execFileSync(
      'pnpm',
      [
        'exec',
        'vite',
        'build',
        '--config',
        'examples/hydration/vite.config.ts',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, HYDRATION_SERVER: ssr ? '1' : '' },
      },
    )
  }
  const { render } = await import(
    process.env.BENCH_DISTRIBUTION
      ? './.dist-server-package/server.js'
      : './.dist-server/server.js'
  )
  const originalWarn = console.warn
  let markup
  try {
    console.warn = (...args) => {
      report.serverWarnings.push(args.map(String).join(' '))
      originalWarn(...args)
    }
    markup = await render()
  } finally {
    console.warn = originalWarn
  }
  assert.deepEqual(report.serverWarnings, [])
  assert.match(markup, /Ada/)
  const template = await readFile(assets + 'index.html', 'utf8')
  assert.ok(
    template.includes('<!--ssr-->'),
    'Built HTML must retain the server markup placeholder',
  )
  const html = template.replace('<!--ssr-->', markup)
  // Capture the original nodes before the deferred module attaches the client.
  await writeFile(
    assets + 'index.html',
    html.replace(
      '</body>',
      '<script>window.serverNodes = [document.querySelector("#name"), document.querySelector("#rename"), document.querySelector("#adopt-name"), document.querySelector("#adopt-check-input"), document.querySelector("#adopt-table tbody td"), document.querySelector("#adopt-trigger"), document.querySelector("#adopt-layout-header"), document.querySelector("#adopt-layout-draft"), document.querySelector("#adopt-table .table-workspace"), document.querySelector("#adopt-table .table-workspace-controls"), ...document.querySelectorAll("#adopt-filters select, #adopt-filters input"), ...document.querySelectorAll("#adopt-extra-filters input, #adopt-extra-filters select, #adopt-extra-filters [aria-haspopup=listbox]")]</script></body>',
    ),
  )
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  browser = await chromium.launch({
    executablePath: process.env.BENCH_EXECUTABLE_PATH,
  })
  report.browser = browser.version()
  const page = await browser.newPage()
  page.on('pageerror', (error) => report.errors.push(error.stack))
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type()))
      report.warnings.push(message.text())
  })
  await Promise.race([
    page
      .goto(`http://127.0.0.1:${server.address().port}`)
      .then(() => page.waitForSelector('html[data-hydrated="true"]')),
    new Promise((_, reject) => page.once('pageerror', reject)),
  ])
  await page.setViewportSize({ width: 390, height: 800 })
  const navigationToggle = page.getByRole('button', {
    name: 'Navigation',
    exact: true,
  })
  await navigationToggle.press('Enter')
  await page
    .getByRole('textbox', { name: 'Navigation draft', exact: true })
    .fill('Hydrated draft')
  await page.keyboard.press('Escape')
  await expect(navigationToggle).toBeFocused()
  const controlsToggle = page.getByRole('button', {
    name: 'Table controls',
    exact: true,
  })
  await controlsToggle.press('Enter')
  const controlsClose = page.getByRole('button', {
    name: 'Close table controls',
    exact: true,
  })
  await expect(controlsClose).toBeVisible()
  await controlsClose.focus()
  await page.keyboard.press('Escape')
  await expect(controlsToggle).toBeFocused()
  report.assertions.push(
    'Table controls retain their server nodes and attach drawer keyboard behavior',
  )
  await page.setViewportSize({ width: 1280, height: 900 })
  assert.equal(
    await page.locator('#adopt-layout-draft').inputValue(),
    'Hydrated draft',
  )
  report.assertions.push(
    'Dashboard header and navigation retain server nodes and attach keyboard behavior across narrow and desktop layouts',
  )
  assert.equal(await page.locator('#name').textContent(), 'Ada')
  assert.equal(
    await page.evaluate(() =>
      window.serverNodes.every(
        (node) =>
          node !== null &&
          node.isConnected &&
          document.getElementById('app').contains(node),
      ),
    ),
    true,
  )
  report.assertions.push(
    'Client attachment preserves native cell and button nodes and initial values',
  )
  const booleanFilter = page.getByRole('combobox', {
    name: 'Active filter',
    exact: true,
  })
  const dateStart = page.getByLabel('Created start', { exact: true })
  const dateEnd = page.getByLabel('Created end', { exact: true })
  await expect(booleanFilter).toHaveValue('false')
  await expect(dateStart).toHaveValue('2026-01-01')
  await expect(dateEnd).toHaveValue('2026-01-02')
  await booleanFilter.selectOption('true')
  await booleanFilter.selectOption('false')
  await booleanFilter.selectOption('')
  await dateStart.fill('2026-01-02')
  await page
    .getByRole('button', { name: 'Clear created end', exact: true })
    .click()
  await expect(dateEnd).toBeFocused()
  await expect(page.locator('#filter-values')).toHaveText('|2026-01-02|')
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.filterChanges),
    5,
  )
  report.assertions.push(
    'Boolean and date filters preserve server controls and attach one listener per interaction',
  )
  const textMatch = page.getByRole('textbox', {
    name: 'Hydrated text',
    exact: true,
  })
  const statusMatch = page.getByRole('button', {
    name: /^Hydrated status(?:\s|$)/,
  })
  const minimum = page.getByRole('spinbutton', {
    name: 'Hydrated amount minimum',
    exact: true,
  })
  await expect(textMatch).toHaveValue('Ada')
  await expect(statusMatch).toHaveText('Open')
  await expect(minimum).toHaveValue('0')
  await textMatch.fill('Grace')
  await minimum.fill('-3.25')
  await statusMatch.click()
  await page.getByRole('option', { name: 'Closed', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(statusMatch).toBeFocused()
  const values = JSON.parse(
    await page.locator('#extra-filter-values').textContent(),
  )
  assert.deepEqual(values, [
    { operator: 'contains', value: 'Grace' },
    { operator: 'in', values: ['Open', 'Closed'] },
    { operator: 'between', min: -3.25, max: 12.5 },
  ])
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.filterChanges),
    8,
  )
  report.assertions.push(
    'Text, multiple choices, and numeric filters retain server controls and apply each change once',
  )
  await page.locator('#rename').click()
  await page.waitForFunction(
    () => document.getElementById('name').textContent === 'Grace',
  )
  assert.equal(
    await page.evaluate(() =>
      window.serverNodes.every(
        (node) =>
          node !== null &&
          node.isConnected &&
          document.getElementById('app').contains(node),
      ),
    ),
    true,
  )
  report.assertions.push('Hydrated event updates existing native cells')
  const nameInput = page.getByRole('textbox', {
    name: 'Record name',
    exact: true,
  })
  const checkbox = page.getByRole('checkbox', {
    name: 'Include record',
    exact: true,
  })
  const table = page.locator('#adopt-table tbody')
  await expect(nameInput).toHaveValue('Grace')
  await expect(checkbox).toBeChecked()
  await expect(table).toContainText('Grace')
  assert.equal(await nameInput.getAttribute('aria-describedby'), 'adopt-help')
  await page.evaluate(() =>
    window.hydrationFixture.configure({
      name: 'Parent update',
      checked: false,
    }),
  )
  await expect(nameInput).toHaveValue('Parent update')
  await expect(checkbox).not.toBeChecked()
  await expect(table).toContainText('Parent update')
  await nameInput.fill('Keyboard value')
  await checkbox.focus()
  await page.keyboard.press('Space')
  await expect(checkbox).toBeChecked()
  await expect(table).toContainText('Keyboard value')
  assert.equal(
    await page.evaluate(() => window.hydrationFixture.lifecycle.changes),
    2,
  )
  await page.getByRole('button', { name: 'View record', exact: true }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', {
    name: 'Record preview',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Keyboard value')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'View record', exact: true }),
  ).toBeFocused()
  assert.equal(
    await page.evaluate(() =>
      window.serverNodes.every((node) => node?.isConnected),
    ),
    true,
  )
  report.assertions.push(
    'Public fields, checkbox and Table retain server nodes, accept parent updates, and attach one listener per interaction',
  )
  report.assertions.push(
    'Hydrated dialog opens from Enter, closes from Escape, and restores trigger focus',
  )
  await page.getByRole('button', { name: 'View record', exact: true }).click()
  await expect(dialog).toBeVisible()

  const cleanup = await page.evaluate(async () => {
    const fixture = window.hydrationFixture
    fixture.dispose()
    const reads = fixture.lifecycle.reads
    const changes = fixture.lifecycle.changes
    const filterChanges = fixture.lifecycle.filterChanges
    fixture.lifecycle.rename('After disposal')
    window.serverNodes[1].click()
    window.serverNodes[2].value = 'Detached input'
    window.serverNodes[2].dispatchEvent(new Event('input', { bubbles: true }))
    window.serverNodes[3].click()
    window.serverNodes[5].click()
    window.serverNodes[10].value = 'true'
    window.serverNodes[10].dispatchEvent(new Event('change', { bubbles: true }))
    window.serverNodes[11].value = '2026-02-01'
    window.serverNodes[11].dispatchEvent(new Event('input', { bubbles: true }))
    for (const node of window.serverNodes.slice(13))
      node.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(done)),
    )
    return {
      cleanups: fixture.lifecycle.cleanups,
      reads,
      afterReads: fixture.lifecycle.reads,
      filterChanges,
      afterFilterChanges: fixture.lifecycle.filterChanges,
      changes,
      afterChanges: fixture.lifecycle.changes,
      portals: document.querySelectorAll('.ui-dialog-portal').length,
      blocked: document.querySelectorAll(
        '[inert], [aria-hidden="true"]:not(svg):not(path)',
      ).length,
      pointerEvents: document.body.style.pointerEvents,
      remainingNodes: document.querySelectorAll('#name, #rename').length,
      diagnostics: fixture.diagnostics(),
    }
  })
  assert.equal(cleanup.cleanups, 1)
  assert.equal(cleanup.remainingNodes, 0)
  assert.equal(cleanup.afterReads, cleanup.reads)
  assert.equal(cleanup.afterChanges, cleanup.changes)
  assert.equal(cleanup.afterFilterChanges, cleanup.filterChanges)
  assert.equal(cleanup.portals, 0)
  assert.equal(cleanup.blocked, 0)
  assert.equal(cleanup.pointerEvents, '')
  assert.deepEqual(cleanup.diagnostics, [])
  report.diagnostics = cleanup.diagnostics
  report.assertions.push(
    'Hydrated scope disposal stops cell reads after state changes or detached clicks; host removes markup',
  )
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
} catch (error) {
  report.failure = error.stack
  throw error
} finally {
  await browser?.close()
  if (server.listening) await new Promise((done) => server.close(done))
  const output = process.env.BENCH_OUTPUT ?? '/tmp/table-hydration.json'
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
}
