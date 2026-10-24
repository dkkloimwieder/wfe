import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { preview } from 'vite'
import { chromium } from '@playwright/test'
import { reviewTheme } from '../shared/appearance/theme-review.mjs'
import {
  attachDiagnostics,
  createRecorder,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  selectGroups,
} from '../shared/browser/runner.mjs'
const report = { cases: [], errors: [], warnings: [] }
let server, browser, page, detach
try {
  report.groups = selectGroups({ theme: true })
  execFileSync(
    'pnpm',
    ['exec', 'vite', 'build', '--config', 'examples/theme/vite.config.ts'],
    { stdio: 'inherit' },
  )
  server = await preview({
    configFile: 'examples/theme/vite.config.ts',
    preview: { host: '127.0.0.1', port: 0 },
  })

  browser = await launchBrowser({
    chromium,
    launchOptions: { args: ['--no-sandbox'] },
  })
  page = await browser.newPage()
  detach = attachDiagnostics(page, report)
  const errors = report.errors
  const record = createRecorder(report)
  await record('Public-only Theme consumer passed', async () => {
    await page.goto(server.resolvedUrls.local[0])
    await reviewTheme(page)
    assert.deepEqual(errors, [])
    assert.deepEqual(report.warnings, [])
  })
} catch (error) {
  report.failure = errorText(error)
  report.failureDetails = errorDetails(error)
} finally {
  const failed = await finalizeReport({
    report,
    output: process.env.BENCH_OUTPUT ?? '/tmp/wfe-theme.json',
    cleanup: [
      { name: 'page', close: () => page?.close() },
      { name: 'diagnostic listeners', close: () => detach?.() },
      { name: 'browser', close: () => browser?.close() },
      {
        name: 'preview server',
        close: () =>
          server
            ? new Promise((resolve, reject) =>
                server.httpServer.close((error) =>
                  error ? reject(error) : resolve(),
                ),
              )
            : undefined,
      },
    ],
  })
  if (failed) process.exitCode = 1
}
