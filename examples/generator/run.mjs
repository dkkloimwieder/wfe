import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { reviewFocus } from './review-focus.mjs'
import { reviewCssProvenance } from '../shared/controls/css-review.mjs'
import { choiceControl } from '../shared/controls/select-review.mjs'
import { reviewRecords } from './review-records.mjs'
import { reviewDispatch } from './review-dispatch.mjs'

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
  const report = {
    hydration,
    cases: [],
    applications: {},
    errors: [],
    warnings: [],
  }
  let browser
  let page
  const html = {}
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, 'http://localhost')
      const path = requestUrl.pathname
      const name = requestUrl.searchParams.get('app') ?? 'records'
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
      response.end(
        path === '/' && html[name] ? html[name] : await readFile(file),
      )
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
      for (const name of ['records', 'dispatch', 'focus']) {
        let result
        try {
          console.warn = (...args) => warnings.push(args.map(String).join(' '))
          result = await render(name)
        } finally {
          console.warn = warn
        }
        assert.deepEqual(warnings, [])
        html[name] = (await readFile(assets + 'hydration.html', 'utf8'))
          .replace('<!--ssr-->', result.html)
          .replace(
            '<script type="module"',
            '<script>window.generatorServerNodes = [...document.querySelectorAll("#root input, #root textarea, #root table")];</script><script type="module"',
          )
      }
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
    for (const name of ['records', 'dispatch', 'focus']) {
      report.application = name
      const firstCase = report.cases.length
      const applicationUrl = `${url}/?app=${name}`
      if (hydration) {
        const context = await browser.newContext({ javaScriptEnabled: false })
        try {
          const initial = await context.newPage()
          await initial.goto(applicationUrl)
          if (name === 'focus') {
            for (const label of ['Title', 'Notes', 'Extra'])
              await expect(
                initial.getByLabel(label, { exact: true }),
              ).toHaveCount(1)
          } else if (name === 'records') {
            for (const label of [
              'Name',
              'Active',
              'Alerts',
              'Notes',
              'Quantity',
            ])
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
          } else {
            for (const label of [
              'Tracking code',
              'Insured',
              'Declared value',
              'Dispatch date',
            ])
              await expect(
                initial.locator('form').getByLabel(label, { exact: true }),
              ).toHaveCount(1)
            await expect(
              choiceControl(initial.locator('form'), {
                name: 'Carrier',
                exact: true,
              }),
            ).toHaveCount(1)
            await expect(initial.locator('tbody tr')).toHaveCount(2)
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
      await page.goto(applicationUrl)
      await expect(
        page
          .locator('form')
          .getByLabel(
            name === 'records'
              ? 'Name'
              : name === 'focus'
                ? 'Title'
                : 'Tracking code',
            {
              exact: true,
            },
          ),
      ).toHaveValue(
        name === 'records'
          ? 'Sample record'
          : name === 'focus'
            ? 'Focused title'
            : 'PKG-100',
      )
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
      if (name === 'records') await reviewRecords({ page, report, record })
      else if (name === 'focus') await reviewFocus({ page, report, record })
      else await reviewDispatch({ page, report, record })
      report.diagnostics = (
        await page.evaluate(() => window.generatorFixture.diagnostics())
      ).filter((event) => event.code !== 'HOT_SCOPE_TIME')
      assert.deepEqual(report.diagnostics, [])
      report.applications[name] = {
        cases: report.cases.slice(firstCase),
        diagnostics: report.diagnostics,
        cssProvenance: report.cssProvenance,
      }
      await page.close()
      page = undefined
    }
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
