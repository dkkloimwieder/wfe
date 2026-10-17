import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { reviewCssProvenance } from '../shared/controls/css-review.mjs'
import {
  choiceControl,
  selectValue,
} from '../shared/controls/select-review.mjs'

export async function run({ hydration = false } = {}) {
  const suffix = process.env.BENCH_DEVELOPMENT
    ? '-dev'
    : process.env.BENCH_DISTRIBUTION
      ? '-package'
      : ''
  const folder = hydration
    ? `.dist-hydration${suffix}`
    : suffix
      ? `.dist${suffix}`
      : '.dist'
  const assets = fileURLToPath(new URL(`${folder}/`, import.meta.url))
  const report = { hydration, cases: [], errors: [], warnings: [] }
  let browser
  let page
  let html
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, 'http://localhost').pathname
      if (path === '/favicon.ico') return void response.writeHead(204).end()
      const file = resolve(assets, '.' + (path === '/' ? '/index.html' : path))
      assert.ok(file.startsWith(assets.replace(/\/$/, '') + sep))
      response.setHeader(
        'Content-Type',
        file.endsWith('.js')
          ? 'text/javascript'
          : file.endsWith('.css')
            ? 'text/css'
            : file.endsWith('.json')
              ? 'application/json'
              : 'text/html',
      )
      response.end(path === '/' && html ? html : await readFile(file))
    } catch {
      response.writeHead(404).end()
    }
  })
  const record = async (name, fn) => {
    console.log(`Start: ${name}`)
    await fn()
    report.cases.push(name)
    console.log(`Pass: ${name}`)
  }
  try {
    if (hydration) {
      for (const server of [true, false])
        execFileSync(
          'pnpm',
          [
            'exec',
            'vite',
            'build',
            '--config',
            'examples/generator/vite.hydration.config.ts',
          ],
          {
            stdio: 'inherit',
            env: { ...process.env, HYDRATION_SERVER: server ? '1' : '' },
          },
        )
      const { render } = await import(
        new URL(`.dist-hydration-server${suffix}/server.js`, import.meta.url)
      )
      const warnings = []
      const warn = console.warn
      let result
      try {
        console.warn = (...args) => warnings.push(args.map(String).join(' '))
        result = await render()
      } finally {
        console.warn = warn
      }
      assert.deepEqual(warnings, [])
      html = (await readFile(assets + 'hydration.html', 'utf8'))
        .replace('<!--ssr-->', result.html)
        .replace(
          '<script type="module"',
          '<script>window.generatorServerNodes = [...document.querySelectorAll("#root input, #root textarea, #root table")];</script><script type="module"',
        )
    }
    for (const directory of hydration
      ? [folder, `.dist-hydration-server${suffix}`]
      : [folder]) {
      const modules = JSON.parse(
        await readFile(
          new URL(`${directory}/modules.json`, import.meta.url),
          'utf8',
        ),
      )
      for (const name of ['generator', 'form', 'components'])
        assert.ok(
          modules.some((id) =>
            id.includes(
              `/packages/${name}/${process.env.BENCH_DISTRIBUTION ? 'dist/' : 'src/'}`,
            ),
          ),
          `Missing public ${name} ${directory} modules`,
        )
      assert.ok(
        !modules.some((id) =>
          /table-core|\/dev\/wamn\/|node_modules\/@kobalte\//.test(id),
        ),
      )
    }
    await new Promise((done) => server.listen(0, '127.0.0.1', done))
    const url = `http://127.0.0.1:${server.address().port}`
    browser = await chromium.launch({ headless: true })
    if (hydration) {
      const context = await browser.newContext({ javaScriptEnabled: false })
      try {
        const initial = await context.newPage()
        await initial.goto(url)
        for (const label of ['Name', 'Active', 'Alerts', 'Notes', 'Quantity'])
          await expect(
            initial.locator('form').getByLabel(label, { exact: true }),
          ).toHaveCount(1)
        await expect(
          choiceControl(initial.locator('form'), {
            name: 'Category',
            exact: true,
          }),
        ).toHaveCount(1)
        for (const label of ['Active', 'Alerts']) {
          const metadata = await initial
            .getByLabel(label, { exact: true })
            .evaluate((node) => ({
              id: node.id,
              described: node
                .getAttribute('aria-describedby')
                ?.split(' ')
                .every((id) => document.getElementById(id)),
            }))
          assert.ok(metadata.id)
          assert.equal(metadata.described, true)
        }
        report.cases.push(
          'server labels and boolean descriptions before JavaScript',
        )
      } finally {
        await context.close()
      }
    }
    page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    })
    page.on('pageerror', (error) => report.errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'warning' || message.type() === 'error')
        report.warnings.push(message.text())
    })
    await page.goto(url)
    await expect(
      page.locator('form').getByLabel('Name', { exact: true }),
    ).toHaveValue('Sample record')
    if (hydration) {
      await expect(page.locator('html')).toHaveAttribute(
        'data-hydrated',
        'true',
      )
      assert.equal(
        await page.evaluate(() =>
          window.generatorServerNodes.every(
            (node) =>
              node.isConnected &&
              [
                ...document.querySelectorAll(
                  '#root input, #root textarea, #root table',
                ),
              ].includes(node),
          ),
        ),
        true,
      )
      report.cases.push('hydration keeps server controls and table')
    }
    report.cssProvenance = await reviewCssProvenance(page, url)
    await record('two-column layout stacks on narrow screens', async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      const panels = await page
        .locator('[data-generator-panel]')
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            x: node.getBoundingClientRect().x,
            y: node.getBoundingClientRect().y,
            width: node.getBoundingClientRect().width,
          })),
        )
      assert.ok(
        panels.every((panel) => panel.x >= 0 && panel.x + panel.width <= 390),
      )
      assert.equal(panels[0].x, panels[1].x)
      assert.ok(panels[1].y > panels[0].y)
      await page.setViewportSize({ width: 1280, height: 900 })
    })
    await record(
      'accepted text, select, checkbox and switch use shared controls',
      async () => {
        await page
          .locator('form')
          .getByLabel('Name', { exact: true })
          .fill('Edited record')
        await selectValue(
          choiceControl(page.locator('form'), {
            name: 'Category',
            exact: true,
          }),
          'b',
        )
        await page.getByText('Active', { exact: true }).click()
        await expect(
          page.getByRole('checkbox', { name: 'Active' }),
        ).not.toBeChecked()
        await page.getByRole('switch', { name: 'Alerts' }).press('Space')
        await expect(page.getByRole('switch', { name: 'Alerts' })).toBeChecked()
        assert.equal(
          (await page.evaluate(() => window.generatorFixture.snapshot())).values
            .category,
          'b',
        )
      },
    )
    await record('optional custom field and explicit submission', async () => {
      await page
        .locator('form')
        .getByLabel('Quantity', { exact: true })
        .fill('4')
      await page
        .locator('form')
        .getByLabel('Name', { exact: true })
        .press('Enter')
      await expect
        .poll(
          async () =>
            (await page.evaluate(() => window.generatorFixture.snapshot()))
              .submitted,
        )
        .toBe(1)
      await page.locator('form').getByLabel('Name', { exact: true }).fill('')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(
        page.locator('form').getByLabel('Name', { exact: true }),
      ).toHaveAttribute('aria-invalid', 'true')
      for (const label of ['Active', 'Alerts']) {
        const control = page.getByRole(
          label === 'Active' ? 'checkbox' : 'switch',
          { name: label },
        )
        await expect(control).toHaveAttribute('aria-invalid', 'true')
        assert.equal(
          await control.evaluate((node) =>
            node
              .getAttribute('aria-describedby')
              .split(' ')
              .map((id) => document.getElementById(id)?.textContent)
              .some((text) => text?.startsWith('Review ')),
          ),
          true,
        )
      }
    })
    await record(
      'relabel, reorder, aliases, row values and callbacks preserve local state',
      async () => {
        await page
          .locator('form')
          .getByLabel('Name', { exact: true })
          .fill('Draft preserved')
        await page.getByLabel('Cell note').fill('Cell preserved')
        await page.getByRole('button', { name: 'Extra', exact: true }).click()
        await page.locator('form').getByLabel('Name', { exact: true }).focus()
        await page.evaluate(() => {
          window.generatorServerNodes = [
            ...document.querySelectorAll(
              '#root input, #root textarea, #root table',
            ),
          ]
          window.generatorFixture.revise()
        })
        await expect(
          page.locator('form').getByLabel('Record name', { exact: true }),
        ).toBeFocused()
        await expect(
          page.locator('form').getByLabel('Record name', { exact: true }),
        ).toHaveValue('Draft preserved')
        await expect(page.getByLabel('Cell note')).toHaveValue('Cell preserved')
        await expect(page.locator('[data-generator-amount]')).toHaveText('7')
        await expect(page.locator('tbody td').first()).toHaveAttribute(
          'data-column',
          'quantity',
        )
        assert.equal(
          await page.evaluate(() =>
            window.generatorServerNodes.every((node) => node.isConnected),
          ),
          true,
        )
        await page.getByRole('button', { name: 'Extra', exact: true }).click()
        const snapshot = await page.evaluate(() =>
          window.generatorFixture.snapshot(),
        )
        assert.deepEqual(snapshot.calls, [1, 2])
        assert.equal(snapshot.lifecycle.quantityMounts, 1)
        assert.equal(snapshot.lifecycle.cellMounts, 1)
      },
    )
    await record('layout stays within narrow viewport', async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      )
      const panels = await page
        .locator('[data-generator-panel]')
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            x: node.getBoundingClientRect().x,
            width: node.getBoundingClientRect().width,
          })),
        )
      assert.ok(
        panels.every((panel) => panel.x >= 0 && panel.x + panel.width <= 390),
      )
    })
    await record(
      'fill panels keep result height for empty, two and forty rows',
      async () => {
        report.geometry = { wide: [], narrow: [] }
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.evaluate(() => window.generatorFixture.columns(2))
        let height
        for (const count of [0, 2, 40]) {
          await page.evaluate(
            (value) => window.generatorFixture.rows(value),
            count,
          )
          await expect(page.locator('tbody tr')).toHaveCount(count)
          const geometry = await page.evaluate(() => {
            const main = document.querySelector('.ui-dashboard-main')
            const grid = document.querySelector('.ui-dashboard-grid')
            const panel = document.querySelector(
              '[data-generator-panel="records-panel"]',
            )
            const editor = document.querySelector(
              '[data-generator-panel="editor-panel"]',
            )
            const results = document.querySelector('.table-scroll')
            const bounds = (node) => {
              const rect = node.getBoundingClientRect()
              return {
                x: rect.x,
                y: rect.y,
                height: rect.height,
                bottom: rect.bottom,
              }
            }
            const mainStyle = getComputedStyle(main)
            return {
              main: bounds(main),
              grid: bounds(grid),
              panel: bounds(panel),
              editor: bounds(editor),
              form: bounds(document.querySelector('form')),
              results: bounds(results),
              padding:
                parseFloat(mainStyle.paddingTop) +
                parseFloat(mainStyle.paddingBottom),
              scrolls: results.scrollHeight > results.clientHeight,
            }
          })
          report.geometry.wide.push({ count, ...geometry })
          assert.ok(
            Math.abs(
              geometry.grid.height - (geometry.main.height - geometry.padding),
            ) <= 2,
            'fill grid occupies the available main height',
          )
          assert.ok(
            Math.abs(geometry.panel.height - geometry.grid.height) <= 2,
            'fill panel occupies the grid height',
          )
          assert.ok(
            geometry.form.bottom <= geometry.editor.bottom + 1,
            'adjacent form is not clipped',
          )
          if (height === undefined) height = geometry.results.height
          else
            assert.ok(
              Math.abs(height - geometry.results.height) <= 1,
              'result count does not resize the table',
            )
          if (count === 40) assert.equal(geometry.scrolls, true)
        }
        await page.evaluate(() => {
          window.generatorFixture.rows(1)
          window.generatorFixture.fill(false)
        })
        const natural = await page.evaluate(() => {
          const main = document.querySelector('.ui-dashboard-main')
          const style = getComputedStyle(main)
          return {
            grid: document
              .querySelector('.ui-dashboard-grid')
              .getBoundingClientRect().height,
            available:
              main.getBoundingClientRect().height -
              parseFloat(style.paddingTop) -
              parseFloat(style.paddingBottom),
          }
        })
        assert.ok(
          natural.grid < natural.available - 1,
          'disabling fill restores content height',
        )
        report.geometry.natural = natural
        await page.evaluate(() => window.generatorFixture.fill(true))
        await page.setViewportSize({ width: 390, height: 844 })
        let narrowHeight
        for (const count of [0, 2, 40]) {
          await page.evaluate(
            (value) => window.generatorFixture.rows(value),
            count,
          )
          await expect(page.locator('tbody tr')).toHaveCount(count)
          const result = await page
            .locator('.table-scroll')
            .evaluate((node) => ({
              height: node.getBoundingClientRect().height,
              minimum:
                node.querySelector('thead').getBoundingClientRect().height +
                (node.querySelector('tbody tr')?.getBoundingClientRect()
                  .height ??
                  parseFloat(
                    getComputedStyle(node).getPropertyValue('--ui-row-height'),
                  )),
            }))
          report.geometry.narrow.push({ count, ...result })
          assert.equal(
            await page.evaluate(
              () =>
                document.querySelector('form').getBoundingClientRect().bottom <=
                document
                  .querySelector('[data-generator-panel="editor-panel"]')
                  .getBoundingClientRect().bottom +
                  1,
            ),
            true,
            'narrow form stays inside its panel',
          )
          assert.ok(
            result.height > result.minimum,
            'narrow results retain room for the header and a record',
          )
          if (narrowHeight === undefined) narrowHeight = result.height
          else
            assert.ok(
              Math.abs(narrowHeight - result.height) <= 1,
              'narrow result count does not resize the table',
            )
        }
        await page.evaluate(() => window.generatorFixture.rows(1))
        const narrow = await page
          .locator('[data-generator-panel]')
          .evaluateAll((nodes) =>
            nodes.map((node) => ({
              x: node.getBoundingClientRect().x,
              width: node.getBoundingClientRect().width,
            })),
          )
        assert.ok(
          narrow.every((panel) => panel.x >= 0 && panel.x + panel.width <= 390),
        )
        assert.equal(
          await page.evaluate(() => {
            const form = document.querySelector('form').getBoundingClientRect()
            const panel = document
              .querySelector('[data-generator-panel="editor-panel"]')
              .getBoundingClientRect()
            return form.bottom <= panel.bottom + 1
          }),
          true,
        )
      },
    )
    await record('removed views and disposed cells clean up once', async () => {
      await page.evaluate(() => window.generatorFixture.remove())
      await expect(
        page.locator('[data-generator-panel="editor-panel"]'),
      ).toHaveCount(0)
      assert.equal(
        (await page.evaluate(() => window.generatorFixture.snapshot()))
          .lifecycle.quantityDisposals,
        1,
      )
      await page.evaluate(() => window.generatorFixture.stop())
      const lifecycle = (
        await page.evaluate(() => window.generatorFixture.snapshot())
      ).lifecycle
      assert.equal(lifecycle.cellDisposals, lifecycle.cellMounts)
      await expect(page.locator('#root input, #root table')).toHaveCount(0)
    })
    report.diagnostics = (
      await page.evaluate(() => window.generatorFixture.diagnostics())
    ).filter((event) => event.code !== 'HOT_SCOPE_TIME')
    assert.deepEqual(report.diagnostics, [])
    assert.deepEqual(report.errors, [])
    assert.deepEqual(report.warnings, [])
  } catch (error) {
    report.failure = error.stack
    if (page) {
      try {
        report.dom = await page.locator('#root').innerHTML({ timeout: 2000 })
      } catch (diagnostic) {
        report.diagnosticFailure = diagnostic.stack
      }
    }
    process.exitCode = 1
  } finally {
    try {
      await browser?.close()
    } catch (error) {
      report.cleanupFailure = error.stack
      process.exitCode = 1
    }
    if (server.listening) await new Promise((done) => server.close(done))
    const output =
      process.env.BENCH_OUTPUT ??
      `/tmp/generator${hydration ? '-hydration' : ''}.json`
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify(report, null, 2))
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await run()
