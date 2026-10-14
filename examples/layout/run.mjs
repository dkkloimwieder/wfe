import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

const directory = process.env.BENCH_DEVELOPMENT
  ? '.dist-dev'
  : process.env.BENCH_DISTRIBUTION
    ? '.dist-package'
    : '.dist'
const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
const output = process.env.BENCH_OUTPUT ?? 'test-results/layout.json'
const report = { cases: [], errors: [], warnings: [] }
const modules = JSON.parse(await readFile(assets + 'modules.json', 'utf8'))
assert.ok(
  modules.some((id) =>
    id.includes(
      process.env.BENCH_DISTRIBUTION
        ? '/components/dist/source/layout/Dashboard.jsx'
        : '/components/src/layout/Dashboard.tsx',
    ),
  ),
)
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('pageerror', (error) => report.errors.push(error.stack))
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type()))
      report.warnings.push(message.text())
  })
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForFunction(() => Boolean(window.layoutFixture))
  const test = async (name, run) => {
    await run()
    report.cases.push(name)
    console.log(`PASS ${name}`)
  }
  const toggle = page.getByRole('button', { name: 'Navigation', exact: true })
  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
    exact: true,
  })
  const main = page.getByRole('main', { name: 'Records', exact: true })
  await test('Desktop exposes caller landmarks and preserves all available height', async () => {
    assert.equal(await page.getByRole('banner').count(), 1)
    assert.equal(await navigation.count(), 1)
    await expect(toggle).toBeHidden()
    assert.equal((await page.locator('#shell').boundingBox()).height, 900)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight),
      900,
    )
    const panels = page.locator('#grid .ui-dashboard-panel')
    assert.equal(
      (await panels.nth(0).boundingBox()).y,
      (await panels.nth(1).boundingBox()).y,
    )
  })
  await test('A table-sized scroller stays fixed for empty, small and large result sets', async () => {
    const before = await page.locator('#results').boundingBox()
    for (const count of [250, 0, 2]) {
      await page.evaluate(
        (count) => window.layoutFixture.replaceRows(count),
        count,
      )
      assert.deepEqual(await page.locator('#results').boundingBox(), before)
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollHeight),
        900,
      )
    }
  })
  await test('Narrow navigation preserves nodes and drafts and moves focus before hiding', async () => {
    const draft = page.getByRole('textbox', {
      name: 'Navigation draft',
      exact: true,
    })
    await draft.fill('Persistent draft')
    await page.evaluate(() => {
      window.layoutSavedDraft = document.querySelector(
        '[aria-label="Navigation draft"]',
      )
    })
    await page.setViewportSize({ width: 390, height: 800 })
    await expect(toggle).toBeFocused()
    assert.equal(await navigation.count(), 0)
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    )
    const panels = page.locator('#grid .ui-dashboard-panel')
    assert.ok(
      (await panels.nth(1).boundingBox()).y >
        (await panels.nth(0).boundingBox()).y,
    )
    const before = await main.boundingBox()
    await toggle.press('Enter')
    await expect(navigation).toBeVisible()
    assert.deepEqual(await main.boundingBox(), before)
    assert.equal(
      (await navigation.boundingBox()).y,
      (await page.getByRole('banner').boundingBox()).y +
        (await page.getByRole('banner').boundingBox()).height,
    )
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector('[aria-label="Navigation draft"]') ===
          window.layoutSavedDraft,
      ),
      true,
    )
    assert.equal(await draft.inputValue(), 'Persistent draft')
    assert.equal(
      (await page.evaluate(() => window.layoutFixture.read())).navigationMounts,
      1,
    )
  })
  await test('Escape and Close restore focus and the nonmodal panel leaves content usable', async () => {
    await page
      .getByRole('textbox', { name: 'Navigation draft', exact: true })
      .focus()
    await page.keyboard.press('Escape')
    await expect(toggle).toBeFocused()
    await expect(navigation).toBeHidden()
    await toggle.press('Space')
    await page.locator('#results').focus()
    await expect(page.locator('#results')).toBeFocused()
    assert.equal(await page.locator('main[inert]').count(), 0)
    await page.keyboard.press('Escape')
    await expect(navigation).toBeVisible()
    await page
      .getByRole('button', { name: 'Close navigation', exact: true })
      .click()
    await expect(toggle).toBeFocused()
    await expect(navigation).toBeHidden()
  })
  await test('Application navigation owns activation and can close the panel', async () => {
    await toggle.click()
    await page
      .getByRole('button', { name: 'Open reports', exact: true })
      .click()
    assert.equal(
      (await page.evaluate(() => window.layoutFixture.read())).visits,
      1,
    )
    await expect(toggle).toBeFocused()
    await expect(navigation).toBeHidden()
  })
  await test('Returning to desktop restores visible focus without remounting navigation', async () => {
    await toggle.focus()
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(navigation).toBeFocused()
    assert.equal(
      await page
        .getByRole('textbox', { name: 'Navigation draft', exact: true })
        .inputValue(),
      'Persistent draft',
    )
    assert.equal(
      (await page.evaluate(() => window.layoutFixture.read())).navigationMounts,
      1,
    )
  })
  await test('Application removal releases navigation refs before a later resize', async () => {
    await page
      .getByRole('textbox', { name: 'Navigation draft', exact: true })
      .focus()
    await page.evaluate(() => {
      window.staleNavigationFocus = 0
      const oldToggle = document.querySelector('.ui-dashboard-toggle')
      oldToggle.focus = () => {
        window.staleNavigationFocus++
      }
      window.layoutFixture.configure({ navigation: false })
      window.staleNavigationReads = 0
      const computedStyle = window.getComputedStyle
      window.getComputedStyle = (node, ...args) => {
        if (node === oldToggle) window.staleNavigationReads++
        return computedStyle.call(window, node, ...args)
      }
      try {
        window.layoutFixture.close()
      } finally {
        window.getComputedStyle = computedStyle
      }
    })
    await page.setViewportSize({ width: 390, height: 800 })
    assert.equal(await page.evaluate(() => window.staleNavigationFocus), 0)
    assert.equal(await page.evaluate(() => window.staleNavigationReads), 0)
    assert.equal(await navigation.count(), 0)
    assert.equal(await toggle.count(), 0)
    await page.evaluate(() =>
      window.layoutFixture.configure({ navigation: true }),
    )
    await expect(toggle).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 900 })
  })
  await test('Main owns scrolling when the application selects main scrolling', async () => {
    await page.evaluate(() => {
      window.layoutFixture.configure({ scroll: 'main' })
      const tall = document.createElement('div')
      tall.id = 'tall'
      tall.style.height = '1600px'
      tall.style.flexShrink = '0'
      document.querySelector('main').append(tall)
    })
    assert.equal(
      await main.evaluate((node) => getComputedStyle(node).overflowY),
      'auto',
    )
    assert.ok(
      await main.evaluate((node) => node.scrollHeight > node.clientHeight),
    )
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight),
      900,
    )
    await page.evaluate(() => {
      document.getElementById('tall').remove()
      window.layoutFixture.configure({ scroll: 'content' })
    })
  })
  await test('Shared density and theme reach panels and controls without changing shell height', async () => {
    await page.evaluate(() =>
      window.layoutFixture.configure({ density: 'comfortable', theme: 'dark' }),
    )
    assert.equal(
      await page.locator('#shell').getAttribute('data-ui-density'),
      'comfortable',
    )
    assert.equal(
      await page
        .locator('#results-panel')
        .evaluate((node) => getComputedStyle(node).backgroundColor),
      'rgb(23, 29, 39)',
    )
    assert.equal((await page.locator('#shell').boundingBox()).height, 900)
  })
  await test('Disposal removes listeners and refuses stale navigation callbacks', async () => {
    await page.setViewportSize({ width: 390, height: 800 })
    await toggle.click()
    await page.evaluate(() => {
      const oldToggle = document.querySelector('.ui-dashboard-toggle')
      const oldNavigation = document.querySelector('nav')
      window.layoutFixture.stop()
      window.layoutFixture.close()
      oldToggle.click()
      oldNavigation.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    assert.equal(await page.locator('#root').textContent(), '')
    const counts = await page.evaluate(() => window.layoutFixture.read())
    assert.equal(counts.navigationMounts, counts.navigationCleanups)
  })
  await test('The shell also supports no navigation and retains full content width', async () => {
    await page.evaluate(() => window.layoutFixture.start(false))
    assert.equal(await page.getByRole('navigation').count(), 0)
    assert.equal(await toggle.count(), 0)
    assert.equal((await main.boundingBox()).width, 1280)
  })
  await test('An outer UI scope preserves shell columns and narrow content width', async () => {
    await page.evaluate(() => {
      document.getElementById('root').setAttribute('data-ui', '')
      window.layoutFixture.start()
    })
    const sidebar = await navigation.boundingBox()
    assert.equal((await main.boundingBox()).width, 1280 - sidebar.width)
    await page.setViewportSize({ width: 390, height: 800 })
    assert.equal((await main.boundingBox()).width, 390)
    assert.equal(await navigation.count(), 0)
  })
  const diagnostics = await page.evaluate(() =>
    window.layoutFixture.diagnostics(),
  )
  report.timingDiagnostics = diagnostics.filter(
    (event) => event.code === 'HOT_SCOPE_TIME',
  )
  report.diagnostics = diagnostics.filter(
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
