import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
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
      path.endsWith('.js') ? 'text/javascript' : 'text/html',
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
      '<script>window.serverNodes = [document.querySelector("#name"), document.querySelector("#rename"), document.querySelector("#adopt-name"), document.querySelector("#adopt-check-input"), document.querySelector("#adopt-table tbody td"), document.querySelector("#adopt-trigger")]</script></body>',
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
    fixture.lifecycle.rename('After disposal')
    window.serverNodes[1].click()
    window.serverNodes[2].value = 'Detached input'
    window.serverNodes[2].dispatchEvent(new Event('input', { bubbles: true }))
    window.serverNodes[3].click()
    window.serverNodes[5].click()
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(done)),
    )
    return {
      cleanups: fixture.lifecycle.cleanups,
      reads,
      afterReads: fixture.lifecycle.reads,
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
  await writeFile(
    process.env.BENCH_OUTPUT ?? '/tmp/table-hydration.json',
    JSON.stringify(report, null, 2) + '\n',
  )
}
