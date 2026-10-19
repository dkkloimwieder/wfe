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
          `<div id="root" data-ssr="true">${await render(url.href)}</div><script>window.chartServerNodes={svg:document.querySelector('svg.ts-chart'),line:document.querySelector('.ts-chart__line path'),generated:document.querySelector('[data-generator-view] svg.ts-chart')}</script>`,
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
if (process.env.BENCH_CHART_FALLBACK)
  await page.addInitScript(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: undefined,
    })
  })
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
  const svg = page.locator('[aria-label="Line chart panel"] svg.ts-chart')
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
              document.querySelector('.ts-chart__line path') &&
            window.chartServerNodes.generated ===
              document.querySelector('[data-generator-view] svg.ts-chart')),
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
  await run('default tooltip contains data without test controls', async () => {
    await svg.focus()
    await svg.press('ArrowRight')
    await settle()
    const panel = page.locator('.chart-primary-tooltip')
    await expect(panel).toBeVisible()
    await expect(panel.locator('input,button')).toHaveCount(0)
    await expect(panel.locator('.ts-chart-tooltip__row')).toHaveCount(2)
    await svg.press('Escape')
  })
  await run('keyboard focus and stable custom tooltip content', async () => {
    await page
      .getByRole('button', { name: 'Toggle custom tooltip', exact: true })
      .click()
    await svg.focus()
    await svg.press('ArrowRight')
    await settle()
    const note = page.getByRole('textbox', { name: 'Tooltip note' })
    await expect(note).toBeVisible()
    await expect(page.locator('.chart-primary-tooltip')).toHaveAttribute(
      'data-ts-chart-tooltip-portal',
      process.env.BENCH_CHART_FALLBACK ? 'fallback' : 'popover',
    )
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
    await expect(page.locator('.chart-primary-tooltip')).toBeVisible()
  })
  await run(
    'shared surfaces and accents repaint without replacing chart nodes',
    async () => {
      for (const surface of ['Dark', 'Light']) {
        await page
          .getByRole('button', { name: `${surface} surfaces`, exact: true })
          .click()
        for (const accent of ['Blue', 'Violet', 'Orange']) {
          await page
            .getByRole('button', { name: `${accent} accent`, exact: true })
            .click()
          const colors = await page
            .locator('.ts-chart__line path')
            .first()
            .evaluate((path) => {
              const scope = path.closest('[data-ui]')
              const probe = document.createElement('span')
              probe.style.color = 'var(--ui-accent)'
              scope.append(probe)
              const expected = getComputedStyle(probe).color
              probe.remove()
              return { expected, stroke: getComputedStyle(path).stroke }
            })
          assert.equal(colors.stroke, colors.expected)
        }
      }
      assert.ok(
        await page.evaluate(
          () =>
            window.chartOriginalNodes.svg ===
              document.querySelector('svg.ts-chart') &&
            window.chartOriginalNodes.line ===
              document.querySelector('.ts-chart__line path'),
        ),
      )
      await svg.focus()
      await svg.press('ArrowRight')
      await settle()
      await svg.press('Enter')
      for (const surface of ['Dark', 'Light']) {
        await page
          .getByRole('button', { name: `${surface} surfaces`, exact: true })
          .evaluate((button) => button.click())
        await expect(page.locator('.chart-primary-tooltip')).toBeVisible()
        const paint = await page
          .locator('.chart-primary-tooltip')
          .evaluate((element) => {
            const scope = document.querySelector('.chart-preview')
            const probe = document.createElement('span')
            probe.style.background = 'var(--ui-surface)'
            probe.style.color = 'var(--ui-text)'
            probe.style.border = '1px solid var(--ui-border)'
            scope.append(probe)
            const expected = getComputedStyle(probe)
            const actual = getComputedStyle(element)
            const result = {
              radius: actual.borderRadius,
              actual: [
                actual.backgroundColor,
                actual.color,
                actual.borderTopColor,
              ],
              expected: [
                expected.backgroundColor,
                expected.color,
                expected.borderTopColor,
              ],
            }
            probe.remove()
            return result
          })
        assert.equal(paint.radius, '0px')
        assert.deepEqual(paint.actual, paint.expected)
      }
    },
  )
  await run(
    'generated charts share the engine and accept application row updates',
    async () => {
      const generated = page.getByRole('img', {
        name: 'Generated daily requests',
        exact: true,
      })
      await expect(generated).toBeVisible()
      const before = await generated.evaluate((element) => {
        window.generatedChartNode = element
        return element.innerHTML
      })
      await page
        .getByRole('button', { name: 'Update data', exact: true })
        .click()
      assert.ok(
        await generated.evaluate(
          (element) => element === window.generatedChartNode,
        ),
      )
      assert.notEqual(
        await generated.evaluate((element) => element.innerHTML),
        before,
      )
      assert.ok(
        (await generated.locator('text').allTextContents()).some((text) =>
          text.includes('requests'),
        ),
      )
      await generated.focus()
      await generated.press('ArrowRight')
      await settle()
      await expect(page.locator('.ts-chart-tooltip:visible')).toContainText(
        'REQUESTS',
      )
      await generated.press('Escape')
    },
  )
  await run(
    'shared legend sends controlled requests and preserves reordered controls',
    async () => {
      const legend = page.getByRole('group', {
        name: 'Request series',
        exact: true,
      })
      const actual = legend.getByRole('button', {
        name: 'Requests',
        exact: true,
      })
      const legendSpacing = await actual.evaluate((button) => {
        const cue = button
          .querySelector('.ui-chart-legend-swatch')
          .getBoundingClientRect()
        const label = button
          .querySelector('.ui-chart-legend-label')
          .getBoundingClientRect()
        return label.left - cue.right
      })
      assert.ok(
        legendSpacing >= 6,
        'Series cues need visible space before their labels',
      )
      await actual.focus()
      await actual.press('Space')
      await expect(actual).toHaveAttribute('aria-pressed', 'false')
      assert.equal(
        await page.evaluate(
          () => window.chartFixture.context().scene.points.length,
        ),
        3,
      )
      await actual.press('Space')
      await expect(actual).toHaveAttribute('aria-pressed', 'true')
      await page
        .getByRole('button', { name: 'Reject visibility changes', exact: true })
        .click()
      await actual.focus()
      await actual.press('Enter')
      await expect(actual).toHaveAttribute('aria-pressed', 'true')
      await actual.evaluate((button) => {
        window.chartLegendButton = button
      })
      await page
        .getByRole('button', { name: 'Reverse legend', exact: true })
        .evaluate((button) => button.click())
      assert.ok(
        await actual.evaluate(
          (button) =>
            button === window.chartLegendButton &&
            document.activeElement === button,
        ),
      )
      await page
        .getByRole('button', { name: 'Reject visibility changes', exact: true })
        .click()
      const labels = await page
        .getByRole('region', { name: 'Area chart panel' })
        .locator('text')
        .allTextContents()
      assert.ok(labels.some((label) => label.includes('Jan')))
    },
  )
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
  await run(
    'application-owned empty and loading states keep the chart available',
    async () => {
      await page
        .getByRole('button', { name: 'Toggle empty results', exact: true })
        .click()
      await expect(
        page.getByText('No chart data', { exact: true }),
      ).toBeVisible()
      assert.equal(
        await page.evaluate(
          () => window.chartFixture.context().scene.points.length,
        ),
        0,
      )
      await expect(svg).toBeVisible()
      await page
        .getByRole('button', { name: 'Toggle empty results', exact: true })
        .click()
      assert.equal(
        await page.evaluate(
          () => window.chartFixture.context().scene.points.length,
        ),
        6,
      )
      await page
        .getByRole('button', { name: 'Toggle loading', exact: true })
        .click()
      await expect(
        page.getByRole('status').filter({ hasText: 'Loading chart data' }),
      ).toContainText('Loading chart data')
      await expect(
        page.getByRole('region', { name: 'Line chart panel' }),
      ).toHaveAttribute('aria-busy', 'true')
      await page
        .getByRole('button', { name: 'Toggle loading', exact: true })
        .click()
      await expect(
        page.getByText('Loading chart data', { exact: true }),
      ).toHaveCount(0)
    },
  )
  await run(
    'forced colors retain chart focus, series and pinned tooltip',
    async () => {
      await page.emulateMedia({ forcedColors: 'active' })
      await svg.focus()
      await svg.press('ArrowRight')
      await svg.press('Enter')
      await settle()
      const tip = page.locator('.chart-primary-tooltip')
      await expect(tip).toBeVisible()
      const appearance = await svg.evaluate((element) => {
        const probe = document.createElement('span')
        probe.style.cssText =
          'color:CanvasText;background:Canvas;border:1px solid GrayText;outline:2px solid Highlight'
        document.body.append(probe)
        const system = getComputedStyle(probe)
        const line = getComputedStyle(
          element.querySelector('.ts-chart__line path'),
        )
        const panel = getComputedStyle(
          document.querySelector('.chart-primary-tooltip'),
        )
        const result = {
          stroke: line.stroke,
          focus: getComputedStyle(element).outlineStyle,
          focusWidth: getComputedStyle(element).outlineWidth,
          focusColor: getComputedStyle(element).outlineColor,
          text: panel.color,
          background: panel.backgroundColor,
          border: panel.borderTopWidth,
          borderColor: panel.borderTopColor,
          systemBorder: system.borderTopColor,
          systemText: system.color,
          systemBackground: system.backgroundColor,
          systemAccent: system.outlineColor,
        }
        probe.remove()
        return result
      })
      assert.equal(appearance.stroke, appearance.systemAccent)
      assert.equal(appearance.focus, 'solid')
      assert.equal(appearance.focusWidth, '2px')
      assert.equal(appearance.focusColor, appearance.systemAccent)
      assert.equal(appearance.text, appearance.systemText)
      assert.equal(appearance.background, appearance.systemBackground)
      assert.equal(appearance.border, '1px')
      assert.equal(appearance.borderColor, appearance.systemBorder)
      await svg.press('Escape')
      await expect(tip).not.toBeVisible()
      await page.emulateMedia({ forcedColors: 'none' })
    },
  )
  await run('remount and complete disposal', async () => {
    await page
      .getByRole('button', { name: 'Toggle chart', exact: true })
      .click()
    await expect(svg).toHaveCount(0)
    await expect(page.locator('.chart-primary-tooltip')).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Toggle chart', exact: true })
      .click()
    await expect(svg).toBeVisible()
    await page.evaluate(() => {
      window.chartFixture.stop()
    })
    await expect(page.locator('#root')).toBeEmpty()
    await expect(page.locator('.ts-chart-tooltip')).toHaveCount(0)
    await page.setViewportSize({ width: 1000, height: 700 })
    await settle()
    await expect(page.locator('.chart-primary-tooltip')).toHaveCount(0)
  })
  await run(
    'standalone charts retain self-scoped focus and sizing styles',
    async () => {
      await page.goto(
        (process.env.BENCH_URL ??
          `http://127.0.0.1:${server.address().port}/`) + '?standalone=1',
      )
      const standalone = page.getByRole('img', {
        name: 'Standalone chart',
        exact: true,
      })
      await standalone.focus()
      const style = await standalone.evaluate((svg) => ({
        outline: getComputedStyle(svg).outlineStyle,
        width: getComputedStyle(svg).outlineWidth,
        minWidth: getComputedStyle(svg.closest('.ui-chart')).minWidth,
        outer: Boolean(
          svg.closest('.ui-chart').parentElement.closest('[data-ui]'),
        ),
      }))
      assert.deepEqual(style, {
        outline: 'solid',
        width: '2px',
        minWidth: '0px',
        outer: false,
      })
      await page.evaluate(() => window.chartFixture.stop())
    },
  )
  await run(
    'hidden charts recover their measured width and retain SVG nodes',
    async () => {
      await page.goto(
        (process.env.BENCH_URL ??
          `http://127.0.0.1:${server.address().port}/`) +
          '?standalone=1&hidden=1',
      )
      const host = page.locator('[data-chart-test-host]')
      const chart = page.getByRole('img', {
        name: 'Standalone chart',
        includeHidden: true,
      })
      await expect(chart).toHaveCount(1)
      await expect(chart).not.toBeVisible()
      await chart.evaluate((element) => {
        window.chartHiddenNodes = {
          svg: element,
          path: element.querySelector('.ts-chart__line path'),
        }
      })
      for (const width of [640, 320, 480]) {
        await host.evaluate((element, width) => {
          element.style.display = 'block'
          element.style.width = `${width}px`
        }, width)
        await expect
          .poll(async () => chart.getAttribute('viewBox'))
          .toBe(`0 0 ${width} 280`)
        assert.ok(
          await chart.evaluate(
            (element) =>
              window.chartHiddenNodes.svg === element &&
              window.chartHiddenNodes.path ===
                element.querySelector('.ts-chart__line path'),
          ),
        )
        assert.doesNotMatch(await chart.innerHTML(), /NaN|Infinity/)
        if (width === 320) {
          await host.evaluate((element) => {
            element.style.display = 'none'
          })
          await settle()
          await expect(chart).not.toBeVisible()
        }
      }
      await page.evaluate(() => window.chartFixture.stop())
      await expect(page.locator('#root')).toBeEmpty()
    },
  )
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
