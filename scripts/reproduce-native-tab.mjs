import { createServer } from 'node:http'
import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { loadavg } from 'node:os'
import { chromium, expect } from '@playwright/test'

const mode = process.env.NATIVE_TAB_MODE ?? 'fetch'
if (!['loopback', 'fetch', 'fulfill'].includes(mode))
  throw new Error('Use NATIVE_TAB_MODE=loopback, fetch, or fulfill.')
const output = process.env.BENCH_OUTPUT ?? '/tmp/wfe-native-tab.json'
const html =
  '<!doctype html><title>Native link probe</title><a id="link" href="#destination">Destination</a><h1 id="destination">Destination</h1>'
const report = {
  mode,
  playwright: createRequire(import.meta.url)('@playwright/test/package.json')
    .version,
  browser: '',
  hostLoad: loadavg(),
  hasPreload: Boolean(process.env.NODE_OPTIONS?.includes('--import')),
  requests: [],
  targets: [],
  cases: [],
  cleanupErrors: [],
}
const server = createServer((request, response) => {
  report.requests.push({ at: Date.now(), url: request.url })
  response.setHeader('Content-Type', 'text/html')
  response.end(html)
})
let browser
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const source = `http://127.0.0.1:${server.address().port}/`
  const base = mode === 'loopback' ? source : 'http://native-tab.test/'
  browser = await chromium.launch()
  report.browser = browser.version()
  const protocol = await browser.newBrowserCDPSession()
  for (const name of [
    'Target.targetCreated',
    'Target.targetInfoChanged',
    'Target.targetDestroyed',
  ])
    protocol.on(name, (event) =>
      report.targets.push({ at: Date.now(), name, event }),
    )
  await protocol.send('Target.setDiscoverTargets', { discover: true })
  // Three observations in fresh contexts, never retries of a failing assertion.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const context = await browser.newContext()
    const entry = {
      attempt,
      started: Date.now(),
      lifecycle: [],
      routeErrors: [],
    }
    try {
      if (mode !== 'loopback')
        await context.route('**/*', async (route) => {
          try {
            if (mode === 'fulfill') {
              await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: html,
              })
            } else {
              const response = await route.fetch({ url: source, maxRetries: 0 })
              try {
                await route.fulfill({ response })
              } finally {
                await response.dispose()
              }
            }
          } catch (error) {
            entry.routeErrors.push(String(error))
            await route.abort().catch(() => {})
          }
        })
      const page = await context.newPage()
      for (const name of [
        'page',
        'request',
        'requestfailed',
        'requestfinished',
      ])
        context.on(name, (event) =>
          entry.lifecycle.push({ at: Date.now(), name, url: event.url() }),
        )
      await page.goto(base)
      const link = page.locator('#link')
      await link.focus()
      await link.press('Enter')
      await expect(page).toHaveURL(base + '#destination')
      await page.goBack()
      await expect(page).toHaveURL(base)
      const [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 30000 }),
        link.click({ modifiers: ['ControlOrMeta'] }),
      ])
      await popup.waitForURL(base + '#destination', {
        waitUntil: 'commit',
        timeout: 30000,
      })
      await expect(popup.locator('#destination')).toHaveText('Destination')
      await expect(page).toHaveURL(base)
      entry.result = 'pass'
    } catch (error) {
      entry.result = String(error)
      entry.pages = context.pages().map((page) => page.url())
      entry.targets = (await protocol.send('Target.getTargets')).targetInfos
    } finally {
      entry.finished = Date.now()
      try {
        await context.close()
      } catch (error) {
        entry.cleanupError = String(error)
      }
      report.cases.push(entry)
      await writeFile(output, JSON.stringify(report, null, 2) + '\n')
    }
  }
} catch (error) {
  report.failure = String(error)
} finally {
  try {
    await browser?.close()
  } catch (error) {
    report.cleanupErrors.push(String(error))
  }
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve))
  }
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
}
for (const entry of report.cases)
  console.log(`${mode} attempt ${entry.attempt}: ${entry.result}`)
console.log(`Report: ${output}`)
if (
  report.failure ||
  report.cleanupErrors.length ||
  report.cases.some(
    (entry) =>
      entry.result !== 'pass' || entry.cleanupError || entry.routeErrors.length,
  )
)
  process.exitCode = 1
