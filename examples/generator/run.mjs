import {
  startStaticServer,
  launchBrowser,
  attachDiagnostics,
  readReactiveDiagnostics,
  createRecorder,
  selectGroups,
  captureDiagnostic,
  finalizeReport,
  errorDetails,
  errorText,
  withCleanup,
} from '../shared/browser/runner.mjs'
import { columnControlChecks } from './review-column-controls.mjs'
import { subtableChecks } from './review-subtables.mjs'
import { reviewExampleSizing } from '../shared/appearance/sizing-review.mjs'
import { reviewDetails, reviewDetailsServer } from './review-details.mjs'
import { reviewRepeated, reviewRepeatedServer } from './review-repeated.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
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
  'column-controls': columnControlChecks,
  subtables: subtableChecks,
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
  let server
  let detachPage = () => {}
  const record = createRecorder(report)
  try {
    report.groups = selectGroups(applications)
    const selectedApplications = Object.fromEntries(
      report.groups.selected.map((name) => [name, applications[name]]),
    )
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
      for (const name of Object.keys(selectedApplications))
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
    server = await startStaticServer({
      assets,
      onServerError: (error) => {
        report.serverErrors ??= []
        report.serverErrors.push(error)
      },
      renderIndex: async (requestUrl) => {
        const name = requestUrl.searchParams.get('app') ?? 'records'
        const reviewCells = requestUrl.searchParams.get('reviewCells') === '1'
        if (
          renderRoute &&
          (requestUrl.searchParams.has('screen') ||
            requestUrl.searchParams.has('record'))
        )
          return renderRoute(name, reviewCells, requestUrl.href)
        return html[`${name}:${reviewCells}`]
      },
    })
    const url = server.url
    browser = await launchBrowser({ chromium })
    for (const [name, checks] of Object.entries(selectedApplications)) {
      report.application = name
      const firstCase = report.cases.length
      const applicationUrl = `${url}/?app=${name}&reviewCells=1`
      if (name === 'records')
        await reviewRecordsWorkflow({ browser, url, hydration, report, record })
      if (hydration) {
        const context = await browser.newContext({ javaScriptEnabled: false })
        await withCleanup(async () => {
          const initial = await context.newPage()
          await initial.goto(applicationUrl)
          await checks.server(initial)
          report.cases.push(
            'server labels and boolean descriptions before JavaScript',
          )
        }, [
          {
            name: 'server-rendered page context',
            close: () => context.close(),
          },
        ])
      }
      page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      })
      detachPage = attachDiagnostics(page, report)
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
      if (checks.sizing !== false)
        await record('shared form sizing survives nested layouts', () =>
          reviewExampleSizing(page),
        )
      await checks.review({ page, report, record })
      report.diagnostics = await readReactiveDiagnostics(page, report, {
        scope: name,
        read: () => window.generatorFixture.diagnostics(),
      })
      assert.deepEqual(report.diagnostics, [])
      report.applications[name] = {
        cases: report.cases.slice(firstCase),
        diagnostics: report.diagnostics,
        cssProvenance: report.cssProvenance,
      }
      await page.close()
      detachPage()
      detachPage = () => {}
      page = undefined
    }
    assert.deepEqual(report.errors, [])
    assert.deepEqual(report.warnings, [])
  } catch (error) {
    report.failure = errorText(error)
    report.failureDetails = errorDetails(error)
    if (page)
      report.dom = await captureDiagnostic(report, 'current page DOM', () =>
        page.locator('#root').innerHTML({ timeout: 2000 }),
      )
    process.exitCode = 1
  } finally {
    const failed = await finalizeReport({
      report,
      cleanup: [
        { name: 'current page', close: () => page?.close() },
        { name: 'page diagnostics', close: () => detachPage() },
        { name: 'browser', close: () => browser?.close() },
        { name: 'static server', close: () => server?.close() },
      ],
      output:
        process.env.BENCH_OUTPUT ??
        `/tmp/generator${hydration ? '-hydration' : ''}.json`,
    })
    if (failed) process.exitCode = 1
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await run()
