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
        'examples/grid/vite.hydration.config.ts',
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
        ? '/generator/dist/source/GridView.jsx'
        : '/generator/src/GridView.tsx',
    ),
  ),
)
const report = { directory, hydration, cases: [], errors: [], warnings: [] }
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://grid.example')
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
          `<div id="root" data-ssr="true">${await render()}</div><script>window.gridServerNodes=[...document.querySelectorAll('input[type="checkbox"]')];window.gridServerNodes[1]?.focus()</script>`,
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
const cell = (name) => page.getByRole('checkbox', { name, exact: true })
const first = cell('Record 01 Write')
let failure
try {
  await page.goto(base + '?qualification=1')
  await expect(
    page.getByRole('table', { name: 'Record capabilities' }),
  ).toBeVisible()
  await settle()
  await run(
    '150 described cells adopt their server nodes and initial focus',
    async () => {
      await expect(page.getByRole('checkbox')).toHaveCount(150)
      await expect(page.getByRole('row')).toHaveCount(31)
      assert.equal(await page.getByRole('columnheader').count(), 6)
      const alignment = await first.evaluate((input) => {
        const cell = input.closest('td').getBoundingClientRect()
        const control = input.parentElement
          .querySelector('.ui-check-control')
          .getBoundingClientRect()
        return Math.abs(
          (cell.left + cell.right) / 2 - (control.left + control.right) / 2,
        )
      })
      assert.ok(alignment <= 1, 'Checkbox and column centers must align')
      if (hydration)
        assert.ok(
          await page.evaluate(
            () =>
              window.gridServerNodes.length === 150 &&
              window.gridServerNodes.every(
                (input, index) =>
                  input ===
                  document.querySelectorAll('input[type="checkbox"]')[index],
              ) &&
              document.activeElement === window.gridServerNodes[1],
          ),
        )
      assert.equal(
        await page.evaluate(() => window.gridFixture.requests().length),
        0,
      )
      await first.evaluate((input) => {
        window.gridOriginalInput = input
      })
    },
  )
  await run(
    'native keyboard activation emits one accepted change',
    async () => {
      await first.focus()
      await first.press('Space')
      await expect(first).toBeChecked()
      assert.deepEqual(
        await page.evaluate(() => window.gridFixture.requests()),
        [{ row: 'r1', column: 'write', value: true }],
      )
      await expect(page.getByRole('status')).toContainText(
        'Record 01 / Write: Yes',
      )
      assert.ok(
        await first.evaluate((input) => input === window.gridOriginalInput),
      )
      await page.evaluate(() =>
        window.gridFixture.setCell('r1', 'write', false),
      )
      await expect(first).not.toBeChecked()
      assert.equal(
        await page.evaluate(() => window.gridFixture.requests().length),
        1,
      )
    },
  )
  await run(
    'shared pointer control emits one change and readonly/disabled cells stay inert',
    async () => {
      await first.locator('..').locator('.ui-check-control').click()
      await expect(first).toBeChecked()
      assert.equal(
        await page.evaluate(() => window.gridFixture.requests().length),
        2,
      )
      const readonly = cell('Record 01 Verified')
      await expect(readonly).toHaveAttribute('aria-readonly', 'true')
      await readonly.focus()
      await readonly.press('Space')
      await readonly.locator('..').locator('.ui-check-control').click()
      const disabled = cell('Record 30 Write')
      await expect(disabled).toBeDisabled()
      await disabled.evaluate((input) => input.click())
      assert.equal(
        await page.evaluate(() => window.gridFixture.requests().length),
        2,
      )
    },
  )
  await run(
    'rejected requests retain accepted values with one callback',
    async () => {
      await page.evaluate(() => {
        window.gridFixture.setCell('r1', 'write', false)
        window.gridFixture.reject(true)
      })
      await first.focus()
      await first.press('Space')
      await expect(first).not.toBeChecked()
      assert.equal(
        await page.evaluate(() => window.gridFixture.requests().length),
        3,
      )
      await page.evaluate(() => window.gridFixture.reject(false))
    },
  )
  await run(
    'reordering and relabeling preserve cell nodes and keyboard focus',
    async () => {
      await first.focus()
      await page.evaluate(() => window.gridFixture.reorder())
      await settle()
      await expect(first).toBeFocused()
      assert.ok(
        await first.evaluate((input) => input === window.gridOriginalInput),
      )
      assert.equal(
        (await page.getByRole('rowheader').allTextContents())[0],
        'Record 30',
      )
      await page.evaluate(() => window.gridFixture.relabel())
      const renamed = cell('Renamed record Edit')
      await expect(renamed).toBeFocused()
      assert.ok(
        await renamed.evaluate((input) => input === window.gridOriginalInput),
      )
      await renamed.press('Space')
      await expect(renamed).toBeChecked()
      assert.equal(
        await page.evaluate(() => window.gridFixture.requests().length),
        4,
      )
      await page.screenshot({ path: '/tmp/wfe-grid-wide.png', fullPage: true })
    },
  )
  await run(
    'forced colors retain keyboard focus and accepted checkbox state',
    async () => {
      await page.emulateMedia({ forcedColors: 'active' })
      const renamed = cell('Renamed record Edit')
      await renamed.focus()
      await renamed.press('Space')
      await expect(renamed).not.toBeChecked()
      await expect(renamed).toBeFocused()
      await renamed.press('Space')
      await expect(renamed).toBeChecked()
      await expect(
        renamed.locator('..').locator('.ui-check-mark'),
      ).toBeVisible()
      assert.equal(
        await page.evaluate(() => window.gridFixture.requests().length),
        6,
      )
      await page.emulateMedia({ forcedColors: 'none' })
    },
  )
  await run(
    'grid owns narrow horizontal scrolling without document overflow',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await settle()
      const geometry = await page
        .getByRole('region', { name: 'Record capabilities' })
        .evaluate((region) => ({
          width: region.getBoundingClientRect().width,
          overflow: region.scrollWidth > region.clientWidth,
          documentOverflow: document.documentElement.scrollWidth > innerWidth,
        }))
      assert.ok(geometry.width <= 390)
      assert.equal(geometry.overflow, true)
      assert.equal(geometry.documentOverflow, false)
      await page
        .getByRole('region', { name: 'Record capabilities' })
        .evaluate((region) => {
          region.scrollLeft = 0
          region.scrollTop = 0
        })
      await page.screenshot({ path: '/tmp/wfe-grid-phone.png', fullPage: true })
    },
  )
  await run(
    'disposal releases inputs and ignores late application updates',
    async () => {
      const before = await page.evaluate(
        () => window.gridFixture.requests().length,
      )
      await page.evaluate(() => {
        window.gridFixture.stop()
        window.gridOriginalInput.click()
        window.gridFixture.setCell('r1', 'write', false)
        window.gridFixture.reorder()
      })
      await settle()
      await expect(page.locator('#root')).toBeEmpty()
      assert.equal(
        await page.evaluate(() => window.gridFixture.requests().length),
        before,
      )
      await page.setViewportSize({ width: 1000, height: 700 })
      await settle()
      await expect(page.locator('#root')).toBeEmpty()
    },
  )
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
} catch (error) {
  report.failure = String(error)
  failure = error
} finally {
  try {
    await writeFile(
      '/tmp/wfe-grid-last-dom.txt',
      await page.locator('body').ariaSnapshot(),
    )
    await mkdir('test-results/grid', { recursive: true })
    await writeFile(
      process.env.BENCH_OUTPUT ?? `test-results/grid/${directory}.json`,
      JSON.stringify(report, null, 2),
    )
  } catch (error) {
    failure ??= error
    console.error('Grid diagnostics failed:', error)
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
