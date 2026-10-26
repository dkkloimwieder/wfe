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
        'examples/status-tiles/vite.hydration.config.ts',
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
const modules = JSON.parse(await readFile(assets + 'modules.json', 'utf8'))
assert.ok(
  modules.some((id) =>
    id.endsWith(
      process.env.BENCH_DISTRIBUTION
        ? '/components/dist/components/StatusTile.jsx'
        : '/components/src/components/StatusTile.tsx',
    ),
  ),
)
const report = { directory, hydration, cases: [], errors: [], warnings: [] }
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://tiles.example')
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
          `<div id="root" data-ssr="true">${await render()}</div><script>window.tileServerNodes={tiles:[...document.querySelectorAll('[data-tile-id]')],heading:document.querySelector('h1')};window.tileServerNodes.heading.focus()</script>`,
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
const base =
  process.env.BENCH_URL ?? `http://127.0.0.1:${server.address().port}/`
const tile = (id) => page.locator(`[data-tile-id="${id}"]`)
let failure
try {
  await page.goto(base + '?qualification=1')
  await expect(tile('capacity')).toContainText('1,250')
  await settle()
  await run(
    'public tiles adopt their server nodes and retain initial focus',
    async () => {
      await expect(page.locator('[data-tile-id]')).toHaveCount(6)
      if (hydration)
        assert.ok(
          await page.evaluate(
            () =>
              window.tileServerNodes.tiles.every(
                (node, index) =>
                  node === document.querySelectorAll('[data-tile-id]')[index],
              ) &&
              window.tileServerNodes.heading === document.querySelector('h1') &&
              document.activeElement === window.tileServerNodes.heading,
          ),
        )
      await tile('capacity').evaluate((node) => {
        window.tileOriginalNodes = {
          tile: node,
          value: node.querySelector('.ui-status-tile-value'),
        }
      })
      assert.equal(await page.evaluate(() => window.tileFixture.value()), 1250)
    },
  )
  await run(
    'visible states, shared formats and missing detail remain accessible',
    async () => {
      await expect(
        page.getByRole('group', { name: 'Capacity', exact: true }),
      ).toContainText('OK')
      await expect(
        page.getByRole('group', { name: 'Queue', exact: true }),
      ).toContainText('Warning')
      await expect(
        page.getByRole('group', { name: 'Snapshot', exact: true }),
      ).toContainText('Unknown')
      await expect(tile('snapshot')).toContainText('19/10/2026')
      await expect(
        tile('snapshot').locator('.ui-status-tile-detail'),
      ).toHaveCount(0)
      await expect(
        tile('enabled').getByRole('img', { name: 'No', exact: true }),
      ).toBeVisible()
      await expect(tile('enabled')).toContainText('OK')
      assert.equal(
        await tile('reference').locator('.ui-status-tile-value').textContent(),
        '1234567890'.repeat(8),
      )
    },
  )
  await run(
    'application value, label, state and format updates preserve tile owners',
    async () => {
      await page.evaluate(() => window.tileFixture.update())
      await expect(
        page.getByRole('group', { name: 'Available capacity', exact: true }),
      ).toContainText('2,500')
      await expect(tile('capacity')).toContainText('Warning')
      assert.equal(await page.evaluate(() => window.tileFixture.value()), 2500)
      await page.evaluate(() => window.tileFixture.plain())
      await expect(
        tile('capacity').locator('.ui-status-tile-value'),
      ).toHaveText('2500')
      assert.ok(
        await tile('capacity').evaluate(
          (node) =>
            window.tileOriginalNodes.tile === node &&
            window.tileOriginalNodes.value ===
              node.querySelector('.ui-status-tile-value'),
        ),
      )
    },
  )
  await run('theme changes preserve tile owners', async () => {
    await page.evaluate(() => window.tileFixture.theme('dark'))
    assert.ok(
      await tile('capacity').evaluate(
        (node) => window.tileOriginalNodes.tile === node,
      ),
    )
    await page.screenshot({
      path: '/tmp/wfe-status-tiles-wide.png',
      fullPage: true,
    })
  })
  await run(
    'long text wraps or truncates within tiles while full text remains available',
    async () => {
      const geometry = await tile('reference').evaluate((node) => {
        const label = node.querySelector('.ui-status-tile-label')
        const detail = node.querySelector('.ui-status-tile-detail')
        const value = node.querySelector('.ui-status-tile-value')
        return {
          labelFull: label.title === label.textContent,
          detailFull: detail.title === detail.textContent,
          detailTruncated: detail.scrollWidth > detail.clientWidth,
          nowrap: getComputedStyle(detail).whiteSpace,
          detailHeight: detail.getBoundingClientRect().height,
          lineHeight: parseFloat(getComputedStyle(detail).lineHeight),
          valueFits: value.scrollWidth <= value.clientWidth + 1,
        }
      })
      assert.equal(geometry.labelFull, true)
      assert.equal(geometry.detailFull, true)
      assert.equal(geometry.detailTruncated, true)
      assert.equal(geometry.nowrap, 'nowrap')
      assert.ok(geometry.detailHeight <= geometry.lineHeight + 1)
      assert.equal(geometry.valueFits, true)
    },
  )
  await run(
    'existing grid wraps to one column on narrow screens without overflow',
    async () => {
      const columns = () =>
        page
          .locator('.ui-dashboard-grid')
          .evaluate(
            (row) =>
              getComputedStyle(row).gridTemplateColumns.split(' ').length,
          )
      assert.ok((await columns()) > 1)
      await page.setViewportSize({ width: 390, height: 844 })
      await settle()
      assert.equal(await columns(), 1)
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      assert.ok(
        await page
          .locator('main')
          .evaluate((main) => main.scrollWidth <= main.clientWidth),
      )
      const widths = await page
        .locator('[data-tile-id]')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().width),
        )
      assert.ok(widths.every((width) => width <= 390))
      await page.screenshot({
        path: '/tmp/wfe-status-tiles-phone.png',
        fullPage: true,
      })
    },
  )
  await run(
    'forced colors preserve visible state text and record values',
    async () => {
      await page.emulateMedia({ forcedColors: 'active' })
      await expect(tile('capacity')).toContainText('Warning')

      await expect(
        tile('capacity').locator('.ui-status-tile-value'),
      ).toHaveText('2500')
      await page.emulateMedia({ forcedColors: 'none' })
    },
  )
  await run('disposal leaves no tile owners or late updates', async () => {
    await page.evaluate(() => {
      window.tileFixture.stop()
      window.tileFixture.update()
      window.tileFixture.plain()
      window.tileFixture.theme('dark')
    })
    await settle()
    await expect(page.locator('#root')).toBeEmpty()
    await page.setViewportSize({ width: 1000, height: 700 })
    await settle()
    await expect(page.locator('#root')).toBeEmpty()
  })
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
} catch (error) {
  report.failure = String(error)
  failure = error
} finally {
  try {
    await writeFile(
      '/tmp/wfe-status-tiles-last-dom.txt',
      await page.locator('body').ariaSnapshot(),
    )
    await mkdir('test-results/status-tiles', { recursive: true })
    await writeFile(
      process.env.BENCH_OUTPUT ?? `test-results/status-tiles/${directory}.json`,
      JSON.stringify(report, null, 2),
    )
  } catch (error) {
    failure ??= error
    console.error('Tile diagnostics failed:', error)
  } finally {
    try {
      await browser.close()
    } catch (error) {
      failure ??= error
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  }
}
if (failure) throw failure
