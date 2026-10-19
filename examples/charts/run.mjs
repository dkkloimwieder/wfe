import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { chromium, expect } from '@playwright/test'

const hydration = process.argv.includes('--hydration')
const suffix = process.env.BENCH_DEVELOPMENT
  ? '-dev'
  : process.env.BENCH_DISTRIBUTION
    ? '-package'
    : ''
const directory = `.dist${hydration ? '-hydration' : ''}${suffix}`
const assets = fileURLToPath(new URL(`${directory}/`, import.meta.url))
let render
if (hydration) {
  for (const server of [true, false])
    execFileSync(
      'pnpm',
      [
        'exec',
        'vite',
        'build',
        '--config',
        'examples/charts/vite.hydration.config.ts',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, HYDRATION_SERVER: server ? '1' : '' },
      },
    )
  render = (
    await import(
      pathToFileURL(
        assets.replace(
          `.dist-hydration${suffix}/`,
          `.dist-hydration-server${suffix}/`,
        ) + 'server.js',
      ).href
    )
  ).render
}
const report = { directory, hydration, cases: [], errors: [], warnings: [] }
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://chart.example')
    if (url.pathname === '/favicon.ico') {
      response.writeHead(204).end()
      return
    }
    response.setHeader(
      'Content-Type',
      url.pathname.endsWith('.js')
        ? 'text/javascript'
        : url.pathname.endsWith('.css')
          ? 'text/css'
          : 'text/html',
    )
    if (url.pathname === '/' && render) {
      const template = await readFile(assets + 'hydration.html', 'utf8')
      response.end(
        template.replace(
          '<div id="root"></div>',
          `<div id="root" data-ssr="true">${await render()}</div><script>window.chartServerNodes={svg:document.querySelector('svg.ts-chart'),line:document.querySelector('.ts-chart__line path')}</script>`,
        ),
      )
    } else
      response.end(
        await readFile(
          assets +
            (url.pathname === '/' ? 'index.html' : url.pathname.slice(1)),
        ),
      )
  } catch (error) {
    response.writeHead(500).end(String(error))
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
page.setDefaultTimeout(8000)
page.on('pageerror', (error) => report.errors.push(String(error)))
page.on('console', (message) => {
  if (
    ['error', 'warning'].includes(message.type()) &&
    !message.text().startsWith('[HOT_SCOPE_TIME]')
  )
    report.warnings.push(message.text())
})
const settle = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
async function run(name, fn) {
  await fn()
  report.cases.push(name)
  console.log('PASS', name)
}
try {
  await page.goto(
    process.env.BENCH_URL ?? `http://127.0.0.1:${server.address().port}/`,
  )
  const svg = page.locator('svg.ts-chart').first()
  await expect(svg).toHaveAttribute('aria-label', 'Requests')
  await settle()
  await run('mount and server adoption', async () => {
    assert.ok(
      await page.evaluate(
        (hydrated) =>
          !hydrated ||
          (window.chartServerNodes.svg ===
            document.querySelector('svg.ts-chart') &&
            window.chartServerNodes.line ===
              document.querySelector('.ts-chart__line path')),
        hydration,
      ),
    )
    await page.evaluate(() => {
      window.chartOriginalNodes = {
        svg: document.querySelector('svg.ts-chart'),
        line: document.querySelector('.ts-chart__line path'),
      }
    })
  })
  await run('updates preserve SVG and mark nodes', async () => {
    const before = await page
      .locator('.ts-chart__line path')
      .first()
      .getAttribute('d')
    await page.getByRole('button', { name: 'Update data', exact: true }).click()
    await page
      .getByRole('button', { name: 'Rename chart', exact: true })
      .click()
    await expect(svg).toHaveAttribute('aria-label', 'Updated requests')
    assert.notEqual(
      await page.locator('.ts-chart__line path').first().getAttribute('d'),
      before,
    )
    assert.ok(
      await page.evaluate(
        () =>
          window.chartOriginalNodes.svg ===
            document.querySelector('svg.ts-chart') &&
          window.chartOriginalNodes.line ===
            document.querySelector('.ts-chart__line path'),
      ),
    )
  })
  await run('keyboard focus and stable custom tooltip content', async () => {
    await svg.focus()
    await svg.press('ArrowRight')
    await settle()
    const note = page.getByRole('textbox', { name: 'Tooltip note' })
    await expect(note).toBeVisible()
    const tooltipLayout = await page
      .locator('.ui-chart-tooltip-row')
      .first()
      .evaluate((row) => ({
        layout: getComputedStyle(row).display,
        swatch: row
          .querySelector('.ui-chart-tooltip-swatch')
          .getBoundingClientRect().width,
      }))
    assert.equal(tooltipLayout.layout, 'grid')
    assert.equal(tooltipLayout.swatch, 8)
    await page.evaluate(() => {
      const input = document.querySelector('[data-custom-tooltip] input')
      input.value = 'Retained'
      window.chartNote = input
    })
    await svg.press('ArrowRight')
    await settle()
    assert.ok(
      await page.evaluate(
        () =>
          window.chartNote ===
            document.querySelector('[data-custom-tooltip] input') &&
          window.chartNote.value === 'Retained',
      ),
    )
    await svg.press('Enter')
    await note.fill('Pinned note')
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(note).toHaveCount(0)
  })
  await run('tooltip renderer changes clean up the old body', async () => {
    await svg.focus()
    await svg.press('ArrowRight')
    await settle()
    await expect(page.locator('[data-custom-tooltip]')).toHaveCount(1)
    await page
      .getByRole('button', { name: 'Toggle custom tooltip', exact: true })
      .click()
    await expect(page.locator('[data-custom-tooltip]')).toHaveCount(0)
    await svg.focus()
    await svg.press('ArrowRight')
    await settle()
    await expect(page.locator('.ts-chart-tooltip')).toBeVisible()
  })
  await run(
    'responsive narrow layout keeps chart inside the page',
    async () => {
      const wide = await svg.getAttribute('viewBox')
      await page.setViewportSize({ width: 390, height: 844 })
      await settle()
      assert.notEqual(await svg.getAttribute('viewBox'), wide)
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      const box = await svg.boundingBox()
      assert.ok(box.width <= 390)
    },
  )
  await run('remount and complete disposal', async () => {
    await page
      .getByRole('button', { name: 'Toggle chart', exact: true })
      .click()
    await expect(page.locator('svg.ts-chart')).toHaveCount(0)
    await expect(page.locator('.ts-chart-tooltip')).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Toggle chart', exact: true })
      .click()
    await expect(svg).toBeVisible()
    await page.evaluate(() => {
      window.chartFixture.stop()
    })
    await expect(page.locator('#root')).toBeEmpty()
    await page.setViewportSize({ width: 1000, height: 700 })
    await settle()
    await expect(page.locator('.ts-chart-tooltip')).toHaveCount(0)
  })
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
} finally {
  await mkdir('test-results/charts', { recursive: true })
  await writeFile(
    process.env.BENCH_OUTPUT ?? `test-results/charts/${directory}.json`,
    JSON.stringify(report, null, 2),
  )
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
