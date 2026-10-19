import { reviewDetails, reviewDetailsServer } from './review-details.mjs'
import { reviewRepeated, reviewRepeatedServer } from './review-repeated.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { reviewFormats, reviewFormatsServer } from './review-formats.mjs'
import { reviewCssProvenance } from '../shared/controls/css-review.mjs'
import { reviewDates, reviewDateServer } from './review-dates.mjs'
import { reviewFocus } from './review-focus.mjs'
import { reviewServer } from './review-server.mjs'
import { reviewRecords } from './review-records.mjs'
import { reviewDispatch } from './review-dispatch.mjs'
import { reviewRecordsWorkflow } from './review-records-workflow.mjs'

const defaultApplications = {
  details: {
    initial: reviewDetailsServer,
    server: reviewDetailsServer,
    review: reviewDetails,
  },
  repeated: {
    label: 'title',
    value: 'Repeated records',
    server: reviewRepeatedServer,
    review: reviewRepeated,
  },
  formats: {
    label: 'note',
    value: 'Raw note',
    server: reviewFormatsServer,
    review: reviewFormats,
  },
  dates: {
    label: 'Review date',
    value: '29/02/2024',
    server: reviewDateServer,
    review: reviewDates,
  },
  focus: {
    label: 'Title',
    value: 'Focused title',
    server: (page) => reviewServer(page, 'focus'),
    review: reviewFocus,
  },
  records: {
    label: 'Name',
    value: 'Sample record',
    server: (page) => reviewServer(page, 'records'),
    review: reviewRecords,
  },
  dispatch: {
    label: 'Tracking code',
    value: 'PKG-100',
    server: (page) => reviewServer(page, 'dispatch'),
    review: reviewDispatch,
  },
}
export async function run({
  hydration = false,
  root = new URL('.', import.meta.url),
  applications = defaultApplications,
} = {}) {
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
  const assets = fileURLToPath(new URL(`${folder}/`, root))
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
  let renderRoute
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, 'http://localhost')
      const path = requestUrl.pathname
      const name = requestUrl.searchParams.get('app') ?? 'records'
      const key = `${name}:${requestUrl.searchParams.get('reviewCells') === '1'}`
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
      if (
        path === '/' &&
        renderRoute &&
        (requestUrl.searchParams.has('screen') ||
          requestUrl.searchParams.has('record'))
      ) {
        response.end(
          await renderRoute(
            name,
            requestUrl.searchParams.get('reviewCells') === '1',
            requestUrl.href,
          ),
        )
      } else
        response.end(
          path === '/' && html[key] ? html[key] : await readFile(file),
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
      const template = await readFile(assets + 'hydration.html', 'utf8')
      renderRoute = async (name, reviewCells, initialUrl) => {
        const warnings = []
        const warn = console.warn
        let result
        try {
          console.warn = (...args) => warnings.push(args.map(String).join(' '))
          result = await render(name, reviewCells, initialUrl)
        } finally {
          console.warn = warn
        }
        assert.deepEqual(warnings, [])
        return template
          .replace('<!--ssr-->', result.html)
          .replace(
            '<script type="module"',
            '<script>window.generatorServerNodes = [...document.querySelectorAll("#root input, #root textarea, #root output, #root table, #root [data-generator-panel]")];</script><script type="module"',
          )
      }
      for (const name of Object.keys(applications))
        for (const reviewCells of [false, true])
          html[`${name}:${reviewCells}`] = await renderRoute(name, reviewCells)
    }
    for (const directory of hydration
      ? [folder, `.dist-hydration-server${suffix}`]
      : [folder]) {
      const modules = JSON.parse(
        await readFile(new URL(`${directory}/modules.json`, root), 'utf8'),
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
    for (const [name, checks] of Object.entries(applications)) {
      report.application = name
      const firstCase = report.cases.length
      const applicationUrl = `${url}/?app=${name}&reviewCells=1`
      if (name === 'records')
        await reviewRecordsWorkflow({ browser, url, hydration, report, record })
      if (hydration) {
        const context = await browser.newContext({ javaScriptEnabled: false })
        try {
          const initial = await context.newPage()
          await initial.goto(applicationUrl)
          await checks.server(initial)
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
      if (checks.initial) await checks.initial(page)
      else
        await expect(
          page.locator('form').getByLabel(checks.label, {
            exact: true,
          }),
        ).toHaveValue(checks.value)
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
                    '#root input, #root textarea, #root output, #root table, #root [data-generator-panel]',
                  ),
                ].includes(node),
            ),
          ),
          true,
        )
        report.cases.push('hydration keeps server controls and table')
      }
      report.cssProvenance = await reviewCssProvenance(page, url)
      await checks.review({ page, report, record })
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
