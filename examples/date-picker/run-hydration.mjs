import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
const suffix = process.env.BENCH_DEVELOPMENT
  ? '-dev'
  : process.env.BENCH_DISTRIBUTION
    ? '-package'
    : ''
const root = new URL('.', import.meta.url)
const assets = new URL(`.dist-hydration${suffix}/`, root)
const output = process.env.BENCH_OUTPUT ?? '/tmp/date-hydration.json'
const report = { cases: [], errors: [], warnings: [], diagnostics: [] }
let browser, html
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
      path === '/' ? html : await readFile(new URL('.' + path, assets)),
    )
  } catch {
    response.writeHead(404).end()
  }
})
try {
  for (const server of [true, false])
    execFileSync(
      'pnpm',
      [
        'exec',
        'vite',
        'build',
        '--config',
        fileURLToPath(new URL('vite.hydration.config.ts', root)),
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, HYDRATION_SERVER: server ? '1' : '' },
      },
    )
  const { render } = await import(
    new URL(`.dist-hydration-server${suffix}/server.js`, root)
  )
  const warn = console.warn
  let content
  try {
    console.warn = (...args) => report.warnings.push(args.map(String).join(' '))
    content = await render()
  } finally {
    console.warn = warn
  }
  html = (await readFile(new URL('hydration.html', assets), 'utf8')).replace(
    '<!--ssr-->',
    content,
  )
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  const url = `http://127.0.0.1:${server.address().port}/`
  browser = await chromium.launch()
  const initialContext = await browser.newContext({
    javaScriptEnabled: false,
    timezoneId: 'Asia/Kathmandu',
  })
  try {
    const initial = await initialContext.newPage()
    await initial.goto(url)
    await expect(
      initial.getByRole('textbox', { name: 'System date', exact: true }),
    ).toHaveValue('28/02/2024')
    await expect(
      initial.getByLabel('System time', { exact: true }),
    ).toHaveValue('21:15')
    await expect(
      initial.getByRole('textbox', { name: 'Browser date', exact: true }),
    ).toBeDisabled()
    await expect(
      initial.getByRole('textbox', { name: 'Browser date', exact: true }),
    ).toHaveValue('')
    await expect(
      initial.getByLabel('Browser time', { exact: true }),
    ).toHaveValue('')
    report.cases.push(
      'Explicit timezone renders on the server and browser timezone stays pending',
    )
  } finally {
    await initialContext.close()
  }
  const context = await browser.newContext({ timezoneId: 'Asia/Kathmandu' })
  const page = await context.newPage()
  page.on('pageerror', (error) => report.errors.push(error.stack))
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()))
      report.warnings.push(message.text())
  })
  await page.goto(url)
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true')
  await expect(
    page.getByRole('textbox', { name: 'System date', exact: true }),
  ).toHaveValue('28/02/2024')
  await expect(page.getByLabel('System time', { exact: true })).toHaveValue(
    '21:15',
  )
  await expect(
    page.getByRole('textbox', { name: 'Browser date', exact: true }),
  ).toHaveValue('29/02/2024')
  await expect(page.getByLabel('Browser time', { exact: true })).toHaveValue(
    '08:00',
  )
  assert.equal(
    await page.evaluate(() =>
      window.dateServerNodes.every(
        (node) =>
          node.isConnected &&
          [...document.querySelectorAll('#root input')].includes(node),
      ),
    ),
    true,
  )
  assert.equal(
    (await page.evaluate(() => window.dateHydration.snapshot())).requests,
    0,
  )
  report.cases.push(
    'Hydration preserves server inputs and resolves browser timezone without requests',
  )
  await page.getByLabel('Browser time', { exact: true }).fill('09:00')
  assert.equal(
    (await page.evaluate(() => window.dateHydration.snapshot())).value,
    '2024-02-29T03:15:16.123Z',
  )
  await expect(page.getByLabel('System time', { exact: true })).toHaveValue(
    '22:15',
  )
  report.cases.push(
    'Hydrated controls request one instant and update both timezone displays',
  )
  await page
    .getByRole('button', { name: 'Open Browser date calendar', exact: true })
    .click()
  await page.evaluate(() => {
    window.dateHydration.stop()
    const node = window.dateServerNodes.find(
      (node) => node.id === 'browser-date-time',
    )
    node.value = '10:00'
    node.dispatchEvent(new Event('input', { bubbles: true }))
  })
  assert.equal(
    (await page.evaluate(() => window.dateHydration.snapshot())).requests,
    1,
  )
  assert.equal(await page.locator('.ui-date-popup').count(), 0)
  report.diagnostics = (
    await page.evaluate(() => window.dateHydration.diagnostics())
  ).filter((event) => event.code !== 'HOT_SCOPE_TIME')
  assert.deepEqual(report.diagnostics, [])
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
  report.cases.push(
    'Hydrated disposal releases popup and retained input listeners',
  )
} catch (error) {
  report.failure = error.stack
  process.exitCode = 1
} finally {
  await browser?.close()
  if (server.listening) await new Promise((done) => server.close(done))
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
