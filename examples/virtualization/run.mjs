import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { preview } from 'vite'
import {
  attachDiagnostics,
  createRecorder,
  errorDetails,
  errorText,
  finalizeReport,
  launchBrowser,
  selectGroups,
} from '../shared/browser/runner.mjs'
import { withArtifactRun } from '../../scripts/artifacts.mjs'

await withArtifactRun(
  { suite: 'virtualization', hydration: process.argv.includes('--hydration') },
  async (artifacts) => {
    const report = { cases: [], errors: [], warnings: [] }
    let server, browser, page, detach
    try {
      report.groups = selectGroups({ virtualization: true })
      server = await preview({
        configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
        preview: { host: '127.0.0.1', port: 0 },
      })

      browser = await launchBrowser({ chromium })
      page = await browser.newPage()
      detach = attachDiagnostics(page, report, { console: () => 'observe' })
      const errors = report.errors
      const record = createRecorder(report)
      await record(
        'measured virtualization, bounded DOM, scrolling, editing, and append',
        async () => {
          await page.goto(server.resolvedUrls.local[0])
          const grid = page.getByRole('grid', { name: 'People' })
          await expect(grid).toBeVisible()
          await expect(grid).toHaveAttribute('aria-rowcount', '10001')
          const rows = grid.locator('.native-row[data-kind="row"]')
          await expect(rows.first()).toBeVisible()
          const initial = await rows.first().getAttribute('data-key')
          assert.ok(
            (await rows.count()) < 100,
            'only the viewport and buffer render',
          )
          await grid.evaluate((element) => {
            element.scrollTop = 240000
          })
          await expect
            .poll(() => rows.first().getAttribute('data-key'))
            .not.toBe(initial)
          assert.ok(
            (await rows.count()) < 100,
            'scrolling keeps DOM rows bounded',
          )
          await grid.evaluate((element) => {
            element.scrollTop = 0
          })
          await expect
            .poll(() => rows.first().getAttribute('data-key'))
            .toBe(initial)
          const name = rows.first().locator('[data-column="name"]')
          await name.dblclick()
          const input = name.locator('input')
          await expect(input).toBeVisible()
          await input.fill('Migrated record')
          await page
            .getByRole('button', { name: 'Save edit', exact: true })
            .click()
          await expect(name).toHaveText('Migrated record')
          await page
            .getByRole('button', { name: 'Append record', exact: true })
            .click()
          await expect(grid).toHaveAttribute('aria-rowcount', '10002')
          assert.deepEqual(errors, [])
        },
      )
    } catch (error) {
      report.failure = errorText(error)
      report.failureDetails = errorDetails(error)
    } finally {
      const failed = await finalizeReport({
        report,
        output: artifacts.reportPath,
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
  },
)
